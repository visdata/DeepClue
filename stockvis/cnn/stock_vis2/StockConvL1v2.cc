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
//unsigned HIDDEN_DIM = 300;

unsigned INPUT_VOCAB_SIZE = 0;

cnn::Dict word_dict;

int kSOS;
int kEOS;
int kUNK;
int kNUM;

unordered_map<string, vector<cnn::real> > pretrained_embeddings;
vector<cnn::real> averaged_vec;
float predicted_value = 0;

template<class T>
struct PairCmp
{
    bool operator()(const pair<string, T>& a, const pair<string, T>& b)
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
    cerr<<"[LOG] WordDict Size: "<< word_dict.size() << endl;
    word_dict.Freeze();
    word_dict.SetUnk("|unk|");
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
        sort(pairs.begin(), pairs.end(), PairCmp<float>());
        /*for(auto p: pairs)
        {
            //cerr<< p.first << "\t" << p.second  << "\t" << tf_counts[p.first] << "\t" << idf_counts[p.first] << "\t" << example.words.size() << endl;
            cerr<< p.first << "\t" << p.second  << "\t" << tf_counts[p.first] << "\t" << idf_counts[p.first] << "\t" << total_titles << endl;
        }*/
        int rank = pairs.size() * 0.4; //save 40% words
        float survive_value  =  pairs[rank].second;
        int remaining_tokens = 0, remaining_types = 0;
        for(auto iter = pairs.begin(); iter != pairs.end(); iter++)
        {
            if(iter->second > survive_value)
            {
                word_dict.Convert(iter->first);
                remaining_tokens += iter->second;
                remaining_types++;
            }
        }
        //}
        cerr<<"[LOG] After Pruning there are "<<  remaining_tokens << " words and " << remaining_types<< " types."<<endl;
        cerr<<"[LOG] WordDict Size: "<< word_dict.size() << endl;
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

struct ConvLayer {
    // in_rows = rows per word in input matrix
    // k_fold_rows = 1 no folding, 2 fold two rows together, 3 ...
    // filter_width = length of filter (columns)
    // in_nfmaps = number of feature maps in input
    // out_nfmaps = number of feature maps in output
    ConvLayer(Model&m, int in_rows, int k_fold_rows, int filter_width, int in_nfmaps, int out_nfmaps) :
        p_filts(in_nfmaps),
        p_fbias(in_nfmaps),
        k_fold_rows(k_fold_rows) {
        if (k_fold_rows < 1 || ((in_rows / k_fold_rows) * k_fold_rows != in_rows)) {
            cerr << "Bad k_fold_rows=" << k_fold_rows << endl;
            abort();
        }
        for (int i = 0; i < in_nfmaps; ++i) {
            p_filts[i].resize(out_nfmaps);
            p_fbias[i].resize(out_nfmaps);
            for (int j = 0; j < out_nfmaps; ++j) {
                p_filts[i][j] = m.add_parameters({(unsigned)in_rows, (unsigned)filter_width}, 1.0);
                p_fbias[i][j] = m.add_parameters({(unsigned)in_rows}, 0.0001);
            }
        }
    }

    vector<Expression> apply(ComputationGraph& cg, const vector<Expression>& inlayer, int k_out){
        const unsigned out_nfmaps = p_filts.front().size();
        const unsigned in_nfmaps = p_filts.size();
        if (in_nfmaps != inlayer.size()) {
            cerr << "Mismatched number of input features (" << inlayer.size() << "), expected " << in_nfmaps << endl;
            abort();
        }
        vector<Expression> r(out_nfmaps);
        bool needAdd = (p_params.size() == 0 );

        vector<Expression> tmp(in_nfmaps);
        for (unsigned fj = 0; fj < out_nfmaps; ++fj) {
            for (unsigned fi = 0; fi < in_nfmaps; ++fi) {
                Expression p_fij = parameter(cg, p_filts[fi][fj]);
                if(needAdd)
                    p_params.push_back(p_fij);
                Expression kmh_fi = conv1d_narrow(inlayer[fi], p_fij);
                //Expression t = conv1d_wide(inlayer[fi], parameter(cg, p_filts[fi][fj]));
                //Expression t = conv1d_narrow(inlayer[fi], parameter(cg, p_filts[fi][fj]));
                //t = colwise_add(t, parameter(cg, p_fbias[fi][fj]));
                //Expression in_fi = concatenate_cols(inlayer[fi]);
                //Expression kmh_fi = tanh(inlayer[fi]);
                //Expression kmh_fi = kmh_ngram(inlayer[fi], 2);
                tmp[fi] = tanh(kmh_fi);
                //tmp[fi] = tanh(t);
                //Expression kmh_exp = kmh_ngram(concatenate_cols(i_words), 2);
                //Expression non_linear_input = tanh(kmh_exp);
                //title_exps.push_back( sum_cols(non_linear_input) );
            }
            Expression s = sum(tmp);
            if (k_fold_rows > 1)
                s = fold_rows(s, k_fold_rows);
            //s = kmax_pooling(s, 1);
            //s = kmax_pooling(s, k_out);
            //r[fj] = rectify(s);
            //r[fj] = tanh(s);
            //s = tanh(s);
            //s = rectify(s);
            s = sum_cols(s);
            r[fj] = s;
        }
        return r;
    }
    void clear(){
        p_params.clear();
    }
    vector<vector<Parameters*>> p_filts; // [feature map index from][feature map index to]
    vector<vector<Parameters*>> p_fbias; // [feature map index from][feature map index to]
    vector<Expression> p_params;
    int k_fold_rows;
};

struct WordConvNet {
    explicit WordConvNet(unsigned _input_dim, Model& m):
    INPUT_DIM(_input_dim),
    //ConvLayer(Model&m, int in_rows, int k_fold_rows, int filter_width, int in_nfmaps, int out_nfmaps) :
    cl1(m, INPUT_DIM, 1,  2, 1, 1)/*,
    cl2(m, INPUT_DIM/2, 1, 2, 4, 4)*/// 4 * (INPUT_DIM/2) * 2 
    {

    }

    Expression buildRep(ComputationGraph& cg, const vector<Expression>& vx, bool eval) {
        /*int k_2 = 2;
        int len = vx.size();
        int k_1 = max(k_2, len / 2);*/
        Expression s = concatenate_cols(vx);

        vector<Expression> l0(1, s);
        vector<Expression> l1 = cl1.apply(cg, l0, 1);
        //vector<Expression> l1 = cl1.apply(cg, l0, k_1);
        //vector<Expression> l2 = cl2.apply(cg, l1, k_2);
        //for(auto& fm : l2)
        //    fm = reshape(fm, {k_2 * INPUT_DIM / 2});
        //Expression t = concatenate(l2);
        assert(l1.size() == 1);
        Expression t = l1[0];
        //if (!eval)
        //    t = dropout(t, pdrop);
        return t;
    }
    unsigned INPUT_DIM;
    ConvLayer cl1;
    //ConvLayer cl2;
};

struct TitleConvNet {

    explicit TitleConvNet(unsigned _input_dim, Model& m):
    //ConvLayer(Model&m, int in_rows, int k_fold_rows, int filter_width, int in_nfmaps, int out_nfmaps) :
    INPUT_DIM(_input_dim),
    cl1(m, 4*INPUT_DIM, 1, 3, 1, 1)/*,
    cl2(m, 2*INPUT_DIM, 2, 2, 4, 4)*/// 4*INPUT_DIM 
    {

    }

    Expression buildRep(ComputationGraph& cg, const vector<Expression>& vx, bool eval) {
        //int k_2 = 1;
        //int len = vx.size();
        //int k_1 = max(k_2, len / 2);
        Expression s = concatenate_cols(vx);

        vector<Expression> l0(1, s);
        vector<Expression> l1 = cl1.apply(cg, l0, 1);
        //vector<Expression> l1 = cl1.apply(cg, l0, k_1);
        //vector<Expression> l2 = cl2.apply(cg, l1, k_2);
        //for(auto& fm : l2)
        //    fm = reshape(fm, {k_2 * INPUT_DIM});
        //Expression t = concatenate(l2);
        assert(l1.size() == 1);
        Expression t = l1[0];
        //if (!eval)
        //    t = dropout(t, pdrop);
        return t;
    }
private:
    unsigned INPUT_DIM;
    ConvLayer cl1;
    //ConvLayer cl2;
};

struct TitleEncoder {
    LookupParameters* p_word;  //
    WordConvNet wordConvNet;
    //TitleConvNet titleConvNet;

    Parameters* p_output_w;
    Parameters* p_output_b;

    Parameters* p_fed_o;
    Parameters* p_fed_o_b;
    Parameters* p_res_w;

    explicit TitleEncoder(Model& model):
        wordConvNet(INPUT_DIM, model)/*,
        titleConvNet(INPUT_DIM, model)*/
    {
        p_word = model.add_lookup_parameters(INPUT_VOCAB_SIZE, {INPUT_DIM});

        //p_output_w = model.add_parameters({1, 4*INPUT_DIM});
        //p_output_b = model.add_parameters({1}, 0.0001);
        
        p_output_w = model.add_parameters({HIDDEN_DIM, INPUT_DIM});
        p_output_b = model.add_parameters({HIDDEN_DIM});
        p_res_w = model.add_parameters({INPUT_DIM, HIDDEN_DIM});
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
    }
    Expression getL1NormOfVector(const Expression& i_word_t)
    {
        Expression l1_i_word_t = rectify(i_word_t) + rectify(-i_word_t);
        l1_i_word_t = sum_cols(transpose(l1_i_word_t));
        return l1_i_word_t;
    }
    Expression getL1NormOfMatrix(const Expression& paramW)
    {
        Expression l1_paramW = rectify(paramW) + rectify(-paramW);
        Expression col_sum = sum_cols(l1_paramW);
        Expression l1_paramW_sum = sum_cols(transpose(col_sum));
        return l1_paramW_sum;
    }

    Expression buildGraph(ComputationGraph&cg, const Example& example, float& cor)
    {
        vector<Expression> title_exps, l1_exprs;

        unordered_set<unsigned> input_word_sets;

        wordConvNet.cl1.clear();

        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            const unsigned slen = insent.size();

            vector<Expression> i_words;

            //bool output = false;
            for (unsigned t = 0; t < insent.size(); ++t)
            {
                if(insent[t] != kUNK && insent[t] != kNUM && word_dict.Convert("-")!=insent[t] && word_dict.Convert("'s")!=insent[t])//this way better
                {
                    //Expression i_word_t = lookup(cg,p_word,insent[t]);
                    Expression i_word_t = const_lookup(cg,p_word,insent[t]);
                    //collect l1
                    /*if(input_word_sets.find(insent[t]) == input_word_sets.end())
                    {
                        Expression l1_i_word_t = getL1NormOfVector(i_word_t);
                        l1_exprs.push_back(l1_i_word_t);
                        input_word_sets.insert(insent[t]);
                    }*/
                    //Expression i_word_t = const_lookup(cg,p_word,insent[t]);
                    if (!eval) {
                        i_word_t = dropout(i_word_t, pdrop);
                    }
                    i_words.push_back(i_word_t);
                }
            }
            //if(i_words.size() > 1 )
            if(i_words.size() > 3 )
            {
                Expression conv_title = wordConvNet.buildRep(cg, i_words, eval);
                title_exps.push_back( conv_title );
            }
            else if(i_words.size()> 0) {
                //cerr<<"haha" << endl;
                //title_exps.push_back(average(i_words));
            }    
        }
        assert(title_exps.size() > 0);
        if(!eval)
        {
            float tdrop = pdrop;
            for(size_t title_index = 0; title_index < title_exps.size(); title_index++)
            {
                title_exps[title_index] = block_dropout(title_exps[title_index], tdrop);
            }
        }
        //Expression example_rep = titleConvNet.buildRep(cg, title_exps, eval);
        Expression example_rep = average(title_exps);
        
        Expression param_tW = parameter(cg, p_output_w);
        Expression param_tb = parameter(cg, p_output_b);
        Expression param_resW = parameter(cg, p_res_w);

        Expression example_rep_temp = rectify(param_tW * example_rep + param_tb);
        example_rep = param_resW * example_rep_temp + example_rep;

        Expression param_oW = parameter(cg, p_fed_o);
        Expression param_ob = parameter(cg, p_fed_o_b);

        Expression output_h = param_oW * example_rep + param_ob;
        //Expression output_h = param_tW * example_rep + param_tb;
        if(eval)
        {
            float example_value = as_scalar(cg.incremental_forward());
            //for wl: return predicted_value, note here is not the fraction, it is the real predicted price
            predicted_value = example.open *( 1+example_value/100 );
            cerr<< example_value << "\t" << example.ylabel<<endl;
            if( example_value >=0 && example.ylabel>=0 )
            {
                cor++;
            }
            else if ( example_value <0 && example.ylabel < 0 )
            {
                cor++;
            }
        }
        if(verbose)
        {
            cg.incremental_forward();
            cerr<<example.fraction << " "<< as_scalar(output_h.value()) << endl;
            /*vector<float> example_rep_values = as_vector(example_rep.value());
            copy(example_rep_values.begin(), example_rep_values.end(), ostream_iterator<float>(cerr, " "));
            cerr<<endl;*/
        }
        Expression gold_y = input(cg, &example.ylabel);
        Expression output_loss1 = squared_distance(output_h, gold_y);

        Expression l1_param_tW = getL1NormOfMatrix(param_tW);
        Expression l1_param_tb = getL1NormOfVector(param_tb);
        Expression l1_param_resW = getL1NormOfMatrix(param_resW);
        Expression l1_param_oW = getL1NormOfMatrix(param_oW);
        Expression l1_param_ob = getL1NormOfVector(param_ob);
        
        l1_exprs.push_back(l1_param_tW);
        l1_exprs.push_back(l1_param_tb);
        l1_exprs.push_back(l1_param_resW);
        l1_exprs.push_back(l1_param_oW);
        l1_exprs.push_back(l1_param_ob);
        for(auto& p: wordConvNet.cl1.p_params)
            l1_exprs.push_back(getL1NormOfMatrix(p));
        
        float lambda_l1 = 1e-3;//1e-3; //1e-3;//0.5;//1e-1;
        Expression sum_l1_norm = lambda_l1 * sum(l1_exprs);

        //Expression output_loss = rectify(output_h - gold_y) + rectify(gold_y - output_h) + output_loss1;
        Expression output_loss = squared_distance(softsign(gold_y), softsign(output_h)) + sum_l1_norm;
        //Expression output_loss = squared_distance(gold_y, output_h) + sum_l1_norm;
        return output_loss;
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
            //if(word.size() >100) continue;
            example.words[i].push_back(word);
        }
    }
    return true;
    //copy(data.begin(), data.end(), ostream_iterator<cnn::real>(cout, " "));
    //cout<<endl;
}

void sampleExamples(vector<Example>& training_examples)
{
    vector<Example> newExamples;
    for(auto& example: training_examples)
    {
        if(example.words.size() > 10)
        {
            int repeat_times =  (int)(10 * cnn::rand01());
            //int repeat_times =  (int)(50 * cnn::rand01());
            for(int k = 0; k< repeat_times; k++)
            {
                Example new_example;
                new_example.ylabel = example.ylabel;
                int new_t = 0;
                for(size_t t = 0; t < example.words.size(); t++)
                {
                    if(cnn::rand01() < 0.5)
                    {
                        new_example.words.resize(new_t+1);
                        new_example.word_ids.resize(new_t+1);
                        new_example.words[new_t] = example.words[t];
                        //fixed a bug here: change new_t to t on the right
                        new_example.word_ids[new_t] = example.word_ids[t];
                        new_t ++;
                    }
                }
                newExamples.push_back(new_example);
            }
        }
    }
    training_examples.insert(training_examples.end(), newExamples.begin(), newExamples.end());
    //training_examples = newExamples;
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
    //exit(0);


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
       << '_' << pdrop << "_pid." << getpid();

    const string fname = os.str();
    cerr << "Parameters will be written to: " << fname << endl;
    cnn::real best = 0;

    Model model;
    bool use_momentum = true;
    Trainer* sgd = nullptr;
    if (use_momentum)
        //sgd = new MomentumSGDTrainer(&model);
        //sgd = new MomentumSGDTrainer(&model, 1e-4, 0.01);
        //sgd = new MomentumSGDTrainer(&model, 1e-4, 0.02);
        //sgd = new MomentumSGDTrainer(&model, 1e-4, 0.01);
        //sgd = new MomentumSGDTrainer(&model, 0.5, 0.01);
        sgd = new MomentumSGDTrainer(&model, 1e-3, 0.01);
    //sgd = new MomentumSGDTrainer(&model, 1e-3, 0.001);
    //sgd = new AdagradTrainer(&model);
    else
        sgd = new SimpleSGDTrainer(&model, 1e-4);
    //sgd = new SimpleSGDTrainer(&model);
    sgd->eta_decay = 0.05;
    //sgd->clipping_enabled = false;

    TitleEncoder titleEncoder(model);

    if(argc == 6)
    {
        string fname = argv[5];
        ifstream in(fname);
        boost::archive::text_iarchive ia(in);
        ia >> model;

        cnn::real dcorr = 0;
        cnn::real dloss = 0;
        eval = true;
        verbose = true;
        int dev_index = 0;
        for (auto& sent : dev_examples) {
            dev_index ++;
            auto y = sent.ylabel;
            ComputationGraph cg;
            //cerr<< "begin " << dev_index << endl;
            float ycorr = 0;
            Expression y_pred =  titleEncoder.buildGraph(cg, sent, ycorr);
            if (ycorr) {
                dcorr++;
                cerr<<  dev_index << " " << sent.date << " "<< y <<" "<<predicted_value << endl;
            }
            else {
                cerr<< "[WRONG] " << dev_index << " " << sent.date << " "<< y <<" "<<predicted_value << endl;
                //outputExample(sent);
            }
            //cerr << "DEVLINE: " << dtags << endl;
            dloss += as_scalar(cg.incremental_forward());
        }
        cerr<<"Loss:"<< dloss/ dev_examples.size() << endl;
        cerr<<"Accuracy:"<< dcorr <<"/" << dev_examples.size()<<" "<< dcorr/dev_examples.size() << endl;
        return 0;
    }

    //sampleExamples(training_examples);
    cerr<<"Training Examples: " << training_examples.size() << endl;

    unsigned report_every_i = min(1000, int(training_examples.size()));
    //unsigned report_every_i = int(training_examples.size());
    unsigned si = training_examples.size();
    //unsigned si = 1000;
    vector<unsigned> order(training_examples.size());
    for (unsigned i = 0; i < order.size(); ++i) order[i] = i;

    bool first = true;
    int report = 0;
    unsigned lines = 0;
    float tcor = 0;
    while(1) {//you should kill the program by hand during training
        Timer iteration("completed in");
        cnn::real loss = 0;
        for (unsigned i = 0; i < report_every_i; ++i) {
            if (si == training_examples.size()) {
                //if (si == 1000) {
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
            auto y = sentx_y.ylabel;
            if(si % 100 == 0)
            {
                cerr << "LINE: " << si  << "\t" << order[si] << endl;
                verbose = true;
            }
            else{
                verbose = false;
            }
            Expression y_pred = titleEncoder.buildGraph(cg, sentx_y, tcor);
            loss += as_scalar(cg.incremental_forward());
            cg.backward();
            sgd->update(1.0);
            ++si;
            ++lines;
        }
        sgd->status();
        cerr << " E = " << (loss / lines) <<" ";
        cerr.flush();

        // show score on dev data?
        report++;
        if (1) {
            cnn::real dloss = 0;
            cnn::real dcorr = 0;
            eval = true;
            for (auto& sent : dev_examples) {
                auto y = sent.ylabel;
                ComputationGraph cg;
                Expression y_pred =  titleEncoder.buildGraph(cg, sent, dcorr);
                dloss += as_scalar(cg.incremental_forward());
            }
            cnn::real acc = dcorr / dev_examples.size();
            if (acc > best) {
                best = acc;
                cerr<<"Exceed" << endl;
                ofstream out(fname);
                boost::archive::text_oarchive oa(out);
                oa << model;
            }
            cerr << "\n***DEV [epoch=" << (lines / (cnn::real)training_examples.size()) << "] E = " << (dloss / dev_examples.size())  << " acc=" << acc << ' '<<endl;
        }
        eval = false;
    }
    delete sgd;
}

