#include <cstddef>
#include <cstdio>

// External symbol implemented in another translation unit / library.
// Keep C linkage so the symbol name is stable for interop.
extern "C" {
int run_lstm_add(const float *a, const float *b, float *out, int n);
}

// Bridge exported with C linkage. Performs minimal argument validation
// and delegates to run_lstm_add.
// Return values:
//   0  - success (as forwarded from run_lstm_add)
//  -1  - invalid arguments (null pointers or non-positive length)
extern "C" int bridge_run_lstm(const float* a, const float* b, float* out, int n) {
  // Validate pointers
  if (a == nullptr || b == nullptr || out == nullptr) {
    std::fprintf(stderr, "bridge_run_lstm: invalid null pointer argument\n");
    return -1;
  }

    // Validate length
    if (n <= 0) {
      std::fprintf(stderr, "bridge_run_lstm: invalid length n=%d\n", n);
      return -1;
    }

    // Delegate to implementation. We don't modify semantics of run_lstm_add;
    // propagate its return value (0 for success by convention here).
    return run_lstm_add(a, b, out, n);
}
