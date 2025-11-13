#include <iostream>
#include <vector>
#include <string>
#include <numeric> // For std::iota
#include <cuda_runtime.h>

extern "C" {
    void compute_cosine_similarity(const float* vec_a, const float* vec_b, float* result, int embedding_dim);
    void process_with_torch(float* pinned, int n); // New function to call
}

int main() {
    std::cout << "🧠 RAG LoRA Trainer (Phase 53/54) - C++ Component" << std::endl;
    std::cout << "-------------------------------------------------" << std::endl;

    // --- Cosine Similarity Example ---
    const int embedding_dim = 1024;
    std::vector<float> host_vec_a(embedding_dim);
    std::vector<float> host_vec_b(embedding_dim);

    // Populate dummy embedding vectors
    for (int i = 0; i < embedding_dim; ++i) {
        host_vec_a[i] = static_cast<float>(i) / embedding_dim;
        host_vec_b[i] = 1.0f - (static_cast<float>(i) / embedding_dim);
    }
    std::cout << "Populated dummy embedding vectors." << std::endl;

    // Compute cosine similarity on the GPU
    float cosine_sim_result = 0.0f;
    compute_cosine_similarity(host_vec_a.data(), host_vec_b.data(), &cosine_sim_result, embedding_dim);
    std::cout << "✅ Cosine similarity computed on GPU: " << cosine_sim_result << std::endl;

    // --- Normalization Example (using process_with_torch) ---
    const int data_size = 512;
    std::vector<float> raw_data(data_size);
    for (int i = 0; i < data_size; ++i) {
        raw_data[i] = static_cast<float>(i); // Dummy raw data
    }

    // Allocate pinned host memory for normalization
    float* pinned_data;
    cudaError_t cudaStatus = cudaMallocHost((void**)&pinned_data, data_size * sizeof(float));
    if (cudaStatus != cudaSuccess) {
        std::cerr << "cudaMallocHost failed for normalization: " << cudaGetErrorString(cudaStatus) << std::endl;
        return 1;
    }
    memcpy(pinned_data, raw_data.data(), data_size * sizeof(float));

    std::cout << "\n--- Normalization Example ---" << std::endl;
    std::cout << "Raw data (first element): " << pinned_data[0] << std::endl;
    process_with_torch(pinned_data, data_size);
    std::cout << "Normalized data (first element): " << pinned_data[0] << std::endl; // Should be 0.0f if normalized by 255.0f

    cudaFreeHost(pinned_data);

    std::cout << "\nRAG LoRA Trainer component finished." << std::endl;

    return 0;
}
