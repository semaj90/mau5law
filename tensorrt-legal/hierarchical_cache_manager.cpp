#pragma once

#include <cuda_runtime.h>
#include <memory>
#include <unordered_map>
#include <vector>
#include <string>
#include <chrono>
#include <future>
#include <queue>
#include <mutex>
#include "tensorrt_wrapper.h"

namespace LegalAI {

// Multi-tier cache levels matching your architecture
enum class CacheLevel {
    GPU_VRAM = 0,        // Active INT4 tensors in VRAM
    PINNED_CPU = 1,      // Pinned CPU memory pool (preloaded)
    REDIS_CACHE = 2,     // Redis 24h TTL fast access
    MULTI_GPU_SHARD = 3, // Multi-GPU shard buffers for ultra-long contexts
    SSD_FILE_CACHE = 4,  // SSD/file-based cache with zstd compression
    PGVECTOR_SEMANTIC = 5 // PostgreSQL/pgvector semantic index
};

// Artifact metadata for bit-packed INT4 storage
struct CacheArtifact {
    std::string id;
    CacheLevel origin_level;
    size_t compressed_size;
    size_t original_size;
    std::chrono::time_point<std::chrono::steady_clock> timestamp;
    float compression_ratio;
    std::vector<uint8_t> int4_data;     // Bit-packed INT4
    std::vector<float> fp32_metadata;   // Decompression metadata
    bool gpu_ready;                     // Can be directly loaded to GPU
};

// GPU buffer management (shader-like vertex buffer analogy)
class GPUBufferPool {
public:
    struct BufferSlice {
        void* gpu_ptr;
        size_t size;
        size_t offset;
        bool in_use;
        std::string artifact_id;
    };

    GPUBufferPool(size_t pool_size = 6ULL * 1024 * 1024 * 1024); // 6GB for RTX 3060 Ti
    ~GPUBufferPool();

    BufferSlice* allocate(size_t size, const std::string& artifact_id);
    void deallocate(BufferSlice* slice);
    void defragment();

    // Shader-like buffer operations
    bool loadINT4Tensor(const CacheArtifact& artifact, BufferSlice* slice);
    bool storeINT4Tensor(const std::string& artifact_id, void* gpu_data, size_t size);

    // Multi-GPU sharding support
    void enableMultiGPUSharding(int num_gpus);
    int getOptimalGPU(const std::string& artifact_id);

private:
    void* mPool;
    size_t mPoolSize;
    size_t mUsed;
    std::vector<std::unique_ptr<BufferSlice>> mSlices;
    std::mutex mMutex;

    // Multi-GPU support
    std::vector<int> mGPUDevices;
    std::unordered_map<std::string, int> mArtifactToGPU;
};

// Pinned CPU memory pool for async GPU transfers
class PinnedMemoryManager {
public:
    PinnedMemoryManager(size_t pool_size = 2ULL * 1024 * 1024 * 1024); // 2GB pinned
    ~PinnedMemoryManager();

    void* allocate(size_t size);
    void deallocate(void* ptr);

    // Async operations
    std::future<bool> asyncGPUTransfer(void* pinned_ptr, void* gpu_ptr, size_t size, cudaStream_t stream);
    std::future<bool> preloadArtifacts(const std::vector<std::string>& artifact_ids);

private:
    void* mPinnedPool;
    size_t mPoolSize;
    std::queue<std::pair<void*, size_t>> mFreeBlocks;
    std::mutex mMutex;
};

// Redis cache interface for GPU artifact acceleration
class RedisGPUCache {
public:
    RedisGPUCache(const std::string& redis_url, int ttl_hours = 24);
    ~RedisGPUCache();

    // GPU-optimized artifact operations
    std::future<bool> storeArtifact(const std::string& key, const CacheArtifact& artifact);
    std::future<std::optional<CacheArtifact>> getArtifact(const std::string& key);
    std::future<bool> exists(const std::string& key);

    // Batch operations for efficiency
    std::future<std::vector<CacheArtifact>> batchGet(const std::vector<std::string>& keys);
    std::future<bool> batchStore(const std::unordered_map<std::string, CacheArtifact>& artifacts);

    // Cache warming and prefetching
    void warmCache(const std::vector<std::string>& likely_keys);

private:
    void* mRedisContext; // Redis connection
    int mTTLSeconds;
    std::string mRedisURL;
};

// SSD file cache with zstd compression
class SSDFileCache {
public:
    SSDFileCache(const std::string& cache_dir, size_t max_size_gb = 50);
    ~SSDFileCache();

    bool storeArtifact(const std::string& key, const CacheArtifact& artifact);
    std::optional<CacheArtifact> getArtifact(const std::string& key);

    // Compression management
    std::future<bool> compressAndStore(const std::string& key, const void* data, size_t size);
    std::future<std::vector<uint8_t>> decompressAndLoad(const std::string& key);

    // LRU eviction
    void evictOldest(size_t bytes_needed);

private:
    std::string mCacheDir;
    size_t mMaxSize;
    size_t mCurrentSize;
    std::unordered_map<std::string, std::chrono::time_point<std::chrono::steady_clock>> mAccessTimes;
    std::mutex mMutex;

    std::string getFilePath(const std::string& key);
    bool compressWithZstd(const void* src, size_t src_size, std::vector<uint8_t>& dst);
    bool decompressWithZstd(const void* src, size_t src_size, std::vector<uint8_t>& dst);
};

// PostgreSQL/pgvector semantic indexing
class PgVectorSemanticCache {
public:
    PgVectorSemanticCache(const std::string& connection_string);
    ~PgVectorSemanticCache();

    // Semantic similarity operations
    struct SemanticHit {
        std::string artifact_id;
        std::vector<float> embedding;
        float similarity_score;
        std::unordered_map<std::string, std::string> metadata;
    };

    std::future<bool> storeEmbedding(const std::string& artifact_id,
                                   const std::vector<float>& embedding,
                                   const std::unordered_map<std::string, std::string>& metadata);

    std::future<std::vector<SemanticHit>> findSimilar(const std::vector<float>& query_embedding,
                                                     int limit = 10,
                                                     float threshold = 0.7);

    // One-to-many mapping via SOM/HMM auto-encoding
    std::future<std::vector<SemanticHit>> expandContext(const std::string& artifact_id, int max_tokens = 131072);

    // RL/QLoRA fine-tuning integration
    std::future<bool> updateFromFineTuning(const std::vector<std::pair<std::string, std::vector<float>>>& updates);

private:
    void* mConnection; // PostgreSQL connection
    std::string mConnectionString;
};

// Master hierarchical cache manager
class HierarchicalCacheManager {
public:
    HierarchicalCacheManager(const std::string& redis_url,
                           const std::string& ssd_cache_dir,
                           const std::string& postgres_connection);
    ~HierarchicalCacheManager();

    // Main cache operations following your architecture
    std::future<std::optional<CacheArtifact>> get(const std::string& key);
    std::future<bool> store(const std::string& key, const CacheArtifact& artifact);

    // Multi-tier fallback chain: GPU → CPU → Redis → SSD → pgvector
    std::future<std::optional<CacheArtifact>> getWithFallback(const std::string& key);
    std::future<bool> storeAtOptimalLevel(const std::string& key, const CacheArtifact& artifact);

    // Context assembly for ultra-long sequences
    struct ContextAssembly {
        std::vector<CacheArtifact> artifacts;
        size_t total_tokens;
        float relevance_score;
        std::vector<int> gpu_assignments; // Multi-GPU shard assignments
    };

    std::future<ContextAssembly> assembleContext(const std::string& query, int max_tokens = 131072);

    // Cache warming and optimization
    void warmCacheForQuery(const std::string& query);
    void optimizeCacheLayout();

    // Performance monitoring
    struct CacheStats {
        uint64_t gpu_hits, cpu_hits, redis_hits, ssd_hits, pgvector_hits;
        uint64_t gpu_misses, cpu_misses, redis_misses, ssd_misses, pgvector_misses;
        float average_latency_ms[6]; // Per cache level
        size_t memory_usage[6];
    };

    CacheStats getStats() const { return mStats; }
    void resetStats() { mStats = {}; }

private:
    std::unique_ptr<GPUBufferPool> mGPUBuffers;
    std::unique_ptr<PinnedMemoryManager> mPinnedMemory;
    std::unique_ptr<RedisGPUCache> mRedisCache;
    std::unique_ptr<SSDFileCache> mSSDCache;
    std::unique_ptr<PgVectorSemanticCache> mSemanticCache;

    mutable CacheStats mStats;
    std::mutex mStatsMutex;

    // Cache level priority and routing
    std::vector<CacheLevel> getCacheLevels(const std::string& key);
    void updateStats(CacheLevel level, bool hit, float latency_ms);

    // Artifact serialization for cross-level transfers
    std::vector<uint8_t> serializeArtifact(const CacheArtifact& artifact);
    std::optional<CacheArtifact> deserializeArtifact(const std::vector<uint8_t>& data);
};

// INT4 to FP32 conversion utilities for shader buffer operations
class INT4Converter {
public:
    static void packINT4(const float* src, uint8_t* dst, size_t count,
                         float* scales, float* mins, int group_size = 256);

    static void unpackINT4(const uint8_t* src, float* dst, size_t count,
                          const float* scales, const float* mins, int group_size = 256);

    // GPU kernel versions
    static cudaError_t packINT4GPU(const float* d_src, uint8_t* d_dst, size_t count,
                                  float* d_scales, float* d_mins, int group_size, cudaStream_t stream);

    static cudaError_t unpackINT4GPU(const uint8_t* d_src, float* d_dst, size_t count,
                                    const float* d_scales, const float* d_mins, int group_size, cudaStream_t stream);
};

} // namespace LegalAI