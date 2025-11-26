# 🔧 Build Status & Linking Fixes

## ✅ What's Working

- ✅ CUDA 13.0 detected
- ✅ MSVC compiler configured
- ✅ LibTorch found
- ✅ cuDNN 9.16 found
- ✅ CUTLASS headers available
- ✅ ast_graph_exporter.exe built successfully
- ✅ cuda_library.lib created

---

## ❌ Linking Errors (5 Issues)

### 1. memory_pool.cpp - Missing torch/torch.h
**Error**: Cannot open include file
**Fix**: Remove torch dependency from memory_pool.cpp (it only needs CUDA)

### 2. quantization_engine.cpp - Type mismatch
**Error**: Cannot convert tuple to Tensor
**Fix**: Return single tensor instead of tuple

### 3. dataset_ingestion_pipeline.cpp - Missing nlohmann/json.hpp
**Error**: Cannot open include file
**Fix**: Add nlohmann_json to CMakeLists.txt via FetchContent

### 4. custom_cuda_extensions.cpp - Missing cuBLASLt defines
**Error**: Undeclared identifiers (CUBLASLT_MATMUL_DESC_TF32, etc.)
**Fix**: Add `#include <cublasLt.h>` and conditional compilation

### 5. custom_cuda_extensions.cpp - Type casting issues
**Error**: Cannot convert void* to const float*
**Fix**: Add explicit static_cast<const float*>() calls

---

## 🚀 Quick Fix Steps

### 1. Update CMakeLists.txt

Add after `find_package(Torch REQUIRED)`:

```cmake
# Add nlohmann/json
find_package(nlohmann_json QUIET)
if(NOT nlohmann_json_FOUND)
    include(FetchContent)
    FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
    FetchContent_MakeAvailable(json)
endif()

# Link to targets that need it
target_link_libraries(dataset_ingestion_pipeline PRIVATE nlohmann_json::nlohmann_json)

# Ensure cuBLASLt is linked
target_link_libraries(custom_cuda_extensions PRIVATE
    CUDA::cublas
    CUDA::cublasLt
    CUDA::cudart
)

# Only link torch to targets that use it
set(TORCH_TARGETS rag_lora_trainer tensorrt_llm_integration qlora_benchmark quantization_engine)
foreach(target ${TORCH_TARGETS})
    if(TARGET ${target})
        target_link_libraries(${target} PRIVATE ${TORCH_LIBRARIES})
        target_include_directories(${target} PRIVATE ${TORCH_INCLUDE_DIRS})
    endif()
endforeach()
```

### 2. Fix memory_pool.cpp

Remove `#include <torch/torch.h>` - it's not needed.

### 3. Fix quantization_engine.cpp (Line 167)

```cpp
// Before:
return std::make_tuple(quantized, scale, zero_point);

// After:
return quantized;  // Return single tensor
```

### 4. Fix custom_cuda_extensions.cpp

Add at top:
```cpp
#include <cublasLt.h>
#include <cuda_fp16.h>
```

Add explicit casts:
```cpp
const float* query = static_cast<const float*>(query_ptr);
float* output = static_cast<float*>(output_ptr);
```

### 5. Fix dataset_ingestion_pipeline.cpp

Change:
```cpp
#include <nlohmann/json.hpp>
```

---

## 🔄 Rebuild

```bash
cd cpp-ast-exporter/build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release --parallel 4
```

Expected output:
```
✅ ast_graph_exporter.exe
✅ rag_lora_trainer.exe
✅ tensorrt_llm_integration.exe
✅ qlora_benchmark.exe
✅ profiling_dashboard.exe
```

---

## 📝 Gemma-3-Legal TensorRT Export

### Workflow
1. **Export on Google Colab** (Linux)
   - Use Unsloth + TensorRT-LLM
   - Output: `gemma_12b_int4_sm86.plan`

2. **Download to WSL2**
   ```bash
   gsutil cp gs://bucket/gemma_12b_int4_sm86.plan ~/legal-ai/models/
   ```

3. **Run in Docker**
   ```bash
   docker run --gpus all -v ~/legal-ai/models:/models legal-ai-gpu:latest
   ```

### Why This Workflow?
- ❌ Windows cannot export .plan files reliably
- ✅ Linux (Colab) exports work perfectly
- ✅ WSL2 Docker provides Linux CUDA runtime
- ✅ GPU passthrough works seamlessly

---

## ✅ Next Steps

1. Apply the 5 fixes above
2. Rebuild with `cmake --build . --config Release --parallel 4`
3. Verify all .exe files are created
4. Export Gemma-3-Legal on Google Colab
5. Download .plan file to WSL2
6. Run Docker stack with GPU support

---

**Status**: 🔧 **FIXABLE - All errors have clear solutions**
