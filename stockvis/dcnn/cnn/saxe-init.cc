#include "cnn/saxe-init.h"
#include "cnn/tensor.h"

#include <random>
#include <cstring>

#include <Eigen/SVD>

using namespace std;

namespace cnn {

void OrthonormalRandom(int dd, cnn::real g, Tensor& x) {
  Tensor t;
  t.d = Dim({dd, dd});
  t.v = new cnn::real[dd * dd];
  normal_distribution<cnn::real> distribution(0, 0.01);
  auto b = [&] () {return distribution(*rndeng);};
  generate(t.v, t.v + dd*dd, b);
  Eigen::JacobiSVD<Eigen::MatrixXd> svd(*t, Eigen::ComputeFullU);
  *x = svd.matrixU();
  delete[] t.v;
}

}

