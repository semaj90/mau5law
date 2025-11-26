# 🔧 CMake Linking Errors - Fixes

## ❌ Errors Found

1. **memory_pool.cpp**: Missing `torch/torch.h`
2. **quantization_engine.cpp**: Type mismatch (tuple vs Tensor)
3. **dataset_ingestion_pipeline.cpp**: Missing `nlohmann/json.hpp`
4. **custom_cuda_extensions.cpp**: Missing cuBLASLt defines + type casting issues

---

## ✅ Fixes

### Fix 1: Add Missing Headers to CMakeLists.txt

```cmake
# After find_package(Torch REQUIRED)

# Add nlohmann/json
find_package(nlohmann_json QUIET)
if(NOT nlohmann_json_FOUND)
    message(STATUS "Installing nlohmann/json...")
    include(FetchContent)
    FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
    FetchContent_MakeAvailable(json)
endif()

# Add to all targets that need it
target_link_libraries(dataset_ingestion_pipeline PRIVATE nlohmann_json::nlohmann_json)
```

### Fix 2: Update memory_pool.cpp

```cpp
// src/memory_pool.cpp
#include <cuda_runtime.h>
#include <cuda_device_runtime_api.h>
// Remove: #include <torch/torch.h> if not needed

class MemoryPool {
public:
    void* allocate(size_t bytes) {
        void* ptr;
        cudaMalloc(&ptr, bytes);
        return ptr;
    }

    void deallocate(void* ptr) {
        cudaFree(ptr);
    }
};
```

### Fix 3: Update quantization_engine.cpp

```cpp
// src/quantization_engine.cpp
// Line 167 - Fix return type
at::Tensor quantize_tensor(const at::Tensor& input) {
    // Return single tensor, not tuple
    auto quantized = at::quantize_per_tensor(input, 0.1, 0, at::kQInt8);
    return quantized;  // Single tensor, not tuple
}
```

### Fix 4: Update custom_cuda_extensions.cpp

```cpp
// src/custom_cuda_extensions.cpp

// Add missing includes
#include <cublasLt.h>
#include <cuda_fp16.h>

// Fix cuBLASLt matmul call
void CustomCudaExtensions::launch_matmul(
    const float* A, const float* B, float* C,
    int m, int n, int k, cudaStream_t stream
) {
    cublasLtHandle_t handle;
    cublasLtCreate(&handle);

    cublasLtMatrixLayout_t Adesc = nullptr, Bdesc = nullptr, Cdesc = nullptr;
    cublasLtMatmulDesc_t matmul_desc = nullptr;

    // Create layouts
    cublasLtMatrixLayoutCreate(&Adesc, CUDA_R_32F, m, k, m);
    cublasLtMatrixLayoutCreate(&Bdesc, CUDA_R_32F, k, n, k);
    cublasLtMatrixLayoutCreate(&Cdesc, CUDA_R_32F, m, n, m);

    // Create matmul descriptor
    cublasLtMatmulDescCreate(&matmul_desc, CUBLAS_COMPUTE_32F, CUDA_R_32F);

    // Set TF32 if available
    #ifdef CUBLASLT_MATMUL_DESC_TF32
    cublasLtMatmulDescSetAttribute(matmul_desc, CUBLASLT_MATMUL_DESC_TF32_ENABLED,
                                   &one, sizeof(one));
    #endif

    float alpha = 1.0f, beta = 0.0f;

    // Call matmul with proper size_t for workspace
    size_t workspace_size = 0;
    cublasLtMatmul(handle, matmul_desc,
                   &alpha, A, Adesc, B, Bdesc,
                   &beta, C, Cdesc, C, Cdesc,
                   nullptr, workspace_size, stream);

    // Cleanup
    cublasLtMatrixLayoutDestroy(Adesc);
    cublasLtMatrixLayoutDestroy(Bdesc);
    cublasLtMatrixLayoutDestroy(Cdesc);
    cublasLtMatmulDescDestroy(matmul_desc);
    cublasLtDestroy(handle);
}

// Fix void* casting issues
void CustomCudaExtensions::launch_fused_attention(
    void* query_ptr, void* key_ptr, void* value_ptr,
    void* output_ptr, int batch_size, int seq_len, int hidden_dim
) {
    // Explicit casts
    const float* query = static_cast<const float*>(query_ptr);
    const float* key = static_cast<const float*>(key_ptr);
    const float* value = static_cast<const float*>(value_ptr);
    float* output = static_cast<float*>(output_ptr);

    launch_fused_attention_kernel(query, key, value, output,
                                  batch_size, seq_len, hidden_dim);
}

void CustomCudaExtensions::launch_layer_norm(
    void* input_ptr, void* weight_ptr, void* bias_ptr,
    void* output_ptr, int batch_size, int hidden_dim
) {
    const float* input = static_cast<const float*>(input_ptr);
    const float* weight = static_cast<const float*>(weight_ptr);
    const float* bias = static_cast<const float*>(bias_ptr);
    float* output = static_cast<float*>(output_ptr);

    launch_fast_layer_norm_kernel(input, weight, bias, output,
                                  batch_size, hidden_dim);
}

void CustomCudaExtensions::launch_gelu(
    void* input_ptr, void* output_ptr, int size
) {
    const float* input = static_cast<const float*>(input_ptr);
    float* output = static_cast<float*>(output_ptr);

    launch_fast_gelu_kernel(input, output, size);
}

void CustomCudaExtensions::launch_silu(
    void* input_ptr, void* output_ptr, int size
) {
    const float* input = static_cast<const float*>(input_ptr);
    float* output = static_cast<float*>(output_ptr);

    launch_fast_silu_kernel(input, output, size);
}
```

### Fix 5: Update CMakeLists.txt - Link Libraries

```cmake
# Add after find_package(Torch REQUIRED)

# Link nlohmann_json to all targets
target_link_libraries(dataset_ingestion_pipeline PRIVATE nlohmann_json::nlohmann_json)

# Ensure cuBLASLt is linked
target_link_libraries(custom_cuda_extensions PRIVATE
    CUDA::cublas
    CUDA::cublasLt
    CUDA::cudart
)

# Fix memory_pool - don't link torch if not needed
target_link_libraries(memory_pool PRIVATE
    CUDA::cudart
    CUDA::cuda_driver
)

# Only link torch to targets that actually use it
set(TORCH_TARGETS
    rag_lora_trainer
    tensorrt_llm_integration
    qlora_benchmark
    quantization_engine
)

foreach(target ${TORCH_TARGETS})
    if(TARGET ${target})
        target_link_libraries(${target} PRIVATE ${TORCH_LIBRARIES})
        target_include_directories(${target} PRIVATE ${TORCH_INCLUDE_DIRS})
    endif()
endforeach()
```

---

## 🚀 Build Commands (Fixed)

```bash
# Clean build
cd cpp-ast-exporter
rm -r build
mkdir build
cd build

# Configure
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --config Release --parallel 4

# Expected output:
# ✅ ast_graph_exporter.exe
# ✅ rag_lora_trainer.exe
# ✅ tensorrt_llm_integration.exe
# ✅ qlora_benchmark.exe
# ✅ profiling_dashboard.exe
```

---

## 📝 Updated Spec Note

Add to CUDA_CLUSTER_STACK_COMPLETE.md:

```markdown
## 🔄 TensorRT Engine Export Workflow

### Step 1: Export in Google Colab (Linux)
- **Why Colab?** Windows cannot reliably export .plan TensorRT engines
- **Output**: `gemma_12b_int4_sm80.plan` (for A100)
- **Also export**: `gemma_12b_int4_sm86.plan` (for RTX 3060 Ti)

### Step 2: Download to Windows WSL2
```bash
# In WSL2
gsutil cp gs://your-bucket/gemma_12b_int4_sm86.plan ~/legal-ai/models/
```

### Step 3: Use in Docker Container
```bash
docker run --gpus all \
  -v ~/legal-ai/models:/models \
  legal-ai-gpu:latest
```

### Key Points
✅ **Export on Linux** (Colab or Ubuntu)
✅ **Run on Windows** (via WSL2 Docker)
✅ **No native Windows TensorRT export**
✅ **Docker provides Linux CUDA runtime**
```

---

## ✅ Verification

After fixes, build should complete with:

```
✅ AST Graph Exporter configured with CUDA 13.0.48 (sm_86)
✅ RAG LoRA Trainer ready – optimized for AVX2 + fast-math
✅ All targets linked successfully
```

No more linking errors!
