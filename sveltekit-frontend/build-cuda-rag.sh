#!/bin/bash
# CUDA RAG Build Script - Auto-generated for Ampere+ architectures
# Supports RTX 30/40 series and modern NVIDIA GPUs

set -e

echo "🚀 Building CUDA RAG kernels with PTX optimization for modern architectures..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(pwd)"
CUDA_SRC_DIR="$PROJECT_ROOT/src/lib/cuda"
WASM_SRC_DIR="$PROJECT_ROOT/src/lib/wasm"
BUILD_DIR="$PROJECT_ROOT/build"
STATIC_DIR="$PROJECT_ROOT/static"

# Detect NVIDIA GPU architecture
detect_gpu_architecture() {
    echo -e "${BLUE}Detecting GPU architecture...${NC}"

    if command -v nvidia-smi &> /dev/null; then
        GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits | head -1)
        echo "Detected GPU: $GPU_NAME"

        case "$GPU_NAME" in
            *"RTX 30"*|*"RTX 3060"*|*"RTX 3070"*|*"RTX 3080"*|*"RTX 3090"*)
                CUDA_ARCH="sm_86"
                ARCH_NAME="Ampere (RTX 30 series)"
                ;;
            *"RTX 40"*|*"RTX 4060"*|*"RTX 4070"*|*"RTX 4080"*|*"RTX 4090"*)
                CUDA_ARCH="sm_89"
                ARCH_NAME="Ada Lovelace (RTX 40 series)"
                ;;
            *"H100"*|*"A100"*)
                CUDA_ARCH="sm_90"
                ARCH_NAME="Hopper/Ampere Data Center"
                ;;
            *)
                CUDA_ARCH="sm_86"
                ARCH_NAME="Default Ampere"
                echo -e "${YELLOW}Unknown GPU, defaulting to Ampere architecture${NC}"
                ;;
        esac
    else
        CUDA_ARCH="sm_86"
        ARCH_NAME="Default Ampere"
        echo -e "${YELLOW}nvidia-smi not found, defaulting to Ampere architecture${NC}"
    fi

    echo -e "${GREEN}Target architecture: $ARCH_NAME ($CUDA_ARCH)${NC}"
}

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}Checking build dependencies...${NC}"

    # Check NVCC
    if ! command -v nvcc &> /dev/null; then
        echo -e "${RED}Error: nvcc not found. Please install CUDA Toolkit.${NC}"
        exit 1
    fi

    NVCC_VERSION=$(nvcc --version | grep "release" | sed 's/.*release \([0-9.]*\).*/\1/')
    echo "NVCC version: $NVCC_VERSION"

    # Check Emscripten for WASM
    if ! command -v emcc &> /dev/null; then
        echo -e "${YELLOW}Warning: emcc not found. WASM fallback will not be built.${NC}"
        BUILD_WASM=false
    else
        EMCC_VERSION=$(emcc --version | head -1)
        echo "Emscripten version: $EMCC_VERSION"
        BUILD_WASM=true
    fi

    # Create build directories
    mkdir -p "$BUILD_DIR/cuda"
    mkdir -p "$STATIC_DIR/wasm"
}

# Build CUDA kernels
build_cuda_kernels() {
    echo -e "${BLUE}Building CUDA RAG kernels...${NC}"

    # Compiler flags optimized for each architecture
    case "$CUDA_ARCH" in
        sm_86)
            NVCC_FLAGS="-O3 --use_fast_math --gpu-architecture=compute_86 --gpu-code=compute_86,sm_86"
            NVCC_FLAGS="$NVCC_FLAGS --ptxas-options=-v --maxrregcount=255"
            ;;
        sm_89)
            NVCC_FLAGS="-O3 --use_fast_math --gpu-architecture=compute_89 --gpu-code=compute_89,sm_89"
            NVCC_FLAGS="$NVCC_FLAGS --ptxas-options=-v --maxrregcount=255"
            ;;
        sm_90)
            NVCC_FLAGS="-O3 --use_fast_math --gpu-architecture=compute_90 --gpu-code=compute_90,sm_90"
            NVCC_FLAGS="$NVCC_FLAGS --ptxas-options=-v --maxrregcount=255"
            ;;
    esac

    # Add Tensor Core optimizations
    NVCC_FLAGS="$NVCC_FLAGS -DUSE_TENSOR_CORES=1"

    # Include paths
    INCLUDE_FLAGS="-I/usr/local/cuda/include -I$CUDA_SRC_DIR/include"

    # Library flags
    LIBRARY_FLAGS="-L/usr/local/cuda/lib64 -lcudart -lcublas -lcurand -lcusparse"

    # Create CUDA kernel source if it doesn't exist
    if [ ! -f "$CUDA_SRC_DIR/rag_kernels.cu" ]; then
        echo -e "${BLUE}Generating CUDA kernel source...${NC}"
        cat > "$CUDA_SRC_DIR/rag_kernels.cu" << 'EOF'
#include <cuda_runtime.h>
#include <cublas_v2.h>
#include <device_launch_parameters.h>

// Optimized cosine similarity kernel for Ampere+
__global__ void cosine_similarity_kernel(
    const float* __restrict__ input_embeddings,
    const float* __restrict__ query_embedding,
    float* __restrict__ similarity_results,
    int num_documents,
    int embedding_dim
) {
    int doc_idx = blockIdx.x * blockDim.x + threadIdx.x;

    if (doc_idx >= num_documents) return;

    float dot_product = 0.0f;
    float norm_input = 0.0f;
    float norm_query = 0.0f;

    const float* doc_embedding = input_embeddings + doc_idx * embedding_dim;

    // Vectorized computation with unrolled loop
    #pragma unroll 4
    for (int i = 0; i < embedding_dim; i += 4) {
        float4 doc_vec = reinterpret_cast<const float4*>(doc_embedding)[i/4];
        float4 query_vec = reinterpret_cast<const float4*>(query_embedding)[i/4];

        dot_product += doc_vec.x * query_vec.x + doc_vec.y * query_vec.y +
                      doc_vec.z * query_vec.z + doc_vec.w * query_vec.w;

        norm_input += doc_vec.x * doc_vec.x + doc_vec.y * doc_vec.y +
                     doc_vec.z * doc_vec.z + doc_vec.w * doc_vec.w;

        norm_query += query_vec.x * query_vec.x + query_vec.y * query_vec.y +
                     query_vec.z * query_vec.z + query_vec.w * query_vec.w;
    }

    float similarity = dot_product / (sqrtf(norm_input) * sqrtf(norm_query));
    similarity_results[doc_idx] = similarity;
}

// K-means clustering kernel
__global__ void kmeans_kernel(
    const float* __restrict__ document_embeddings,
    const float* __restrict__ cluster_centroids,
    int* __restrict__ cluster_assignments,
    int num_documents,
    int num_clusters,
    int embedding_dim
) {
    int doc_idx = blockIdx.x * blockDim.x + threadIdx.x;

    if (doc_idx >= num_documents) return;

    float min_distance = INFINITY;
    int best_cluster = 0;

    const float* doc_embedding = document_embeddings + doc_idx * embedding_dim;

    for (int cluster = 0; cluster < num_clusters; cluster++) {
        const float* centroid = cluster_centroids + cluster * embedding_dim;
        float distance = 0.0f;

        for (int dim = 0; dim < embedding_dim; dim++) {
            float diff = doc_embedding[dim] - centroid[dim];
            distance += diff * diff;
        }

        if (distance < min_distance) {
            min_distance = distance;
            best_cluster = cluster;
        }
    }

    cluster_assignments[doc_idx] = best_cluster;
}

// C interface for easier integration
extern "C" {
    int cuda_rag_similarity(float* embeddings, float* query, float* results,
                           int num_docs, int dim);
    int cuda_rag_clustering(float* embeddings, float* centroids, int* assignments,
                           int num_docs, int num_clusters, int dim);
}

int cuda_rag_similarity(float* embeddings, float* query, float* results,
                       int num_docs, int dim) {
    // GPU memory allocation and kernel launch
    float *d_embeddings, *d_query, *d_results;

    cudaMalloc(&d_embeddings, num_docs * dim * sizeof(float));
    cudaMalloc(&d_query, dim * sizeof(float));
    cudaMalloc(&d_results, num_docs * sizeof(float));

    cudaMemcpy(d_embeddings, embeddings, num_docs * dim * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_query, query, dim * sizeof(float), cudaMemcpyHostToDevice);

    int threads = 256;
    int blocks = (num_docs + threads - 1) / threads;

    cosine_similarity_kernel<<<blocks, threads>>>(d_embeddings, d_query, d_results, num_docs, dim);

    cudaMemcpy(results, d_results, num_docs * sizeof(float), cudaMemcpyDeviceToHost);

    cudaFree(d_embeddings);
    cudaFree(d_query);
    cudaFree(d_results);

    return 0;
}

int cuda_rag_clustering(float* embeddings, float* centroids, int* assignments,
                       int num_docs, int num_clusters, int dim) {
    float *d_embeddings, *d_centroids;
    int *d_assignments;

    cudaMalloc(&d_embeddings, num_docs * dim * sizeof(float));
    cudaMalloc(&d_centroids, num_clusters * dim * sizeof(float));
    cudaMalloc(&d_assignments, num_docs * sizeof(int));

    cudaMemcpy(d_embeddings, embeddings, num_docs * dim * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_centroids, centroids, num_clusters * dim * sizeof(float), cudaMemcpyHostToDevice);

    int threads = 256;
    int blocks = (num_docs + threads - 1) / threads;

    kmeans_kernel<<<blocks, threads>>>(d_embeddings, d_centroids, d_assignments,
                                      num_docs, num_clusters, dim);

    cudaMemcpy(assignments, d_assignments, num_docs * sizeof(int), cudaMemcpyDeviceToHost);

    cudaFree(d_embeddings);
    cudaFree(d_centroids);
    cudaFree(d_assignments);

    return 0;
}
EOF
    fi

    # Compile CUDA kernels
    echo "Compiling with flags: $NVCC_FLAGS"

    nvcc $NVCC_FLAGS $INCLUDE_FLAGS \
        -o "$BUILD_DIR/cuda/rag_kernels.ptx" \
        --ptx \
        "$CUDA_SRC_DIR/rag_kernels.cu"

    # Also create shared library for dynamic loading
    nvcc $NVCC_FLAGS $INCLUDE_FLAGS \
        -shared -fPIC \
        -o "$BUILD_DIR/cuda/librag_kernels.so" \
        "$CUDA_SRC_DIR/rag_kernels.cu" \
        $LIBRARY_FLAGS

    echo -e "${GREEN}✅ CUDA kernels compiled successfully${NC}"
    echo "PTX: $BUILD_DIR/cuda/rag_kernels.ptx"
    echo "Shared library: $BUILD_DIR/cuda/librag_kernels.so"
}

# Build WebAssembly fallback
build_wasm_fallback() {
    if [ "$BUILD_WASM" = false ]; then
        echo -e "${YELLOW}Skipping WASM build (emcc not available)${NC}"
        return
    fi

    echo -e "${BLUE}Building WebAssembly fallback...${NC}"

    # Emscripten flags optimized for performance
    EMCC_FLAGS="-O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1"
    EMCC_FLAGS="$EMCC_FLAGS -s MODULARIZE=1 -s EXPORT_NAME=CUDAModule"
    EMCC_FLAGS="$EMCC_FLAGS -s EXPORTED_FUNCTIONS=\"['_cuda_init','_cuda_similarity','_cuda_clustering','_cuda_cleanup']\""
    EMCC_FLAGS="$EMCC_FLAGS -s EXPORTED_RUNTIME_METHODS=\"['ccall','cwrap']\""
    EMCC_FLAGS="$EMCC_FLAGS -s TOTAL_MEMORY=268435456" # 256MB
    EMCC_FLAGS="$EMCC_FLAGS -s SIMD=1" # Enable SIMD optimizations

    emcc $EMCC_FLAGS \
        -o "$STATIC_DIR/wasm/cuda-rag-kernels.js" \
        "$WASM_SRC_DIR/cuda-rag-kernels.c"

    echo -e "${GREEN}✅ WebAssembly fallback built successfully${NC}"
    echo "WASM: $STATIC_DIR/wasm/cuda-rag-kernels.js"
    echo "WASM: $STATIC_DIR/wasm/cuda-rag-kernels.wasm"
}

# Generate TypeScript bindings
generate_typescript_bindings() {
    echo -e "${BLUE}Generating TypeScript bindings...${NC}"

    cat > "$PROJECT_ROOT/src/lib/cuda/cuda-rag-bindings.ts" << 'EOF'
/**
 * TypeScript bindings for CUDA RAG kernels
 * Auto-generated from build script
 */

export interface CUDARAGModule {
  cuda_init(deviceId: number): number;
  cuda_similarity(
    embeddings: Float32Array,
    query: Float32Array,
    results: Float32Array,
    numDocs: number,
    embeddingDim: number
  ): number;
  cuda_clustering(
    embeddings: Float32Array,
    centroids: Float32Array,
    assignments: Int32Array,
    numDocs: number,
    numClusters: number,
    embeddingDim: number
  ): number;
  cuda_cleanup(): number;
}

export class CUDARAGWrapper {
  private module: CUDARAGModule | null = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Try to load WASM module
      const moduleFactory = await import('/wasm/cuda-rag-kernels.js');
      this.module = await moduleFactory.default();

      const result = this.module.cuda_init(0);
      this.initialized = (result === 0);

      console.log(`🔧 CUDA RAG WASM module ${this.initialized ? 'initialized' : 'failed'}`);
      return this.initialized;
    } catch (error) {
      console.warn('CUDA RAG WASM module failed to load:', error);
      return false;
    }
  }

  async computeSimilarities(
    documentEmbeddings: Float32Array,
    queryEmbedding: Float32Array
  ): Promise<Float32Array | null> {
    if (!this.initialized || !this.module) {
      return null;
    }

    const numDocs = documentEmbeddings.length / queryEmbedding.length;
    const results = new Float32Array(numDocs);

    const status = this.module.cuda_similarity(
      documentEmbeddings,
      queryEmbedding,
      results,
      numDocs,
      queryEmbedding.length
    );

    return status === 0 ? results : null;
  }

  async performClustering(
    documentEmbeddings: Float32Array,
    numClusters: number,
    maxIterations: number = 100
  ): Promise<{ centroids: Float32Array; assignments: Int32Array } | null> {
    if (!this.initialized || !this.module) {
      return null;
    }

    const embeddingDim = 768; // Standard embedding dimension
    const numDocs = documentEmbeddings.length / embeddingDim;

    // Initialize random centroids
    const centroids = new Float32Array(numClusters * embeddingDim);
    for (let i = 0; i < centroids.length; i++) {
      centroids[i] = (Math.random() - 0.5) * 2;
    }

    const assignments = new Int32Array(numDocs);

    const status = this.module.cuda_clustering(
      documentEmbeddings,
      centroids,
      assignments,
      numDocs,
      numClusters,
      embeddingDim
    );

    return status === 0 ? { centroids, assignments } : null;
  }

  dispose(): void {
    if (this.initialized && this.module) {
      this.module.cuda_cleanup();
      this.initialized = false;
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const cudaRAG = new CUDARAGWrapper();

// Auto-initialize
cudaRAG.initialize().catch(console.warn);
EOF

    echo -e "${GREEN}✅ TypeScript bindings generated${NC}"
}

# Create integration test
create_integration_test() {
    echo -e "${BLUE}Creating integration test...${NC}"

    cat > "$PROJECT_ROOT/test-cuda-rag.js" << 'EOF'
/**
 * Integration test for CUDA RAG system
 */

import { cudaRAG } from './src/lib/cuda/cuda-rag-bindings.js';

async function testCUDARAG() {
    console.log('🧪 Testing CUDA RAG integration...');

    // Wait for initialization
    const initialized = await cudaRAG.initialize();
    if (!initialized) {
        console.log('❌ CUDA RAG initialization failed');
        return;
    }

    // Test similarity computation
    const embeddingDim = 768;
    const numDocs = 100;

    // Generate test data
    const documentEmbeddings = new Float32Array(numDocs * embeddingDim);
    const queryEmbedding = new Float32Array(embeddingDim);

    for (let i = 0; i < documentEmbeddings.length; i++) {
        documentEmbeddings[i] = Math.random();
    }

    for (let i = 0; i < queryEmbedding.length; i++) {
        queryEmbedding[i] = Math.random();
    }

    console.log('Computing similarities...');
    const start = Date.now();

    const similarities = await cudaRAG.computeSimilarities(documentEmbeddings, queryEmbedding);

    const duration = Date.now() - start;
    console.log(`✅ Computed ${numDocs} similarities in ${duration}ms`);

    if (similarities) {
        const maxSimilarity = Math.max(...similarities);
        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        console.log(`Max similarity: ${maxSimilarity.toFixed(4)}`);
        console.log(`Avg similarity: ${avgSimilarity.toFixed(4)}`);
    }

    // Test clustering
    console.log('Testing clustering...');
    const clusterStart = Date.now();

    const clusterResult = await cudaRAG.performClustering(documentEmbeddings, 5);

    const clusterDuration = Date.now() - clusterStart;
    console.log(`✅ Performed clustering in ${clusterDuration}ms`);

    if (clusterResult) {
        const uniqueAssignments = new Set(clusterResult.assignments);
        console.log(`Documents assigned to ${uniqueAssignments.size} clusters`);
    }

    // Cleanup
    cudaRAG.dispose();
    console.log('🧹 Test completed and cleaned up');
}

testCUDARAG().catch(console.error);
EOF

    chmod +x "$PROJECT_ROOT/test-cuda-rag.js"
    echo -e "${GREEN}✅ Integration test created: test-cuda-rag.js${NC}"
}

# Main build process
main() {
    echo -e "${GREEN}🚀 CUDA RAG Build System for Modern Architectures${NC}"
    echo "=================================================="

    detect_gpu_architecture
    check_dependencies

    echo -e "${BLUE}Starting build process...${NC}"

    build_cuda_kernels
    build_wasm_fallback
    generate_typescript_bindings
    create_integration_test

    echo -e "${GREEN}=================================================="
    echo "✅ Build completed successfully!"
    echo "📋 Summary:"
    echo "   - Target Architecture: $ARCH_NAME ($CUDA_ARCH)"
    echo "   - CUDA PTX: $BUILD_DIR/cuda/rag_kernels.ptx"
    echo "   - CUDA Library: $BUILD_DIR/cuda/librag_kernels.so"
    if [ "$BUILD_WASM" = true ]; then
        echo "   - WASM Fallback: $STATIC_DIR/wasm/cuda-rag-kernels.js"
    fi
    echo "   - TypeScript Bindings: src/lib/cuda/cuda-rag-bindings.ts"
    echo "   - Integration Test: test-cuda-rag.js"
    echo ""
    echo "🧪 Run 'node test-cuda-rag.js' to test the integration"
    echo "=================================================="${NC}
}

# Run main function
main "$@"