#pragma once

#include <NvInfer.h>
#include <cuda_runtime.h>
#include <memory>
#include <vector>
#include <string>
#include <unordered_map>

namespace LegalAI {

struct TensorInfo {
    std::string name;
    nvinfer1::DataType dataType;
    nvinfer1::Dims dims;
    size_t size;
    void* hostPtr;
    void* devicePtr;
    bool isInput;
};

struct ModelConfig {
    std::string modelPath;
    std::string planPath;
    int maxBatchSize = 8;
    int maxSeqLen = 131072;  // Ultra-long context for legal documents
    int numHeads = 32;       // Gemma3 default
    int headDim = 128;       // Gemma3 default
    bool useINT4 = true;
    bool useCUDAGraphs = true;
    size_t workspaceSize = 6ULL * 1024 * 1024 * 1024; // 6GB for RTX 3060 Ti
};

class MemoryPool {
public:
    MemoryPool(size_t poolSize);
    ~MemoryPool();

    void* allocate(size_t size, size_t alignment = 256);
    void deallocate(void* ptr);
    void reset();
    size_t getUsage() const { return mCurrentUsage; }
    size_t getCapacity() const { return mPoolSize; }

private:
    void* mPool;
    size_t mPoolSize;
    size_t mCurrentUsage;
    std::vector<std::pair<void*, size_t>> mAllocations;
    bool mInitialized;
};

class CUDAGraphManager {
public:
    CUDAGraphManager();
    ~CUDAGraphManager();

    bool beginCapture(cudaStream_t stream);
    bool endCapture(const std::string& graphName);
    bool executeGraph(const std::string& graphName, cudaStream_t stream);
    void clearGraphs();

private:
    std::unordered_map<std::string, cudaGraphExec_t> mExecutableGraphs;
    cudaGraph_t mCurrentGraph;
    bool mCapturing;
};

class TensorRTEngine {
public:
    TensorRTEngine(const ModelConfig& config);
    ~TensorRTEngine();

    // Engine management
    bool loadModel(const std::string& modelPath);
    bool buildEngine();
    bool saveEngine(const std::string& planPath);
    bool loadEngine(const std::string& planPath);

    // Inference
    bool setInputTensor(const std::string& name, const void* data, size_t size);
    bool infer();
    bool inferAsync(cudaStream_t stream = nullptr);
    void* getOutputTensor(const std::string& name);

    // Batch processing
    bool inferBatch(const std::vector<void*>& inputs, std::vector<void*>& outputs);

    // Memory management
    bool allocateBuffers();
    void deallocateBuffers();

    // CUDA Graphs
    bool captureInferenceGraph(const std::string& graphName);
    bool executeInferenceGraph(const std::string& graphName);

    // Utilities
    void printModelInfo() const;
    size_t getMaxBatchSize() const { return mConfig.maxBatchSize; }
    nvinfer1::Dims getInputDims(const std::string& name) const;
    nvinfer1::Dims getOutputDims(const std::string& name) const;

    // Performance monitoring
    struct PerfMetrics {
        float inferenceTime_ms;
        float throughput_tokens_per_sec;
        size_t memoryUsage_bytes;
        float gpuUtilization_percent;
    };
    PerfMetrics getLastMetrics() const { return mLastMetrics; }

private:
    bool buildEngineFromONNX(const std::string& onnxPath);
    bool buildEngineFromPlan(const std::string& planPath);
    void setupQ4KMPlugin();
    bool validateInputs();
    void updateMetrics(float inferenceTime);

    ModelConfig mConfig;
    nvinfer1::IRuntime* mRuntime;
    nvinfer1::ICudaEngine* mEngine;
    nvinfer1::IExecutionContext* mContext;

    std::unique_ptr<MemoryPool> mMemoryPool;
    std::unique_ptr<CUDAGraphManager> mGraphManager;

    std::vector<TensorInfo> mInputTensors;
    std::vector<TensorInfo> mOutputTensors;
    std::vector<void*> mBindings;

    cudaStream_t mStream;
    cudaEvent_t mStartEvent, mEndEvent;

    PerfMetrics mLastMetrics;
    bool mInitialized;

    // Logger for TensorRT
    class Logger : public nvinfer1::ILogger {
    public:
        void log(Severity severity, const char* msg) noexcept override;
    } mLogger;
};

// Utility functions
namespace Utils {
    size_t getDataTypeSize(nvinfer1::DataType dataType);
    size_t getDimsSize(const nvinfer1::Dims& dims);
    std::string dimsToString(const nvinfer1::Dims& dims);
    bool fileExists(const std::string& path);
    std::vector<char> loadFile(const std::string& path);
    bool saveFile(const std::string& path, const void* data, size_t size);

    // Compression utilities for model caching
    std::vector<char> compressData(const void* data, size_t size);
    std::vector<char> decompressData(const void* data, size_t size);
}

} // namespace LegalAI