#ifndef CNN_ATTENTION_LSTM_H_
#define CNN_ATTENTION_LSTM_H_

#include "cnn/cnn.h"
#include "cnn/rnn.h"
#include "cnn/expr.h"
#include "cnn/lstm.h"

using namespace cnn::expr;

namespace cnn {

class Model;

struct AttentionLSTMBuilder : public RNNBuilder {
  AttentionLSTMBuilder() = default;
  explicit AttentionLSTMBuilder(unsigned layers,
                       unsigned input_dim,
                       unsigned hidden_dim,
                       Model* model,
                       LSTMBuilder& encoder);
  //Added by Zhiyang: 2015-09-03
  std::vector<Expression> getLastLayerHiddenVector() const
  {  
    int layer_index = layers -1;  
    std::vector<Expression> ret;
    for(unsigned t_index = 0; t_index <  h.size(); t_index++)
        ret.push_back( h[t_index][layer_index] );
    return ret;
  }
  
  Expression back() const { return h.back().back(); }
  std::vector<Expression> final_h() const { return (h.size() == 0 ? h0 : h.back()); }
  std::vector<Expression> final_s() const {
    std::vector<Expression> ret = (c.size() == 0 ? c0 : c.back());
    for(auto my_h : final_h()) ret.push_back(my_h);
    return ret;
  }
  unsigned num_h0_components() const override { return 2 * layers; }
  void copy(const RNNBuilder & params) override;
 protected:
  void new_graph_impl(ComputationGraph& cg) override;
  void start_new_sequence_impl(const std::vector<Expression>& h0) override;
  Expression add_input_impl(int prev, const Expression& x) override;

 public:
  // first index is layer, then ...
  std::vector<std::vector<Parameters*>> params;

  // first index is layer, then ...
  std::vector<std::vector<Expression>> param_vars;

  // first index is time, second is layer
  std::vector<std::vector<Expression>> h, c;

  // initial values of h and c at each layer
  // - both default to zero matrix input
  bool has_initial_state; // if this is false, treat h0 and c0 as 0
  std::vector<Expression> h0;
  std::vector<Expression> c0;
  unsigned layers;
  LSTMBuilder&  m_encoder; 
};

} // namespace cnn

#endif