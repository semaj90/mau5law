# Enhanced RAG Go Microservice with CUDA support
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and CUDA
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    git \
    build-essential \
    pkg-config \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install CUDA 12.1 (compatible version)
RUN wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb && \
    dpkg -i cuda-keyring_1.0-1_all.deb && \
    apt-get update && \
    apt-get install -y cuda-toolkit-12-1 && \
    rm cuda-keyring_1.0-1_all.deb && \
    rm -rf /var/lib/apt/lists/*

# Set CUDA paths
ENV CUDA_PATH=/usr/local/cuda-12.1
ENV PATH=$CUDA_PATH/bin:$PATH
ENV LD_LIBRARY_PATH=$CUDA_PATH/lib64:/usr/local/lib

# Install Go 1.25
RUN wget https://go.dev/dl/go1.25.0.linux-amd64.tar.gz && \
    rm -rf /usr/local/go && \
    tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz && \
    rm go1.25.0.linux-amd64.tar.gz

ENV PATH=/usr/local/go/bin:$PATH

# CUDA development libraries are included with cuda-toolkit-12-1

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Clean and download Go dependencies with Go 1.25
RUN rm -f go.sum && go mod tidy && go mod download

# Copy source code
COPY . .

# Compile CUDA kernels
RUN nvcc -c -o cuda_kernels.o cuda_kernels.cu \
    -gencode arch=compute_75,code=sm_75 \
    -gencode arch=compute_80,code=sm_80 \
    -gencode arch=compute_86,code=sm_86 \
    --compiler-options '-fPIC'

# Build the Go application with CGO enabled for CUDA
ENV CGO_ENABLED=1
ENV CGO_CFLAGS="-I/usr/local/cuda-12.1/include"
ENV CGO_LDFLAGS="-L/usr/local/cuda-12.1/lib64 -L/usr/local/cuda-12.1/lib64/stubs -lcuda -lcudart -lcublas"

RUN go build -ldflags="-s -w" -o enhanced-rag-service .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["./enhanced-rag-service"]