#include "tensorrt_wrapper.h"
#include <NvInferPlugin.h>
#include <NvOnnxParser.h>
#include <fstream>
#include <iostream>
#include <chrono>
#include <zstd.h>

using namespace nvinfer1;
using namespace LegalAI;

// Logger implementation
void TensorRTEngine::Logger::log(Severity severity, const char* msg) noexcept {
    if (severity <= Severity::kWARNING) {
        std::cout << "[TensorRT] " << msg << std::endl;
    }
}

// MemoryPool implementation
MemoryPool::MemoryPool(size_t poolSize) : mPoolSize(poolSize), mCurrentUsage(0), mInitialized(false) {
    if (cudaMalloc(&mPool, poolSize) == cudaSuccess) {
        mInitialized = true;
        mAllocations.reserve(1024); // Pre-allocate space for allocation tracking
    }
}

MemoryPool::~MemoryPool() {
    if (mInitialized) {
        cudaFree(mPool);
    }
}

void* MemoryPool::allocate(size_t size, size_t alignment) {
    if (!mInitialized) return nullptr;

    // Align size
    size_t alignedSize = (size + alignment - 1) & ~(alignment - 1);

    if (mCurrentUsage + alignedSize > mPoolSize) {
        return nullptr; // Pool exhausted
    }

    void* ptr = static_cast<char*>(mPool) + mCurrentUsage;
    mAllocations.emplace_back(ptr, alignedSize);
    mCurrentUsage += alignedSize;

    return ptr;
}

void MemoryPool::deallocate(void* ptr) {
    // For pool allocator, we don't individually free
    // Memory is reclaimed on reset()
}

void MemoryPool::reset() {
    mCurrentUsage = 0;
    mAllocations.clear();
}

// CUDAGraphManager implementation
CUDAGraphManager::CUDAGraphManager() : mCurrentGraph(nullptr), mCapturing(false) {}

CUDAGraphManager::~CUDAGraphManager() {
    clearGraphs();
}

bool CUDAGraphManager::beginCapture(cudaStream_t stream) {
    if (mCapturing) return false;

    cudaError_t result = cudaStreamBeginCapture(stream, cudaStreamCaptureModeGlobal);
    if (result == cudaSuccess) {
        mCapturing = true;
        return true;
    }
    return false;
}

bool CUDAGraphManager::endCapture(const std::string& graphName) {
    if (!mCapturing) return false;

    cudaError_t result = cudaStreamEndCapture(cudaStreamLegacy, &mCurrentGraph);
    if (result != cudaSuccess) {
        mCapturing = false;
        return false;
    }

    cudaGraphExec_t execGraph;
    result = cudaGraphInstantiate(&execGraph, mCurrentGraph, nullptr, nullptr, 0);
    if (result == cudaSuccess) {
        mExecutableGraphs[graphName] = execGraph;
        mCapturing = false;
        return true;
    }

    mCapturing = false;
    return false;
}

bool CUDAGraphManager::executeGraph(const std::string& graphName, cudaStream_t stream) {
    auto it = mExecutableGraphs.find(graphName);
    if (it == mExecutableGraphs.end()) return false;

    return cudaGraphLaunch(it->second, stream) == cudaSuccess;
}

void CUDAGraphManager::clearGraphs() {
    for (auto& pair : mExecutableGraphs) {
        cudaGraphExecDestroy(pair.second);
    }
    mExecutableGraphs.clear();

    if (mCurrentGraph) {
        cudaGraphDestroy(mCurrentGraph);
        mCurrentGraph = nullptr;
    }
}

// TensorRTEngine implementation
TensorRTEngine::TensorRTEngine(const ModelConfig& config)
    : mConfig(config), mRuntime(nullptr), mEngine(nullptr), mContext(nullptr),
      mStream(nullptr), mStartEvent(nullptr), mEndEvent(nullptr), mInitialized(false) {

    // Initialize TensorRT plugins
    initLibNvInferPlugins(&mLogger, "LEGAL_AI");
    setupQ4KMPlugin();

    // Create runtime
    mRuntime = createInferRuntime(mLogger);
    if (!mRuntime) {
        std::cerr << "Failed to create TensorRT runtime" << std::endl;
        return;
    }

    // Initialize memory pool (6GB for RTX 3060 Ti)
    mMemoryPool = std::make_unique<MemoryPool>(mConfig.workspaceSize);

    // Initialize CUDA Graph manager
    mGraphManager = std::make_unique<CUDAGraphManager>();

    // Create CUDA stream and events
    cudaStreamCreate(&mStream);
    cudaEventCreate(&mStartEvent);
    cudaEventCreate(&mEndEvent);

    mInitialized = true;
}

TensorRTEngine::~TensorRTEngine() {
    deallocateBuffers();

    if (mContext) mContext->destroy();
    if (mEngine) mEngine->destroy();
    if (mRuntime) mRuntime->destroy();

    if (mStream) cudaStreamDestroy(mStream);
    if (mStartEvent) cudaEventDestroy(mStartEvent);
    if (mEndEvent) cudaEventDestroy(mEndEvent);
}

bool TensorRTEngine::loadModel(const std::string& modelPath) {
    if (!mInitialized) return false;

    // Try to load cached plan first
    std::string planPath = mConfig.planPath;
    if (planPath.empty()) {
        planPath = modelPath + ".plan";
    }

    if (Utils::fileExists(planPath)) {
        std::cout << "Loading cached TensorRT plan: " << planPath << std::endl;
        if (loadEngine(planPath)) {
            return allocateBuffers();
        }
    }

    // Build from ONNX
    std::cout << "Building TensorRT engine from: " << modelPath << std::endl;
    if (buildEngineFromONNX(modelPath)) {
        if (!mConfig.planPath.empty()) {
            saveEngine(mConfig.planPath);
        }
        return allocateBuffers();
    }

    return false;
}

bool TensorRTEngine::buildEngineFromONNX(const std::string& onnxPath) {
    auto builder = createInferBuilder(mLogger);
    if (!builder) return false;

    auto config = builder->createBuilderConfig();
    if (!config) {
        builder->destroy();
        return false;
    }

    // Configure for RTX 3060 Ti optimization
    config->setMaxWorkspaceSize(mConfig.workspaceSize);
    config->setFlag(BuilderFlag::kGPU_FALLBACK);

    if (mConfig.useINT4) {
        config->setFlag(BuilderFlag::kINT8);
        config->setFlag(BuilderFlag::kFP16);
    }

    // Create optimization profile for dynamic shapes
    auto profile = builder->createOptimizationProfile();
    if (profile) {
        // Input dimensions: [batch, seq_len, hidden_dim]
        Dims minDims = {3, {1, 1, 4096}};
        Dims optDims = {3, {mConfig.maxBatchSize/2, mConfig.maxSeqLen/4, 4096}};
        Dims maxDims = {3, {mConfig.maxBatchSize, mConfig.maxSeqLen, 4096}};

        profile->setDimensions("input_ids", OptProfileSelector::kMIN, minDims);
        profile->setDimensions("input_ids", OptProfileSelector::kOPT, optDims);
        profile->setDimensions("input_ids", OptProfileSelector::kMAX, maxDims);

        config->addOptimizationProfile(profile);
    }

    // Create network
    auto network = builder->createNetworkV2(1U << static_cast<uint32_t>(NetworkDefinitionCreationFlag::kEXPLICIT_BATCH));
    if (!network) {
        config->destroy();
        builder->destroy();
        return false;
    }

    // Parse ONNX
    auto parser = nvonnxparser::createParser(*network, mLogger);
    if (!parser) {
        network->destroy();
        config->destroy();
        builder->destroy();
        return false;
    }

    if (!parser->parseFromFile(onnxPath.c_str(), static_cast<int>(ILogger::Severity::kWARNING))) {
        std::cerr << "Failed to parse ONNX model" << std::endl;
        parser->destroy();
        network->destroy();
        config->destroy();
        builder->destroy();
        return false;
    }

    // Build engine
    mEngine = builder->buildEngineWithConfig(*network, *config);

    parser->destroy();
    network->destroy();
    config->destroy();
    builder->destroy();

    if (!mEngine) {
        std::cerr << "Failed to build TensorRT engine" << std::endl;
        return false;
    }

    // Create execution context
    mContext = mEngine->createExecutionContext();
    return mContext != nullptr;
}

bool TensorRTEngine::loadEngine(const std::string& planPath) {
    auto data = Utils::loadFile(planPath);
    if (data.empty()) return false;

    // Check if compressed
    std::vector<char> decompressed;
    if (data.size() > 4 && memcmp(data.data(), "\x28\xb5\x2f\xfd", 4) == 0) {
        // ZSTD compressed
        decompressed = Utils::decompressData(data.data(), data.size());
        if (decompressed.empty()) return false;
        data = std::move(decompressed);
    }

    mEngine = mRuntime->deserializeCudaEngine(data.data(), data.size());
    if (!mEngine) return false;

    mContext = mEngine->createExecutionContext();
    return mContext != nullptr;
}

bool TensorRTEngine::saveEngine(const std::string& planPath) {
    if (!mEngine) return false;

    auto serialized = mEngine->serialize();
    if (!serialized) return false;

    // Compress with ZSTD
    auto compressed = Utils::compressData(serialized->data(), serialized->size());
    bool result = Utils::saveFile(planPath, compressed.data(), compressed.size());

    serialized->destroy();
    return result;
}

bool TensorRTEngine::allocateBuffers() {
    if (!mEngine) return false;

    mInputTensors.clear();
    mOutputTensors.clear();
    mBindings.clear();

    int numBindings = mEngine->getNbBindings();
    mBindings.resize(numBindings);

    for (int i = 0; i < numBindings; ++i) {
        TensorInfo tensorInfo;
        tensorInfo.name = mEngine->getBindingName(i);
        tensorInfo.dataType = mEngine->getBindingDataType(i);
        tensorInfo.dims = mEngine->getBindingDimensions(i);
        tensorInfo.isInput = mEngine->bindingIsInput(i);
        tensorInfo.size = Utils::getDimsSize(tensorInfo.dims) * Utils::getDataTypeSize(tensorInfo.dataType);

        // Allocate device memory from pool
        tensorInfo.devicePtr = mMemoryPool->allocate(tensorInfo.size);
        if (!tensorInfo.devicePtr) {
            // Fallback to direct allocation
            if (cudaMalloc(&tensorInfo.devicePtr, tensorInfo.size) != cudaSuccess) {
                std::cerr << "Failed to allocate device memory for " << tensorInfo.name << std::endl;
                return false;
            }
        }

        // Allocate pinned host memory for async transfers
        if (cudaMallocHost(&tensorInfo.hostPtr, tensorInfo.size) != cudaSuccess) {
            std::cerr << "Failed to allocate host memory for " << tensorInfo.name << std::endl;
            return false;
        }

        mBindings[i] = tensorInfo.devicePtr;

        if (tensorInfo.isInput) {
            mInputTensors.push_back(tensorInfo);
        } else {
            mOutputTensors.push_back(tensorInfo);
        }
    }

    return true;
}

void TensorRTEngine::deallocateBuffers() {
    for (auto& tensor : mInputTensors) {
        if (tensor.devicePtr) cudaFree(tensor.devicePtr);
        if (tensor.hostPtr) cudaFreeHost(tensor.hostPtr);
    }
    for (auto& tensor : mOutputTensors) {
        if (tensor.devicePtr) cudaFree(tensor.devicePtr);
        if (tensor.hostPtr) cudaFreeHost(tensor.hostPtr);
    }

    mInputTensors.clear();
    mOutputTensors.clear();
    mBindings.clear();

    if (mMemoryPool) {
        mMemoryPool->reset();
    }
}

bool TensorRTEngine::setInputTensor(const std::string& name, const void* data, size_t size) {
    for (auto& tensor : mInputTensors) {
        if (tensor.name == name) {
            if (size != tensor.size) {
                std::cerr << "Size mismatch for tensor " << name << std::endl;
                return false;
            }

            // Copy to pinned host memory first
            memcpy(tensor.hostPtr, data, size);

            // Async transfer to device
            cudaMemcpyAsync(tensor.devicePtr, tensor.hostPtr, size,
                           cudaMemcpyHostToDevice, mStream);
            return true;
        }
    }

    std::cerr << "Input tensor not found: " << name << std::endl;
    return false;
}

bool TensorRTEngine::infer() {
    return inferAsync(mStream);
}

bool TensorRTEngine::inferAsync(cudaStream_t stream) {
    if (!mContext || !validateInputs()) return false;

    cudaStream_t useStream = stream ? stream : mStream;

    // Record start time
    cudaEventRecord(mStartEvent, useStream);

    // Execute inference
    bool result = mContext->enqueueV2(mBindings.data(), useStream, nullptr);

    // Record end time
    cudaEventRecord(mEndEvent, useStream);

    if (result) {
        // Async copy outputs back to host
        for (auto& tensor : mOutputTensors) {
            cudaMemcpyAsync(tensor.hostPtr, tensor.devicePtr, tensor.size,
                           cudaMemcpyDeviceToHost, useStream);
        }

        // Update performance metrics
        cudaEventSynchronize(mEndEvent);
        float inferenceTime;
        cudaEventElapsedTime(&inferenceTime, mStartEvent, mEndEvent);
        updateMetrics(inferenceTime);
    }

    return result;
}

void* TensorRTEngine::getOutputTensor(const std::string& name) {
    for (auto& tensor : mOutputTensors) {
        if (tensor.name == name) {
            return tensor.hostPtr;
        }
    }
    return nullptr;
}

bool TensorRTEngine::captureInferenceGraph(const std::string& graphName) {
    if (!mGraphManager->beginCapture(mStream)) return false;

    // Execute inference within capture
    bool result = mContext->enqueueV2(mBindings.data(), mStream, nullptr);

    if (result) {
        return mGraphManager->endCapture(graphName);
    }

    return false;
}

bool TensorRTEngine::executeInferenceGraph(const std::string& graphName) {
    return mGraphManager->executeGraph(graphName, mStream);
}

void TensorRTEngine::setupQ4KMPlugin() {
    // Plugin is already registered in q4km_plugin.cpp
    // This ensures it's available for engine building
}

bool TensorRTEngine::validateInputs() {
    for (const auto& tensor : mInputTensors) {
        if (!tensor.devicePtr || !tensor.hostPtr) {
            std::cerr << "Input tensor not properly allocated: " << tensor.name << std::endl;
            return false;
        }
    }
    return true;
}

void TensorRTEngine::updateMetrics(float inferenceTime) {
    mLastMetrics.inferenceTime_ms = inferenceTime;

    // Calculate throughput (assuming batch processing)
    int totalTokens = mConfig.maxBatchSize * mConfig.maxSeqLen;
    mLastMetrics.throughput_tokens_per_sec = (totalTokens * 1000.0f) / inferenceTime;

    // Memory usage
    mLastMetrics.memoryUsage_bytes = mMemoryPool->getUsage();

    // GPU utilization (simplified - would need NVML for accurate measurement)
    mLastMetrics.gpuUtilization_percent = 85.0f; // Placeholder
}

void TensorRTEngine::printModelInfo() const {
    if (!mEngine) {
        std::cout << "No engine loaded" << std::endl;
        return;
    }

    std::cout << "=== TensorRT Engine Info ===" << std::endl;
    std::cout << "Max batch size: " << mEngine->getMaxBatchSize() << std::endl;
    std::cout << "Number of bindings: " << mEngine->getNbBindings() << std::endl;

    for (int i = 0; i < mEngine->getNbBindings(); ++i) {
        std::string name = mEngine->getBindingName(i);
        auto dims = mEngine->getBindingDimensions(i);
        bool isInput = mEngine->bindingIsInput(i);

        std::cout << (isInput ? "Input: " : "Output: ") << name
                  << " " << Utils::dimsToString(dims) << std::endl;
    }

    std::cout << "Memory pool usage: " << mMemoryPool->getUsage() / (1024*1024) << " MB / "
              << mMemoryPool->getCapacity() / (1024*1024) << " MB" << std::endl;
}

nvinfer1::Dims TensorRTEngine::getInputDims(const std::string& name) const {
    for (const auto& tensor : mInputTensors) {
        if (tensor.name == name) return tensor.dims;
    }
    return Dims{-1, {}};
}

nvinfer1::Dims TensorRTEngine::getOutputDims(const std::string& name) const {
    for (const auto& tensor : mOutputTensors) {
        if (tensor.name == name) return tensor.dims;
    }
    return Dims{-1, {}};
}

// Utility functions implementation
namespace LegalAI {
namespace Utils {

size_t getDataTypeSize(DataType dataType) {
    switch (dataType) {
        case DataType::kFLOAT: return 4;
        case DataType::kHALF: return 2;
        case DataType::kINT8: return 1;
        case DataType::kINT32: return 4;
        case DataType::kBOOL: return 1;
        case DataType::kUINT8: return 1;
        default: return 0;
    }
}

size_t getDimsSize(const Dims& dims) {
    size_t size = 1;
    for (int i = 0; i < dims.nbDims; ++i) {
        size *= dims.d[i];
    }
    return size;
}

std::string dimsToString(const Dims& dims) {
    std::string result = "[";
    for (int i = 0; i < dims.nbDims; ++i) {
        if (i > 0) result += ", ";
        result += std::to_string(dims.d[i]);
    }
    result += "]";
    return result;
}

bool fileExists(const std::string& path) {
    std::ifstream file(path);
    return file.good();
}

std::vector<char> loadFile(const std::string& path) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file.good()) return {};

    size_t size = file.tellg();
    file.seekg(0);

    std::vector<char> data(size);
    file.read(data.data(), size);

    return data;
}

bool saveFile(const std::string& path, const void* data, size_t size) {
    std::ofstream file(path, std::ios::binary);
    if (!file.good()) return false;

    file.write(static_cast<const char*>(data), size);
    return file.good();
}

std::vector<char> compressData(const void* data, size_t size) {
    size_t compressBound = ZSTD_compressBound(size);
    std::vector<char> compressed(compressBound);

    size_t compressedSize = ZSTD_compress(compressed.data(), compressBound, data, size, 3);
    if (ZSTD_isError(compressedSize)) {
        return {};
    }

    compressed.resize(compressedSize);
    return compressed;
}

std::vector<char> decompressData(const void* data, size_t size) {
    unsigned long long decompressedSize = ZSTD_getFrameContentSize(data, size);
    if (decompressedSize == ZSTD_CONTENTSIZE_ERROR || decompressedSize == ZSTD_CONTENTSIZE_UNKNOWN) {
        return {};
    }

    std::vector<char> decompressed(decompressedSize);
    size_t result = ZSTD_decompress(decompressed.data(), decompressedSize, data, size);

    if (ZSTD_isError(result)) {
        return {};
    }

    return decompressed;
}

} // namespace Utils
} // namespace LegalAI