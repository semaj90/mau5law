#!/bin/bash
# Build script for Legal AI TensorRT Service

set -e

echo "🚀 Building Legal AI TensorRT Service"
echo "====================================="

# Check CUDA installation
if ! command -v nvcc &> /dev/null; then
    echo "❌ CUDA not found. Please install CUDA toolkit first."
    exit 1
fi

echo "✅ CUDA found: $(nvcc --version | grep release)"

# Check TensorRT
if [ ! -d "/usr/include/NvInfer.h" ] && [ ! -d "/usr/local/cuda/include/NvInfer.h" ]; then
    echo "❌ TensorRT headers not found. Please install TensorRT."
    exit 1
fi

echo "✅ TensorRT found"

# Create directories
mkdir -p models cache logs

echo "📦 Compiling CUDA kernels..."
nvcc -O3 -arch=sm_86 -std=c++17 -Xcompiler -fPIC \
    int4_flash_attn_kernel.cu -c -o int4_flash_attn_kernel.o

echo "🔧 Building Q4_K_M TensorRT plugin..."
# Add to Dockerfile.tensorrt-legal equivalent step
nvcc -shared -o q4km_plugin.so \
    q4km_plugin.cpp int4_flash_attn_kernel.o \
    -I/usr/include -I/usr/local/cuda/include \
    -I/usr/include/x86_64-linux-gnu \
    -L/usr/lib/x86_64-linux-gnu -L/usr/local/cuda/lib64 \
    -ltensorrt -ltensorrt_plugin -lcudart -lcuda -lcublas -lcurand \
    -O3 -arch=sm_86 -std=c++17 -Xcompiler -fPIC

echo "🔗 Building TensorRT C++ wrapper..."
g++ -O3 -std=c++17 -fPIC -shared \
    tensorrt_wrapper.cpp q4km_plugin.so \
    -I/usr/include -I/usr/local/cuda/include \
    -I/usr/include/x86_64-linux-gnu \
    -L/usr/lib/x86_64-linux-gnu -L/usr/local/cuda/lib64 \
    -ltensorrt -ltensorrt_plugin -lcudart -lcuda -lcublas -lcurand \
    -lzstd \
    -o libq4km_plugin.so

echo "🏗️ Building Go microservice..."
go mod tidy
go build -o legal-tensorrt-service engine_manager.go

echo "🧪 Creating C wrapper for Go integration..."
cat > tensorrt_c_wrapper.cpp << 'EOF'
#include "tensorrt_wrapper.h"
#include <cstring>

using namespace LegalAI;

extern "C" {
    TensorRTEngine* createEngine(const char* modelPath, int maxBatchSize, int maxSeqLen, int numHeads, int headDim) {
        ModelConfig config;
        config.modelPath = std::string(modelPath);
        config.maxBatchSize = maxBatchSize;
        config.maxSeqLen = maxSeqLen;
        config.numHeads = numHeads;
        config.headDim = headDim;

        return new TensorRTEngine(config);
    }

    void destroyEngine(TensorRTEngine* engine) {
        delete engine;
    }

    int loadModel(TensorRTEngine* engine, const char* modelPath) {
        return engine->loadModel(std::string(modelPath)) ? 1 : 0;
    }

    int setInputTensor(TensorRTEngine* engine, const char* name, void* data, size_t size) {
        return engine->setInputTensor(std::string(name), data, size) ? 1 : 0;
    }

    int inferAsync(TensorRTEngine* engine) {
        return engine->inferAsync() ? 1 : 0;
    }

    void* getOutputTensor(TensorRTEngine* engine, const char* name) {
        return engine->getOutputTensor(std::string(name));
    }

    void printEngineInfo(TensorRTEngine* engine) {
        engine->printModelInfo();
    }

    typedef struct {
        float inferenceTime_ms;
        float throughput_tokens_per_sec;
        size_t memoryUsage_bytes;
        float gpuUtilization_percent;
    } PerfMetrics;

    PerfMetrics getLastMetrics(TensorRTEngine* engine) {
        auto metrics = engine->getLastMetrics();
        PerfMetrics result;
        result.inferenceTime_ms = metrics.inferenceTime_ms;
        result.throughput_tokens_per_sec = metrics.throughput_tokens_per_sec;
        result.memoryUsage_bytes = metrics.memoryUsage_bytes;
        result.gpuUtilization_percent = metrics.gpuUtilization_percent;
        return result;
    }
}
EOF

echo "🔗 Compiling C wrapper..."
g++ -O3 -std=c++17 -fPIC -shared \
    tensorrt_c_wrapper.cpp \
    -I. -L. -lq4km_plugin \
    -o libtensorrt_c_wrapper.so

echo "🧪 Running basic tests..."
python3 -c "
import torch
print('PyTorch version:', torch.__version__)
print('CUDA available:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
    print('CUDA capability:', torch.cuda.get_device_capability(0))
"

echo ""
echo "🎉 Build Complete!"
echo "=================="
echo "📂 Files created:"
echo "   • int4_flash_attn_kernel.o    - Compiled CUDA kernel"
echo "   • libq4km_plugin.so          - TensorRT plugin library"
echo "   • libtensorrt_c_wrapper.so   - C wrapper for Go integration"
echo "   • legal-tensorrt-service     - Go microservice binary"
echo ""
echo "🚀 Ready to run:"
echo "   ./legal-tensorrt-service"
echo ""
echo "📚 Convert a model:"
echo "   python3 model_converter.py --model microsoft/DialoGPT-medium --output-dir ./models"
echo ""
echo "🐳 Build Docker image:"
echo "   docker build -t legal-tensorrt-service ."
echo "=================="