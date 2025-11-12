#include <iostream>
#include <cuda_runtime.h>

// Simple CUDA kernel for demonstration
__global__ void wardenNetKernel(float* data, int size) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < size) {
        // Simple computation - can be replaced with actual WardenNet logic
        data[idx] = data[idx] * data[idx] + 1.0f;
    }
}

int main() {
    std::cout << "Hello from WardenNet with CUDA support!" << std::endl;

    // Test CUDA availability
    int deviceCount;
    cudaGetDeviceCount(&deviceCount);

    if (deviceCount > 0) {
        cudaDeviceProp prop;
        cudaGetDeviceProperties(&prop, 0);
        std::cout << "CUDA Device: " << prop.name << std::endl;
        std::cout << "Compute Capability: " << prop.major << "." << prop.minor << std::endl;
        std::cout << "Total Global Memory: " << prop.totalGlobalMem / (1024*1024) << " MB" << std::endl;

        // Simple CUDA kernel test
        const int size = 1024;
        float* h_data = new float[size];
        float* d_data;

        // Initialize data
        for (int i = 0; i < size; ++i) {
            h_data[i] = static_cast<float>(i) * 0.1f;
        }

        // Allocate device memory
        cudaMalloc(&d_data, size * sizeof(float));
        cudaMemcpy(d_data, h_data, size * sizeof(float), cudaMemcpyHostToDevice);

        // Launch kernel
        int threadsPerBlock = 256;
        int blocksPerGrid = (size + threadsPerBlock - 1) / threadsPerBlock;
        wardenNetKernel<<<blocksPerGrid, threadsPerBlock>>>(d_data, size);

        // Copy result back
        cudaMemcpy(h_data, d_data, size * sizeof(float), cudaMemcpyDeviceToHost);

        std::cout << "CUDA kernel executed successfully!" << std::endl;
        std::cout << "Sample result: " << h_data[0] << std::endl;

        // Cleanup
        cudaFree(d_data);
        delete[] h_data;
    } else {
        std::cout << "No CUDA devices found - running CPU only" << std::endl;
    }

    return 0;
}