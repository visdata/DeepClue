#include "cnn/grad-check.h"

#include <cassert>
#include <iostream>
#include <iomanip>

#include "cnn/model.h"
#include "cnn/cnn.h"
#include "cnn/tensor.h"
#include "cnn/training.h"

using namespace std;

namespace cnn {

bool CheckGrad(Model& m, ComputationGraph& g, Trainer& trainer) {
  cnn::real alpha = 5e-4;
  cerr<< " GRADIENT CHECKING" << endl;
  cnn::real E = as_scalar(g.forward());
  g.backward();

  bool flag = false;
  const vector<Parameters*>& params = m.parameters_list();
  for (auto pp : params) {
    //if(flag) break; //tzy
    Parameters& p = *pp;
    size_t ts = p.dim.size();
    //if(ts != 100 ) continue;
    cerr << "\nPARAMETERS " << pp  <<"\t" << p.dim << endl;
    //for (size_t i = 0; i < ts && !flag; ++i) { //tzy
    for (size_t i = 0; i < ts; ++i) { //tzy
      cnn::real old = p.values.v[i];
      p.values.v[i] = old - alpha;
      //cerr<< p.values.v[i]<<" ";
      cnn::real E_left = as_scalar(g.forward());

      p.values.v[i] = old + alpha;
      //cerr<< p.values.v[i]<<" ";
      cnn::real E_right = as_scalar(g.forward());
      cnn::real eg = (E_right - E_left) / (2 * alpha);
      cnn::real f = fabs(eg - p.g.v[i]);
      cnn::real m = max(fabs(eg), fabs(p.g.v[i]));
      if (f > 0.1) {
        if (m > 0.f) f /= m;
        //if (f > 0.1) { flag = true; cerr << "***[" << f*m <<"\t"<< old << "\t" << g << "\t" << p.g.v[i]<<"\t"<< E <<"\t" << E_left <<"\t" << E_right << "] "; }
          if (f > 0.1) { flag = true; cerr << std::setprecision(5)<< "***[ f:" << f*m <<"\told:"<< old << "\tg:" << eg << "\t ag:" << p.g.v[i]<<"\tE:"<< E <<"\tLeft:" << E_left <<"\tRight:" << E_right <<"\t"<<(E_right - E_left)/(2*alpha)<< " " << (E_right-E_left)<<" "<< alpha << "] "; }
      }
      p.values.v[i] = old; //tzy
      //cerr << p.g.v[i] << ' ' << g << endl; //tzy
    }
  }

  const vector<LookupParameters*>& lookup_params = m.lookup_parameters_list();
  for (auto pp : lookup_params) {
    //if(flag) break; //tzy
    cerr << "\nLOOKUP PARAMETERS " << pp << endl;
    LookupParameters& p = *pp;
    size_t ts = p.dim.size();
    for (unsigned j : p.non_zero_grads) {
      //cerr << "OBJECT=" << j << endl;
      Tensor& v = p.values[j];
      Tensor& ag = p.grads[j];
      //for (size_t i = 0; i < ts && !flag; ++i) { //tzy
      for (size_t i = 0; i < ts; ++i) { //tzy
        cnn::real old = v.v[i];
        v.v[i] = old - alpha;
        cnn::real E_left = as_scalar(g.forward());

        v.v[i] = old + alpha;
        cnn::real E_right = as_scalar(g.forward());
        cnn::real eg = (E_right - E_left) / (2 * alpha);
        cnn::real f = fabs(eg - ag.v[i]);
        cnn::real m = max(fabs(eg), fabs(ag.v[i]));
        if (f > 0.1) {
          if (m > 0.f) f /= m;
          //if (f > 0.1) { flag = true; cerr << "*** [" << f << "] "<<endl; }
            if (f > 0.1) { flag = true; cerr <<std::setprecision(5) << "***[ f:" << f*m <<"\told:"<< old << "\tg:" << eg << "\t ag:" << ag.v[i]<<"\tE:"<< E <<"\tLeft:" << E_left <<"\tRight:" << E_right << "\t"<< (E_right-E_left)/(2*alpha)<< "] "; }
        }
        v.v[i] = old; //tzy
        //cerr << ag.v[i] << ' ' << g << endl; //tzy
      }
      
    }
  }

  if (flag) {
    cerr << "\n*** GRADIENT CHECK FAILED ***\n";
  } else {
    cerr << "\nGRADIENT CHECK PASSED\n";
  }
  trainer.update(1.0);
  return !flag;
}

}

