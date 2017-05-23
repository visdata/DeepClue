#include "cnn/tensor.h"

#include <random>
#include <vector>
#include <cstring>

#if HAVE_CUDA
#include "cnn/cuda.h"
#endif

using namespace std;

namespace cnn {

ostream& operator<<(ostream& os, const Tensor& t) {
#if HAVE_CUDA
  vector<real> vt = as_vector(t);
  Eigen::Map<Eigen::MatrixXf> m(&vt[0], t.d.rows(), t.d.cols());
  os << m;
#else
  os << (*t);
#endif
  return os;
}

real as_scalar(const Tensor& t) {
  assert(t.d.size() == 1);
#if HAVE_CUDA
  cnn::real res;
  CUDA_CHECK(cudaMemcpy(&res, t.v, sizeof(cnn::real), cudaMemcpyDeviceToHost));
  return res;
#else
  return t.v[0];
#endif
}

vector<real> as_vector(const Tensor& v) {
  vector<real> res(v.d.size());
#if HAVE_CUDA
  CUDA_CHECK(cudaMemcpy(&res[0], v.v, sizeof(real) * res.size(), cudaMemcpyDeviceToHost));
#else
  memcpy(&res[0], v.v, sizeof(real) * res.size());
#endif
  return res;
}

cnn::real TensorTools::AccessElement(const Tensor& v, const Dim& index) {
#if HAVE_CUDA
  abort();
#else
  return (*v)(index[0], index[1]);
#endif
}

void TensorTools::SetElements(const Tensor& v, const vector<cnn::real>& vec) {
#if HAVE_CUDA
  cudaMemcpyAsync(v.v, &vec[0], sizeof(real) * vec.size(), cudaMemcpyHostToDevice);
#else
  memcpy(v.v, &vec[0], sizeof(real) * vec.size());
#endif
}

void TensorTools::CopyElements(const Tensor& v, const Tensor& v_src) {
#if HAVE_CUDA
  cudaMemcpyAsync(v.v, v_src.v, sizeof(real) * v.d.size(), cudaMemcpyDeviceToDevice);
#else
  memcpy(v.v, v_src.v, sizeof(real) * v.d.size());
#endif
}

void TensorTools::Constant(Tensor& d, cnn::real c) {
#if HAVE_CUDA
  if (!c) {
    CUDA_CHECK(cudaMemsetAsync(d.v, 0, d.d.size() * sizeof(cnn::real)));
  } else {
    fill(d.v, d.v + d.d.size(), c);
  }
#else
  if (!c) {
    memset(d.v, c, d.d.size() * sizeof(cnn::real));
  } else {
    fill(d.v, d.v + d.d.size(), c);
  }
#endif
}

void TensorTools::Zero(Tensor& d) {
  Constant(d, 0);
}

void TensorTools::Randomize(Tensor& val, real scale) {
  uniform_real_distribution<real> distribution(-scale,scale);
  auto b = [&] {return distribution(*rndeng);};
#if HAVE_CUDA
  cnn::real* t = new cnn::real[val.d.size()];
  generate(t, t + val.d.size(), b);
  CUDA_CHECK(cudaMemcpy(val.v, t, sizeof(real) * val.d.size(), cudaMemcpyHostToDevice));
  delete[] t;
#else
  generate(val.v, val.v + val.d.size(), b);
#endif
}

void TensorTools::Randomize(Tensor& d) {
  //std::cerr<< d.d << " "<<sqrt(6) / sqrt(d.d.sum_dims()) << " " << 0.3/sqrt(d.d.sum_dims())<< endl;
  Randomize(d, sqrt(6) / sqrt(d.d.sum_dims()));
  //Randomize(d, 0.3 / sqrt(d.d.sum_dims()));
}

void TensorTools::RandomBernoulli(Tensor& val, real p, real scale) {
  bernoulli_distribution distribution(p);
  auto b = [&] {return distribution(*rndeng) * scale;};
  generate(val.v, val.v + val.d.size(), b);
}

void TensorTools::RandomizeNormal(real mean, real stddev, Tensor& val) {
  normal_distribution<real> distribution(mean, stddev);
  auto b = [&] {return distribution(*rndeng);};
  generate(val.v, val.v + val.d.size(), b);
}

real rand01() {
  uniform_real_distribution<real> distribution(0, 1);
  return distribution(*rndeng);
}

real rand_normal() {
  normal_distribution<real> distribution(0, 1);
  return distribution(*rndeng);
}

} // namespace cnn
