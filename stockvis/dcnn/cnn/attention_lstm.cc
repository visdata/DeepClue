#include "cnn/attention_lstm.h"

#include <string>
#include <cassert>
#include <vector>
#include <iostream>

#include "cnn/nodes.h"

using namespace std;
using namespace cnn::expr;

namespace cnn
{

enum { X2I, H2I, C2I, BI, X2O, H2O, C2O, BO, X2C, H2C, BC, GA, ATV, ATW1, ATW2}; //GA is the guard parameter for the last layer, ATV is the index for attention based parameters

AttentionLSTMBuilder::AttentionLSTMBuilder(unsigned layers,
        unsigned input_dim,
        unsigned hidden_dim,
        Model* model,
        LSTMBuilder& enc) : layers(layers), m_encoder(enc)
{
    unsigned layer_input_dim = input_dim;
    for (unsigned i = 0; i < layers; ++i) {
        // i
        Parameters* p_x2i = model->add_parameters({hidden_dim, layer_input_dim});
        Parameters* p_h2i;
        if(i == layers -1 )
            p_h2i = model->add_parameters({hidden_dim, hidden_dim + hidden_dim}); //if we are on the last layer, we concatnate the attention vector with dt
        else
            p_h2i = model->add_parameters({hidden_dim, hidden_dim });

        Parameters* p_c2i = model->add_parameters({hidden_dim, hidden_dim});
        Parameters* p_bi = model->add_parameters({hidden_dim});

        // o
        Parameters* p_x2o = model->add_parameters({hidden_dim, layer_input_dim});
        Parameters* p_h2o;
        if( i == layers -1 )
            p_h2o = model->add_parameters({hidden_dim, hidden_dim + hidden_dim});
        else
            p_h2o = model->add_parameters({hidden_dim, hidden_dim});

        Parameters* p_c2o = model->add_parameters({hidden_dim, hidden_dim});
        Parameters* p_bo = model->add_parameters({hidden_dim});

        // c
        Parameters* p_x2c = model->add_parameters({hidden_dim, layer_input_dim});
        Parameters* p_h2c;
        if( i == layers -1 )
            p_h2c = model->add_parameters({hidden_dim, hidden_dim + hidden_dim});
        else
            p_h2c = model->add_parameters({hidden_dim, hidden_dim});

        Parameters* p_bc = model->add_parameters({hidden_dim});
        layer_input_dim = hidden_dim;  // output (hidden) from 1st layer is input to next

        vector<Parameters*> ps = {p_x2i, p_h2i, p_c2i, p_bi, p_x2o, p_h2o, p_c2o, p_bo, p_x2c, p_h2c, p_bc};
        if(i == layers -1) {
            ps.push_back( model->add_parameters({hidden_dim}) );

            Parameters* p_atv = model->add_parameters({1, hidden_dim});
            ps.push_back(p_atv);

            Parameters* p_atw1 = model->add_parameters({hidden_dim, hidden_dim});
            ps.push_back(p_atw1);

            Parameters* p_atw2 = model->add_parameters({hidden_dim, hidden_dim});
            ps.push_back(p_atw2);
        }
        params.push_back(ps);
    }  // layers
}

void AttentionLSTMBuilder::new_graph_impl(ComputationGraph& cg)
{
    param_vars.clear();

    for (unsigned i = 0; i < layers; ++i) {
        auto& p = params[i];

        //i
        Expression i_x2i = parameter(cg,p[X2I]);
        Expression i_h2i = parameter(cg,p[H2I]);
        Expression i_c2i = parameter(cg,p[C2I]);
        Expression i_bi = parameter(cg,p[BI]);
        //o
        Expression i_x2o = parameter(cg,p[X2O]);
        Expression i_h2o = parameter(cg,p[H2O]);
        Expression i_c2o = parameter(cg,p[C2O]);
        Expression i_bo = parameter(cg,p[BO]);
        //c
        Expression i_x2c = parameter(cg,p[X2C]);
        Expression i_h2c = parameter(cg,p[H2C]);
        Expression i_bc = parameter(cg,p[BC]);

        vector<Expression> vars = {i_x2i, i_h2i, i_c2i, i_bi, i_x2o, i_h2o, i_c2o, i_bo, i_x2c, i_h2c, i_bc};
        if( i == layers -1 ) {
            vars.push_back( parameter(cg, p[GA]) );

            vars.push_back( parameter(cg, p[ATV]) );
            vars.push_back( parameter(cg, p[ATW1]) );
            vars.push_back( parameter(cg, p[ATW2]) );
        }
        param_vars.push_back(vars);

    }
}

// layout: 0..layers = c
//         layers+1..2*layers = h
void AttentionLSTMBuilder::start_new_sequence_impl(const vector<Expression>& hinit)
{
    h.clear();
    c.clear();
    if (hinit.size() > 0) {
        assert(layers*2 == hinit.size());
        h0.resize(layers);
        c0.resize(layers);
        for (unsigned i = 0; i < layers; ++i) {
            c0[i] = hinit[i];
            h0[i] = hinit[i + layers];
        }
        has_initial_state = true;
    } else {
        has_initial_state = false;
    }
}

Expression AttentionLSTMBuilder::add_input_impl(int prev, const Expression& x)
{
    h.push_back(vector<Expression>(layers));
    c.push_back(vector<Expression>(layers));
    vector<Expression>& ht = h.back();
    vector<Expression>& ct = c.back();
    //for attention
    vector<Expression> last_layer_new_ht;
    const vector<Expression>&  encoder_ht = this->m_encoder.getLastLayerHiddenVector();
    Expression con_encoder_ht = transpose( concatenate_cols(encoder_ht) );

    Expression in = x;
    for (unsigned i = 0; i < layers; ++i) {
        const vector<Expression>& vars = param_vars[i];
        Expression i_h_tm1, i_c_tm1;
        bool has_prev_state = (prev >= 0 || has_initial_state);
        if (prev < 0) {
            if (has_initial_state) {
                // intial value for h and c at timestep 0 in layer i
                // defaults to zero matrix input if not set in add_parameter_edges
                if(i == layers-1)
                    i_h_tm1 = concatenate({h0[i], vars[GA]});
                else
                    i_h_tm1 = h0[i];
                i_c_tm1 = c0[i];
            }
        } else {  // t > 0
            //i_h_tm1 = concatenate({h[prev][i], last_layer_new_ht[prev]});
            i_h_tm1 = h[prev][i];
            i_c_tm1 = c[prev][i];
        }
        // input
        Expression i_ait;
        if (has_prev_state)
            //      i_ait = vars[BI] + vars[X2I] * in + vars[H2I]*i_h_tm1 + vars[C2I] * i_c_tm1;
            i_ait = affine_transform({vars[BI], vars[X2I], in, vars[H2I], i_h_tm1, vars[C2I], i_c_tm1});
        else
            //      i_ait = vars[BI] + vars[X2I] * in;
            i_ait = affine_transform({vars[BI], vars[X2I], in});
        Expression i_it = logistic(i_ait);
        // forget
        Expression i_ft = 1.f - i_it;
        // write memory cell
        Expression i_awt;
        if (has_prev_state)
            //      i_awt = vars[BC] + vars[X2C] * in + vars[H2C]*i_h_tm1;
            i_awt = affine_transform({vars[BC], vars[X2C], in, vars[H2C], i_h_tm1});
        else
            //      i_awt = vars[BC] + vars[X2C] * in;
            i_awt = affine_transform({vars[BC], vars[X2C], in});
        Expression i_wt = tanh(i_awt);
        // output
        if (has_prev_state) {
            Expression i_nwt = cwise_multiply(i_it,i_wt);
            Expression i_crt = cwise_multiply(i_ft,i_c_tm1);
            ct[i] = i_crt + i_nwt;
        } else {
            ct[i] = cwise_multiply(i_it,i_wt);
        }

        Expression i_aot;
        if (has_prev_state)
            //      i_aot = vars[BO] + vars[X2O] * in + vars[H2O] * i_h_tm1 + vars[C2O] * ct[i];
            i_aot = affine_transform({vars[BO], vars[X2O], in, vars[H2O], i_h_tm1, vars[C2O], ct[i]});
        else
            //      i_aot = vars[BO] + vars[X2O] * in;
            i_aot = affine_transform({vars[BO], vars[X2O], in});
        Expression i_ot = logistic(i_aot);
        Expression ph_t = tanh(ct[i]);
        if( i == layers - 1 ) {
            in =  cwise_multiply(i_ot,ph_t);
            //in = ht[i] = cwise_multiply(i_ot,ph_t);
            //do attention here
            vector<Expression>  u_i;
            for(unsigned ta = 0 ; ta < encoder_ht.size(); ta++) {
                Expression u_i_t = vars[ATV] * tanh( vars[ATW1]* encoder_ht[ta] + vars[ATW2] * in );
                u_i.push_back(u_i_t);
            }
            Expression a_i = softmax( concatenate(u_i) );
            // d_t' = \sum_i ( a_i_t * h_i)
            Expression d_t = transpose(a_i) * con_encoder_ht;

            Expression new_d_t = transpose(d_t);
            last_layer_new_ht.push_back(  new_d_t );
            ht[i] =  concatenate({in, new_d_t}) ;
        } else {
            in = ht[i] = cwise_multiply(i_ot,ph_t);
        }
        //ht
    }
    return ht.back();
}

void AttentionLSTMBuilder::copy(const RNNBuilder & rnn)
{
    const AttentionLSTMBuilder & rnn_lstm = (const AttentionLSTMBuilder&)rnn;
    assert(params.size() == rnn_lstm.params.size());
    for(size_t i = 0; i < params.size(); ++i)
        for(size_t j = 0; j < params[i].size(); ++j)
            params[i][j]->copy(*rnn_lstm.params[i][j]);
}

} // namespace cnn
