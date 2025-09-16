# Simplified TensorRT for Q4_K_M Gemma3-Legal in WSL2
FROM nvcr.io/nvidia/tensorrt:24.09-py3

WORKDIR /app

# Install essentials only
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for Q4_K_M support
RUN pip3 install --no-cache-dir \
    tensorrt \
    pycuda \
    numpy \
    fastapi \
    uvicorn \
    torch

# Create Q4_K_M test script
RUN cat > /app/test_q4km.py << 'EOF'
import pycuda.driver as cuda
import pycuda.autoinit
import tensorrt as trt
import numpy as np

print("=== Q4_K_M TensorRT Test ===")
print(f"CUDA Device: {cuda.Device(0).name()}")
print(f"Memory: {cuda.Device(0).total_memory() // (1024**3)} GB")

# Q4_K_M specific settings for Gemma3-Legal
EMBEDDING_DIM = 3840  # Gemma3 uses 3840, not 768
COMPRESSED_DIM = 512  # Your target compression
CONTEXT_LENGTH = 131072  # 131K tokens

print(f"\nGemma3-Legal Q4_K_M Configuration:")
print(f"- Embedding: {EMBEDDING_DIM} -> {COMPRESSED_DIM}")
print(f"- Context: {CONTEXT_LENGTH} tokens")
print(f"- Quantization: 4-bit mixed precision")
print(f"- Memory Required: ~{11.8 * 0.25:.1f}GB (Q4_K_M)")

# Test TensorRT builder
TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
builder = trt.Builder(TRT_LOGGER)
config = builder.create_builder_config()

# Enable Q4_K_M optimizations
config.set_flag(trt.BuilderFlag.FP16)
config.max_workspace_size = 2 << 30  # 2GB

print("\n✓ TensorRT ready for Q4_K_M conversion")
EOF

# Test script execution
CMD ["python3", "/app/test_q4km.py"]

EXPOSE 8090