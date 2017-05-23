#include "cnn/nodes.h"
#include "cnn/cnn.h"
#include "cnn/training.h"
#include "cnn/timing.h"
#include "cnn/rnn.h"
#include "cnn/gru.h"
#include "cnn/lstm.h"
#include "cnn/dict.h"
#include "cnn/expr.h"

#include <iostream>
#include <fstream>

#include <boost/archive/text_iarchive.hpp>
#include <boost/archive/text_oarchive.hpp>

#include <unordered_map>
#include <unordered_set>

using namespace std;
using namespace cnn;

double pdrop = 0.5;
bool eval = false;
bool verbose = false;
unsigned INPUT_DIM = 64;
unsigned HIDDEN_DIM = 150;
unsigned TAG_HIDDEN_DIM = 64;
unsigned LABEL_SIZE = 2;

unsigned INPUT_VOCAB_SIZE = 0;

cnn::Dict word_dict(true);

int kSOS;
int kEOS;
int kUNK;

unordered_map<string, vector<double> > pretrained_embeddings;
vector<double> averaged_vec;

cnn::real epsilon = 0.001;

template<class T1, class T2>
struct PairCmp
{
    bool operator()(const pair<T1, T2>& a, const pair<T1, T2>& b)
    {
        return a.second > b.second;
    }
};
class Example {
public:
    vector<vector<string> > words; //multiple sents
    vector<vector<int> > word_ids; //sent_ids
    int ylabel;
};

bool ReadExample(ifstream& fin, Example& example);

/**
* Read Word Embeddings and normalize them
* @param input_file pretrained embeddings file path
* */

void ReadEmbeddings(const string& input_file)
{
    ifstream fin(input_file);
    assert(fin);
    string line;
    bool first = true;
    while(getline(fin, line))
    {
        istringstream sin(line);
        string word;
        sin>>word;
        double value;
        vector<double> vecs;
        double sum = 0.000001;
        while(sin>>value)
        {
            vecs.push_back(value);
            sum += value * value;
        }
        if(first)
        {
            first = false;
            INPUT_DIM = vecs.size();
            averaged_vec.resize(INPUT_DIM, 0.0);
        }
        //normalize to one
        sum = sqrt(sum);
        for(int j = 0; j < INPUT_DIM; j++)
        {
            averaged_vec[j] += vecs[j];
            vecs[j] /= sum;
        }
        pretrained_embeddings[word] = vecs;
        //word_dict.Convert(word);
    }
    fin.close();
    double sum = 0.000001;
    for(int j = 0; j < INPUT_DIM; j++)
    {
        averaged_vec[j] /= pretrained_embeddings.size();
        sum += averaged_vec[j] * averaged_vec[j];
    }
    sum = sqrt(sum);
    for(int j = 0; j < INPUT_DIM; j++)
    {
        averaged_vec[j] /= sum ;
    }
    cerr<<"Pretrained Embeddings: "<< pretrained_embeddings.size()<<endl;
}

void ReadCorpus(const string& input_file,
                vector<Example>& examples,
                cnn::Dict& wordDict,
                int& tlines,
                int& ttoks,
                bool isTrain = true,
                int cut_off = 1)
{
    ifstream fin(input_file);
    if(!fin) {
        cerr<<"Cannot open file: "<< input_file << endl;
        exit(0);
    }

    unordered_map<string, int> word_counts;
    int tokens = 0, types = 0;
    while(true)
    {
        Example example;
        if(!ReadExample(fin,  example)) break;
        tlines++;
        for(int t = 0; t< (int)example.words.size(); t++)
        {
            auto& title = example.words[t];
            if(isTrain)
            {
                for(int j = 0; j < (int)title.size(); j++)
                {
                    auto& word = title[j];
                    auto iter = word_counts.find(word);
                    if( iter == word_counts.end())
                    {
                        word_counts.insert(make_pair(word, 1));
                        types++;
                    }
                    else {
                        iter->second++;
                    }
                    tokens++;
                }
            }
            ttoks += title.size();
        }
        examples.push_back(example);
    }
    fin.close();

    if(isTrain)
    {
        cerr<<"[LOG] Before Pruning there are "<<  tokens << " words and " <<types<< " types."<<endl;
        std::vector<pair<string, int>> pairs;
        for (auto itr = word_counts.begin(); itr != word_counts.end(); ++itr)
            pairs.push_back(*itr);

        sort(pairs.begin(), pairs.end(), PairCmp<string, int>());

        //int top_k = 24 * 1000; //24 k
        int remaining_tokens = 0, remaining_types = 0;
        int type_count = 0;
        for(auto iter = pairs.begin(); iter != pairs.end(); iter++)
        {
            type_count++;
            //if(type_count > top_k) break;
            if(iter->second >= cut_off && cnn::rand01() < 0.5)
                //if(pretrained_embeddings.find( iter->first) != pretrained_embeddings.end() )
            {
                //cerr<< iter->first << "\t" << iter->second<<endl;
                wordDict.Convert(iter->first);
                remaining_tokens += iter->second;
                remaining_types++;
            }
        }
        cerr<<"[LOG] After Pruning there are "<<  remaining_tokens << " words and " << remaining_types<< " types."<<endl;
        cerr<<"[LOG] WordDict Size: "<< wordDict.size() << endl;
        wordDict.Freeze();
    }

    for(unsigned sent_index = 0; sent_index < examples.size(); sent_index++)
    {
        auto& example = examples[sent_index];
        int num_titles = example.words.size();
        example.word_ids.resize(num_titles);

        for(int title_index = 0; title_index < num_titles; title_index++)
        {
            example.word_ids[title_index].resize( example.words[title_index].size() );

            for(unsigned word_index = 0; word_index < example.words[title_index].size(); word_index++)
            {
                int wordId = wordDict.Convert( example.words[title_index][word_index] );

                if(wordId == -1)
                {
                    wordId = kUNK;
                    //cerr<<"kUNK ";
                }
                example.word_ids[title_index][word_index] = wordId;
                //cerr<< example.words[title_index][word_index]<<" ";
            }
            //cerr<<endl;
        }
        //cerr<< endl;
    }
    //cerr<<endl;
}

void computeLRP(cnn::real Rf, const vector<cnn::real>& w, const vector<cnn::real>& s, cnn::real b, vector<cnn::real>& Rs)
{
    //implement equation (2) to equation (6) of alex's note
    assert(w.size() == s.size());
    cnn::real sum = b;
    for(unsigned k = 0; k< s.size(); k++)
        sum += w[k] * s[k];
    cnn::real append = epsilon * (sum > 0? 1: -1);
    sum += append;
    Rs.resize(s.size(), 0);
    for(unsigned k = 0; k< s.size(); k++)
        Rs[k] = Rf * w[k] * s[k] / sum;
}
void compuateLRPforSum(float Rf, const vector<cnn::real>& s, vector<cnn::real>& Rs)
{
    Rs.resize(s.size(), 0);
    cnn::real sum = 0;
    for(unsigned k = 0; k< s.size(); k++)
        sum += s[k];
    cnn::real append = epsilon * (sum > 0? 1: -1);
    sum += append;
    for(unsigned k = 0; k< s.size(); k++)
        Rs[k] = Rf  * s[k] / sum;
}


struct TitleEncoder {
    LookupParameters* p_word;  //

    Parameters* p_output_w;
    Parameters* p_output_b;
    Parameters* p_fed_o;
    Parameters* p_fed_o_b;

    explicit TitleEncoder(Model& model)
    {
        p_word = model.add_lookup_parameters(INPUT_VOCAB_SIZE, {INPUT_DIM});

        p_output_w = model.add_parameters({TAG_HIDDEN_DIM, INPUT_DIM});
        p_output_b = model.add_parameters({TAG_HIDDEN_DIM});

        p_fed_o = model.add_parameters({LABEL_SIZE, TAG_HIDDEN_DIM});
        p_fed_o_b = model.add_parameters({LABEL_SIZE});


        for( size_t  word_index = 0; word_index <  INPUT_VOCAB_SIZE; word_index++)
        {
            auto word_iter = pretrained_embeddings.find( word_dict.Convert(word_index) );
            if(word_iter != pretrained_embeddings.end())
            {
                ((LookupParameters*)p_word)->Initialize(word_index, word_iter->second);
            }
            else {
                ((LookupParameters*)p_word)->Initialize(word_index, averaged_vec);
            }
        }
    }


    Expression buildGraph(ComputationGraph&cg, const Example& example)
    {
        vector<Expression> title_exps;

        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            const unsigned slen = insent.size();

            vector<Expression> i_words;

            for (unsigned t = 0; t < insent.size(); ++t)
            {
                Expression i_word_t = const_lookup(cg,p_word,insent[t]);
                if (!eval) {
                    i_word_t = dropout(i_word_t, pdrop);
                }
                if(insent[t] != kUNK)
                    i_words.push_back(i_word_t);
            }
            if(i_words.size() > 1 )
            {
                //关键是这个地方
                title_exps.push_back( sum_cols(tanh(kmh_ngram(concatenate_cols(i_words), 2))) );
            }
            else if(i_words.size()> 0) {
                //这个地方用得到每个words
                title_exps.push_back(average(i_words));
            }
        }
        //这个地方用得到每个title_exps的
        Expression example_rep = average(title_exps);
        Expression param_tW = parameter(cg, p_output_w);
        Expression param_tb = parameter(cg, p_output_b);
        //Dropout可以不用管
        if(!eval)
            example_rep = dropout(example_rep, pdrop);
        //Expression i_output = rectify(param_tW * example_rep + param_tb);
        Expression i_output = tanh(param_tW * example_rep + param_tb);
        //得到example_rep的相关度也没有问题了
        if(verbose)
        {
            cg.incremental_forward();
            cerr<<(*i_output.value())<<endl;
        }

        Expression param_oW = parameter(cg, p_fed_o);
        Expression param_ob = parameter(cg, p_fed_o_b);
        Expression output_h = param_oW * i_output + param_ob;
        //f(x) 对于涨能得到多少, 对于跌能多少，应该没有问题了。
        return output_h;
    }

    Expression buildLRPGraph(ComputationGraph&cg, const Example& example)
    {
        vector<Expression> title_exps;
        vector<vector<Expression> > title_words;
        vector<Expression> title_cols;

        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            const unsigned slen = insent.size();

            vector<Expression> i_words;

            for (unsigned t = 0; t < insent.size(); ++t)
            {
                Expression i_word_t = const_lookup(cg,p_word,insent[t]);
                if (!eval) {
                    i_word_t = dropout(i_word_t, pdrop);
                }
                if(insent[t] != kUNK)
                    i_words.push_back(i_word_t);
            }
            if(i_words.size() > 1 )
            {
                title_words.push_back(i_words);
                //关键是这个地方
                Expression current_col = tanh(kmh_ngram(concatenate_cols(i_words), 2));
                title_exps.push_back(sum_cols(current_col) );
                title_cols.push_back(current_col);
            }
            else if(i_words.size()> 0) {
                //这个地方用得到每个words
                title_exps.push_back(average(i_words));
                title_words.push_back(i_words);
            }
        }
        //这个地方用得到每个title_exps的
        Expression example_rep = average(title_exps);
        Expression param_tW = parameter(cg, p_output_w);
        Expression param_tb = parameter(cg, p_output_b);
        //Dropout可以不用管
        if(!eval)
            example_rep = dropout(example_rep, pdrop);
        //Expression i_output = rectify(param_tW * example_rep + param_tb);
        Expression i_output = tanh(param_tW * example_rep + param_tb);
        //得到example_rep的相关度也没有问题了
        if(verbose)
        {
            cg.incremental_forward();
            cerr<<(*i_output.value())<<endl;
        }

        Expression param_oW = parameter(cg, p_fed_o);
        Expression param_ob = parameter(cg, p_fed_o_b);
        Expression output_h = param_oW * i_output + param_ob;
        //===============LRP==============================
        //Step 1: Get Rf
        auto feature_vector  = as_vector(cg.incremental_forward());
        cnn::real final_r_f = feature_vector[1] - feature_vector[0]; //预测涨的相关性, 如果final_r_f 大于0， 那么就预测涨
        //cerr<<"final_f: " << final_r_f  << "\t" << feature_vector[1]<< endl;
        //Step 2: Get R_i_output
        auto param_ob_values = as_vector(param_ob.value());
        auto param_oW_values = *(param_oW.value());
        auto i_output_values = as_vector(i_output.value());
        /*
        cnn::real sum = b_values[1];
        for(int i = 0; i< TAG_HIDDEN_DIM; i++)
            sum += param_oW_values(1, i) * i_output_values[i];
        cerr<<"comp: " << sum << "\t" << feature_vector[1] << endl; //几乎相等了
        */
        vector<cnn::real> w(TAG_HIDDEN_DIM);
        for(unsigned i = 0; i< TAG_HIDDEN_DIM; i++)
            w[i] = param_oW_values(1,i);
        vector<cnn::real> R_i_output;
        computeLRP(final_r_f, w, i_output_values, param_ob_values[1], R_i_output);
        /*copy(R_i_output.begin(), R_i_output.end(), ostream_iterator<cnn::real>(cerr, " "));
        cerr<< endl;*/
        //Step 3: Get R_example_rep
        auto param_tW_values = *(param_tW.value());
        auto param_tb_values = as_vector(param_tb.value());
        auto example_rep_values = as_vector(example_rep.value());
        vector<cnn::real> R_example_rep(INPUT_DIM, 0);
        for(unsigned i = 0; i< TAG_HIDDEN_DIM; i++)
        {
            vector<cnn::real> temp_R_example_rep;
            vector<cnn::real> sw(INPUT_DIM);
            for(unsigned j = 0; j< INPUT_DIM; j++)
                sw[j] = param_tW_values(i,j);
            computeLRP(R_i_output[i], sw, example_rep_values, param_tb_values[i], temp_R_example_rep);
            for(unsigned j = 0; j< INPUT_DIM; j++)
                R_example_rep[j] += temp_R_example_rep[j];
        }
        /*copy(R_example_rep.begin(), R_example_rep.end(), ostream_iterator<cnn::real>(cerr, " "));
        cerr<< endl;*/
        //Step 4: Get R_title_exps, using Equations (12) to Equations (16)
        //Expression example_rep = average(title_exps);
        vector<vector<cnn::real> > title_exps_values(title_exps.size()), R_title_exps(title_exps.size());
        for(unsigned i = 0; i< title_exps.size(); i++)
        {
            title_exps_values[i] = as_vector(title_exps[i].value());
            R_title_exps[i].resize(INPUT_DIM, 0.0);
        }
        for(unsigned i = 0; i< INPUT_DIM; i++)
        {
            vector<cnn::real> s(title_exps.size());
            for(unsigned j = 0; j< title_exps.size(); j++)
                s[j] = title_exps_values[j][i];
            vector<cnn::real> temp_R_s(title_exps.size());
            compuateLRPforSum(R_example_rep[i], s, temp_R_s);
            for(unsigned j = 0; j< title_exps.size(); j++)
                R_title_exps[j][i] += temp_R_s[j];
        }
        /*for(unsigned i = 0; i< title_exps.size(); i++) //这个地方把标题的每一维度加起来可以实现得到每个标题的相关性
        {
            copy(R_title_exps[i].begin(), R_title_exps[i].end(), ostream_iterator<cnn::real>(cerr, " "));
            cerr<< endl;
        }*/
        //Step 5: Get R_i_words
        size_t real_title_index = 0, title_col_index = 0;
        unordered_map<unsigned, vector<cnn::real> > R_words;
        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            vector<unsigned> selected_words; //选中的词

            for (unsigned t = 0; t < insent.size(); ++t)
            {
                if(insent[t] != kUNK)
                    selected_words.push_back(insent[t]);
            }
            if(selected_words.size() > 1 )
            {
                vector<Expression>& i_words  = title_words[real_title_index];
                Expression& current_col = title_cols[title_col_index];
                //title_exps.push_back( sum_cols(tanh(kmh_ngram(concatenate_cols(i_words), 2))) );
                //title_exps -> sum_cols
                //title_exps[real_title_index][i] = sum_j(current_col[i,j])
                auto current_col_values = *(current_col.value());
                assert(current_col_values.cols() == i_words.size() -1);
                vector<vector<cnn::real> > R_current_col(INPUT_DIM);
                unsigned num_cols = current_col_values.cols(); //列数
                for(size_t row_index = 0; row_index < INPUT_DIM; row_index++)
                {
                    vector<cnn::real> s(num_cols);
                    for(unsigned col_index = 0; col_index < num_cols ; col_index++)
                        s[col_index] = current_col_values(row_index, col_index);
                    vector<cnn::real> temp_R_s(num_cols);
                    compuateLRPforSum(R_title_exps[real_title_index][row_index], s, temp_R_s);
                    R_current_col[row_index] = temp_R_s;
                }
                //sum->kmh_ngram->i_words
                vector<vector<cnn::real> > i_words_values(i_words.size()), R_i_words(i_words.size());
                for(unsigned i = 0; i< i_words.size(); i++)
                {
                    i_words_values[i] = as_vector(i_words[i].value());
                    R_i_words[i].resize(INPUT_DIM, 0.0);
                }
                unsigned ngram = 2;
                for(size_t row_index = 0; row_index < INPUT_DIM; row_index++)
                {
                    for(size_t col_index = 0; col_index < num_cols-ngram+1; col_index++)    
                    {
                        vector<cnn::real> s(ngram);
                        for(unsigned ngram_index = 0; ngram_index < ngram; ngram_index++)
                            s[ngram_index] = i_words_values[col_index + ngram_index][row_index];
                        vector<cnn::real> temp_R_s(ngram);
                        compuateLRPforSum(R_current_col[row_index][col_index], s, temp_R_s);
                        for(unsigned ngram_index = 0; ngram_index < ngram; ngram_index++)
                            R_i_words[col_index+ngram_index][row_index] += temp_R_s[ngram_index];
                    }
                }
                //加到每个词的身上
                for(unsigned i = 0; i< R_i_words.size(); i++)
                {
                    unsigned word = selected_words[i];
                    auto iter = R_words.find(word);
                    if(iter  == R_words.end())
                    {
                        R_words[word] = R_i_words[i];
                    }
                    else {
                        for(unsigned j = 0; j<INPUT_DIM; j++)
                            iter->second[j] += R_i_words[i][j];
                    }
                }
                
                real_title_index ++;
                title_col_index++;
            }
            else if(selected_words.size()> 0) {
                //title_exps.push_back(average(i_words));
                vector<Expression>& i_words  = title_words[real_title_index];
                vector<vector<cnn::real> > i_words_values(i_words.size()), R_i_words(i_words.size());
                for(unsigned i = 0; i< i_words.size(); i++)
                {
                    i_words_values[i] = as_vector(i_words[i].value());
                    R_i_words[i].resize(INPUT_DIM, 0.0);
                }
                for(unsigned i = 0; i< INPUT_DIM; i++)
                {
                    vector<cnn::real> s(i_words.size());
                    for(unsigned j = 0; j< i_words.size(); j++)
                        s[j] = i_words_values[j][i];
                    vector<cnn::real> temp_R_s(i_words.size());
                    compuateLRPforSum(R_title_exps[real_title_index][i], s, temp_R_s);
                    for(unsigned j = 0; j< i_words.size(); j++)
                        R_i_words[j][i] += temp_R_s[j];
                }
                //加到每个词的身上
                for(unsigned i = 0; i< R_i_words.size(); i++)
                {
                    unsigned word = selected_words[i];
                    auto iter = R_words.find(word);
                    if(iter  == R_words.end())
                    {
                        R_words[word] = R_i_words[i];
                    }
                    else {
                        for(unsigned j = 0; j<INPUT_DIM; j++)
                            iter->second[j] += R_i_words[i][j];
                    }
                }
                real_title_index ++;
            }
        }
        //6, Get sum of R_words for each word according to equation 17
        vector<pair<unsigned, cnn::real> > R_sum_words;
        for(auto& item: R_words)
        {
            auto& scores = item.second;
            cnn::real sum_score = 0;
            for(auto& score: scores)
                sum_score += score;
            R_sum_words.push_back(make_pair(item.first, sum_score));    
        }
        sort(R_sum_words.begin(), R_sum_words.end(), PairCmp<unsigned, cnn::real>());
        for(auto& item: R_sum_words)
        {
            cerr<< word_dict.Convert(item.first) << "\t" << item.second << endl;
        }
        cerr<< "===" << endl;
        return output_h;
    }
};


bool IsCurrentPredictionCorrection(ComputationGraph& cg, int y_true) {
    auto v = as_vector(cg.incremental_forward());
    assert(v.size() > 1);
    int besti = 0;
    double best = v[0];
    for (unsigned i = 1; i < v.size(); ++i)
        if (v[i] > best) {
            best = v[i];
            besti = i;
        }
    if(verbose)
    {
        cerr<<"prob: ";
        copy(v.begin(), v.end(), ostream_iterator<double>(cerr, " "));
        cerr<<endl;
    }
    return (besti == y_true);
}
Expression HingeLoss(const Expression& y_pred, int y_true) {
    Expression hl = hinge(y_pred, y_true, 10.0f);
    return hl;
}

Expression CrossEntropyLoss(const Expression& y_pred, int y_true) {
    Expression lp = log_softmax(y_pred);
    Expression nll = -pick(lp, y_true);
    return nll;
}


bool ReadExample(ifstream& fin, Example& example)
{
    string label_str,line;
    int num_titles;
    if(!getline(fin, line)) return false;
    istringstream sin(line);
    sin>>label_str>>num_titles;
    //cout<<label_str<<", "<<num_titles<<endl;
    if(label_str=="+1") example.ylabel = 1;
    else example.ylabel = 0;
    example.words.resize(num_titles);

    for(int i = 0; i< num_titles; i++)
    {
        if(!getline(fin, line))
            return false;
        istringstream wsin(line);
        string word;
        while(wsin>>word)
            example.words[i].push_back(word);
    }
    return true;
    //copy(data.begin(), data.end(), ostream_iterator<double>(cout, " "));
    //cout<<endl;
}


int main(int argc, char** argv) {
    cnn::Initialize(argc, argv, 4);
    if (argc != 5 && argc != 6) {
        cerr << "Usage: " << argv[0] << " code vec train dev [model.params]\n";
        return 1;
    }
    kSOS = word_dict.Convert("<s>");
    kEOS = word_dict.Convert("</s>");
    kUNK = word_dict.Convert("|unk|");

    string stock_code = argv[1];
    vector<Example> training_examples, dev_examples;

    int tlc = 0;
    int ttoks = 0;
    cerr << "Reading Pretrained Word Vectors ... " << argv[2] << endl;
    ReadEmbeddings(argv[2]);

    cerr << "Reading training data from " << argv[3] << "...\n";

    ReadCorpus(argv[3], training_examples, word_dict, tlc, ttoks, true, 1);
    cerr << tlc << " lines, " << ttoks << " tokens, " << word_dict.size() << " types\n";
    INPUT_VOCAB_SIZE = word_dict.size();

    int dlc = 0;
    int dtoks = 0;
    cerr << "Reading dev data from " << argv[4] << "...\n";
    ReadCorpus(argv[4], dev_examples, word_dict, dlc, dtoks, false, 0);
    cerr << dlc << " lines, " << dtoks << " tokens\n";

    ostringstream os;
    os << stock_code<<".hier.avg"
       << '_' << INPUT_DIM
       << '_' << TAG_HIDDEN_DIM
       << '_' << pdrop;

    const string fname = os.str();
    cerr << "Parameters will be written to: " << fname << endl;
    double best = 0;

    Model model;
    bool use_momentum = false;
    Trainer* sgd = nullptr;
    if (use_momentum)
        sgd = new MomentumSGDTrainer(&model);
    //sgd = new AdagradTrainer(&model);
    else
        sgd = new SimpleSGDTrainer(&model, 1e-4);
    //sgd = new SimpleSGDTrainer(&model);

    TitleEncoder titleEncoder(model);

    if(argc == 6)
    {
        string fname = argv[5];
        ifstream in(fname);
        boost::archive::text_iarchive ia(in);
        ia >> model;

        double dcorr = 0;
        double dloss = 0;
        eval = true;
        //verbose = true;
        int dev_index = 0;
        for (auto& sent : dev_examples) {
            dev_index ++;
            const int y = sent.ylabel;
            ComputationGraph cg;
            //cerr<< "begin " << dev_index << endl;
            Expression y_pred =  titleEncoder.buildLRPGraph(cg, sent);
            if (IsCurrentPredictionCorrection(cg, y)) {
                dcorr++;
                cerr<< dev_index << " "<< y <<" "<<y<< endl;
            }
            else {
                cerr<< dev_index <<" " << y <<" "<<1-y << endl;
            }
            CrossEntropyLoss(y_pred, y);
            //cerr << "DEVLINE: " << dtags << endl;
            dloss += as_scalar(cg.incremental_forward());
        }
        cerr<<"Loss:"<< dloss/ dev_examples.size() << endl;
        cerr<<"Accuracy:"<< dcorr <<"/" << dev_examples.size()<<" "<< dcorr/dev_examples.size() << endl;
        return 0;
    }

    //unsigned report_every_i = min(100, int(training_examples.size()));
    unsigned report_every_i = int(training_examples.size());
    //unsigned si = training_examples.size();
    unsigned si = 1000;
    vector<unsigned> order(training_examples.size());
    for (unsigned i = 0; i < order.size(); ++i) order[i] = i;

    bool first = true;
    int report = 0;
    unsigned lines = 0;
    while(1) {//you should kill the program by hand during training
        Timer iteration("completed in");
        double loss = 0;
        for (unsigned i = 0; i < report_every_i; ++i) {
            //if (si == training_examples.size()) {
            if (si == 1000) {
                si = 0;
                if (first) {
                    first = false;
                }
                else {
                    sgd->update_epoch();
                }
                cerr << "**SHUFFLE\n";
                shuffle(order.begin(), order.end(), *rndeng);
                cerr << "**finish shuffle\n";
            }
            if(order[si] == 0)
                verbose = true;
            else
                verbose = false;

            // build graph for this instance
            ComputationGraph cg;
            auto& sentx_y = training_examples[order[si]];
            const int y = sentx_y.ylabel;
            //cerr << "LINE: " << order[si] << endl;
            Expression y_pred = titleEncoder.buildGraph(cg, sentx_y);
            CrossEntropyLoss(y_pred, y);
            loss += as_scalar(cg.forward());
            cg.backward();
            sgd->update(1.0);
            ++si;
            ++lines;
        }
        sgd->status();
        cerr << " E = " << (loss / lines) <<" ";

        // show score on dev data?
        report++;
        if (1) {
            double dloss = 0;
            double dcorr = 0;
            eval = true;
            for (auto& sent : dev_examples) {
                const int y = sent.ylabel;
                ComputationGraph cg;
                Expression y_pred =  titleEncoder.buildGraph(cg, sent);
                if (IsCurrentPredictionCorrection(cg, y)) dcorr++;
                CrossEntropyLoss(y_pred, y);
                dloss += as_scalar(cg.incremental_forward());
            }
            double acc = dcorr / dev_examples.size();
            if (acc >= best) {
                best = acc;
                ofstream out(fname);
                boost::archive::text_oarchive oa(out);
                oa << model;
            }
            cerr << "\n***DEV [epoch=" << (lines / (double)training_examples.size()) << "] E = " << (dloss / dev_examples.size())  << " acc=" << acc << ' '<<endl;
        }
        eval = false;
    }
    delete sgd;
}

