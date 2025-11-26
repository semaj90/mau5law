# Phase 73: CMake Integration Guide

## 🎯 Overview

This guide shows how to integrate **Phase 73 (Unified Reasoning Engine)** into your existing YoRHa Legal AI CMake configuration without breaking existing targets.

---

## 📋 Prerequisites

### Required Packages
```bash
# Install gRPC and Protocol Buffers
vcpkg install grpc:x64-windows protobuf:x64-windows

# Or via Chocolatey
choco install protoc grpc
```

### Verify Installation
```bash
protoc --version
grpc_cpp_plugin --version
```

---

## 🔧 Integration Steps

### Step 1: Add gRPC/Protobuf to CMakeLists.txt

After your existing CUTLASS configuration, add:

```cmake
# --- Phase 73: CUDA Clustering gRPC Service ----------------

# Find gRPC and Protocol Buffers
find_package(gRPC CONFIG REQUIRED)
find_package(Protobuf REQUIRED)
```

### Step 2: Create Protocol Buffer Definition

Create `proto/cuda_cluster.proto`:

```protobuf
syntax = "proto3";

package cuda_cluster;

service ClusterEngine {
  rpc ComputeCentroids (EmbeddingBatch) returns (CentroidResponse);
  rpc TrainSOM (SOMRequest) returns (SOMResponse);
  rpc PredictCluster (EmbeddingVector) returns (ClusterLabel);
}

message EmbeddingVector {
  repeated float values = 1;
}

message EmbeddingBatch {
  repeated EmbeddingVector vectors = 1;
}

message SOMRequest {
  int32 grid_size = 1;
  repeated EmbeddingVector vectors = 2;
}

message SOMResponse {
  repeated int32 bmu_indices = 1;
}

message CentroidResponse {
  repeated EmbeddingVector centroids = 1;
}

message ClusterLabel {
  int32 label = 1;
}
```

### Step 3: Add CUDA Clustering Library

```cmake
# Protocol Buffer files
set(PROTO_FILES
    proto/cuda_cluster.proto
)

# Generate gRPC C++ files
protobuf_generate_cpp(PROTO_SRCS PROTO_HDRS ${PROTO_FILES})
grpc_generate_cpp(GRPC_SRCS GRPC_HDRS ${PROTO_FILES})

# CUDA Clustering Library
add_library(cuda_clustering STATIC
    src/cuda_cluster_kernels.cu
    src/cuda_cluster_service.cpp
    ${PROTO_SRCS}
    ${GRPC_SRCS}
)

target_include_directories(cuda_clustering PRIVATE
    ${CMAKE_CURRENT_BINARY_DIR}
    ${CUDAToolkit_INCLUDE_DIRS}
    ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(cuda_clustering PRIVATE
    CUDA::cudart
    CUDA::cuda_driver
    CUDA::cublas
    CUDA::cublasLt
    gRPC::grpc++
    protobuf::libprotobuf
    ${CUDA_LIBRARIES}
)

set_target_properties(cuda_clustering PROPERTIES
    CUDA_SEPARABLE_COMPILATION ON
    CUDA_ARCHITECTURES "86"
)
```

### Step 4: Create gRPC Server Executable

```cmake
# CUDA Clustering gRPC Server
add_executable(cuda_cluster_server
    src/cuda_cluster_server.cpp
)

target_include_directories(cuda_cluster_server PRIVATE
    ${CMAKE_CURRENT_BINARY_DIR}
    ${CUDAToolkit_INCLUDE_DIRS}
    ${CMAKE_SOURCE_DIR}/include
)

target_link_libraries(cuda_cluster_server PRIVATE
    cuda_clustering
    CUDA::cudart
    gRPC::grpc++
    protobuf::libprotobuf
    ${CUDA_LIBRARIES}
)

target_compile_features(cuda_cluster_server PRIVATE cxx_std_20)
target_compile_options(cuda_cluster_server PRIVATE ${MSVC_FLAGS})
```

### Step 5: Link to Existing Targets

```cmake
# Add to existing targets that need clustering
target_link_libraries(ast_graph_exporter PRIVATE cuda_clustering)
target_link_libraries(rag_lora_trainer PRIVATE cuda_clustering)
target_link_libraries(tensorrt_llm_integration PRIVATE cuda_clustering)
```

---

## 📁 File Structure

```
legal-ai/
├── CMakeLists.txt                          (existing - add Phase 73 section)
├── proto/
│   └── cuda_cluster.proto                  (new)
├── src/
│   ├── cuda_cluster_kernels.cu             (new)
│   ├── cuda_cluster_service.cpp            (new)
│   ├── cuda_cluster_server.cpp             (new)
│   ├── cuda_cluster_benchmark.cpp          (new)
│   └── ... (existing files)
├── include/
│   ├── cuda_cluster_service.h              (new)
│   └── ... (existing headers)
└── build/
    └── bin/
        ├── cuda_cluster_server.exe         (generated)
        ├── cuda_cluster_benchmark.exe      (generated)
        └── ... (existing executables)
```

---

## 🚀 Build Commands

### Configure
```bash
cd legal-ai
mkdir build
cd build

cmake -G "Visual Studio 17 2022" \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DCUDNN_ROOT="C:/Program Files/NVIDIA/CUDNN/v9.16" \
  -DCUTLASS_ROOT="C:/cutlass" \
  ..
```

### Build
```bash
cmake --build . --config Release --parallel 8
```

### Run gRPC Server
```bash
./bin/cuda_cluster_server.exe
```

### Run Benchmark
```bash
./bin/cuda_cluster_benchmark.exe
```

---

## 🔍 Verification

### Check Generated Files
```bash
# Protocol Buffer generated files
ls build/CMakeFiles/cuda_clustering.dir/
  cuda_cluster.pb.cc
  cuda_cluster.pb.h
  cuda_cluster.grpc.pb.cc
  cuda_cluster.grpc.pb.h
```

### Test gRPC Service
```bash
# In PowerShell
grpcurl -plaintext localhost:50051 list

# Expected output:
# cuda_cluster.ClusterEngine
```

### Monitor GPU
```bash
nvidia-smi -l 1
```

---

## 🐛 Troubleshooting

### gRPC Not Found
```bash
# Install via vcpkg
vcpkg install grpc:x64-windows

# Add to CMake
-DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake
```

### Protobuf Compilation Error
```bash
# Ensure protoc is in PATH
where protoc

# Or specify explicitly
-DProtobuf_PROTOC_EXECUTABLE=C:/path/to/protoc.exe
```

### CUDA Compilation Error
```bash
# Check CUDA architecture
cmake -DCMAKE_CUDA_ARCHITECTURES=86 ..

# Verify CUDA toolkit
nvcc --version
```

### Link Error: Missing CUDA Libraries
```bash
# Ensure CUDA paths are correct
set(CUDA_TOOLKIT_ROOT_DIR "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v13.0")
set(CMAKE_CUDA_IMPLICIT_LINK_DIRECTORIES "${CUDA_TOOLKIT_ROOT_DIR}/lib/x64")
```

---

## 📊 Build Output

### Successful Build
```
✅ Phase 73: CUDA Clustering gRPC Service configured
   • cuda_cluster_server: gRPC service on port 50051
   • cuda_clustering: Static library for integration
   • cuda_cluster_benchmark: Performance testing tool
   • Integrated with: ast_graph_exporter, rag_lora_trainer, tensorrt_llm_integration
```

### Targets Created
- `cuda_clustering` (static library)
- `cuda_cluster_server` (executable)
- `cuda_cluster_benchmark` (executable)

---

## 🔗 Integration with Existing Targets

### ast_graph_exporter
```cpp
// Can now call CUDA clustering
#include "cuda_cluster_service.h"

ClusterEngine engine;
auto centroids = engine.ComputeCentroids(embeddings);
```

### rag_lora_trainer
```cpp
// Can use clustering for training
auto clusters = engine.PredictCluster(embedding);
```

### tensorrt_llm_integration
```cpp
// Can cluster inference results
auto som_result = engine.TrainSOM(grid_size, embeddings);
```

---

## 📈 Performance Optimization

### Compiler Flags
```cmake
# Already set in your CMakeLists.txt:
# /arch:AVX2 /fp:fast /EHsc

# CUDA-specific:
# --use_fast_math -g -lineinfo
```

### Tensor Core Optimization
```cmake
# Already enabled:
# -arch=sm_86 (Ampere)
# -DUSE_TF32 (TensorFloat32)
```

### Memory Optimization
```cmake
# CUDA_SEPARABLE_COMPILATION ON
# Allows incremental linking
```

---

## 🎯 Next Steps

1. **Add gRPC/Protobuf to CMakeLists.txt**
2. **Create proto/cuda_cluster.proto**
3. **Implement CUDA kernels** (src/cuda_cluster_kernels.cu)
4. **Implement gRPC service** (src/cuda_cluster_service.cpp)
5. **Create server** (src/cuda_cluster_server.cpp)
6. **Build and test**

---

## 📚 References

- [CMake gRPC Integration](https://github.com/grpc/grpc/tree/master/examples/cpp)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [CUDA CMake](https://cmake.org/cmake/help/latest/language/CUDA/)
- [Your Existing CMakeLists.txt](./CMakeLists.txt)

---

## ✅ Checklist

- [ ] gRPC and Protobuf installed
- [ ] proto/cuda_cluster.proto created
- [ ] CMakeLists.txt updated with Phase 73 section
- [ ] CUDA kernel files created
- [ ] gRPC service implementation complete
- [ ] Server executable created
- [ ] Build succeeds without errors
- [ ] gRPC server runs on port 50051
- [ ] Benchmark tool works
- [ ] Integrated with existing targets

---

**Status**: ✅ Ready for integration

**Build Command**: `cmake --build . --config Release --parallel 8`

**Run Server**: `./bin/cuda_cluster_server.exe`
