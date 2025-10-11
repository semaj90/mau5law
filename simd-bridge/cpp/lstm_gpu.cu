// Minimal CUDA LSTM GPU stub
// This file provides a tiny GPU kernel that performs an elementwise add on two arrays
// and serves as a compilable placeholder for later tensor-core/TensorRT kernels.

#include <cuda_runtime.h>
#include <cstdio>

extern "C" __global__ void lstm_add_kernel(const float* a, const float* b, float* out, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) out[i] = a[i] + b[i];
}

extern "C" int run_lstm_add(const float* a, const float* b, float* out, int n) {
    float *d_a=nullptr, *d_b=nullptr, *d_out=nullptr;
    size_t sz = sizeof(float) * n;
    if (cudaMalloc((void**)&d_a, sz) != cudaSuccess) return -1;
    if (cudaMalloc((void**)&d_b, sz) != cudaSuccess) { cudaFree(d_a); return -2; }
    if (cudaMalloc((void**)&d_out, sz) != cudaSuccess) { cudaFree(d_a); cudaFree(d_b); return -3; }
    if (cudaMemcpy(d_a, a, sz, cudaMemcpyHostToDevice) != cudaSuccess) goto fail;
    if (cudaMemcpy(d_b, b, sz, cudaMemcpyHostToDevice) != cudaSuccess) goto fail;
    int block = 256;
    int grid = (n + block - 1) / block;
    lstm_add_kernel<<<grid, block>>>(d_a, d_b, d_out, n);
    if (cudaMemcpy(out, d_out, sz, cudaMemcpyDeviceToHost) != cudaSuccess) goto fail;
    cudaFree(d_a); cudaFree(d_b); cudaFree(d_out);
    return 0;
fail:
    cudaFree(d_a); cudaFree(d_b); cudaFree(d_out);
    return -99;
}
