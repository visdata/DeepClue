#ifndef CNN_GPU_FUNCTORS_H
#define CNN_GPU_FUNCTORS_H

#include <cstdint>

#if HAVE_CUDA
#  define CNN_DEVICE_FUNC __device__
#else
#  define CNN_DEVICE_FUNC
#endif

// these functions are used both in CPU and in GPU computation
// this file may be compiled with NVCC or a standard C++ tool.
// if you need a new elementwise (nullary, unary, binary...)
// functor, this is the place for it

#define cast_uint32_t static_cast<uint32_t>

// THIS CODE IS BROKEN- sometimes it returns NaN
// it is commented out for this reason
static inline cnn::real fastpow2 (cnn::real p) {
  cnn::real offset = (p < 0) ? 1.0f : 0.0f;
  cnn::real clipp = (p < -126) ? -126.0f : p;
  int w = clipp;
  cnn::real z = clipp - w + offset;
  union { uint32_t i; cnn::real f; } v = { cast_uint32_t ( (1 << 23) * (clipp + 121.2740575f + 27.7280233f / (4.84252568f - z) - 1.49012907f * z) ) };

  return v.f;
}

#if 1
#if 0
static inline cnn::real fastexp (cnn::real p) {
  return fastpow2 (1.442695040f * p);
}
#else
static inline cnn::real fastexp (cnn::real p) {
  return exp(p);
}
#endif
#else
// Schraudolph version, but it's a bit crappy in terms of
// performance and not that much faster
#define EXPAF (8388608 / 0.6931471806f)
static inline cnn::real fastexp (cnn::real p) {
  union { cnn::real f; int32_t i; } eco;
  eco.i = (int32_t)(EXPAF * (p)) + 1065353216;
  return eco.f;
}
#endif

#if defined(__GNU_LIBRARY__) && (__GLIBC__ == 2) && (__GLIBC_MINOR__ < 14) && !defined(HAVE_CUDA)
#define USE_FASTEXP
#else
#undef USE_FASTEXP
#endif

#ifdef USE_FASTEXP
#define CNN_EXPF fastexp
#else
#define CNN_EXPF expf
#endif

namespace cnn {

struct FHuberForward {
  FHuberForward(cnn::real c) : c(c) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    const cnn::real a = fabs(x);
    return (a < c) ? x*x : c*(2*a - c);
  }
  const cnn::real c;
};

template <typename T> int sgn(T val) {
  return (T(0) < val) - (val < T(0));
}

struct FL1Backward {
  FL1Backward(cnn::real d) : d(d) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return sgn(x) * d;
  }
  const cnn::real d;
};

struct FHuberBackward {
  FHuberBackward(cnn::real c, cnn::real dEdf) : c(c), d(dEdf) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    const cnn::real a = fabs(x);
    return (2 * d) * ((a < c) ? x : c * sgn(x));
  }
  const cnn::real c;
  const cnn::real d;
};

struct FProduct {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real a, cnn::real b) const {
    return a * b;
  }
};

struct FQuotient {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real a, cnn::real b) const {
    return a / b;
  }
};

struct FConstantPlus {
  FConstantPlus(cnn::real c) : c(c) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return c + x;
  }
  cnn::real c;
};

struct FConstantMinus {
  FConstantMinus(cnn::real c) : c(c) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return c - x;
  }
  cnn::real c;
};

struct FNegate {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return -x;
  }
};

struct FTanh {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
#ifdef FAST_TANH
    cnn::real x2 = x * x;
    cnn::real a = x * (135135.0f + x2 * (17325.0f + x2 * (378.0f + x2)));
    cnn::real b = 135135.0f + x2 * (62370.0f + x2 * (3150.0f + x2 * 28.0f));
    return a / b;
#else
    return tanhf(x);
#endif
  }
};

struct FMaxBackwardInv {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real u, cnn::real d) const {
    return (1.f - u) * d;
  }
};

struct FTanhBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return (1.f - t * t) * d;
  }
};

struct FPairwiseRankLoss {
  FPairwiseRankLoss(cnn::real m) : margin(m) {}
  CNN_DEVICE_FUNC cnn::real operator()(cnn::real a, cnn::real b) const {
    cnn::real d = margin - a + b;
    return d > 0.f ? d : 0.f;
  }
  cnn::real margin;
};

struct FRectifyBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return (t) ? d : 0.f;
  }
};

struct FRectifyNegateBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return (t) ? -d : 0.f;
  }
};

struct FSoftmaxNormalize {
  explicit FSoftmaxNormalize(cnn::real logz) : logz(logz) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return CNN_EXPF(x - logz);
  }
  cnn::real logz;
};

struct FSoftmaxBackward {
  explicit FSoftmaxBackward(cnn::real off_diag_sum) : off_diag_sum(off_diag_sum) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return (off_diag_sum + d) * t;
  }
  cnn::real off_diag_sum;
};

struct FNegLogSoftmaxBackward {
  FNegLogSoftmaxBackward(cnn::real lz, cnn::real err) : logz(lz), d(err) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t) const {
    return CNN_EXPF(t - logz) * d;
  }
  cnn::real logz;
  cnn::real d;
};

struct FPtrNegLogSoftmaxBackward {
  FPtrNegLogSoftmaxBackward(const cnn::real* lz, const cnn::real* err) : logz(lz), d(err) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t) const {
    return CNN_EXPF(t - *logz) * *d;
  }
  const cnn::real* logz;
  const cnn::real* d;
};

struct FLogSoftmaxNormalize {
  explicit FLogSoftmaxNormalize(cnn::real logz) : logz(logz) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return x - logz;
  }
  cnn::real logz;
};

struct FWeightedError {
  cnn::real operator()(cnn::real t, cnn::real d) const {
    return CNN_EXPF(t) * d / CNN_EXPF(t);
  }
};

struct FLogSoftmaxBackward {
  explicit FLogSoftmaxBackward(cnn::real off_diag_sum) : off_diag_sum(off_diag_sum) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return off_diag_sum * CNN_EXPF(t) + d;
    //return (off_diag_sum + d) * t;
  }
  cnn::real off_diag_sum;
};

struct FRectify {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return (x > 0.f) ? x : 0.f;
  }
};

struct FSoftSign {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return x / (1.f + (x < 0.f ? -x : x));
  }
};

struct FSoftSignBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    cnn::real a = 1.f - (t < 0.f ? -t : t);
    return a * a * d;
  }
};

struct FLogisticSigmoid {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x) const {
    return 1.f / (1.f + CNN_EXPF(-x));
  }
};

struct FLogisticSigmoidBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real t, cnn::real d) const {
    return (1.f - t) * t * d;
  }
};

struct FSqDist {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real a, cnn::real b) const {
    cnn::real d = a - b;
    return d * d;
  }
};

struct FEuclideanBackward {
  FEuclideanBackward(int i, const cnn::real* s) : i(i), scalar(s) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real a, cnn::real b) const {
    return (i == 0 ? 2.f : -2.f) * (*scalar) * (a - b);
  }
  int i;
  const cnn::real* scalar;
};

struct FL2SGDUpdate {
  FL2SGDUpdate(cnn::real l, cnn::real s) : lambda(l), scale(-s) {}
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x, cnn::real g) const {
    return scale * g - x * lambda;
  }
  cnn::real lambda;
  cnn::real scale;
};

struct FBinaryLogLoss {
    CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x, cnn::real x_true) const {
        if (x_true == 1.f) {
            if (x == 0.f) x = std::numeric_limits<float>::min();
            return -1.f * x_true * log(x);
        }
        else if (x_true == 0.f) {
            if (x == 1.f) x = std::numeric_limits<float>::min();
            return (x_true - 1.f) * log1p(-x);
        }
        else {
            if (x == 0.f) x = std::numeric_limits<float>::min();
            if (x == 1.f) x = std::numeric_limits<float>::min();
            return -1.f * (x_true * log(x) + (1.f - x_true) * log1p(-x));
        }
    }
};

struct FBinaryLogLossBackward {
  CNN_DEVICE_FUNC inline cnn::real operator()(cnn::real x, cnn::real x_true, cnn::real d) const {
    cnn::real scale = (x_true > 0.f) ? -x_true/x : (1.f-x_true)/(1.-x);
    return d * scale;
  }
};

} // namespace cnn

#endif
