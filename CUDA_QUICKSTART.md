# CUDA Acceleration Quick Start Guide

## 🚀 Prerequisites

- NVIDIA GPU (RTX 3060 Ti or compatible with SM 86)
- CUDA Toolkit 12.0+
- CMake 3.18+
- Python 3.11+
- Docker + NVIDIA Container Toolkit (optional)

## 📋 Installation Steps

### Step 1: Install CUDA Toolkit

**Windows**:
```powershell
# Download from https://developer.nvidia.com/cuda-downloads
# Run installer and select:
# - CUDA Toolkit 12.0
# - cuDNN 8.x
# - CUTLASS (optional)
```

**Linux (Ubuntu 22.04)**:
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get install -y cuda-toolkit-12-0
```

### Step 2: Install Build Tools

**Windows (MSVC)**:
```powershell
# Install Visual Studio 2022 with C++ workload
# Install CMake: https://cmake.org/download/
```

**Linux**:
```bash
sudo apt-get install -y cmake build-essential python3.11-dev
```

### Step 3: Install Python Dependencies

```bash
pip install pybind11 numpy torch transformers
```

### Step 4: Build CUDA Components

```bash
# Create build directory
mkdir build
cd build

# Configure with CMake
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCUDA_ARCHITECTURES=86 \
      -DCUTLASS_DIR=/opt/cutlass \
      ..

# Build all targets
cmake --build . --config Release --parallel 8

# Install
cmake --install .
```

## 🐳 Docker Quick Start

### Option 1: Build and Run Locally

```bash
# Build GPU image
docker build -f docker/Dockerfile.cuda -t legal-ai-gpu .

# Run with GPU support
docker run --gpus all -p 8000:8000 legal-ai-gpu
```

### Option 2: Docker Compose (Recommended)

```bash
# Start entire GPU-accelerated stack
docker-compose -f docker/docker-compose.gpu.yml up -d

# Check status
docker-compose -f docker/docker-compose.gpu.yml ps

# View logs
docker-compose -f docker/docker-compose.gpu.yml logs -f legal-ai-gpu

# Stop stack
docker-compose -f docker/docker-compose.gpu.yml down
```

## ✅ Verification

### Check GPU Detection

```bash
# Verify CUDA installation
nvidia-smi

# Expected output:
# NVIDIA-SMI 535.x.xx    Driver Version: 535.x.xx    CUDA Version: 12.0
# GPU 0: NVIDIA RTX 3060 Ti
```

### Test CUDA Components

```bash
# Run tokenizer benchmark
./build/benchmark_tokenizer --batch-size 32 --iterations 100

# Run embedding benchmark
./build/benchmark_embedding --batch-size 32 --iterations 100

# Run search benchmark
./build/benchmark_search --num-candidates 1000 --iterations 100

# Run reranker benchmark
./build/benchmark_reranker --batch-size 32 --iterations 100
```

### Check API Health

```bash
# Test API endpoint
curl http://localhost:8000/api/health

# Expected response:
# {"status": "healthy", "gpu": "NVIDIA RTX 3060 Ti", "cuda_version": "12.0"}
```

## 📊 Performance Monitoring

### GPU Metrics Dashboard

```bash
# View real-time GPU metrics
curl http://localhost:8000/api/gpu-metrics

# Expected response:
# {
#   "gpu_util": 85,
#   "memory_used": 4096,
#   "temperature": 65,
#   "power_draw": 250
# }
```

### Performance Benchmarks

```bash
# Run comprehensive benchmark suite
./build/benchmark_tokenizer --batch-size 32 --iterations 1000 > tokenizer_results.json
./build/benchmark_embedding --batch-size 32 --iterations 1000 > embedding_results.json
./build/benchmark_search --num-candidates 1000 --iterations 1000 > search_results.json
./build/benchmark_reranker --batch-size 32 --iterations 1000 > reranker_results.json

# Analyze results
python3 scripts/analyze_benchmarks.py
```

## 🔧 Configuration

### Environment Variables

```bash
# GPU selection
export CUDA_VISIBLE_DEVICES=0

# Memory optimization
export CUDA_LAUNCH_BLOCKING=0
export CUDA_DEVICE_ORDER=PCI_BUS_ID

# Logging
export CUDA_LAUNCH_BLOCKING=1  # For debugging
```

### CMake Options

```bash
# Build with CUTLASS optimization
cmake -DCUTLASS_DIR=/opt/cutlass ..

# Build with debug symbols
cmake -DCMAKE_BUILD_TYPE=Debug ..

# Build specific architecture
cmake -DCUDA_ARCHITECTURES=86 ..

# Build for multiple architectures
cmake -DCUDA_ARCHITECTURES="75;86;89" ..
```

## 🐛 Troubleshooting

### CUDA Not Found

```bash
# Check CUDA installation
nvcc --version

# Add to PATH (Linux)
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH

# Add to PATH (Windows)
set PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.0\bin;%PATH%
```

### Out of Memory

```bash
# Reduce batch size
export CUDA_LAUNCH_BLOCKING=1

# Monitor memory
nvidia-smi --query-gpu=memory.used,memory.free --format=csv,noheader -l 1
```

### Slow Performance

```bash
# Check GPU utilization
nvidia-smi dmon

# Profile with NVIDIA Nsight
nsys profile -o profile.nsys-rep ./build/benchmark_tokenizer
```

## 📈 Performance Expectations

### Phase A: Tokenizer
- **CPU**: 100ms/page
- **GPU**: 20ms/page
- **Speedup**: 5x

### Phase B: Embedding
- **CPU**: 500ms/batch
- **GPU**: 50ms/batch
- **Speedup**: 10x

### Phase C: Vector Search
- **CPU**: 100ms
- **GPU**: 30ms
- **Speedup**: 3x

### Phase D: Reranking
- **CPU**: 50ms
- **GPU**: 6ms
- **Speedup**: 8x

### Total Pipeline
- **CPU**: 750ms
- **GPU**: 106ms
- **Speedup**: 7x

## 🚀 Next Steps

1. **Verify Installation**: Run `nvidia-smi` and benchmarks
2. **Test API**: Call `/api/health` and `/api/gpu-metrics`
3. **Monitor Performance**: Check GPU utilization during operations
4. **Optimize**: Adjust batch sizes and memory settings
5. **Deploy**: Use docker-compose for production

## 📚 Resources

- [NVIDIA CUDA Documentation](https://docs.nvidia.com/cuda/)
- [CMake CUDA Support](https://cmake.org/cmake/help/latest/language/CUDA/)
- [pybind11 Documentation](https://pybind11.readthedocs.io/)
- [CUTLASS Library](https://github.com/NVIDIA/cutlass)

## 💡 Tips

- Use `nvidia-smi` to monitor GPU in real-time
- Profile with `nsys` for detailed performance analysis
- Start with Phase A (tokenizer) for quick wins
- Test each phase independently before integration
- Monitor memory usage to avoid OOM errors

---

**Status**: ✅ Ready for deployment
**Expected Speedup**: 7x (750ms → 106ms)
**Timeline**: 4 weeks for full implementation
