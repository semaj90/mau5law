// Minimal SOM cache with optional CUDA kernel. Compile with CUDA for GPU path,
// or define NO_CUDA / compile without __CUDACC__ for CPU-only build.

// Detect whether CUDA headers are actually present and allowed.
// If NO_CUDA is defined, force CPU-only path.
#if defined(__has_include)
  #if !defined(NO_CUDA) && __has_include(<cuda_runtime.h>) && defined(__CUDACC__)
    #define SOM_HAVE_CUDA 1
  #else
    #define SOM_HAVE_CUDA 0
  #endif
#else
  // Fallback: if NO_CUDA is set treat as no CUDA, otherwise rely on __CUDACC__.
  #if defined(__CUDACC__) && !defined(NO_CUDA)
    #define SOM_HAVE_CUDA 1
  #else
    #define SOM_HAVE_CUDA 0
  #endif
#endif

#if SOM_HAVE_CUDA
#include <cuda_runtime.h>
#include <cstring>
#include <cstdlib>

// Simple device kernel: copy input to output
__global__ static void somCopyKernel(const float* in, float* out, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) out[i] = in[i];
}

extern "C" {
    void runSOMCache(const float* in, float* out, int n) {
        if (n <= 0 || !in || !out) return;

        // Try to detect whether pointers are device pointers.
        bool inIsDevice = false;
        bool outIsDevice = false;
    #if defined(CUDART_VERSION)
        cudaPointerAttributes attrIn, attrOut;
        cudaError_t a1 = cudaPointerGetAttributes(&attrIn, in);
        cudaError_t a2 = cudaPointerGetAttributes(&attrOut, out);
        inIsDevice = (a1 == cudaSuccess && attrIn.devicePointer != nullptr);
        outIsDevice = (a2 == cudaSuccess && attrOut.devicePointer != nullptr);
    #else
        // If runtime version unknown, assume host pointers to be safe.
        (void)0;
    #endif

        // If both are device pointers, launch kernel directly.
        if (inIsDevice && outIsDevice) {
            const int block = 256;
            const int grid = (n + block - 1) / block;
            somCopyKernel<<<grid, block>>>(in, out, n);
            cudaError_t err = cudaGetLastError();
            if (err != cudaSuccess) {
                // Kernel launch failed -> fallback to CPU copy
                cudaDeviceSynchronize();
                for (int i = 0; i < n; ++i) out[i] = in[i];
                return;
            }
            cudaDeviceSynchronize();
            return;
        }

        // Mixed or host pointers: handle via memcpy between host/device as needed.
        if (!inIsDevice && !outIsDevice) {
            // Both host pointers -> CPU copy
            for (int i = 0; i < n; ++i) out[i] = in[i];
            return;
        }

        // One is device, the other host. Use cudaMemcpy to bridge.
        size_t bytes = static_cast<size_t>(n) * sizeof(float);
        if (inIsDevice && !outIsDevice) {
            // device -> host
            if (cudaMemcpy((void*)out, in, bytes, cudaMemcpyDeviceToHost) != cudaSuccess) {
                float* tmp = (float*)malloc(bytes);
                if (tmp) {
                    if (cudaMemcpy(tmp, in, bytes, cudaMemcpyDeviceToHost) == cudaSuccess) {
                        std::memcpy(out, tmp, bytes);
                    }
                    free(tmp);
                }
            }
            return;
        }

        if (!inIsDevice && outIsDevice) {
            // host -> device
            if (cudaMemcpy(out, in, bytes, cudaMemcpyHostToDevice) != cudaSuccess) {
                float* tmp = (float*)malloc(bytes);
                if (tmp) {
                    std::memcpy(tmp, in, bytes);
                    if (cudaMemcpy(out, tmp, bytes, cudaMemcpyHostToDevice) != cudaSuccess) {
                        // final fallback: no-op
                    }
                    free(tmp);
                }
            }
            return;
        }
    }
}
#else
#include <cstring>
#include <cstdlib>

// CPU-only fallback used when no CUDA headers/toolchain are available or NO_CUDA is defined.
extern "C" {
    void runSOMCache(const float* in, float* out, int n) {
        if (n <= 0 || !in || !out) return;
        for (int i = 0; i < n; ++i) {
            out[i] = in[i];
        }
    }
}
#endif

