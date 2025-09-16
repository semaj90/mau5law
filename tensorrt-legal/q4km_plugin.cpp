#include <NvInfer.h>
#include <NvInferPlugin.h>
#include <cuda_runtime.h>
#include <cublas_v2.h>
#include <cassert>
#include <cstring>
#include <iostream>
#include <vector>
#include <memory>

using namespace nvinfer1;

// Forward declarations for CUDA kernels
extern "C" {
    void q4_flash_attn_kernel(
        const uint8_t* q_quantized, const uint8_t* k_quantized, const uint8_t* v_quantized,
        const float* q_scales, const float* k_scales, const float* v_scales,
        const float* q_mins, const float* k_mins, const float* v_mins,
        float* output,
        const int batch_size, const int seq_len, const int num_heads, const int head_dim,
        const float scale_factor,
        cudaStream_t stream
    );

    void quantize_to_q4km(
        const float* input, uint8_t* output, float* scales, float* mins,
        const int num_elements, const int block_size,
        cudaStream_t stream
    );
}

namespace {
    constexpr const char* Q4KM_PLUGIN_VERSION = "1";
    constexpr const char* Q4KM_PLUGIN_NAME = "Q4KMFlashAttention";
}

class Q4KMFlashAttentionPlugin : public IPluginV2DynamicExt {
public:
    Q4KMFlashAttentionPlugin(int numHeads, int headDim, float scaleFactor = -1.0f)
        : mNumHeads(numHeads), mHeadDim(headDim), mScaleFactor(scaleFactor) {
        if (mScaleFactor < 0) {
            mScaleFactor = 1.0f / sqrtf(static_cast<float>(mHeadDim));
        }
    }

    Q4KMFlashAttentionPlugin(const void* data, size_t length) {
        deserialize(static_cast<const char*>(data), length);
    }

    // IPluginV2DynamicExt methods
    IPluginV2DynamicExt* clone() const noexcept override {
        return new Q4KMFlashAttentionPlugin(mNumHeads, mHeadDim, mScaleFactor);
    }

    const char* getPluginType() const noexcept override {
        return Q4KM_PLUGIN_NAME;
    }

    const char* getPluginVersion() const noexcept override {
        return Q4KM_PLUGIN_VERSION;
    }

    int getNbOutputs() const noexcept override {
        return 1;
    }

    DimsExprs getOutputDimensions(int outputIndex, const DimsExprs* inputs,
                                 int nbInputs, IExprBuilder& exprBuilder) noexcept override {
        // Input format: [batch, seq_len, num_heads, head_dim] for Q,K,V (quantized)
        // Output format: [batch, seq_len, num_heads, head_dim] (FP32)
        assert(outputIndex == 0);
        assert(nbInputs == 9); // Q, K, V, Q_scales, K_scales, V_scales, Q_mins, K_mins, V_mins

        return inputs[0]; // Same shape as Q input
    }

    bool supportsFormatCombination(int pos, const PluginTensorDesc* inOut,
                                  int nbInputs, int nbOutputs) noexcept override {
        assert(nbInputs == 9 && nbOutputs == 1);

        switch (pos) {
            case 0: case 1: case 2:  // Q, K, V (quantized)
                return inOut[pos].type == DataType::kUINT8 && inOut[pos].format == TensorFormat::kLINEAR;
            case 3: case 4: case 5: case 6: case 7: case 8:  // Scales and mins
                return inOut[pos].type == DataType::kFLOAT && inOut[pos].format == TensorFormat::kLINEAR;
            case 9:  // Output
                return inOut[pos].type == DataType::kFLOAT && inOut[pos].format == TensorFormat::kLINEAR;
        }
        return false;
    }

    void configurePlugin(const DynamicPluginTensorDesc* in, int nbInputs,
                        const DynamicPluginTensorDesc* out, int nbOutputs) noexcept override {
        assert(nbInputs == 9 && nbOutputs == 1);

        // Extract dimensions from Q tensor
        const auto& qDims = in[0].desc.dims;
        mBatchSize = qDims.d[0];
        mSeqLen = qDims.d[1];
        mNumHeads = qDims.d[2];
        mHeadDim = qDims.d[3];
    }

    size_t getWorkspaceSize(const PluginTensorDesc* inputs, int nbInputs,
                           const PluginTensorDesc* outputs, int nbOutputs) const noexcept override {
        // No additional workspace needed for this implementation
        return 0;
    }

    int enqueue(const PluginTensorDesc* inputDesc, const PluginTensorDesc* outputDesc,
               const void* const* inputs, void* const* outputs,
               void* workspace, cudaStream_t stream) noexcept override {

        const uint8_t* q_quantized = static_cast<const uint8_t*>(inputs[0]);
        const uint8_t* k_quantized = static_cast<const uint8_t*>(inputs[1]);
        const uint8_t* v_quantized = static_cast<const uint8_t*>(inputs[2]);
        const float* q_scales = static_cast<const float*>(inputs[3]);
        const float* k_scales = static_cast<const float*>(inputs[4]);
        const float* v_scales = static_cast<const float*>(inputs[5]);
        const float* q_mins = static_cast<const float*>(inputs[6]);
        const float* k_mins = static_cast<const float*>(inputs[7]);
        const float* v_mins = static_cast<const float*>(inputs[8]);
        float* output = static_cast<float*>(outputs[0]);

        // Extract dynamic dimensions
        const int batchSize = inputDesc[0].dims.d[0];
        const int seqLen = inputDesc[0].dims.d[1];
        const int numHeads = inputDesc[0].dims.d[2];
        const int headDim = inputDesc[0].dims.d[3];

        // Launch kernel with optimal grid configuration
        dim3 blockSize(256);  // Threads per block
        dim3 gridSize(
            (seqLen + blockSize.x - 1) / blockSize.x,  // X: sequence positions
            numHeads,                                   // Y: attention heads
            batchSize                                   // Z: batch dimension
        );

        // Calculate shared memory requirements
        const size_t sharedMemSize = blockSize.x * headDim * 4 * sizeof(float); // Q, K, V, scores

        q4_flash_attn_kernel<<<gridSize, blockSize, sharedMemSize, stream>>>(
            q_quantized, k_quantized, v_quantized,
            q_scales, k_scales, v_scales,
            q_mins, k_mins, v_mins,
            output,
            batchSize, seqLen, numHeads, headDim,
            mScaleFactor
        );

        return cudaGetLastError() == cudaSuccess ? 0 : -1;
    }

    DataType getOutputDataType(int index, const DataType* inputTypes, int nbInputs) const noexcept override {
        assert(index == 0);
        return DataType::kFLOAT;
    }

    size_t getSerializationSize() const noexcept override {
        return sizeof(mNumHeads) + sizeof(mHeadDim) + sizeof(mScaleFactor) +
               sizeof(mBatchSize) + sizeof(mSeqLen);
    }

    void serialize(void* buffer) const noexcept override {
        char* d = static_cast<char*>(buffer);
        write(d, mNumHeads);
        write(d, mHeadDim);
        write(d, mScaleFactor);
        write(d, mBatchSize);
        write(d, mSeqLen);
    }

    void terminate() noexcept override {}

    void destroy() noexcept override {
        delete this;
    }

    int initialize() noexcept override {
        return 0;
    }

    const char* getPluginNamespace() const noexcept override {
        return "LEGAL_AI";
    }

    void setPluginNamespace(const char* pluginNamespace) noexcept override {
        mNamespace = pluginNamespace;
    }

private:
    void deserialize(const char* data, size_t length) {
        const char* d = data;
        read(d, mNumHeads);
        read(d, mHeadDim);
        read(d, mScaleFactor);
        read(d, mBatchSize);
        read(d, mSeqLen);
    }

    template<typename T>
    void write(char*& buffer, const T& val) const {
        std::memcpy(buffer, &val, sizeof(T));
        buffer += sizeof(T);
    }

    template<typename T>
    void read(const char*& buffer, T& val) {
        std::memcpy(&val, buffer, sizeof(T));
        buffer += sizeof(T);
    }

    int mNumHeads;
    int mHeadDim;
    float mScaleFactor;
    int mBatchSize;
    int mSeqLen;
    std::string mNamespace;
};

class Q4KMFlashAttentionPluginCreator : public IPluginCreator {
public:
    Q4KMFlashAttentionPluginCreator() {
        mPluginAttributes.clear();
        mPluginAttributes.emplace_back(PluginField("num_heads", nullptr, PluginFieldType::kINT32, 1));
        mPluginAttributes.emplace_back(PluginField("head_dim", nullptr, PluginFieldType::kINT32, 1));
        mPluginAttributes.emplace_back(PluginField("scale_factor", nullptr, PluginFieldType::kFLOAT32, 1));
        mFC.nbFields = mPluginAttributes.size();
        mFC.fields = mPluginAttributes.data();
    }

    const char* getPluginName() const noexcept override {
        return Q4KM_PLUGIN_NAME;
    }

    const char* getPluginVersion() const noexcept override {
        return Q4KM_PLUGIN_VERSION;
    }

    const PluginFieldCollection* getFieldNames() noexcept override {
        return &mFC;
    }

    IPluginV2* createPlugin(const char* name, const PluginFieldCollection* fc) noexcept override {
        int numHeads = 32;  // Default for Gemma3
        int headDim = 128;  // Default for Gemma3
        float scaleFactor = -1.0f;  // Auto-calculate

        for (int i = 0; i < fc->nbFields; i++) {
            std::string field_name(fc->fields[i].name);
            if (field_name.compare("num_heads") == 0) {
                numHeads = static_cast<const int*>(fc->fields[i].data)[0];
            } else if (field_name.compare("head_dim") == 0) {
                headDim = static_cast<const int*>(fc->fields[i].data)[0];
            } else if (field_name.compare("scale_factor") == 0) {
                scaleFactor = static_cast<const float*>(fc->fields[i].data)[0];
            }
        }

        return new Q4KMFlashAttentionPlugin(numHeads, headDim, scaleFactor);
    }

    IPluginV2* deserializePlugin(const char* name, const void* serialData, size_t serialLength) noexcept override {
        return new Q4KMFlashAttentionPlugin(serialData, serialLength);
    }

    void setPluginNamespace(const char* pluginNamespace) noexcept override {
        mNamespace = pluginNamespace;
    }

    const char* getPluginNamespace() const noexcept override {
        return mNamespace.c_str();
    }

private:
    static PluginFieldCollection mFC;
    static std::vector<PluginField> mPluginAttributes;
    std::string mNamespace;
};

PluginFieldCollection Q4KMFlashAttentionPluginCreator::mFC{};
std::vector<PluginField> Q4KMFlashAttentionPluginCreator::mPluginAttributes{};

// Plugin registration
extern "C" {
    bool initializePlugin(ILogger* logger, const char* libNamespace) {
        auto* creator = new Q4KMFlashAttentionPluginCreator();
        getPluginRegistry()->registerCreator(*creator, libNamespace);
        return true;
    }

    // For dynamic loading
    void* createQ4KMPlugin(int numHeads, int headDim, float scaleFactor) {
        return new Q4KMFlashAttentionPlugin(numHeads, headDim, scaleFactor);
    }
}

// Additional utility functions for integration
namespace Q4KMUtils {
    // Helper to convert FP32 tensor to Q4_K_M format
    class QuantizationHelper {
    public:
        static void quantizeTensorQ4KM(
            const float* input, uint8_t* output,
            float* scales, float* mins,
            int batchSize, int seqLen, int numHeads, int headDim,
            cudaStream_t stream = nullptr) {

            const int totalElements = batchSize * seqLen * numHeads * headDim;
            const int blockSize = 256;
            const int numBlocks = (totalElements + blockSize - 1) / blockSize;

            quantize_to_q4km<<<numBlocks, blockSize, 0, stream>>>(
                input, output, scales, mins, totalElements, blockSize
            );
        }

        // Memory footprint calculation
        static size_t getQuantizedSize(int batchSize, int seqLen, int numHeads, int headDim) {
            const int totalElements = batchSize * seqLen * numHeads * headDim;
            return (totalElements + 1) / 2; // INT4 packing: 2 elements per byte
        }

        static size_t getScalesSize(int batchSize, int numHeads) {
            return batchSize * numHeads * sizeof(float);
        }
    };

    // Performance profiler for different configurations
    class ProfilerQ4KM {
    public:
        struct PerfResult {
            float latency_ms;
            float throughput_tokens_per_sec;
            float memory_bandwidth_gb_per_sec;
            size_t memory_usage_bytes;
        };

        static PerfResult profileConfiguration(
            int batchSize, int seqLen, int numHeads, int headDim,
            int numIterations = 100) {

            // Allocate test data
            const size_t qkv_size = getQuantizedSize(batchSize, seqLen, numHeads, headDim);
            const size_t scales_size = getScalesSize(batchSize, numHeads);

            uint8_t *d_q, *d_k, *d_v;
            float *d_q_scales, *d_k_scales, *d_v_scales;
            float *d_q_mins, *d_k_mins, *d_v_mins, *d_output;

            cudaMalloc(&d_q, qkv_size);
            cudaMalloc(&d_k, qkv_size);
            cudaMalloc(&d_v, qkv_size);
            cudaMalloc(&d_q_scales, scales_size);
            cudaMalloc(&d_k_scales, scales_size);
            cudaMalloc(&d_v_scales, scales_size);
            cudaMalloc(&d_q_mins, scales_size);
            cudaMalloc(&d_k_mins, scales_size);
            cudaMalloc(&d_v_mins, scales_size);
            cudaMalloc(&d_output, batchSize * seqLen * numHeads * headDim * sizeof(float));

            // Warm up and benchmark
            cudaEvent_t start, stop;
            cudaEventCreate(&start);
            cudaEventCreate(&stop);

            // Warm-up runs
            for (int i = 0; i < 10; ++i) {
                Q4KMFlashAttentionPlugin plugin(numHeads, headDim);
                // ... benchmark kernel launch
            }

            cudaEventRecord(start);
            for (int i = 0; i < numIterations; ++i) {
                // Launch kernel
                dim3 blockSize(256);
                dim3 gridSize((seqLen + 255) / 256, numHeads, batchSize);
                const float scaleFactor = 1.0f / sqrtf(headDim);

                q4_flash_attn_kernel<<<gridSize, blockSize, 0, nullptr>>>(
                    d_q, d_k, d_v, d_q_scales, d_k_scales, d_v_scales,
                    d_q_mins, d_k_mins, d_v_mins, d_output,
                    batchSize, seqLen, numHeads, headDim, scaleFactor
                );
            }
            cudaEventRecord(stop);
            cudaEventSynchronize(stop);

            float milliseconds = 0;
            cudaEventElapsedTime(&milliseconds, start, stop);

            // Calculate performance metrics
            PerfResult result;
            result.latency_ms = milliseconds / numIterations;
            result.throughput_tokens_per_sec = (batchSize * seqLen * 1000.0f) / result.latency_ms;
            result.memory_usage_bytes = qkv_size * 3 + scales_size * 6 +
                                       batchSize * seqLen * numHeads * headDim * sizeof(float);

            // Cleanup
            cudaFree(d_q); cudaFree(d_k); cudaFree(d_v);
            cudaFree(d_q_scales); cudaFree(d_k_scales); cudaFree(d_v_scales);
            cudaFree(d_q_mins); cudaFree(d_k_mins); cudaFree(d_v_mins);
            cudaFree(d_output);
            cudaEventDestroy(start);
            cudaEventDestroy(stop);

            return result;
        }

    private:
        static size_t getQuantizedSize(int batchSize, int seqLen, int numHeads, int headDim) {
            return QuantizationHelper::getQuantizedSize(batchSize, seqLen, numHeads, headDim);
        }

        static size_t getScalesSize(int batchSize, int numHeads) {
            return QuantizationHelper::getScalesSize(batchSize, numHeads);
        }
    };
}