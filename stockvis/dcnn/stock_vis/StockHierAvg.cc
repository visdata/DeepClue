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


struct PairCmp
{
 bool operator()(const pair<string, int>& a, const pair<string, int>& b)
 {
        return a.second > b.second;
 }
};
class Example{
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
    if(!fin){
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
                    else{
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

        sort(pairs.begin(), pairs.end(), PairCmp());
        
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
            else{
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
                title_exps.push_back( sum_cols(tanh(kmh_ngram(concatenate_cols(i_words), 2))) ); 
            }
            else if(i_words.size()> 0){
                title_exps.push_back(average(i_words));
            }
        }
        Expression example_rep = average(title_exps); 
        Expression param_tW = parameter(cg, p_output_w);
        Expression param_tb = parameter(cg, p_output_b);
        if(!eval)
            example_rep = dropout(example_rep, pdrop);
        //Expression i_output = rectify(param_tW * example_rep + param_tb);
        Expression i_output = tanh(param_tW * example_rep + param_tb);
        if(verbose)
        {
            cg.incremental_forward();
            cerr<<(*i_output.value())<<endl;
        }
        
        Expression param_oW = parameter(cg, p_fed_o);
        Expression param_ob = parameter(cg, p_fed_o_b);
        Expression output_h = param_oW * i_output + param_ob;
        return output_h;
    }
};

bool IsCurrentPredictionCorrection(ComputationGraph& cg, int y_true) {
    auto v = as_vector(cg.incremental_forward());
    assert(v.size() > 1);
    int besti = 0;
    double best = v[0];
    for (unsigned i = 1; i < v.size(); ++i)
        if (v[i] > best) { best = v[i]; besti = i; }
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
            Expression y_pred =  titleEncoder.buildGraph(cg, sent);
            if (IsCurrentPredictionCorrection(cg, y)) {
                dcorr++;
                cerr<< dev_index << " "<< y <<" "<<y<< endl;
            }
            else{
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
                if (first) { first = false; } else { sgd->update_epoch(); }
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

