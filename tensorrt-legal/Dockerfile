FROM nvcr.io/nvidia/tensorrt:24.09-py3

WORKDIR /app

# System deps for C++/CUDA compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ninja-build git curl wget zstd \
    golang-1.21 pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set Go path
ENV PATH="/usr/lib/go-1.21/bin:${PATH}"

# Optional Python dependencies (for conversion/benchmarking)
RUN pip install --no-cache-dir \
    torch>=2.2.2+cu121 --index-url https://download.pytorch.org/whl/cu121 \
    transformers>=4.41.2 flash-attn>=2.0.0 zstandard>=0.22.0 \
    onnx>=1.15.0 onnxruntime-gpu>=1.16.0

# Copy sources: C++ wrappers + plugins + microservice
COPY int4_flash_attn_kernel.cu ./         # CUDA kernel for INT4 FlashAttention
COPY q4km_plugin.cpp ./                   # INT4 Q4_K_M plugin
COPY tensorrt_wrapper.cpp ./              # Engine & CUDA Graphs
COPY tensorrt_wrapper.h ./                # Header definitions
COPY engine_manager.go ./                 # Orchestration (Go)
COPY go.mod ./                           # Go dependencies
COPY go.sum ./                           # Go lock file
COPY model_converter.py ./                # Optional Python conversion
COPY build.sh ./                         # Build script

# Make build script executable
RUN chmod +x build.sh

# Compile CUDA + Plugin + Wrapper
RUN nvcc -O3 -arch=sm_86 -std=c++17 -Xcompiler -fPIC \
    int4_flash_attn_kernel.cu -c -o int4_flash_attn_kernel.o

RUN g++ -O3 -std=c++17 -fPIC -shared \
    tensorrt_wrapper.cpp q4km_plugin.cpp int4_flash_attn_kernel.o \
    -I/usr/include -I/usr/local/cuda/include \
    -I/usr/include/x86_64-linux-gnu \
    -L/usr/lib/x86_64-linux-gnu -L/usr/local/cuda/lib64 \
    -ltensorrt -ltensorrt_plugin -lcudart -lcuda -lcublas -lcurand \
    -o libq4km_plugin.so

# Compile Go microservice
RUN go mod tidy && go build -o legal-tensorrt-service engine_manager.go

# Create directories for models, cache, logs
RUN mkdir -p /app/models /app/cache /app/logs

# Volumes for models, cache, logs
VOLUME ["/app/models", "/app/cache", "/app/logs"]

# Expose microservice
EXPOSE 8100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8100/health || exit 1

# Entry
CMD ["./legal-tensorrt-service"]