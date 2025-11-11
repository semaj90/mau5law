#include <cuda_runtime.h>
#include <cmath>
#include <iostream>
#include <vector>

// --- CUDA reduction kernel for cosine similarity ---
__global__ void cosine_similarity_kernel(
    const float* __restrict__ a,
    const float* __restrict__ b,
    float* __restrict__ partial_dot,
    float* __restrict__ partial_norm_a,
    float* __restrict__ partial_norm_b,
    int n)
{
    __shared__ float dot[256];
    __shared__ float norm_a[256];
    __shared__ float norm_b[256];

    int tid = threadIdx.x;
    int i = blockIdx.x * blockDim.x + tid;

    float local_dot = 0.0f, local_a = 0.0f, local_b = 0.0f;
    if (i < n) {
        float va = a[i];
        float vb = b[i];
        local_dot = va * vb;
        local_a = va * va;
        local_b = vb * vb;
    }
    dot[tid]     = local_dot;
    norm_a[tid]  = local_a;
    norm_b[tid]  = local_b;
    __syncthreads();

    // Parallel reduction
    for (int s = blockDim.x / 2; s > 0; s >>= 1) {
        if (tid < s) {
            dot[tid] += dot[tid + s];
            norm_a[tid] += norm_a[tid + s];
            norm_b[tid] += norm_b[tid + s];
        }
        __syncthreads();
    }

    if (tid == 0) {
        partial_dot[blockIdx.x] = dot[0];
        partial_norm_a[blockIdx.x] = norm_a[0];
        partial_norm_b[blockIdx.x] = norm_b[0];
    }
}

// --- Host wrapper function ---
extern "C" void compute_cosine_similarity(
    const float* vec_a,
    const float* vec_b,
    float* result,
    int embedding_dim)
{
    int threads = 256;
    int blocks = (embedding_dim + threads - 1) / threads;

    // Allocate temporary partial results
    float *d_a, *d_b, *d_dot, *d_na, *d_nb;
    cudaMalloc(&d_a, embedding_dim * sizeof(float));
    cudaMalloc(&d_b, embedding_dim * sizeof(float));
    cudaMalloc(&d_dot, blocks * sizeof(float));
    cudaMalloc(&d_na, blocks * sizeof(float));
    cudaMalloc(&d_nb, blocks * sizeof(float));

    // Copy to device
    cudaMemcpy(d_a, vec_a, embedding_dim * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, vec_b, embedding_dim * sizeof(float), cudaMemcpyHostToDevice);

    // Launch kernel
    cosine_similarity_kernel<<<blocks, threads>>>(d_a, d_b, d_dot, d_na, d_nb, embedding_dim);
    cudaDeviceSynchronize();

    // Retrieve partial results
    std::vector<float> h_dot(blocks), h_na(blocks), h_nb(blocks);
    cudaMemcpy(h_dot.data(), d_dot, blocks * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_na.data(), d_na, blocks * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_nb.data(), d_nb, blocks * sizeof(float), cudaMemcpyDeviceToHost);

    float dot = 0.0f, norm_a = 0.0f, norm_b = 0.0f;
    for (int i = 0; i < blocks; ++i) {
        dot += h_dot[i];
        norm_a += h_na[i];
        norm_b += h_nb[i];
    }

    *result = dot / (sqrtf(norm_a) * sqrtf(norm_b) + 1e-8f);

    cudaFree(d_a);
    cudaFree(d_b);
    cudaFree(d_dot);
    cudaFree(d_na);
    cudaFree(d_nb);
}