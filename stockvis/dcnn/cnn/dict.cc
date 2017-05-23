#include "dict.h"

#include <string>
#include <vector>
#include <sstream>
#include <fstream>

using namespace std;

namespace cnn {

std::vector<int> ReadSentence(const std::string& line, Dict* sd) {
  std::istringstream in(line);
  std::string word;
  std::vector<int> res;
  while(in) {
    in >> word;
    if (!in || word.empty()) break;
    res.push_back(sd->Convert(word));
  }
  return res;
}

void ReadSentencePair(const std::string& line, std::vector<int>* s, Dict* sd, std::vector<int>* t, Dict* td, bool debug) {
  std::istringstream in(line);
  std::string word;
  std::string sep = "|||";
  Dict* d = sd;
  std::vector<int>* v = s;
  while(in) {
    in >> word;
    if(debug)
        cerr<< word << endl;
    if (!in) break;
    if (word == sep) { if(debug) cerr<<"**CHANGE**"<<endl; d = td; v = t; continue; }
    v->push_back(d->Convert(word));
  }
}

void ReadSentencePair(const std::string& line, std::vector<int>* s, Dict* sd, std::vector<std::vector<int> >* chars, Dict* cd, std::vector<int>* t, Dict* td, bool debug) {
  std::istringstream in(line);
  std::string word;
  std::string sep = "|||";
  Dict* d = sd;
  std::vector<int>* v = s;
  bool is_word = true;
  while(in) {
    in >> word;
    if(debug)
        cerr<< word << endl;
    if (!in) break;
    if (word == sep) { is_word = false; if(debug) cerr<<"**CHANGE**"<<endl; d = td; v = t; continue; }
    if(is_word)
      {
         std::vector<int> char_ids; 
         for(unsigned j =0; j < word.size(); )
         {
            int char_num = UTF8Len(word[j]); 
            std::string character;
            for(int k = j; k< (int)j+char_num; k++ )
                character += word[k];
            char_ids.push_back( cd->Convert(character) );
            j+=char_num;
         }
         chars->push_back(char_ids);
      }
    v->push_back(d->Convert(word));
  }
  assert(chars->size() == s->size());
}

void ReadFeatures(const std::string& input_file, 
                      std::vector<std::vector<int> >& sent_words, Dict* sd, 
                      std::vector<std::vector<std::vector<int> > >& sent_chars, Dict* cd, 
                      std::vector< std::vector<std::vector<int> > >& sent_feats, Dict* fd,
                      std::vector<std::vector<int> >&  sent_tags, Dict* td, bool debug) 
{
  std::ifstream fin(input_file.c_str());
  assert(fin);
  std::string line;
  std::vector<int>  cur_sent_words;
  std::vector<int>  cur_tags;
  std::vector<std::vector<int> > cur_chars;
  std::vector<std::vector<std::string> > cur_feats;
  
  std::vector<std::vector< std::vector<std::string> > > sent_str_feats;

  while(getline(fin,line))
  {
      if(line.empty())
      {
         assert(cur_chars.size() == cur_sent_words.size());
         assert(cur_chars.size() == cur_tags.size());
         assert(cur_chars.size() == cur_feats.size());
         sent_words.push_back(cur_sent_words);          
         sent_tags.push_back(cur_tags);
         sent_chars.push_back(cur_chars);
         sent_str_feats.push_back(cur_feats);
        
         cur_sent_words.clear();
         cur_tags.clear();
         cur_feats.clear();
         cur_chars.clear();
         continue;
      }
      std::istringstream in(line);
      std::vector<std::string> tokens;
      std::string token;
      while(in>>token)
        tokens.push_back(token);
      //word
      string& word = tokens[0];
      cur_sent_words.push_back(sd->Convert(word));
      if(debug)
            cerr<< word << endl;
      {//char
         std::vector<int> char_ids; 
         for(unsigned j =0; j < word.size(); )
         {
            int char_num = UTF8Len(word[j]); 
            std::string character;
            for(int k = j; k< (int)j+char_num; k++ )
                character += word[k];
            char_ids.push_back( cd->Convert(character) );
            j+=char_num;
         }
         cur_chars.push_back(char_ids);
      }
      //tag
      cur_tags.push_back(td->Convert(tokens.back()));
      assert(tokens.size() >2 );
      //feat
      vector<string> feats(tokens.size()-2);
      for(int feat_index =1 ; feat_index < (int)tokens.size()-1; feat_index++)
      {
          feats[feat_index-1] = tokens[feat_index];
      }
      cur_feats.push_back(feats);
  }
  fin.close();
  //push features to dict
  sent_feats.resize(sent_str_feats.size());
  int tag_size = td->size();
  for(unsigned sent_index = 0; sent_index < sent_str_feats.size(); sent_index++)
  {
      sent_feats[sent_index].resize(sent_str_feats[sent_index].size());
      
      for(unsigned word_index =0; word_index < sent_str_feats[sent_index].size(); word_index++)
      {
          assert( sent_str_feats[sent_index].size() >=0 );
          sent_feats[sent_index][word_index].resize(sent_str_feats[sent_index][word_index].size());
          for(unsigned feat_index =0; feat_index < sent_str_feats[sent_index][word_index].size(); feat_index++)
          {
              sent_feats[sent_index][word_index][feat_index] = fd->Convert(sent_str_feats[sent_index][word_index][feat_index]); 
              for(int tag_index  =1; tag_index < tag_size; tag_index ++) 
              {
                  fd->Convert(sent_str_feats[sent_index][word_index][feat_index]+td->Convert(tag_index));
              }
          }
      }
  }
}

inline unsigned UTF8Len(unsigned char x) {
  if (x < 0x80) return 1;
  else if ((x >> 5) == 0x06) return 2;
  else if ((x >> 4) == 0x0e) return 3;
  else if ((x >> 3) == 0x1e) return 4;
  else if ((x >> 2) == 0x3e) return 5;
  else if ((x >> 1) == 0x7e) return 6;
  else return 0;
}

} // namespace cnn

