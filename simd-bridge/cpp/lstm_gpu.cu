// Minimal CUDA LSTM GPU stub
// This file provides a tiny GPU kernel that performs an elementwise add on two arrays
// and serves as a compilable placeholder for later tensor-core/TensorRT kernels.

/*
  Build notes:
  - To compile the GPU path use nvcc (so __CUDACC__ is defined).
  - To force CPU-only build add -DNO_CUDA to your compiler flags.
  - If you get "Cannot find libdevice" or similar, either provide --cuda-path
    to the compiler or build with -DNO_CUDA to use the CPU fallback.
*/

#if defined(__CUDACC__) && !defined(NO_CUDA)

#include <cuda_runtime.h>
#include <cstdio>

extern "C" __global__ void lstm_add_kernel(const float* a, const float* b, float* out, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) out[i] = a[i] + b[i];
}

extern "C" int run_lstm_add(const float* a, const float* b, float* out, int n) {
    if (n <= 0 || !a || !b || !out) return -1;

    float *d_a = nullptr, *d_b = nullptr, *d_out = nullptr;
    size_t sz = sizeof(float) * (size_t)n;
    cudaError_t err = cudaSuccess;

    err = cudaMalloc((void**)&d_a, sz);
    if (err != cudaSuccess) return -2;

    err = cudaMalloc((void**)&d_b, sz);
    if (err != cudaSuccess) { cudaFree(d_a); return -3; }

    err = cudaMalloc((void**)&d_out, sz);
    if (err != cudaSuccess) { cudaFree(d_a); cudaFree(d_b); return -4; }

    err = cudaMemcpy(d_a, a, sz, cudaMemcpyHostToDevice);
    if (err != cudaSuccess) goto fail;

    err = cudaMemcpy(d_b, b, sz, cudaMemcpyHostToDevice);
    if (err != cudaSuccess) goto fail;

    const int block = 256;
    const int grid = (n + block - 1) / block;
    lstm_add_kernel<<<grid, block>>>(d_a, d_b, d_out, n);

    err = cudaGetLastError();
    if (err != cudaSuccess) goto fail;

    // Ensure kernel finished before copying back
    err = cudaDeviceSynchronize();
    if (err != cudaSuccess) goto fail;

    err = cudaMemcpy(out, d_out, sz, cudaMemcpyDeviceToHost);
    if (err != cudaSuccess) goto fail;

    cudaFree(d_a); cudaFree(d_b); cudaFree(d_out);
    return 0;

fail:
    // Best-effort cleanup
    if (d_a) cudaFree(d_a);
    if (d_b) cudaFree(d_b);
    if (d_out) cudaFree(d_out);
    return -99;
}

#else

// CPU-only fallback: elementwise add. Safe, simple, and easy to build without CUDA.
// Removed unused <cstring> and <cstdio> includes to silence "header not used" warnings.
extern "C" int run_lstm_add(const float* a, const float* b, float* out, int n) {
    if (n <= 0 || !a || !b || !out) return -1;
    for (int i = 0; i < n; ++i) {
        out[i] = a[i] + b[i];
    }
    return 0;
}

#endif
