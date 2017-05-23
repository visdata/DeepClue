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

cnn::real pdrop = 0.5;
bool eval = false;
bool verbose = false;
unsigned INPUT_DIM = 64;
unsigned HIDDEN_DIM = 150;

unsigned INPUT_VOCAB_SIZE = 0;

cnn::Dict word_dict;

int kSOS;
int kEOS;
int kUNK;
int kNUM; //新加的用来表示数字

unordered_map<string, vector<cnn::real> > pretrained_embeddings;
vector<cnn::real> averaged_vec;

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
    float ylabel;
    float fraction;
    float open;
    float close;
    string date;
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
        cnn::real value;
        vector<cnn::real> vecs;
        cnn::real sum = 0.000001;
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
        word_dict.Convert(word);
    }
    fin.close();
    cnn::real sum = 0.000001;
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
                int cut_off = 3)
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
        std::vector<pair<string, float>> pairs;


        unordered_map<string, float> tf_counts;
        unordered_map<string, float> idf_counts;
        int total_titles = 0;
        for(unsigned sent_index = 0; sent_index < examples.size(); sent_index++)
        {
            auto& example = examples[sent_index];
            int num_titles = example.words.size();
            total_titles += num_titles;
            for(int title_index = 0; title_index < num_titles; title_index++)
            {
                unordered_map<string, float> temp_idf_counts;
                for(unsigned word_index = 0; word_index < example.words[title_index].size(); word_index++)
                {
                    const string& word = example.words[title_index][word_index];
                    tf_counts[word]++;
                    temp_idf_counts[word] = 1;
                }
                for(auto& item: temp_idf_counts)
                {
                    idf_counts[item.first]++;
                }
            }
        }
        for(auto& item: tf_counts)
        {
            float tf = item.second;
            float idf = idf_counts[item.first];
            //float tf_idf = (1.0 + std::log(tf)) * std::log( example.words.size()/idf );
            float tf_idf = (1.0 + std::log(tf)) * std::log( total_titles/idf );
            pairs.push_back(make_pair(item.first, tf_idf));
        }
        sort(pairs.begin(), pairs.end(), PairCmp<string, float>());
        /*for(auto p: pairs)
        {
            //cerr<< p.first << "\t" << p.second  << "\t" << tf_counts[p.first] << "\t" << idf_counts[p.first] << "\t" << example.words.size() << endl;
            cerr<< p.first << "\t" << p.second  << "\t" << tf_counts[p.first] << "\t" << idf_counts[p.first] << "\t" << total_titles << endl;
        }*/
        //int rank = pairs.size() * 0.4; //save 40% words
        int rank = pairs.size() * 0.4; //save 40% words
        float survive_value  =  pairs[rank].second;
        int remaining_tokens = 0, remaining_types = 0;
        for(auto iter = pairs.begin(); iter != pairs.end(); iter++)
        {
            if(iter->second > survive_value)
                //if(iter->second >= survive_value)
            {
                word_dict.Convert(iter->first);
                remaining_tokens += iter->second;
                remaining_types++;
            }
        }
        cerr<<"[LOG] After Pruning there are "<<  remaining_tokens << " words and " << remaining_types<< " types."<<endl;
        cerr<<"[LOG] WordDict Size: "<< word_dict.size() << endl;
        //word_dict.Freeze();
        //word_dict.SetUnk("|unk|");
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
void computeLRP(cnn::real Rf, const vector<cnn::real>& w, const vector<cnn::real>& s, cnn::real b, vector<cnn::real>& Rs, cnn::real& Rb)
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
    Rb = Rf * b / sum; 
}
void computeLRPforSum(float Rf, const vector<cnn::real>& s, vector<cnn::real>& Rs)
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

    vector<Parameters*> p_output_w;
    vector<Parameters*> p_output_b;

    vector<Parameters*> p_res_w;

    Parameters* p_fed_o;
    Parameters* p_fed_o_b;

    int layers;
    explicit TitleEncoder(Model& model): layers(1)
    {
        p_word = model.add_lookup_parameters(INPUT_VOCAB_SIZE, {INPUT_DIM});

        p_output_w.resize(layers);
        p_output_b.resize(layers);
        p_res_w.resize(layers);
        for(int i = 0; i< layers; i++)
        {
            p_output_w[i] = model.add_parameters({HIDDEN_DIM, INPUT_DIM});
            p_output_b[i] = model.add_parameters({HIDDEN_DIM});
            p_res_w[i] = model.add_parameters({INPUT_DIM, HIDDEN_DIM});
        }

        p_fed_o = model.add_parameters({1, INPUT_DIM});
        p_fed_o_b = model.add_parameters({1}, 0.01);

        for( size_t  word_index = 0; word_index <  INPUT_VOCAB_SIZE; word_index++)
        {
            auto word_iter = pretrained_embeddings.find( word_dict.Convert(word_index) );
            if(word_iter != pretrained_embeddings.end())
            {
                ((LookupParameters*)p_word)->Initialize(word_index, word_iter->second);
            }
        }
        ((LookupParameters*)p_word)->Initialize(kUNK, averaged_vec);
        ((LookupParameters*)p_word)->Initialize(kNUM, averaged_vec);
    }

    Expression buildLRPGraph(ComputationGraph&cg, const Example& example)
    {
        assert(eval);
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
                Expression i_word_t;




                i_word_t = lookup(cg, p_word, insent[t]);
                if (!eval) {
                    i_word_t = dropout(i_word_t, pdrop);
                }
                //if(insent[t] != kUNK)//this way better
                if(insent[t] != kUNK && insent[t] != kNUM && word_dict.Convert("-")!=insent[t] && word_dict.Convert("'s")!=insent[t])//this way better
                {
                    i_words.push_back(i_word_t);
                }
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
        if(!eval)
        {
            for(size_t title_index = 0; title_index < title_exps.size(); title_index++)
            {
                title_exps[title_index] = block_dropout(title_exps[title_index], pdrop);
            }
        }
        //这个地方用得到每个title_exps的
        Expression example_rep = average(title_exps);
        vector<Expression> param_tW(layers), param_tb(layers), param_resW(layers);
        for(int i = 0; i< layers; i++)
        {
            param_tW[i] = parameter(cg, p_output_w[i]);
            param_tb[i] = parameter(cg, p_output_b[i]);
            param_resW[i] = parameter(cg, p_res_w[i]);
        }
        //Dropout可以不用管
        if(!eval)
            example_rep = dropout(example_rep, pdrop);
        vector<Expression> example_reps, example_rep_temps; 
        example_reps.push_back(example_rep);

        for(int i = 0; i < layers; i++)
        {
            Expression example_rep_temp = tanh(param_tW[i] * example_rep + param_tb[i]);
            example_rep_temps.push_back(example_rep_temp);
            
            example_rep = param_resW[i] * example_rep_temp + example_rep;
            example_reps.push_back(example_rep);
        }
        Expression i_output = example_rep;
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
        auto feature_vector  = as_scalar(cg.incremental_forward());
        cnn::real final_r_f = feature_vector; //预测涨的相关性, 如果final_r_f 大于0， 那么就预测涨
        //cerr<<"final_f: " << final_r_f  << "\t" << feature_vector[1]<< endl;

        //Step 2: Get R_i_output
        auto param_ob_value = as_scalar(param_ob.value());
        auto param_oW_values = *(param_oW.value());
        auto i_output_values = as_vector(i_output.value());
        /*
        cnn::real sum = b_values[1];
        for(int i = 0; i< HIDDEN_DIM; i++)
            sum += param_oW_values(1, i) * i_output_values[i];
        cerr<<"comp: " << sum << "\t" << feature_vector[1] << endl; //几乎相等了
        */
        vector<cnn::real> w(INPUT_DIM);
        for(unsigned i = 0; i< INPUT_DIM; i++)
            w[i] = param_oW_values(0,i);
        vector<cnn::real> R_i_output;
        computeLRP(final_r_f, w, i_output_values, param_ob_value, R_i_output);
        /*copy(R_i_output.begin(), R_i_output.end(), ostream_iterator<cnn::real>(cerr, " "));
        cerr<< endl;*/
        //Step 2.5; Get R_example_rep final
        auto example_rep_final_values = as_vector(example_reps.back().value());

        auto example_rep_input_values = as_vector(example_reps[0].value());
        auto example_rep_temp_values = as_vector(example_rep_temps.back().value());
        auto param_resW_values = *(param_resW[0].value());

        vector<cnn::real> R_example_rep(INPUT_DIM, 0);
        vector<cnn::real> R_example_rep_tanh(HIDDEN_DIM, 0);
        for(unsigned i = 0; i< INPUT_DIM; i++)
        {
            vector<cnn::real> temp_R_example_rep;
            vector<cnn::real> sw(HIDDEN_DIM);
            for(unsigned j = 0; j< HIDDEN_DIM; j++)
                sw[j] = param_resW_values(i,j);
            //also need to compute b
            computeLRP(R_i_output[i], sw, example_rep_temp_values, example_rep_input_values[i], temp_R_example_rep, R_example_rep[i]);
            for(unsigned j = 0; j< HIDDEN_DIM; j++)
                R_example_rep_tanh[j] += temp_R_example_rep[j];
        }
        //Step 3: Accumulate R_example_rep input
        auto param_tW_values = *(param_tW[0].value());
        auto param_tb_values = as_vector(param_tb[0].value());
        for(unsigned i = 0; i< HIDDEN_DIM; i++)
        {
            vector<cnn::real> temp_R_example_rep;
            vector<cnn::real> sw(INPUT_DIM);
            for(unsigned j = 0; j< INPUT_DIM; j++)
                sw[j] = param_tW_values(i,j);
            computeLRP(R_example_rep_tanh[i], sw, example_rep_input_values, param_tb_values[i], temp_R_example_rep);
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
            computeLRPforSum(R_example_rep[i], s, temp_R_s);
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
                //if(insent[t] != kUNK)
                if(insent[t] != kUNK && insent[t] != kNUM && word_dict.Convert("-")!=insent[t] && word_dict.Convert("'s")!=insent[t])//this way better
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
                    computeLRPforSum(R_title_exps[real_title_index][row_index], s, temp_R_s);
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
                        computeLRPforSum(R_current_col[row_index][col_index], s, temp_R_s);
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
                    computeLRPforSum(R_title_exps[real_title_index][i], s, temp_R_s);
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
        float p_sum = 0.0, n_sum = 0.0, p_count = 0, n_count = 0;
        for(auto& item: R_sum_words)
        {
            cerr<< word_dict.Convert(item.first) << "\t" << item.second << endl;
            if(item.second < 0)
            {
                n_count ++;
                n_sum += item.second;
            }
            else if(item.second >0){
                p_count ++;
                p_sum += item.second;
            }
        }
        cerr<< "["<< p_count << "\t" << n_count << ", "<< p_sum << "\t" << n_sum << "]" << endl;
        cerr<< "===" << endl;
        return output_h;
    }
};

bool ReadExample(ifstream& fin, Example& example)
{
    string line;
    float open_price, close_price, fraction;
    int num_titles;
    string date;
    if(!getline(fin, line)) return false;
    istringstream sin(line);
    sin>>fraction>>num_titles>>open_price>>close_price>>date;
    //cout<<label_str<<", "<<num_titles<<endl;
    example.ylabel = fraction * 100;
    example.fraction = fraction;
    example.open = open_price;
    example.close = close_price;
    example.date = date;
    example.words.resize(num_titles);

    for(int i = 0; i< num_titles; i++)
    {
        if(!getline(fin, line))
            return false;
        istringstream wsin(line);
        string word;
        while(wsin>>word)
        {
            if(word == "|||") break;
            example.words[i].push_back(word);
        }
    }
    return true;
    //copy(data.begin(), data.end(), ostream_iterator<cnn::real>(cout, " "));
    //cout<<endl;
}


int main(int argc, char** argv) {
    cerr<<"Command: ";
    for(int i = 0; i< argc; i++)
        cerr<<argv[i]<<" ";
    cerr<<endl;

    cnn::Initialize(argc, argv, 4);

    if (argc != 5 && argc != 6) {
        cerr << "Usage: " << argv[0] << " code vec train dev [model.params]\n";
        return 1;
    }
    kSOS = word_dict.Convert("<s>");
    kEOS = word_dict.Convert("</s>");
    kUNK = word_dict.Convert("|unk|");
    kNUM = word_dict.Convert("<num>"); //number

    string stock_code = argv[1];
    vector<Example> training_examples, dev_examples;

    int tlc = 0;
    int ttoks = 0;
    cerr << "Reading Pretrained Word Vectors ... " << argv[2] << endl;
    ReadEmbeddings(argv[2]);
    word_dict.Freeze();
    word_dict.SetUnk("|unk|");

    cerr << "Reading training data from " << argv[3] << "...\n";

    ReadCorpus(argv[3], training_examples, word_dict, tlc, ttoks, true, 1);
    cerr << tlc << " lines, " << ttoks << " tokens, " << word_dict.size() << " types\n";
    int pos_count = 0;
    for(auto& example: training_examples)
        pos_count+= (example.ylabel >= 0);
    cerr<< "Total Training Examples: " << training_examples.size() << endl;
    cerr<< "Positive Training Examples: " << pos_count << " " << pos_count/(float)training_examples.size() << endl;
    cerr<< "Negative Training Examples: " << training_examples.size() - pos_count << " "<< 1.0 - pos_count /(float)training_examples.size() << endl;
    INPUT_VOCAB_SIZE = word_dict.size();

    int dlc = 0;
    int dtoks = 0;
    cerr << "Reading dev data from " << argv[4] << "...\n";
    ReadCorpus(argv[4], dev_examples, word_dict, dlc, dtoks, false, 0);
    cerr << dlc << " lines, " << dtoks << " tokens\n";
    int pos_dev_count = 0;
    for(auto& example: dev_examples)
        pos_dev_count+= (example.ylabel >=0);
    cerr<< "Total Dev Examples: " << dev_examples.size() << endl;
    cerr<< "Positive DEV Examples: " << pos_dev_count << " " << pos_dev_count/(float)dev_examples.size() << endl;
    cerr<< "Negative DEV Examples: " << dev_examples.size() - pos_dev_count << " "<< 1.0 - pos_dev_count /(float)dev_examples.size() << endl;

    ostringstream os;
    os << stock_code<<".hier.avg"
       << '_' << INPUT_DIM
       << '_' << HIDDEN_DIM
       << '_' << pdrop << "_pid." << getpid();

    const string fname = os.str();
    cerr << "Parameters will be written to: " << fname << endl;

    Model model;
    bool use_momentum = true;
    Trainer* sgd = nullptr;
    if (use_momentum)
    {
        //sgd = new MomentumSGDTrainer(&model);
        sgd = new MomentumSGDTrainer(&model, 1e-4, 0.01);
        sgd->eta_decay = 0.05;
        //sgd = new AdagradTrainer(&model);
    }
    else
        sgd = new SimpleSGDTrainer(&model, 1e-4);
    //sgd = new SimpleSGDTrainer(&model);
    //sgd->clipping_enabled = false;

    TitleEncoder titleEncoder(model);

    if(argc == 6)
    {
        string fname = argv[5];
        ifstream in(fname);
        boost::archive::text_iarchive ia(in);
        ia >> model;

        cnn::real dloss = 0;
        eval = true;
        //verbose = true;
        int dev_index = 0;
        for (auto& sent : dev_examples) {
            dev_index ++;
            auto y = sent.ylabel;
            ComputationGraph cg;
            cerr<< "[log]: "<<(dev_index+1) << "\t" << sent.words.size() << "\t" << sent.ylabel << endl;
            //cerr<< "begin " << dev_index << endl;
            Expression y_pred =  titleEncoder.buildLRPGraph(cg, sent);
            //cerr << "DEVLINE: " << dtags << endl;
            dloss += as_scalar(cg.incremental_forward());
        }
        return 0;
    }

    delete sgd;
}

