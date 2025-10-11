#include <iostream>
#include <vector> // added: define std::vector

extern "C" int bridge_run_lstm(const float* a, const float* b, float* out, int n);

int main() {
    const int n = 512;
    std::vector<float> a(n), b(n), out(n);
    for (int i = 0; i < n; ++i) { a[i] = i * 1.0f; b[i] = (n - i) * 1.0f; }
    int r = bridge_run_lstm(a.data(), b.data(), out.data(), n);
    std::cout << "bridge_run_lstm returned: " << r << "\n";
    if (r == 0) std::cout << "out[0]=" << out[0] << " out[n-1]=" << out[n-1] << "\n";
    return r;
}
