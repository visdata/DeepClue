#ifndef CNN_GRAD_CHECK_H
#define CNN_GRAD_CHECK_H

namespace cnn {

class Model;
struct ComputationGraph;
class Trainer;

bool CheckGrad(Model& m, ComputationGraph& g, Trainer& trainer);

} // namespace cnn

#endif
