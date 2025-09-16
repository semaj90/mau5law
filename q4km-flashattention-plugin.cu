/*
 * Q4_K_M + FlashAttention Fused TensorRT Plugin
 * Custom CUDA kernel for optimal Q4_K_M inference with FlashAttention
 */

#include <cuda_runtime.h>
#include <cuda_fp16.h>
#include <NvInfer.h>
#include <NvInferPlugin.h>
#include <vector>
#include <string>
#include <memory>
#include <cmath>
#include <cassert>

namespace nvinfer1 {
namespace plugin {

// Q4_K_M dequantization constants
constexpr int Q4KM_BLOCK_SIZE = 32;
constexpr int Q4KM_QUANTIZED_BYTES = 20; // 2 (scale) + 2 (min) + 16 (4-bit values)

// FlashAttention constants
constexpr int FLASH_ATTN_BLOCK_SIZE = 128;
constexpr int WARP_SIZE = 32;

// Q4_K_M block structure
struct Q4KMBlock {
    __half scale;
    __half min;
    uint8_t quantized[16]; // 32 4-bit values packed into 16 bytes
};

// Shared memory structure for FlashAttention
template<int BLOCK_M, int BLOCK_N, int HEAD_DIM>
struct SharedMemory {
    __half Q_block[BLOCK_M][HEAD_DIM];
    __half K_block[BLOCK_N][HEAD_DIM];
    __half V_block[BLOCK_N][HEAD_DIM];
    float row_max[BLOCK_M];
    float row_sum[BLOCK_M];
};

// CUDA kernel for Q4_K_M dequantization
__global__ void dequantize_q4km_kernel(
    const Q4KMBlock* __restrict__ quantized,
    __half* __restrict__ output,
    int num_elements
) {
    const int tid = blockIdx.x * blockDim.x + threadIdx.x;
    const int block_idx = tid / Q4KM_BLOCK_SIZE;
    const int elem_idx = tid % Q4KM_BLOCK_SIZE;

    if (tid >= num_elements) return;

    const Q4KMBlock& block = quantized[block_idx];

    // Extract 4-bit value
    const int byte_idx = elem_idx / 2;
    const int nibble_idx = elem_idx % 2;
    const uint8_t byte_val = block.quantized[byte_idx];
    const uint8_t q_val = (nibble_idx == 0) ? (byte_val & 0x0F) : ((byte_val >> 4) & 0x0F);

    // Dequantize: min + scale * q_val
    output[tid] = __hfma(__half(q_val), block.scale, block.min);
}

// Fused Q4_K_M dequantization + matrix multiply kernel
__global__ void q4km_dequant_matmul_kernel(
    const Q4KMBlock* __restrict__ A_quantized,  // [M, K] in Q4_K_M format
    const __half* __restrict__ B,               // [K, N] in FP16
    __half* __restrict__ C,                     // [M, N] output
    int M, int N, int K
) {
    const int row = blockIdx.y * blockDim.y + threadIdx.y;
    const int col = blockIdx.x * blockDim.x + threadIdx.x;

    if (row >= M || col >= N) return;

    float sum = 0.0f;

    // Process K dimension in chunks of Q4KM_BLOCK_SIZE
    for (int k_block = 0; k_block < K / Q4KM_BLOCK_SIZE; k_block++) {
        // Load Q4_K_M block for this row
        const int a_block_idx = row * (K / Q4KM_BLOCK_SIZE) + k_block;
        const Q4KMBlock& a_block = A_quantized[a_block_idx];

        // Dequantize and multiply-accumulate
        for (int k = 0; k < Q4KM_BLOCK_SIZE; k++) {
            // Dequantize A element
            const int byte_idx = k / 2;
            const int nibble_idx = k % 2;
            const uint8_t byte_val = a_block.quantized[byte_idx];
            const uint8_t q_val = (nibble_idx == 0) ?
                                  (byte_val & 0x0F) :
                                  ((byte_val >> 4) & 0x0F);

            const float a_val = __half2float(a_block.min) +
                               __half2float(a_block.scale) * q_val;

            // Load B element and multiply
            const float b_val = __half2float(B[(k_block * Q4KM_BLOCK_SIZE + k) * N + col]);
            sum += a_val * b_val;
        }
    }

    C[row * N + col] = __float2half(sum);
}

// FlashAttention v2 kernel with Q4_K_M support
template<int BLOCK_M, int BLOCK_N, int HEAD_DIM, int NUM_THREADS>
__global__ void flash_attention_q4km_kernel(
    const Q4KMBlock* __restrict__ Q_quantized,  // [batch, seq_len, num_heads, head_dim]
    const Q4KMBlock* __restrict__ K_quantized,  // [batch, seq_len, num_heads, head_dim]
    const Q4KMBlock* __restrict__ V_quantized,  // [batch, seq_len, num_heads, head_dim]
    __half* __restrict__ O,                     // [batch, seq_len, num_heads, head_dim]
    const float scale,
    int batch_size,
    int seq_len,
    int num_heads
) {
    extern __shared__ char smem[];
    auto* shared = reinterpret_cast<SharedMemory<BLOCK_M, BLOCK_N, HEAD_DIM>*>(smem);

    const int batch_idx = blockIdx.z;
    const int head_idx = blockIdx.y;
    const int tile_idx = blockIdx.x;

    const int tid = threadIdx.x;
    const int warp_id = tid / WARP_SIZE;
    const int lane_id = tid % WARP_SIZE;

    // Initialize accumulators
    float acc[BLOCK_M][HEAD_DIM / NUM_THREADS];
    for (int i = 0; i < BLOCK_M; i++) {
        for (int j = 0; j < HEAD_DIM / NUM_THREADS; j++) {
            acc[i][j] = 0.0f;
        }
    }

    float row_max_val[BLOCK_M];
    float row_sum_val[BLOCK_M];
    for (int i = 0; i < BLOCK_M; i++) {
        row_max_val[i] = -INFINITY;
        row_sum_val[i] = 0.0f;
    }

    // Process attention blocks
    const int q_offset = batch_idx * seq_len * num_heads * HEAD_DIM +
                        head_idx * HEAD_DIM +
                        tile_idx * BLOCK_M * num_heads * HEAD_DIM;

    // Load and dequantize Q block
    if (tid < BLOCK_M) {
        const int q_blocks_per_row = HEAD_DIM / Q4KM_BLOCK_SIZE;
        for (int d_block = 0; d_block < q_blocks_per_row; d_block++) {
            const Q4KMBlock& q_block = Q_quantized[
                q_offset / Q4KM_BLOCK_SIZE + tid * q_blocks_per_row + d_block
            ];

            // Dequantize block
            for (int d = 0; d < Q4KM_BLOCK_SIZE; d++) {
                const int byte_idx = d / 2;
                const int nibble_idx = d % 2;
                const uint8_t byte_val = q_block.quantized[byte_idx];
                const uint8_t q_val = (nibble_idx == 0) ?
                                      (byte_val & 0x0F) :
                                      ((byte_val >> 4) & 0x0F);

                shared->Q_block[tid][d_block * Q4KM_BLOCK_SIZE + d] =
                    __hfma(__half(q_val), q_block.scale, q_block.min);
            }
        }
    }

    __syncthreads();

    // Main attention loop over K,V blocks
    for (int kv_tile = 0; kv_tile < seq_len / BLOCK_N; kv_tile++) {
        const int kv_offset = batch_idx * seq_len * num_heads * HEAD_DIM +
                             head_idx * HEAD_DIM +
                             kv_tile * BLOCK_N * num_heads * HEAD_DIM;

        // Load and dequantize K,V blocks
        if (tid < BLOCK_N) {
            const int kv_blocks_per_row = HEAD_DIM / Q4KM_BLOCK_SIZE;

            // Load K
            for (int d_block = 0; d_block < kv_blocks_per_row; d_block++) {
                const Q4KMBlock& k_block = K_quantized[
                    kv_offset / Q4KM_BLOCK_SIZE + tid * kv_blocks_per_row + d_block
                ];

                // Dequantize K block
                for (int d = 0; d < Q4KM_BLOCK_SIZE; d++) {
                    const int byte_idx = d / 2;
                    const int nibble_idx = d % 2;
                    const uint8_t byte_val = k_block.quantized[byte_idx];
                    const uint8_t q_val = (nibble_idx == 0) ?
                                          (byte_val & 0x0F) :
                                          ((byte_val >> 4) & 0x0F);

                    shared->K_block[tid][d_block * Q4KM_BLOCK_SIZE + d] =
                        __hfma(__half(q_val), k_block.scale, k_block.min);
                }
            }

            // Load V
            for (int d_block = 0; d_block < kv_blocks_per_row; d_block++) {
                const Q4KMBlock& v_block = V_quantized[
                    kv_offset / Q4KM_BLOCK_SIZE + tid * kv_blocks_per_row + d_block
                ];

                // Dequantize V block
                for (int d = 0; d < Q4KM_BLOCK_SIZE; d++) {
                    const int byte_idx = d / 2;
                    const int nibble_idx = d % 2;
                    const uint8_t byte_val = v_block.quantized[byte_idx];
                    const uint8_t q_val = (nibble_idx == 0) ?
                                          (byte_val & 0x0F) :
                                          ((byte_val >> 4) & 0x0F);

                    shared->V_block[tid][d_block * Q4KM_BLOCK_SIZE + d] =
                        __hfma(__half(q_val), v_block.scale, v_block.min);
                }
            }
        }

        __syncthreads();

        // Compute QK^T scores
        float scores[BLOCK_M][BLOCK_N / NUM_THREADS];
        for (int m = 0; m < BLOCK_M; m++) {
            for (int n = tid; n < BLOCK_N; n += NUM_THREADS) {
                float score = 0.0f;
                for (int d = 0; d < HEAD_DIM; d++) {
                    score += __half2float(shared->Q_block[m][d]) *
                            __half2float(shared->K_block[n][d]);
                }
                scores[m][n / NUM_THREADS] = score * scale;
            }
        }

        // Online softmax: update max and sum
        for (int m = 0; m < BLOCK_M; m++) {
            float block_max = row_max_val[m];
            for (int n = 0; n < BLOCK_N / NUM_THREADS; n++) {
                block_max = fmaxf(block_max, scores[m][n]);
            }

            // Warp reduce max
            for (int offset = WARP_SIZE / 2; offset > 0; offset /= 2) {
                block_max = fmaxf(block_max, __shfl_down_sync(0xffffffff, block_max, offset));
            }

            float block_sum = 0.0f;
            for (int n = 0; n < BLOCK_N / NUM_THREADS; n++) {
                scores[m][n] = expf(scores[m][n] - block_max);
                block_sum += scores[m][n];
            }

            // Warp reduce sum
            for (int offset = WARP_SIZE / 2; offset > 0; offset /= 2) {
                block_sum += __shfl_down_sync(0xffffffff, block_sum, offset);
            }

            // Update running statistics
            float old_max = row_max_val[m];
            float old_sum = row_sum_val[m];
            row_max_val[m] = fmaxf(old_max, block_max);
            row_sum_val[m] = old_sum * expf(old_max - row_max_val[m]) +
                           block_sum * expf(block_max - row_max_val[m]);

            // Rescale accumulator if needed
            if (old_max != row_max_val[m]) {
                float rescale = expf(old_max - row_max_val[m]);
                for (int d = 0; d < HEAD_DIM / NUM_THREADS; d++) {
                    acc[m][d] *= rescale;
                }
            }
        }

        // Accumulate weighted values
        for (int m = 0; m < BLOCK_M; m++) {
            for (int d = tid; d < HEAD_DIM; d += NUM_THREADS) {
                float weighted_val = 0.0f;
                for (int n = 0; n < BLOCK_N; n++) {
                    if ((n % NUM_THREADS) == (tid % NUM_THREADS)) {
                        weighted_val += scores[m][n / NUM_THREADS] *
                                      __half2float(shared->V_block[n][d]);
                    }
                }
                acc[m][d / NUM_THREADS] += weighted_val *
                                          expf(row_max_val[m] - row_max_val[m]);
            }
        }

        __syncthreads();
    }

    // Write output
    for (int m = 0; m < BLOCK_M; m++) {
        const int out_row = tile_idx * BLOCK_M + m;
        if (out_row < seq_len) {
            for (int d = tid; d < HEAD_DIM; d += NUM_THREADS) {
                const int out_idx = batch_idx * seq_len * num_heads * HEAD_DIM +
                                   out_row * num_heads * HEAD_DIM +
                                   head_idx * HEAD_DIM + d;
                O[out_idx] = __float2half(acc[m][d / NUM_THREADS] / row_sum_val[m]);
            }
        }
    }
}

// TensorRT plugin implementation
class Q4KMFlashAttentionPlugin : public IPluginV2DynamicExt {
private:
    int num_heads_;
    int head_dim_;
    float dropout_;
    std::string namespace_;
    std::string plugin_type_;
    std::string plugin_version_;

public:
    Q4KMFlashAttentionPlugin(int num_heads, int head_dim, float dropout = 0.0f)
        : num_heads_(num_heads)
        , head_dim_(head_dim)
        , dropout_(dropout)
        , namespace_("Q4KM")
        , plugin_type_("Q4KMFlashAttention")
        , plugin_version_("1.0") {}

    // IPluginV2DynamicExt methods
    IPluginV2DynamicExt* clone() const noexcept override {
        return new Q4KMFlashAttentionPlugin(num_heads_, head_dim_, dropout_);
    }

    DimsExprs getOutputDimensions(
        int outputIndex,
        const DimsExprs* inputs,
        int nbInputs,
        IExprBuilder& exprBuilder) noexcept override {

        // Output shape is same as Q shape
        return inputs[0];
    }

    bool supportsFormatCombination(
        int pos,
        const PluginTensorDesc* inOut,
        int nbInputs,
        int nbOutputs) noexcept override {

        // Support FP16 for inputs and outputs
        if (pos < nbInputs) {
            return inOut[pos].format == TensorFormat::kLINEAR &&
                   inOut[pos].type == DataType::kHALF;
        }
        return inOut[pos].format == TensorFormat::kLINEAR &&
               inOut[pos].type == DataType::kHALF;
    }

    void configurePlugin(
        const DynamicPluginTensorDesc* in,
        int nbInputs,
        const DynamicPluginTensorDesc* out,
        int nbOutputs) noexcept override {
        // Configuration is handled in constructor
    }

    size_t getWorkspaceSize(
        const PluginTensorDesc* inputs,
        int nbInputs,
        const PluginTensorDesc* outputs,
        int nbOutputs) const noexcept override {
        // Workspace for temporary buffers during attention computation
        const auto& dims = inputs[0].dims;
        size_t batch_size = dims.d[0];
        size_t seq_len = dims.d[1];

        // Need workspace for dequantized Q, K, V if input is quantized
        size_t workspace_size = 3 * batch_size * seq_len * num_heads_ * head_dim_ * sizeof(__half);
        return workspace_size;
    }

    int enqueue(
        const PluginTensorDesc* inputDesc,
        const PluginTensorDesc* outputDesc,
        const void* const* inputs,
        void* const* outputs,
        void* workspace,
        cudaStream_t stream) noexcept override {

        const auto& dims = inputDesc[0].dims;
        int batch_size = dims.d[0];
        int seq_len = dims.d[1];

        // Determine if input is quantized (Q4_K_M) or FP16
        bool is_quantized = true; // Assume Q4_K_M input

        if (is_quantized) {
            // Launch fused Q4_K_M FlashAttention kernel
            constexpr int BLOCK_M = 64;
            constexpr int BLOCK_N = 64;
            constexpr int NUM_THREADS = 256;

            dim3 grid(
                (seq_len + BLOCK_M - 1) / BLOCK_M,
                num_heads_,
                batch_size
            );
            dim3 block(NUM_THREADS);

            size_t smem_size = sizeof(SharedMemory<BLOCK_M, BLOCK_N, head_dim_>);

            flash_attention_q4km_kernel<BLOCK_M, BLOCK_N, head_dim_, NUM_THREADS>
                <<<grid, block, smem_size, stream>>>(
                    reinterpret_cast<const Q4KMBlock*>(inputs[0]),
                    reinterpret_cast<const Q4KMBlock*>(inputs[1]),
                    reinterpret_cast<const Q4KMBlock*>(inputs[2]),
                    reinterpret_cast<__half*>(outputs[0]),
                    1.0f / sqrtf(static_cast<float>(head_dim_)),
                    batch_size,
                    seq_len,
                    num_heads_
                );
        } else {
            // Standard FlashAttention for FP16 inputs
            // (Implementation would go here)
        }

        return 0;
    }

    DataType getOutputDataType(
        int index,
        const DataType* inputTypes,
        int nbInputs) const noexcept override {
        return DataType::kHALF;
    }

    const char* getPluginType() const noexcept override {
        return plugin_type_.c_str();
    }

    const char* getPluginVersion() const noexcept override {
        return plugin_version_.c_str();
    }

    void destroy() noexcept override {
        delete this;
    }

    int getNbOutputs() const noexcept override {
        return 1;
    }

    int initialize() noexcept override {
        return 0;
    }

    void terminate() noexcept override {}

    size_t getSerializationSize() const noexcept override {
        return sizeof(num_heads_) + sizeof(head_dim_) + sizeof(dropout_);
    }

    void serialize(void* buffer) const noexcept override {
        char* d = reinterpret_cast<char*>(buffer);
        *reinterpret_cast<int*>(d) = num_heads_;
        d += sizeof(num_heads_);
        *reinterpret_cast<int*>(d) = head_dim_;
        d += sizeof(head_dim_);
        *reinterpret_cast<float*>(d) = dropout_;
    }

    void setPluginNamespace(const char* pluginNamespace) noexcept override {
        namespace_ = pluginNamespace;
    }

    const char* getPluginNamespace() const noexcept override {
        return namespace_.c_str();
    }
};

// Plugin creator
class Q4KMFlashAttentionPluginCreator : public IPluginCreator {
private:
    std::string namespace_;
    std::string plugin_name_;
    std::string plugin_version_;
    PluginFieldCollection field_collection_;

public:
    Q4KMFlashAttentionPluginCreator()
        : namespace_("Q4KM")
        , plugin_name_("Q4KMFlashAttention")
        , plugin_version_("1.0") {
        field_collection_ = {0, nullptr};
    }

    const char* getPluginName() const noexcept override {
        return plugin_name_.c_str();
    }

    const char* getPluginVersion() const noexcept override {
        return plugin_version_.c_str();
    }

    const PluginFieldCollection* getFieldNames() noexcept override {
        return &field_collection_;
    }

    IPluginV2* createPlugin(
        const char* name,
        const PluginFieldCollection* fc) noexcept override {

        int num_heads = 32;
        int head_dim = 128;
        float dropout = 0.0f;

        // Parse plugin fields
        for (int i = 0; i < fc->nbFields; i++) {
            const char* attr_name = fc->fields[i].name;
            if (strcmp(attr_name, "num_heads") == 0) {
                num_heads = *static_cast<const int*>(fc->fields[i].data);
            } else if (strcmp(attr_name, "head_dim") == 0) {
                head_dim = *static_cast<const int*>(fc->fields[i].data);
            } else if (strcmp(attr_name, "dropout") == 0) {
                dropout = *static_cast<const float*>(fc->fields[i].data);
            }
        }

        return new Q4KMFlashAttentionPlugin(num_heads, head_dim, dropout);
    }

    IPluginV2* deserializePlugin(
        const char* name,
        const void* serialData,
        size_t serialLength) noexcept override {

        const char* d = reinterpret_cast<const char*>(serialData);
        int num_heads = *reinterpret_cast<const int*>(d);
        d += sizeof(num_heads);
        int head_dim = *reinterpret_cast<const int*>(d);
        d += sizeof(head_dim);
        float dropout = *reinterpret_cast<const float*>(d);

        return new Q4KMFlashAttentionPlugin(num_heads, head_dim, dropout);
    }

    void setPluginNamespace(const char* pluginNamespace) noexcept override {
        namespace_ = pluginNamespace;
    }

    const char* getPluginNamespace() const noexcept override {
        return namespace_.c_str();
    }
};

// Register plugin
REGISTER_TENSORRT_PLUGIN(Q4KMFlashAttentionPluginCreator);

} // namespace plugin
} // namespace nvinfer1