#include <cstddef>
#include <vector>
#include <cstdio>

extern "C" {
    // Provided by another translation unit; ensure C linkage for the symbol.
    int run_lstm_add(const float* a, const float* b, float* out, int n);
}

// Bridge exported with C linkage. Performs minimal argument validation
// and delegates to run_lstm_add.
extern "C" int bridge_run_lstm(const float* a, const float* b, float* out, int n) {
    if (!a || !b || !out || n <= 0) {
        // invalid arguments
        return -1;
    }
    return run_lstm_add(a, b, out, n);
}
