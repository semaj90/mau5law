#include <cstdio>
#include <cuda_runtime.h>

// Trivial kernel just to prove we can launch
__global__ void smoketest_kernel() {
    // Empty kernel - just proves launch works
}

int main() {
    printf("=== CUDA Smoketest ===\n\n");

    int deviceCount = 0;
    cudaError_t err = cudaGetDeviceCount(&deviceCount);

    if (err != cudaSuccess) {
        printf("❌ cudaGetDeviceCount failed: %s\n", cudaGetErrorString(err));
        return 1;
    }

    printf("✅ CUDA devices found: %d\n\n", deviceCount);

    for (int i = 0; i < deviceCount; i++) {
        cudaDeviceProp prop{};
        cudaGetDeviceProperties(&prop, i);

        printf("📊 Device [%d]: %s\n", i, prop.name);
        printf("   Compute Capability: %d.%d\n", prop.major, prop.minor);
        printf("   Total Global Memory: %zu MB\n", prop.totalGlobalMem / (1024 * 1024));
        printf("   Multiprocessors: %d\n", prop.multiProcessorCount);
        printf("   Max Threads/Block: %d\n", prop.maxThreadsPerBlock);
        printf("   Warp Size: %d\n", prop.warpSize);
        printf("\n");
    }

    // Try to launch a kernel
    printf("🚀 Launching test kernel...\n");
    smoketest_kernel<<<1, 1>>>();

    err = cudaDeviceSynchronize();
    if (err != cudaSuccess) {
        printf("❌ Kernel sync failed: %s\n", cudaGetErrorString(err));
        return 2;
    }

    printf("✅ Kernel launch + sync successful!\n");
    printf("\n=== CUDA Smoketest PASSED ===\n");

    return 0;
}
