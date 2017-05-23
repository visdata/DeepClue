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
unsigned TAG_HIDDEN_DIM = 64;
//unsigned TAG_HIDDEN_DIM = 32;
unsigned LABEL_SIZE = 2;

unsigned INPUT_VOCAB_SIZE = 0;

cnn::Dict word_dict;

int kSOS;
int kEOS;
int kUNK;
int kNUM;

unordered_map<string, vector<cnn::real> > pretrained_embeddings;
vector<cnn::real> averaged_vec;

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
    int ylabel;
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
    /*cerr<<"[LOG] WordDict Size: "<< word_dict.size() << endl;
    word_dict.Freeze();
    word_dict.SetUnk("|unk|");*/
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
        //}
        cerr<<"[LOG] After Pruning there are "<<  remaining_tokens << " words and " << remaining_types<< " types."<<endl;
        cerr<<"[LOG] WordDict Size: "<< word_dict.size() << endl;
        word_dict.Freeze();
        word_dict.SetUnk("|unk|");
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
void outputExample(const Example& example)
{
    int num_titles = example.words.size();
    for(int title_index = 0; title_index < num_titles; title_index++)
    {

        /*for(unsigned word_index = 0; word_index < example.words[title_index].size(); word_index++)
        {
            cerr<< example.words[title_index][word_index]<<" ";
        }
        cerr<<endl;*/
        
        for(unsigned word_index = 0; word_index < example.words[title_index].size(); word_index++)
        {
            cerr<< word_dict.Convert(example.word_ids[title_index][word_index])<<" ";
        }
        cerr<<endl;
    }
    cerr<< endl;
}

void outputExamples(const vector<Example>& examples)
{
    for(unsigned sent_index = 0; sent_index < examples.size(); sent_index++)
    {
        cerr<<"sent: " << sent_index+1 << endl;
        outputExample(examples[sent_index]);
    }
}

struct ConvLayer {
    // in_rows = rows per word in input matrix
    // filter_width = length of filter (columns)
    // in_nfmaps = number of feature maps in input
    // out_nfmaps = number of feature maps in output
    ConvLayer(Model&m, int in_rows, int filter_width, int in_nfmaps, int out_nfmaps) :
        p_filts(in_nfmaps),
        p_fbias(in_nfmaps)
    {
        for (int i = 0; i < in_nfmaps; ++i) {
            p_filts[i].resize(out_nfmaps);
            p_fbias[i].resize(out_nfmaps);
            for (int j = 0; j < out_nfmaps; ++j) {
                p_filts[i][j] = m.add_parameters({in_rows, filter_width}, 0.01);
                p_fbias[i][j] = m.add_parameters({in_rows}, 0.05);
            }
        }
        //for (int j = 0; j < out_nfmaps; ++j)
        //p_fbias[j] = m.add_parameters({in_rows});
    }

    vector<Expression> apply(ComputationGraph& cg, const vector<Expression>& inlayer, int k_out) const {
        const unsigned out_nfmaps = p_filts.front().size();
        const unsigned in_nfmaps = p_filts.size();
        if (in_nfmaps != inlayer.size()) {
            cerr << "Mismatched number of input features (" << inlayer.size() << "), expected " << in_nfmaps << endl;
            abort();
        }
        vector<Expression> r(out_nfmaps);

        vector<Expression> tmp(in_nfmaps);
        for (int fj = 0; fj < out_nfmaps; ++fj) {
            for (int fi = 0; fi < in_nfmaps; ++fi) {
                Expression t = conv1d_wide(inlayer[fi], parameter(cg, p_filts[fi][fj]));
                t = colwise_add(t, parameter(cg, p_fbias[fi][fj]));
                tmp[fi] = t;
            }
            Expression s = sum(tmp);
            s = kmax_pooling(s, k_out);
            //r[fj] = rectify(s);
            r[fj] = (s);
        }
        return r;
    }
    vector<vector<Parameters*>> p_filts; // [feature map index from][feature map index to]
    vector<vector<Parameters*>> p_fbias; // [feature map index from][feature map index to]
};
struct ConvNet {
    ConvLayer cl1;
    //ConvLayer cl2;
    explicit ConvNet(unsigned INPUT_DIM, Model& m):
        cl1(m, INPUT_DIM, 3, 1, 1)/*,
        cl2(m, INPUT_DIM, 3, 6, 6)*/
    {
    }
    //output: 6*INPUT_DIM*2
    Expression buildRep(ComputationGraph& cg, const vector<Expression>& vx) {
        
        Expression s = concatenate_cols(vx);

        vector<Expression> l0(1, s);
        vector<Expression> l1 = cl1.apply(cg, l0, 1);
        /*vector<Expression> l2 = cl2.apply(cg, l1, 2);
        for(auto& fm : l2)
            fm = reshape(fm, {2 * INPUT_DIM});
        Expression t = concatenate(l2);*/
        assert(l1.size() == 1);
        Expression t = l1[0];
        return t;
    }
};

struct TitleEncoder {
    LookupParameters* p_word;  //

    vector<Parameters*> p_output_w;
    vector<Parameters*> p_output_b;
    Parameters* p_fed_o;
    Parameters* p_fed_o_b;
    
    //Parameters* p_input_w;
    //Parameters* p_input_b;

    //Parameters* p_padding;
    //ConvNet titleConvNet;
    int layers;
    explicit TitleEncoder(Model& model): layers(1)
    //:titleConvNet(INPUT_DIM, model)
    {
        p_word = model.add_lookup_parameters(INPUT_VOCAB_SIZE, {INPUT_DIM});

        p_output_w.resize(layers);
        p_output_b.resize(layers);
        for(int i = 0; i< layers; i++)
        {
            p_output_w[i] = model.add_parameters({INPUT_DIM, INPUT_DIM});
            p_output_b[i] = model.add_parameters({INPUT_DIM});
            //p_output_w[i] = model.add_parameters({TAG_HIDDEN_DIM, INPUT_DIM});
            //p_output_b[i] = model.add_parameters({TAG_HIDDEN_DIM});
        }
        
        //p_input_w = model.add_parameters({TAG_HIDDEN_DIM, INPUT_DIM});
        
        
        //p_output_w = model.add_parameters({TAG_HIDDEN_DIM, INPUT_DIM});
        //p_output_b = model.add_parameters({TAG_HIDDEN_DIM});

        //p_fed_o = model.add_parameters({LABEL_SIZE, TAG_HIDDEN_DIM});
        p_fed_o = model.add_parameters({LABEL_SIZE, INPUT_DIM});
        p_fed_o_b = model.add_parameters({LABEL_SIZE});
        
        //p_padding = model.add_parameters({INPUT_DIM}, 0.0);


        for( size_t  word_index = 0; word_index <  INPUT_VOCAB_SIZE; word_index++)
        {
            auto word_iter = pretrained_embeddings.find( word_dict.Convert(word_index) );
            if(word_iter != pretrained_embeddings.end())
            {
                ((LookupParameters*)p_word)->Initialize(word_index, word_iter->second);
            }
        }
        //else{
        ((LookupParameters*)p_word)->Initialize(kUNK, averaged_vec);
        ((LookupParameters*)p_word)->Initialize(kNUM, averaged_vec);
        //}
    }


    Expression buildGraph(ComputationGraph&cg, const Example& example)
    {
        vector<Expression> title_exps;
        
        //Expression padding = parameter(cg, p_padding);

        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            const unsigned slen = insent.size();

            vector<Expression> i_words;

            //bool output = false;
            for (unsigned t = 0; t < insent.size(); ++t)
            {
                //Expression i_word_t = const_lookup(cg,p_word,insent[t]);
                Expression i_word_t;
                i_word_t = lookup(cg,p_word,insent[t]);
                /*if(insent[t] != kUNK && insent[t] != kNUM && pretrained_embeddings.find(example.words[title_index][t]) == pretrained_embeddings.end())
                    i_word_t = lookup(cg,p_word,insent[t]);
                else if(insent[t] == kUNK || insent[t] == kNUM)
                    i_word_t = lookup(cg,p_word,insent[t]);
                else
                    i_word_t = const_lookup(cg,p_word,insent[t]);*/
                if (!eval) {
                    //i_word_t = dropout(i_word_t, pdrop);
                    i_word_t = dropout(i_word_t, pdrop);
                    //i_word_t = block_dropout(i_word_t, pdrop);
                }
                if(insent[t] != kUNK)//this way better
                //if(insent[t] != kUNK && insent[t]!=kNUM)
                {
                    i_words.push_back(i_word_t);
                }
                //while(i_words.size()<3)
                //    i_words.push_back(padding);
                /*else{
                cerr << example.words[title_index][t] << " ";
                output = true;
                }*/
            }
            /*if(output)
            cerr<<endl;*/
            if(i_words.size() > 1 )
            {
                Expression kmh_exp = kmh_ngram(concatenate_cols(i_words), 2);
                Expression non_linear_input = tanh(kmh_exp);
                //Expression non_linear_input = tanh(kmh_exp) + kmh_exp;
                //Expression non_linear_input = rectify(kmh_exp) + kmh_exp;
                title_exps.push_back( sum_cols(non_linear_input) );
                //title_exps.push_back( sum_cols((kmh_ngram(concatenate_cols(i_words), 2))) );
                //title_exps.push_back( average(i_words)  );
                //title_exps.push_back( sum_cols(tanh(kmh_ngram(concatenate_cols(i_words), 3))) );
                //title_exps.push_back( sum_cols(rectify(kmh_ngram(concatenate_cols(i_words), 2))) );
            }
            else if(i_words.size()> 0) {
                title_exps.push_back(average(i_words));
            }
        }
        if(!eval)
        {
            //float tdrop = std::min(0.8f, title_exps.size()/500.0f);
            float tdrop = pdrop; 
            if(verbose)
                cerr<< title_exps.size() << "\t" << tdrop << endl;
            for(size_t title_index = 0; title_index < title_exps.size(); title_index++)
            {
                //title_exps[title_index] = block_dropout(title_exps[title_index], pdrop);
                title_exps[title_index] = block_dropout(title_exps[title_index], tdrop);
            }
        }
        /*vector<Expression> max_reps;
        int num_cols = 3;
        for(size_t title_index = 0; title_index < title_exps.size(); )
        {
            Expression max_rep;
            if(title_index + 2 < (int) title_exps.size())
            {
                max_rep = kmax_pooling(concatenate_cols({title_exps[title_index], 
                                                                title_exps[title_index+1],
                                                                title_exps[title_index+2]}), 1);
                max_rep = reshape(max_rep, {INPUT_DIM});
                title_index +=3;
            }
            else if(title_index + 1 < (int) title_exps.size())
            {
                max_rep = kmax_pooling(concatenate_cols({title_exps[title_index], 
                                                                title_exps[title_index+1]
                                                        }), 1);
                max_rep = reshape(max_rep, {INPUT_DIM});
                title_index += 2;
            }
            else 
            {
                max_rep = title_exps[title_index];  
                title_index++;
            }
            max_reps.push_back(max_rep);
        }*/
        Expression example_rep =average(title_exps);
        //Expression input_w = parameter(cg, p_input_w);
        //Expression example_rep = average(max_reps);
        //Expression example_rep = titleConvNet.buildRep(cg, title_exps);
        //Expression example_rep = sum_cols((kmh_ngram(concatenate_cols(title_exps), 2)))/(float)title_exps.size();
        vector<Expression> param_tW(layers), param_tb(layers);
        for(int i = 0; i< layers; i++)
        {
            param_tW[i] = parameter(cg, p_output_w[i]);
            param_tb[i] = parameter(cg, p_output_b[i]);
        }
        //if(!eval)
        //    example_rep = dropout(example_rep, pdrop);
        for(int i = 0; i < layers; i++)
        {
            //example_rep = rectify(param_tW[i] * example_rep + param_tb[i]) + example_rep;
            //example_rep = tanh(param_tW[i] * example_rep + param_tb[i]) + input_w * example_rep ;
            //example_rep = tanh(param_tW[i] * example_rep + param_tb[i]);
            example_rep = tanh(param_tW[i] * example_rep + param_tb[i]) + example_rep;
            //example_rep = tanh(param_tW[i] * example_rep + param_tb[i]);
        }
        Expression i_output = example_rep;
        //Expression i_output = rectify(param_tW * example_rep + param_tb);
        //Expression i_output = tanh(param_tW * example_rep + param_tb);

        Expression param_oW = parameter(cg, p_fed_o);
        Expression param_ob = parameter(cg, p_fed_o_b);
        Expression output_h = param_oW * i_output + param_ob;
        if(verbose)
        {
            cerr<<example.fraction << " ";
        }
        return output_h;
    }
};

bool IsCurrentPredictionCorrection(ComputationGraph& cg, int y_true) {
    auto v = as_vector(cg.incremental_forward());
    assert(v.size() > 1);
    int besti = 0;
    cnn::real best = v[0];
    for (unsigned i = 1; i < v.size(); ++i)
        if (v[i] > best) {
            best = v[i];
            besti = i;
        }
    if(verbose)
    {
        cerr<<"prob: ";
        copy(v.begin(), v.end(), ostream_iterator<cnn::real>(cerr, " "));
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
    string line;
    float open_price, close_price, fraction;
    int num_titles;
    string date;
    if(!getline(fin, line)) return false;
    istringstream sin(line);
    sin>>fraction>>num_titles>>open_price>>close_price>>date;
    //cout<<label_str<<", "<<num_titles<<endl;
    //if(fraction>=0) example.ylabel = 1;
    if(fraction>0) example.ylabel = 1;
    else example.ylabel = 0;
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
    //kNUM = word_dict.Convert("<NUM>"); //number

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
        pos_count+= example.ylabel;
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
        pos_dev_count+= example.ylabel;
    cerr<< "Total Dev Examples: " << dev_examples.size() << endl;
    cerr<< "Positive DEV Examples: " << pos_dev_count << " " << pos_dev_count/(float)dev_examples.size() << endl;
    cerr<< "Negative DEV Examples: " << dev_examples.size() - pos_dev_count << " "<< 1.0 - pos_dev_count /(float)dev_examples.size() << endl;
    //outputExamples(dev_examples);
    //exit(0);

    ostringstream os;
    os << stock_code<<".hier.avg"
       << '_' << INPUT_DIM
       << '_' << TAG_HIDDEN_DIM
       << '_' << pdrop << "_pid." << getpid();

    const string fname = os.str();
    cerr << "Parameters will be written to: " << fname << endl;
    cnn::real best = 0;

    Model model;
    bool use_momentum = true;
    Trainer* sgd = nullptr;
    if (use_momentum)
    {
        //sgd = new MomentumSGDTrainer(&model);
        //sgd = new MomentumSGDTrainer(&model, 1e-4, 0.01);
        //sgd = new MomentumSGDTrainer(&model, 1e-4, 0.02);
        sgd = new MomentumSGDTrainer(&model, 1e-4, 0.01);
        sgd->eta_decay = 0.05;
        //sgd = new AdadeltaTrainer(&model); //lambda: 0.02, eta: 1e-9
        //sgd = new AdamTrainer(&model); //lambda: 0.02, eta: 1e-9
        //sgd->eta0 = 1e-3;
        //sgd->eta = 1e-3;
    }
    //sgd = new MomentumSGDTrainer(&model, 1e-3, 0.001);
    //sgd = new AdagradTrainer(&model);
    else
        sgd = new SimpleSGDTrainer(&model, 1e-4);
    //sgd = new SimpleSGDTrainer(&model);
    sgd->clipping_enabled = false;

    TitleEncoder titleEncoder(model);
    int TEST_TIME = 11; //11;//11;
    int MAX_TEST_TIME = TEST_TIME;//101;//TEST_TIME;

    if(argc == 6)
    {
        string fname = argv[5];
        ifstream in(fname);
        boost::archive::text_iarchive ia(in);
        ia >> model;

        cnn::real dcorr = 0;
        cnn::real dloss = 0;
        eval = true;
        //verbose = true;
        int dev_index = 0;
        for (auto& sent : dev_examples) {
            dev_index ++;
            const int y = sent.ylabel;
            cnn::real ycorr = 0, yloss = 0;
            int pos_num = 0, neg_num = 0;
            int CUR_TEST_TIME = TEST_TIME;
            int total_ycorr = 0; 
            while(true)
            {
                ycorr = 0;
                if( pos_num + neg_num >= MAX_TEST_TIME )
                    break;
                for(int j = 0; j < CUR_TEST_TIME; j++)
                {
                    if(CUR_TEST_TIME == 1)
                        eval = true;
                    else
                        eval = false;
                    //pdrop = 0.25;
                    ComputationGraph cg;
                    Expression y_pred =  titleEncoder.buildGraph(cg, sent);
                    if (IsCurrentPredictionCorrection(cg, y)) ycorr++;
                    CrossEntropyLoss(y_pred, y);
                    yloss += as_scalar(cg.incremental_forward());
                }    
                total_ycorr += ycorr;
                //cerr<< "begin " << dev_index << endl;
                if(y == 0)
                {
                    pos_num += CUR_TEST_TIME - ycorr;
                    neg_num += ycorr;
                }
                else{
                    pos_num += ycorr;
                    neg_num += CUR_TEST_TIME - ycorr;
                }
                if(abs(pos_num - neg_num)<= (pos_num+neg_num)/10)
                {
                    CUR_TEST_TIME = 10; //test more time
                }
                else
                {
                    break;
                }    
            }
            dloss += yloss/(pos_num+neg_num);
            bool correct = false;
            if(total_ycorr>(pos_num+neg_num)/2)
            correct = true;
            if(correct)
            {
                dcorr++;
                cerr<<  dev_index << " "<<sent.date << " "<< y <<" "<<y << " " << pos_num <<" "<< neg_num<< endl;
                cerr<<"[TEST NUM]: " << total_ycorr << "\t" << pos_num + neg_num << endl;
            }
            else {
                cerr<< "[WRONG] " << dev_index <<" "<<sent.date<<" " << y <<" "<<1-y << " " << pos_num <<" "<< neg_num<< endl;
                //outputExample(sent);
                cerr<<"[TEST NUM]: " << total_ycorr << "\t" << pos_num + neg_num << endl;
            }
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
        cerr.flush();

        // show score on dev data?
        report++;
        if (1) {
            cnn::real dloss = 0;
            cnn::real dcorr = 0;
            eval = true;
            MAX_TEST_TIME = TEST_TIME = 1;
            
            for (auto& sent : dev_examples) {
                const int y = sent.ylabel;
                cnn::real ycorr = 0, yloss = 0;
                int pos_num = 0, neg_num = 0;
                int CUR_TEST_TIME = TEST_TIME;
                int total_ycorr = 0; 
                while(true)
                {
                    ycorr = 0;
                    if( pos_num + neg_num >= MAX_TEST_TIME )
                        break;
                    for(int j = 0; j < CUR_TEST_TIME; j++)
                    {
                        if(CUR_TEST_TIME == 1)
                            eval = true;
                        else
                            eval = false;
                        //pdrop = 0.25;
                        ComputationGraph cg;
                        Expression y_pred =  titleEncoder.buildGraph(cg, sent);
                        if (IsCurrentPredictionCorrection(cg, y)) ycorr++;
                        CrossEntropyLoss(y_pred, y);
                        yloss += as_scalar(cg.incremental_forward());
                    }    
                    total_ycorr += ycorr;
                    //cerr<< "begin " << dev_index << endl;
                    if(y == 0)
                    {
                        pos_num += CUR_TEST_TIME - ycorr;
                        neg_num += ycorr;
                    }
                    else{
                        pos_num += ycorr;
                        neg_num += CUR_TEST_TIME - ycorr;
                    }
                    if(abs(pos_num - neg_num)<= (pos_num+neg_num)/10)
                    {
                        CUR_TEST_TIME = 10; //test more time
                    }
                    else
                    {
                        break;
                    }    
                }
                dloss += yloss/(pos_num+neg_num);
                bool correct = false;
                if(total_ycorr>(pos_num+neg_num)/2)
                    correct = true;
                if(correct)
                {
                    dcorr++;
                }
            }
            cnn::real acc = dcorr / dev_examples.size();
            if (acc >= best) {
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

