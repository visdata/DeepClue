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
unsigned LAYERS = 1;

unsigned INPUT_VOCAB_SIZE = 0;

cnn::Dict word_dict;

int kSOS;
int kEOS;
int kUNK;
int kNUM;

unordered_map<string, vector<cnn::real> > pretrained_embeddings;
vector<cnn::real> averaged_vec;
bool count_corr = false;

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

struct TitleEncoder {
    LookupParameters* p_word;  //

    GRUBuilder word_rev_encoder;
    GRUBuilder word_fwd_encoder;

    Parameters* p_atten_lstm;
    Parameters* p_atten_avg;
    Parameters* p_atten_reg;
    Parameters* p_atten_u;
    Parameters* p_atten_b;

    Parameters* p_output_lstm;
    Parameters* p_output_avg;
    Parameters* p_output_b;

    Parameters* p_fed_o;
    Parameters* p_fed_o_b;

    explicit TitleEncoder(Model& model):
        word_rev_encoder(LAYERS, INPUT_DIM , HIDDEN_DIM, &model),
        word_fwd_encoder(LAYERS, INPUT_DIM , HIDDEN_DIM, &model)
    {
        p_word = model.add_lookup_parameters(INPUT_VOCAB_SIZE, {INPUT_DIM});


        p_output_lstm = model.add_parameters({HIDDEN_DIM, 2*HIDDEN_DIM});
        p_output_avg = model.add_parameters({HIDDEN_DIM, INPUT_DIM});
        p_output_b = model.add_parameters({HIDDEN_DIM});

        p_fed_o = model.add_parameters({1, HIDDEN_DIM});
        p_fed_o_b = model.add_parameters({1}, 0.01);

        p_atten_lstm = model.add_parameters({HIDDEN_DIM, 2*HIDDEN_DIM});
        p_atten_avg = model.add_parameters({HIDDEN_DIM, INPUT_DIM});
        p_atten_reg = model.add_parameters({HIDDEN_DIM, 1});
        p_atten_u = model.add_parameters({1, HIDDEN_DIM});
        p_atten_b = model.add_parameters({HIDDEN_DIM});

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

    Expression buildGraph(ComputationGraph&cg, const Example& example, float& cor)
    {
        float predicted_value = 0;
        return buildGraph(cg, example, cor, predicted_value);
    }

    Expression buildGraph(ComputationGraph&cg, const Example& example, float& cor, float& predicted_value)
    {
        // forward encoder
        word_fwd_encoder.new_graph(cg);
        // backward encoder
        word_rev_encoder.new_graph(cg);

        vector<Expression> title_exps, recurrent_title_exps;

        for(size_t title_index = 0; title_index < example.words.size(); title_index++)
        {
            auto& insent = example.word_ids[title_index];

            const unsigned slen = insent.size();

            vector<Expression> i_words;

            word_fwd_encoder.start_new_sequence();
            word_rev_encoder.start_new_sequence();

            for (unsigned t = 0; t < insent.size(); ++t)
            {
                //Expression i_word_t = lookup(cg, p_word, insent[t]);
                if(insent[t] != kUNK && insent[t] != kNUM && word_dict.Convert("-")!=insent[t] && word_dict.Convert("'s")!=insent[t])//this way better
                {
                    Expression i_word_t = const_lookup(cg, p_word, insent[t]);
                    if (!eval) {
                        i_word_t = dropout(i_word_t, pdrop);
                    }
                    i_words.push_back(i_word_t);
                }
            }
            if(i_words.size() > 1 )
            {
                Expression kmh_exp = kmh_ngram(concatenate_cols(i_words), 2);
                Expression non_linear_input = tanh(kmh_exp);
                title_exps.push_back( sum_cols(non_linear_input) );

                for (unsigned t = 0; t < i_words.size(); ++t)
                {
                    word_fwd_encoder.add_input(i_words[t]);
                    word_rev_encoder.add_input(i_words[i_words.size() - t - 1]);
                }
            }
            else if(i_words.size()> 0) {
                title_exps.push_back(average(i_words));
                for (unsigned t = 0; t < i_words.size(); ++t)
                {
                    word_fwd_encoder.add_input(i_words[t]);
                    word_rev_encoder.add_input(i_words[i_words.size() - t - 1]);
                }
            }
            if(i_words.size()>0)
            {
                Expression title_exp = concatenate({word_fwd_encoder.back(), word_rev_encoder.back()});
                recurrent_title_exps.push_back(title_exp);
            }
        }
        assert(recurrent_title_exps.size() > 0 );
        Expression atten_lstm = parameter(cg, p_atten_lstm);
        Expression atten_avg = parameter(cg, p_atten_avg);
        Expression atten_reg = parameter(cg, p_atten_reg);
        Expression atten_u = parameter(cg, p_atten_u);
        Expression atten_b = parameter(cg, p_atten_b);

        Expression output_lstm = parameter(cg, p_output_lstm);
        Expression output_avg = parameter(cg, p_output_avg);
        Expression output_b = parameter(cg, p_output_b);

        Expression fed_o = parameter(cg, p_fed_o);
        Expression fed_o_b = parameter(cg, p_fed_o_b);

        vector<Expression> output_alphas, output_losses, output_hs;
        Expression gold_y = input(cg, &example.ylabel);
        while(output_losses.empty())
        {
            output_alphas.clear();
            output_losses.clear();
            output_hs.clear();
            for(int i =0; i< recurrent_title_exps.size(); i++)
            {
                if(eval || recurrent_title_exps.size() < 10 || cnn::rand01() < pdrop)
                {
                    Expression example_rep_temp = rectify(affine_transform({output_b,
                                                          output_lstm, recurrent_title_exps[i],
                                                          output_avg, title_exps[i]
                                                                           }));
                    Expression output_h = affine_transform({fed_o_b, fed_o, example_rep_temp});
                    Expression title_loss = squared_distance(output_h, gold_y); // a number
                    Expression cur_alpha = atten_u * tanh(affine_transform({atten_b,
                                                          atten_lstm, recurrent_title_exps[i],
                                                          atten_avg, title_exps[i],
                                                          atten_reg, output_h}));
                    output_alphas.push_back(cur_alpha);
                    output_losses.push_back(title_loss);
                    output_hs.push_back(output_h);
                }
            }
            if(output_losses.empty())
            {
                cerr<< recurrent_title_exps.size() << endl;
            }
        }
        Expression alpha = softmax(concatenate(output_alphas));
        Expression input_loss = concatenate_cols(output_losses);
        Expression  all_h = concatenate_cols(output_hs) * alpha;
        if(count_corr)
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
            cerr<<example.fraction << " ";
        }
        Expression all_loss = input_loss * alpha;
        return all_loss;
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
    //cout<<line<<",\t"<<num_titles<<endl;
    /*if(fraction>0.04)
        example.ylabel = 0.04;
    else if(fraction < -0.04)
        example.ylabel = -0.04;
    else*/
    example.ylabel = fraction * 100;
    //example.ylabel*=10;
    example.fraction = fraction;
    example.open = open_price;
    example.close = close_price;
    example.date = date;
    //cerr<< "date: " << line << endl;
    example.words.resize(num_titles);
    if(num_titles>1000)
    {
        cerr<< "[LOG]: " << num_titles << endl;
    }

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
        //sgd = new MomentumSGDTrainer(&model, 1e-6, 0.01);
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
    //sgd->clipping_enabled = false;

    TitleEncoder titleEncoder(model);
    int TEST_TIME = 1;//11;//11;//11; //11;//11;
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
        count_corr = true;
        //verbose = true;
        int dev_index = 0;
        for (auto& sent : dev_examples) {
            dev_index ++;
            const int y = sent.ylabel;
            cnn::real ycorr = 0, yloss = 0;
            int pos_num = 0, neg_num = 0;
            int CUR_TEST_TIME = TEST_TIME;
            int total_ycorr = 0;
            vector<float> predicted_values;
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
                    ComputationGraph cg;
                    float predicted_value = 0;
                    Expression y_pred =  titleEncoder.buildGraph(cg, sent, ycorr, predicted_value);
                    yloss += as_scalar(cg.incremental_forward());
                    predicted_values.push_back(predicted_value);
                    //for wl: print predicted price for every time, later we will get the averaged price
                    cerr<<"\t[predicted price]: "<< predicted_value << "\t" << sent.close << endl;
                }
                total_ycorr += ycorr;
                //cerr<< "begin " << dev_index << endl;
                if(y == 0)
                {
                    pos_num += CUR_TEST_TIME - ycorr;
                    neg_num += ycorr;
                }
                else {
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
            float average_predicted_price = 0;
            for(auto price: predicted_values)
                average_predicted_price += price;
            average_predicted_price /= predicted_values.size();
            cerr<<"\t[average predicted price]: "<< average_predicted_price << "\t" << sent.close << endl;
            if(correct)
            {
                dcorr++;
                //for wl: gold label, predicted label, number of positive guess, number of negative guess
                cerr<<  dev_index << " " << sent.date << " "<< y <<" "<<y << " " << pos_num <<" "<< neg_num<< endl;
                cerr<<"[TEST NUM]: " << total_ycorr << "\t" << pos_num + neg_num << endl;
            }
            else {
                //for wl: same here
                cerr<< "[WRONG] " << dev_index <<" " << sent.date << " "<< y <<" "<<1-y << " " << pos_num <<" "<< neg_num<< endl;
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
            const int y = sentx_y.ylabel;
            cerr << "LINE: " << order[si] << "\t" << sentx_y.words.size() << endl;
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
            MAX_TEST_TIME = TEST_TIME = 1;
            count_corr = true;

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
                        Expression y_pred =  titleEncoder.buildGraph(cg, sent, ycorr);
                        yloss += as_scalar(cg.incremental_forward());
                    }
                    total_ycorr += ycorr;
                    //cerr<< "begin " << dev_index << endl;
                    if(y == 0)
                    {
                        pos_num += CUR_TEST_TIME - ycorr;
                        neg_num += ycorr;
                    }
                    else {
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
            //if (acc >= best) {
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
        count_corr = false;
    }
    delete sgd;
}
