#ifndef CNN_DICT_H_
#define CNN_DICT_H_

#include <cassert>
#include <unordered_map>
#include <string>
#include <vector>
#include <iostream>
#include <stdexcept>

#include <boost/version.hpp>
#if BOOST_VERSION >= 105600
#include <boost/serialization/split_member.hpp>
#include <boost/serialization/vector.hpp>
#include <boost/serialization/unordered_map.hpp>
#include <boost/serialization/string.hpp>
#endif

namespace cnn {

    class Dict {
        typedef std::unordered_map<std::string, int> Map;
        public:
        Dict(bool supportUnk=false) : frozen(false), map_unk(supportUnk), unk_id(-1) {
        }

        inline unsigned size() const { return words_.size(); }

        inline bool Contains(const std::string& words) {
            return !(d_.find(words) == d_.end());
        }

        void Freeze() { frozen = true; }

        inline int Convert(const std::string& word) {
            auto i = d_.find(word);
            if (i == d_.end()) {
                if (frozen) {
                    if (map_unk) {
                        return unk_id;

                    }
                    else {
                        std::cerr << "Unknown word encountered: " << word << std::endl;
                        throw std::runtime_error("Unknown word encountered in frozen dictionary: " + word);
                    }  
                }
                words_.push_back(word);
                return d_[word] = words_.size() - 1;
            } else {
                return i->second;
            }
        }
        void SetUnk(const std::string& word) {
            if (!frozen)
            throw std::runtime_error("Please call SetUnk() only after dictionary is frozen");

            unk_id = Convert(word);
            map_unk = true;

        }
        inline const std::string& Convert(const int& id) const {
            assert(id < (int)words_.size());
            return words_[id];
        }

        void clear() { words_.clear(); d_.clear(); }

        private:
        bool frozen;
        bool map_unk; // if true, map unknown word to unk_id
int unk_id; 
std::vector<std::string> words_;
Map d_;

#if BOOST_VERSION >= 105600
friend class boost::serialization::access;
template<class Archive> void serialize(Archive& ar, const unsigned int) {
    ar & frozen;
    ar & map_unk;
    ar & unk_id;
    ar & words_;
    ar & d_;
}
#endif
};

inline unsigned UTF8Len(unsigned char x) ;
std::vector<int> ReadSentence(const std::string& line, Dict* sd);
void ReadSentencePair(const std::string& line, std::vector<int>* s, Dict* sd, std::vector<int>* t, Dict* td, bool debug=false);
void ReadSentencePair(const std::string& line, std::vector<int>* s, Dict* sd,  std::vector<std::vector<int> >* chars, Dict* cd, std::vector<int>* t, Dict* td, bool debug=false);

void ReadFeatures(const std::string& input_file, 
                      std::vector<std::vector<int>>& sent_words, Dict* sd, 
                      std::vector<std::vector<std::vector<int> >>& sent_chars, Dict* cd, 
                      std::vector< std::vector<std::vector<int> > >& sent_feats, Dict* fd,
                      std::vector<std::vector<int>>&  sent_tags, Dict* td, bool debug=false) ;


} // namespace cnn

#endif
