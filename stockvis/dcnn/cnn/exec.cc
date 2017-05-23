#include "cnn/exec.h"

#include "cnn/param-nodes.h"

using namespace std;

namespace cnn {

ExecutionEngine::~ExecutionEngine() {}

void SimpleExecutionEngine::invalidate() {
    last_node_evaluated = 0;
}

const Tensor& SimpleExecutionEngine::forward() { 
  const VariableIndex node_max_index = (VariableIndex)cg.nodes.size();
  return forward(node_max_index);
}

const Tensor& SimpleExecutionEngine::forward(VariableIndex i) {
  invalidate();
  return incremental_forward(i);
}

const Tensor& SimpleExecutionEngine::get_value(VariableIndex i) {
    assert(i < cg.nodes.size());
    if (i >= last_node_evaluated) {
        incremental_forward(i);
    }
    return nfxs[i];
}

const Tensor& SimpleExecutionEngine::incremental_forward() {
  const VariableIndex node_max_index = (VariableIndex)cg.nodes.size();
  return incremental_forward(node_max_index);
}

const Tensor& SimpleExecutionEngine::incremental_forward(VariableIndex node_max_index) {
  // free any old memory if this is a new HG
  if (last_node_evaluated == 0) fxs->free();

  assert(node_max_index > 0);
  nfxs.resize(node_max_index);
  if (node_max_index - last_node_evaluated == 0)
    return nfxs.back();

  //vector<string> dummy(5, "x");
  vector<const Tensor*> xs(16);
  for (; last_node_evaluated < node_max_index; ++last_node_evaluated) {
    const Node* node = cg.nodes[last_node_evaluated];
    xs.resize(node->arity());
    unsigned ai = 0;
    for (VariableIndex arg : node->args) {
      xs[ai] = &nfxs[arg];
      ++ai;
    }
    nfxs[last_node_evaluated].d = node->dim;
    nfxs[last_node_evaluated].v = static_cast<cnn::real*>(fxs->allocate(node->dim.size() * sizeof(cnn::real)));
    if (nfxs[last_node_evaluated].v == nullptr) {
      cerr << "out of memory\n";
      abort();
    }
    void* aux_mem = nullptr;
    size_t aux_size = node->aux_storage_size();
    if (aux_size) {
      aux_mem = fxs->allocate(aux_size);
      if (!aux_mem) {
        cerr << "out of memory\n";
        abort();
      }
    }
    node->aux_mem = aux_mem;
    node->forward(xs, nfxs[last_node_evaluated]);
  }
  return nfxs.back();
}

void SimpleExecutionEngine::backward() {
  if (nfxs.back().d.size() != 1) {
    cerr << "backward() called on non-scalar node.\n";
    abort();
  }

  const unsigned num_nodes = cg.nodes.size();
  ndEdfs.resize(num_nodes);
  dEdfs->free();
  for (unsigned i = 0; i < num_nodes; ++i) {
    const auto dim = nfxs[i].d;
    ndEdfs[i].d = dim;
    ndEdfs[i].v = static_cast<cnn::real*>(dEdfs->allocate(dim.size() * sizeof(cnn::real)));
    assert(ndEdfs[i].v);
  }
  dEdfs->zero_allocated_memory();
  // initialize dE/dE = 1
  ndEdfs.back().v = kSCALAR_ONE;

  // here we find constant paths to avoid doing extra work
  vector<bool> needs_derivative(num_nodes, false);
  for (auto i : cg.parameter_nodes)
    needs_derivative[i] = true;

  for (unsigned ni = 0; ni < num_nodes; ++ni) {
    bool nd = needs_derivative[ni];
    for (auto arg : cg.nodes[ni]->args)
      nd |= needs_derivative[arg];
    needs_derivative[ni] = nd;
  }

  // loop in reverse topological order
  vector<const Tensor*> xs;
  for (int i = num_nodes - 1; i >= 0; --i) {
    const Node* node = cg.nodes[i];
    xs.resize(node->arity());
    unsigned ai = 0;
    for (VariableIndex arg : node->args) {
      xs[ai] = &nfxs[arg];
      ++ai;
    }
    ai = 0;
    for (VariableIndex arg : node->args) {
      if (needs_derivative[arg]) {
        node->backward(xs, nfxs[i], ndEdfs[i], ai, ndEdfs[arg]);
      }
      ++ai;
    }
  }

  // accumulate gradients into parameters
  // this is simpler than you might find in some other frameworks
  // since we assume parameters come into the graph as a "function"
  // that returns the current value of the parameters
  for (VariableIndex i : cg.parameter_nodes)
    static_cast<ParameterNodeBase*>(cg.nodes[i])->accumulate_grad(ndEdfs[i]);
}

} // namespace cnn
