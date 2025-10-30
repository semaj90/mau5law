# Use a TensorRT base image with CUDA pre-installed
FROM nvcr.io/nvidia/tensorrt:24.10-py3

WORKDIR /app

# Copy your Go application source code and the C wrapper
COPY . .

# Copy the pre-built TensorRT engine plan file
# Ensure your embeddinggemma.plan is in a 'models' directory relative to your Dockerfile
COPY models/embeddinggemma.plan /models/embeddinggemma.plan

# Install Go, GCC, G++ for CGo compilation
RUN apt-get update && apt-get install -y golang gcc g++ make

# Enable CGo for Go build
ENV CGO_ENABLED=1

# Compile the C shared library for TensorRT embedding
# The -I flag points to the TensorRT headers, adjust if your path differs
RUN nvcc -Xcompiler -fPIC -shared tensor/embedding_trt.c -o tensor/libembedding_trt.so \
     -I/usr/include/x86_64-linux-gnu -I/usr/src/tensorrt/include

# Build the Go application
# Ensure your main entry point is correct, e.g., cmd/quic-tensor/main.go
RUN go build -tags=cuda -o quic-tensor cmd/quic-tensor/main.go

# Expose the QUIC port
EXPOSE 4433/udp

# Run the QUIC Tensor Server
CMD ["./quic-tensor"]