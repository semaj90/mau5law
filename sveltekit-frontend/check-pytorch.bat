@echo off
REM Phase 89: PyTorch Quick Check (Batch Script - More Reliable)

echo.
echo ========================================================================
echo    Phase 89: PyTorch Environment Check
echo ========================================================================
echo.

set PYTHON=C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe

echo Checking PyTorch installation...
echo.

REM Check PyTorch
%PYTHON% -c "import torch; print('✓ PyTorch:', torch.__version__)"
if errorlevel 1 (
    echo ✗ PyTorch not installed
    echo Install: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
    echo Note: Using cu130 for CUDA 13.0
    exit /b 1
)

REM Check CUDA
%PYTHON% -c "import torch; print('✓ CUDA Available:', torch.cuda.is_available())"
%PYTHON% -c "import torch; print('✓ GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only')"

REM Check multiprocessing
%PYTHON% -c "import torch.multiprocessing as mp; print('✓ torch.multiprocessing: Available (GIL bypass enabled)')"

REM Check dependencies
echo.
echo Checking dependencies...
%PYTHON% -c "import transformers; print('✓ transformers:', transformers.__version__)"
%PYTHON% -c "import sentence_transformers; print('✓ sentence-transformers:', sentence_transformers.__version__)"
%PYTHON% -c "import numpy; print('✓ numpy:', numpy.__version__)"
%PYTHON% -c "import redis; print('✓ redis:', redis.__version__)"
%PYTHON% -c "import psycopg2; print('✓ psycopg2:', psycopg2.__version__)"

echo.
echo ========================================================================
echo    ✓ PyTorch environment ready!
echo ========================================================================
echo.
echo Next steps:
echo   1. Run indexer: python scripts\phase89-pytorch-multicore.py index --root src
echo   2. Full check:  .\scripts\run-pytorch-check.ps1
echo.

pause
