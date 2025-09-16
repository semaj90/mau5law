#include <cuda_fp16.h>
#include <cuda_runtime.h>
#include <cublas_v2.h>
#include <cub/cub.cuh>
#include <math.h>

// Q4_K_M quantization parameters
#define Q4KM_BLOCK_SIZE 256
#define Q4KM_GROUPS 8
#define Q4KM_BITS 4

// INT4 unpacking utilities
__device__ inline float dequantize_q4km(uint8_t val, float scale, float min_val) {
    return ((float)val / 15.0f) * scale + min_val;
}

// Optimized INT4 FlashAttention kernel for Gemma3-Legal
extern "C" __global__ void q4_flash_attn_kernel(
    const uint8_t* __restrict__ q_quantized,     // Quantized Q (INT4 packed)
    const uint8_t* __restrict__ k_quantized,     // Quantized K (INT4 packed)
    const uint8_t* __restrict__ v_quantized,     // Quantized V (INT4 packed)
    const float* __restrict__ q_scales,          // Q quantization scales
    const float* __restrict__ k_scales,          // K quantization scales
    const float* __restrict__ v_scales,          // V quantization scales
    const float* __restrict__ q_mins,            // Q quantization minimums
    const float* __restrict__ k_mins,            // K quantization minimums
    const float* __restrict__ v_mins,            // V quantization minimums
    float* __restrict__ output,                  // FP32 output
    const int batch_size,
    const int seq_len,
    const int num_heads,
    const int head_dim,
    const float scale_factor) {

    // Thread and block indices
    const int batch_idx = blockIdx.z;
    const int head_idx = blockIdx.y;
    const int seq_idx = blockIdx.x * blockDim.x + threadIdx.x;

    if (batch_idx >= batch_size || head_idx >= num_heads || seq_idx >= seq_len) {
        return;
    }

    // Shared memory for tiles
    extern __shared__ float shared_mem[];
    float* s_q = shared_mem;
    float* s_k = s_q + blockDim.x * head_dim;
    float* s_v = s_k + blockDim.x * head_dim;
    float* s_scores = s_v + blockDim.x * head_dim;

    const int tid = threadIdx.x;
    const int warp_id = tid / 32;
    const int lane_id = tid % 32;

    // Base pointers for current batch and head
    const int qkv_offset = batch_idx * num_heads * seq_len * head_dim +
                          head_idx * seq_len * head_dim;
    const uint8_t* q_base = q_quantized + qkv_offset / 2; // INT4 packed
    const uint8_t* k_base = k_quantized + qkv_offset / 2;
    const uint8_t* v_base = v_quantized + qkv_offset / 2;

    // Load and dequantize Q for this sequence position
    float local_q[32]; // Assuming head_dim <= 1024, so max 32 elements per thread
    const int q_load_offset = seq_idx * head_dim;

    #pragma unroll
    for (int d = tid; d < head_dim; d += blockDim.x) {
        const int packed_idx = (q_load_offset + d) / 2;
        const uint8_t packed_val = q_base[packed_idx];
        const uint8_t q_val = (d % 2 == 0) ? (packed_val & 0xF) : (packed_val >> 4);

        const float q_scale = q_scales[batch_idx * num_heads + head_idx];
        const float q_min = q_mins[batch_idx * num_heads + head_idx];
        local_q[d / blockDim.x] = dequantize_q4km(q_val, q_scale, q_min);
    }

    // Output accumulation
    float output_sum = 0.0f;
    float max_score = -INFINITY;
    float sum_exp = 0.0f;

    // Process K,V in tiles for memory efficiency
    for (int k_start = 0; k_start <= seq_idx; k_start += blockDim.x) {
        const int k_end = min(k_start + blockDim.x, seq_idx + 1);
        const int k_pos = k_start + tid;

        // Load and dequantize K tile
        if (k_pos < k_end && tid < k_end - k_start) {
            const int k_load_offset = k_pos * head_dim;

            #pragma unroll
            for (int d = 0; d < head_dim; d += 32) {
                if (d + lane_id < head_dim) {
                    const int packed_idx = (k_load_offset + d + lane_id) / 2;
                    const uint8_t packed_val = k_base[packed_idx];
                    const uint8_t k_val = ((d + lane_id) % 2 == 0) ?
                                         (packed_val & 0xF) : (packed_val >> 4);

                    const float k_scale = k_scales[batch_idx * num_heads + head_idx];
                    const float k_min = k_mins[batch_idx * num_heads + head_idx];
                    s_k[tid * head_dim + d + lane_id] = dequantize_q4km(k_val, k_scale, k_min);
                }
            }
        }

        __syncthreads();

        // Compute attention scores: Q @ K^T
        if (tid < k_end - k_start) {
            float score = 0.0f;

            #pragma unroll
            for (int d = 0; d < head_dim; ++d) {
                score += local_q[d / blockDim.x] * s_k[tid * head_dim + d];
            }

            score *= scale_factor;
            s_scores[tid] = score;

            // Update running max for numerical stability
            max_score = fmaxf(max_score, score);
        }

        __syncthreads();

        // Compute softmax denominator
        float local_sum_exp = 0.0f;
        if (tid < k_end - k_start) {
            const float exp_score = expf(s_scores[tid] - max_score);
            s_scores[tid] = exp_score;
            local_sum_exp = exp_score;
        }

        // Reduce sum across block
        typedef cub::BlockReduce<float, 256> BlockReduce;
        __shared__ typename BlockReduce::TempStorage temp_storage;
        float block_sum = BlockReduce(temp_storage).Sum(local_sum_exp);

        if (tid == 0) {
            sum_exp += block_sum;
        }

        __syncthreads();

        // Load and dequantize V tile
        if (k_pos < k_end && tid < k_end - k_start) {
            const int v_load_offset = k_pos * head_dim;

            #pragma unroll
            for (int d = 0; d < head_dim; d += 32) {
                if (d + lane_id < head_dim) {
                    const int packed_idx = (v_load_offset + d + lane_id) / 2;
                    const uint8_t packed_val = v_base[packed_idx];
                    const uint8_t v_val = ((d + lane_id) % 2 == 0) ?
                                         (packed_val & 0xF) : (packed_val >> 4);

                    const float v_scale = v_scales[batch_idx * num_heads + head_idx];
                    const float v_min = v_mins[batch_idx * num_heads + head_idx];
                    s_v[tid * head_dim + d + lane_id] = dequantize_q4km(v_val, v_scale, v_min);
                }
            }
        }

        __syncthreads();

        // Accumulate weighted values
        if (tid < k_end - k_start) {
            const float attn_weight = s_scores[tid];

            #pragma unroll
            for (int d = 0; d < head_dim; ++d) {
                atomicAdd(&output_sum, attn_weight * s_v[tid * head_dim + d]);
            }
        }

        __syncthreads();
    }

    // Final normalization and output
    const int out_idx = batch_idx * num_heads * seq_len * head_dim +
                       head_idx * seq_len * head_dim +
                       seq_idx * head_dim + tid;

    if (seq_idx < seq_len && tid < head_dim) {
        output[out_idx] = output_sum / sum_exp;
    }
}

// Utility kernel for INT4 quantization during conversion
extern "C" __global__ void quantize_to_q4km(
    const float* __restrict__ input,
    uint8_t* __restrict__ output,
    float* __restrict__ scales,
    float* __restrict__ mins,
    const int num_elements,
    const int block_size) {

    const int block_idx = blockIdx.x;
    const int tid = threadIdx.x;
    const int global_idx = block_idx * block_size + tid;

    if (global_idx >= num_elements) return;

    // Find min/max for quantization range
    __shared__ float s_data[Q4KM_BLOCK_SIZE];
    s_data[tid] = (global_idx < num_elements) ? input[global_idx] : 0.0f;
    __syncthreads();

    // Reduce to find min/max
    typedef cub::BlockReduce<float, Q4KM_BLOCK_SIZE> BlockReduce;
    __shared__ typename BlockReduce::TempStorage temp_storage_max;
    __shared__ typename BlockReduce::TempStorage temp_storage_min;

    float block_max = BlockReduce(temp_storage_max).Reduce(s_data[tid], cub::Max());
    __syncthreads();
    float block_min = BlockReduce(temp_storage_min).Reduce(s_data[tid], cub::Min());

    if (tid == 0) {
        scales[block_idx] = (block_max - block_min) / 15.0f;
        mins[block_idx] = block_min;
    }

    __syncthreads();

    // Quantize to 4-bit
    const float scale = scales[block_idx];
    const float min_val = mins[block_idx];

    if (global_idx < num_elements) {
        const float normalized = (input[global_idx] - min_val) / scale;
        const uint8_t quantized = (uint8_t)fminf(15.0f, fmaxf(0.0f, roundf(normalized)));

        // Pack two 4-bit values into one uint8_t
        const int pack_idx = global_idx / 2;
        if (global_idx % 2 == 0) {
            atomicAnd(&output[pack_idx], 0xF0);  // Clear lower 4 bits
            atomicOr(&output[pack_idx], quantized);  // Set lower 4 bits
        } else {
            atomicAnd(&output[pack_idx], 0x0F);  // Clear upper 4 bits
            atomicOr(&output[pack_idx], quantized << 4);  // Set upper 4 bits
        }
    }
}

// Memory bandwidth optimized kernel for long sequences
extern "C" __global__ void q4_flash_attn_long_sequence(
    const uint8_t* __restrict__ qkv_quantized,
    const float* __restrict__ scales,
    const float* __restrict__ mins,
    float* __restrict__ output,
    const int batch_size,
    const int seq_len,
    const int num_heads,
    const int head_dim,
    const float scale_factor,
    const int max_seq_chunk) {

    // For ultra-long sequences (131K tokens), process in chunks
    // This kernel handles memory-constrained scenarios

    const int chunk_id = blockIdx.w;
    const int chunk_start = chunk_id * max_seq_chunk;
    const int chunk_end = min(chunk_start + max_seq_chunk, seq_len);

    if (chunk_start >= seq_len) return;

    // Process this chunk with standard FlashAttention logic
    // but with reduced memory footprint
    // ... (implementation similar to main kernel but chunked)
}