#ifndef CNN_SAXE_INIT_H_
#define CNN_SAXE_INIT_H_
#include "cnn/tensor.h"
namespace cnn {

struct Tensor;

void OrthonormalRandom(int dim, cnn::real g, Tensor& x);

}

#endif
