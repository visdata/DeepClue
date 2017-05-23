#include "cnn/cnn.h"
#include "cnn/exec.h"
#include "cnn/nodes.h"
#include "cnn/param-nodes.h"
#include "cnn/aligned-mem-pool.h"
#include "cnn/cnn-helper.h"
#include "cnn/expr.h"

using namespace std;

namespace cnn {

cnn::real* kSCALAR_MINUSONE;
cnn::real* kSCALAR_ONE;
cnn::real* kSCALAR_ZERO;
int n_hgs = 0;

Node::~Node() {}
size_t Node::aux_storage_size() const { return 0; }

ComputationGraph::ComputationGraph() : last_node_evaluated(),
  ee(new SimpleExecutionEngine(*this)) {
  ++n_hgs;
  if (n_hgs > 1) {
    cerr << "Memory allocator assumes only a single ComputationGraph at a time.\n";
    throw std::runtime_error("Attempted to create >1 CG");
  }
}

ComputationGraph::~ComputationGraph() {
  this->clear();
  delete ee;
  --n_hgs;
}

void ComputationGraph::clear() {
  last_node_evaluated = VariableIndex();
  parameter_nodes.clear();
  for (auto n : nodes) delete n;
  nodes.clear();
}

VariableIndex ComputationGraph::add_input(real s) {
  VariableIndex new_node_index(nodes.size());
  nodes.push_back(new ScalarInputNode(s));
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_input(const real* ps) {
  VariableIndex new_node_index(nodes.size());
  nodes.push_back(new ScalarInputNode(ps));
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_input(const Dim& d, const vector<cnn::real>* pm) {
  VariableIndex new_node_index(nodes.size());
  //cout<<"inside add input"<<endl;
  //copy(pm->begin(), pm->end(), ostream_iterator<cnn::real>(cout, " "));
  //cout<<endl;
  nodes.push_back(new InputNode(d, pm));
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_parameters(Parameters* p) {
  VariableIndex new_node_index(nodes.size());
  ParameterNode* new_node = new ParameterNode(p);
  nodes.push_back(new_node);
  parameter_nodes.push_back(new_node_index);
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_lookup(LookupParameters* p, const unsigned* pindex) {
  VariableIndex new_node_index(nodes.size());
  LookupNode* new_node = new LookupNode(p, pindex);
  nodes.push_back(new_node);
  parameter_nodes.push_back(new_node_index);
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_lookup(LookupParameters* p, unsigned index) {
  VariableIndex new_node_index(nodes.size());
  LookupNode* new_node = new LookupNode(p, index);
  nodes.push_back(new_node);
  parameter_nodes.push_back(new_node_index);
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_const_lookup(LookupParameters* p, const unsigned* pindex) {
  VariableIndex new_node_index(nodes.size());
  LookupNode* new_node = new LookupNode(p, pindex);
  // get rid of the following in favor of using parameter_nodes to see the needs_derivative
  // expression
  nodes.push_back(new_node);
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

VariableIndex ComputationGraph::add_const_lookup(LookupParameters* p, unsigned index) {
  VariableIndex new_node_index(nodes.size());
  LookupNode* new_node = new LookupNode(p, index);
  nodes.push_back(new_node);
  set_dim_for_new_node(new_node_index);
  return new_node_index;
}

// factory function should call this right after creating a new node object
// to set its dimensions properly
void ComputationGraph::set_dim_for_new_node(const VariableIndex& i) {
  Node* node = nodes[i];
  vector<Dim> xds(node->arity());
  unsigned ai = 0;
  for (VariableIndex arg : node->args) {
    xds[ai] = nodes[arg]->dim;
    ++ai;
  }
  node->dim = node->dim_forward(xds);
}

const Tensor& ComputationGraph::incremental_forward() { return ee->incremental_forward(); }
const Tensor& ComputationGraph::forward() { return ee->forward(); }
const Tensor& ComputationGraph::get_value(VariableIndex i) { return ee->get_value(i); }
const Tensor& ComputationGraph::get_value(const expr::Expression& e) { return this->get_value(e.i); }
void ComputationGraph::invalidate() { ee->invalidate(); }
void ComputationGraph::backward() { ee->backward(); }

void ComputationGraph::PrintGraphviz() const {
  cerr << "digraph G {\n  rankdir=LR;\n  nodesep=.05;\n";
  unsigned nc = 0;
  for (auto node : nodes) {
    vector<string> var_names;
    for (auto arg : node->args)
      var_names.push_back(string("v") + to_string((unsigned)arg));
    cerr << "  N" << nc << " [label=\"v" << nc << " = "
         << node->as_string(var_names) << "\"];\n";
    for (auto arg : node->args)
      cerr << "  N" << ((unsigned)arg) << " -> N" << nc << ";\n";
    ++nc;
  }
  cerr << "}\n";
}

}  // namespace cnn

