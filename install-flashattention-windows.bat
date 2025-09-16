@echo off
echo 🚀 FlashAttention Direct Installation for Windows
echo ================================================

echo ✅ Checking system requirements...
python --version
echo CUDA Version:
nvcc --version | findstr "release"

echo.
echo 🔧 Installing FlashAttention dependencies...

:: Install PyTorch with CUDA 12.1 support
echo Installing PyTorch with CUDA support...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

:: Set environment variables for RTX 3060 Ti
set TORCH_CUDA_ARCH_LIST=8.6
set FLASH_ATTENTION_SKIP_CUDA_BUILD=FALSE
set MAX_JOBS=4

echo.
echo 🎯 Installing FlashAttention (this may take 10-15 minutes)...
echo Architecture: RTX 3060 Ti (8.6)
echo Max Jobs: 4 (optimized for your GPU)

pip install packaging wheel ninja
pip install flash-attn --no-build-isolation -v

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed. Trying alternative approach...
    echo 🔄 Installing pre-compiled wheel...
    pip install flash-attn --find-links https://flash-attn.s3.amazonaws.com/wheels/index.html

    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Alternative installation also failed.
        echo 💡 Suggestions:
        echo    1. Ensure Visual Studio Build Tools are installed
        echo    2. Try the Docker approach with: docker run --gpus all legal-ai-flashattention:latest
        echo    3. Check CUDA installation
        pause
        exit /b 1
    )
)

echo.
echo ✅ Verifying FlashAttention installation...
python -c "import flash_attn; print('✅ FlashAttention version:', flash_attn.__version__)"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 🎉 FlashAttention installed successfully!
    echo.
    echo 🎯 Integration with your legal AI system:
    echo    - FlashAttention is now available for TensorRT acceleration
    echo    - Your RTX 3060 Ti will benefit from 2-4x speedup in attention operations
    echo    - Ready for integration with Moogle Graph Synthesizer Stage 6
    echo.
    echo 🚀 Next steps:
    echo    1. Restart your legal AI services to use FlashAttention
    echo    2. Monitor GPU memory usage (should see improved efficiency)
    echo    3. Check performance improvements in embedding generation
    echo.
) else (
    echo ❌ Verification failed
    pause
    exit /b 1
)

pause