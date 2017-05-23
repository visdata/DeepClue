#ifndef CNN_EIGEN_TENSOR_H
#define CNN_EIGEN_TENSOR_H

#include <initializer_list>
#include <vector>

#include "cnn/dim.h"
#include "cnn/random.h"
#include "cnn/aligned-mem-pool.h"

#if HAVE_CUDA
#include <cuda.h>
#include <cuda_runtime.h>
#include "cnn/cuda.h"
#endif
#include <boost/serialization/array.hpp>
// CNN manages its own memory. DO NOT remove the following line

// Following line is commented out because it causes errors with large nets (Antonis)
//#define EIGEN_NO_MALLOC

// This prevents Eigen from trying to allocate heap and crashing due to NO_MALLOC
#define EIGEN_STACK_ALLOCATION_LIMIT 1000000000

#include <Eigen/Eigen>

namespace cnn {

#define EIGEN_BACKEND 1

//typedef float real;
typedef double real;

struct Tensor {
  Tensor() = default;
  Tensor(const Dim& d, cnn::real* v) : d(d), v(v) {}
  const Eigen::Map<Eigen::MatrixXd, Eigen::Aligned> operator*() const {
    return Eigen::Map<Eigen::MatrixXd, Eigen::Aligned>(v, d.rows(), d.cols());
  }
  Eigen::Map<Eigen::MatrixXd, Eigen::Aligned> operator*() {
    return Eigen::Map<Eigen::MatrixXd, Eigen::Aligned>(v, d.rows(), d.cols());
  }
  // this is very slow: use sparingly
  inline bool is_valid() const {
#if HAVE_CUDA
    std::cerr << "is_valid() not implemented with HAVE_CUDA\n";
    abort();
#else
    const size_t s = d.size();
    for (unsigned i = 0; i < s; ++i)
      if (std::isnan(v[i]) || std::isinf(v[i])) return false;
    return true;
#endif
  }
  Dim d;
  cnn::real* v;

 private:
  friend class boost::serialization::access;
  template<class Archive>
  void save(Archive& ar, const unsigned int) const {
    ar & d;
#if HAVE_CUDA
    cnn::real* vc = (cnn::real*)malloc(d.size() * sizeof(cnn::real));
    CUDA_CHECK(cudaMemcpy(vc, v, d.size() * sizeof(cnn::real), cudaMemcpyDeviceToHost));
    ar & boost::serialization::make_array(vc, d.size());
    free(vc);
#else
    ar & boost::serialization::make_array(v, d.size());
#endif
  }
  template<class Archive>
  void load(Archive& ar, const unsigned int) {
    ar & d;
#if HAVE_CUDA
    CUDA_CHECK(cudaMalloc(&v, d.size() * sizeof(cnn::real)));
    cnn::real* vc = static_cast<cnn::real*>(std::malloc(d.size() * sizeof(cnn::real)));
    ar & boost::serialization::make_array(vc, d.size());
    CUDA_CHECK(cudaMemcpyAsync(v, vc, d.size() * sizeof(cnn::real), cudaMemcpyHostToDevice));
#else
    v = static_cast<cnn::real*>(cnn_mm_malloc(d.size() * sizeof(cnn::real), 32));
    ar & boost::serialization::make_array(v, d.size());
#endif
  }
  BOOST_SERIALIZATION_SPLIT_MEMBER()
};

std::ostream& operator<<(std::ostream& os, const Tensor& t);
real as_scalar(const Tensor& t);
std::vector<real> as_vector(const Tensor& v);

struct TensorTools {
  static void Constant(Tensor& d, cnn::real c);
  static void Zero(Tensor& d);
  static void Randomize(Tensor& val, real scale);
  static void Randomize(Tensor& d);
  // sample some bernoulli random variables and scale them by scale
  static void RandomBernoulli(Tensor& val, real p, real scale = 1.0);
  static void RandomizeNormal(real mean, real stddev, Tensor& val);
  // AccessElement is very, very slow (potentially) - use appropriately
  static cnn::real AccessElement(const Tensor& v, const Dim& index);
  static void SetElements(const Tensor& v, const std::vector<cnn::real>& vec);
  static void CopyElements(const Tensor& v, const Tensor& v_src);
};
real rand01();
real rand_normal();

} // namespace cnn

#endif
