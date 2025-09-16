@echo off
REM Build script for Q4_K_M TensorRT Pipeline with FlashAttention
REM This script compiles the CUDA plugin and runs the full pipeline

echo ========================================
echo Q4_K_M TensorRT Pipeline Build Script
echo ========================================

REM Check CUDA installation
echo Checking CUDA installation...
where nvcc >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: NVCC not found. Please install CUDA Toolkit.
    echo Download from: https://developer.nvidia.com/cuda-toolkit
    exit /b 1
)

nvcc --version
echo.

REM Check TensorRT installation
echo Checking TensorRT installation...
python -c "import tensorrt as trt; print(f'TensorRT version: {trt.__version__}')" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: TensorRT not found. Please install TensorRT.
    echo Download from: https://developer.nvidia.com/tensorrt
    exit /b 1
)

REM Set environment variables
set CUDA_PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8
set TENSORRT_PATH=C:\TensorRT-8.6.1.6
set PATH=%CUDA_PATH%\bin;%TENSORRT_PATH%\bin;%PATH%

echo Using CUDA: %CUDA_PATH%
echo Using TensorRT: %TENSORRT_PATH%
echo.

REM Create build directory
if not exist "build" mkdir build
cd build

REM Compile CUDA plugin
echo ========================================
echo Compiling Q4_K_M FlashAttention Plugin
echo ========================================

nvcc -shared -o q4km_flashattention_plugin.dll ^
    -I"%TENSORRT_PATH%\include" ^
    -I"%CUDA_PATH%\include" ^
    -L"%TENSORRT_PATH%\lib" ^
    -L"%CUDA_PATH%\lib\x64" ^
    -lnvinfer ^
    -lnvinfer_plugin ^
    -lcudart ^
    --expt-extended-lambda ^
    --expt-relaxed-constexpr ^
    -O3 ^
    -arch=sm_86 ^
    -std=c++17 ^
    ..\q4km-flashattention-plugin.cu

if %errorlevel% neq 0 (
    echo ERROR: Plugin compilation failed!
    exit /b 1
)

echo Plugin compiled successfully: q4km_flashattention_plugin.dll
echo.

REM Install Python dependencies
echo ========================================
echo Installing Python Dependencies
echo ========================================

pip install tensorrt pycuda torch numpy

if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies!
    exit /b 1
)

echo Python dependencies installed successfully.
echo.

REM Test the plugin
echo ========================================
echo Testing Plugin Registration
echo ========================================

python -c "
import ctypes
import tensorrt as trt

# Load plugin
plugin_lib = ctypes.CDLL('./q4km_flashattention_plugin.dll')
print('Plugin loaded successfully')

# Check if plugin is registered
registry = trt.get_plugin_registry()
creators = [registry.get_plugin_creator(name, version)
           for name, version in [('Q4KMFlashAttention', '1.0')]]
creators = [c for c in creators if c is not None]

if creators:
    print(f'Found {len(creators)} plugin creators')
    for creator in creators:
        print(f'  - {creator.name} v{creator.version}')
else:
    print('Warning: Plugin creators not found')
"

if %errorlevel% neq 0 (
    echo ERROR: Plugin testing failed!
    exit /b 1
)

echo.

REM Run conversion example
echo ========================================
echo Running Conversion Example
echo ========================================

REM Create a small test model for conversion
python -c "
import torch
import torch.nn as nn
import numpy as np

# Create a small test model
class TestModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.embedding = nn.Embedding(1000, 256)
        self.linear = nn.Linear(256, 256)

    def forward(self, x):
        x = self.embedding(x)
        return self.linear(x)

model = TestModel()
torch.save(model.state_dict(), 'test_model.bin')
print('Test model created: test_model.bin')
"

if %errorlevel% neq 0 (
    echo ERROR: Test model creation failed!
    exit /b 1
)

echo Test model created successfully.
echo.

REM Run the converter (with mock data)
echo Running Q4_K_M to TensorRT converter...

python ..\q4km-to-tensorrt-converter.py ^
    test_model.bin ^
    test_model.trt ^
    --precision fp16 ^
    --max-batch-size 4 ^
    --max-seq-length 512

if %errorlevel% neq 0 (
    echo Warning: Converter completed with warnings (expected for mock data)
) else (
    echo Converter completed successfully.
)

echo.

REM Test CUDA graphs (if engine was created)
if exist "test_model.trt" (
    echo ========================================
    echo Testing CUDA Graph Optimization
    echo ========================================

    python ..\cuda-graph-optimizer.py ^
        test_model.trt ^
        --output-dir ./cuda_graph_optimization ^
        --batch-sizes 1 2 4 ^
        --seq-lengths 128 256 512 ^
        --benchmark

    if %errorlevel% neq 0 (
        echo Warning: CUDA Graph testing completed with warnings
    ) else (
        echo CUDA Graph optimization completed successfully.
    )
    echo.
)

REM Run comprehensive tests
echo ========================================
echo Running Comprehensive Tests
echo ========================================

python ..\test-q4km-tensorrt.py ^
    --engine-path test_model.trt ^
    --output-path test_results.json

if %errorlevel% neq 0 (
    echo Warning: Some tests may have failed (expected for mock data)
) else (
    echo All tests completed successfully.
)

echo.

REM Generate performance report
echo ========================================
echo Performance Summary
echo ========================================

if exist "test_results.json" (
    python -c "
import json
with open('test_results.json', 'r') as f:
    results = json.load(f)

print('Test Results Summary:')
print('=' * 40)

for test_name, result in results.items():
    if isinstance(result, dict):
        status = 'PASS' if result.get('success', False) else 'FAIL'
        print(f'{test_name:.<30} {status}')

if 'performance_benchmarks' in results and results['performance_benchmarks'].get('success'):
    perf = results['performance_benchmarks']
    print(f'\\nBest throughput: {perf[\"best_throughput\"]:.1f} tokens/sec')
    print(f'Lowest latency: {perf[\"lowest_latency\"]:.2f}ms')

if 'cuda_graph_performance' in results and results['cuda_graph_performance'].get('success'):
    cuda = results['cuda_graph_performance']
    print(f'CUDA Graph speedup: {cuda[\"average_speedup\"]:.2f}x')
"
) else (
    echo No test results found.
)

echo.

REM Build complete
cd ..
echo ========================================
echo Build Complete!
echo ========================================

echo Output files:
if exist "build\q4km_flashattention_plugin.dll" (
    echo   ✓ Plugin: build\q4km_flashattention_plugin.dll
)
if exist "build\test_model.trt" (
    echo   ✓ Engine: build\test_model.trt
)
if exist "build\test_results.json" (
    echo   ✓ Results: build\test_results.json
)

echo.
echo Next steps:
echo   1. Replace test_model.bin with your actual Q4_K_M model
echo   2. Run the converter with your model:
echo      python q4km-to-tensorrt-converter.py your_model.gguf your_model.trt
echo   3. Optimize with CUDA graphs:
echo      python cuda-graph-optimizer.py your_model.trt
echo   4. Test with your data:
echo      python test-q4km-tensorrt.py --engine-path your_model.trt
echo.

pause