@echo off
REM Phase 89: ACE Contextual Synthesis Runner
REM Run with: run-ace-synthesis.bat

SET PYTHON=C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║   Phase 89: ACE Contextual Engineering Synthesis                 ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Pre-flight Checks:
echo.

REM Check Python
echo 1. Python Environment...
"%PYTHON%" --version
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Python not found!
    pause
    exit /b 1
)
echo    ✅ Python OK
echo.

REM Check PyTorch + CUDA
echo 2. PyTorch + CUDA...
"%PYTHON%" -c "import torch; print(f'   ✅ PyTorch {torch.__version__}, CUDA {torch.cuda.is_available()}')"
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ PyTorch not available!
    pause
    exit /b 1
)
echo.

REM Check dependencies (pysimdjson is optional, will fallback to orjson/stdlib)
echo 3. Checking dependencies...

REM Try installing pysimdjson (only works on Python 3.9-3.12)
"%PYTHON%" -c "import sys; exit(0 if sys.version_info[:2] < (3, 13) else 1)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    Installing pysimdjson for faster JSON parsing...
    "%PYTHON%" -m pip install pysimdjson -q >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    ✅ pysimdjson installed
    ) else (
        echo    ⚠️  pysimdjson failed, will use orjson/stdlib fallback
    )
) else (
    echo    ⚠️  Python 3.13+ detected, skipping pysimdjson (incompatible)
    echo    ✅ Using orjson/stdlib fallback ^(slower but compatible^)
)

"%PYTHON%" -c "import sklearn; print('   ✅ scikit-learn')" 2>nul || (
    echo    ⚠️  scikit-learn not installed, installing...
    "%PYTHON%" -m pip install scikit-learn -q
)

"%PYTHON%" -c "import qdrant_client; print('   ✅ qdrant-client')" 2>nul || (
    echo    ⚠️  qdrant-client not installed, installing...
    "%PYTHON%" -m pip install qdrant-client -q
)

REM Check langextract Docker container
echo    LangExtract ^(Docker^)...
docker inspect phase66-langextract >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker port phase66-langextract | findstr "8095" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    ✅ LangExtract running ^(port 8095^)
    ) else (
        echo    ⚠️  LangExtract container exists but not running
        echo    Start with: docker start phase66-langextract
    )
) else (
    echo    ⚠️  LangExtract container not found ^(validation disabled^)
)
echo.

REM Check infrastructure
echo 4. Infrastructure Status...

echo    Redis...
docker exec phase66-redis redis-cli PING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Redis running
) else (
    echo    ⚠️  Redis not accessible
)

echo    Qdrant...
curl -s http://localhost:6333/collections >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Qdrant running
) else (
    echo    ⚠️  Qdrant not accessible
)

echo    Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Ollama running
) else (
    echo    ⚠️  Ollama not accessible
)
echo.

echo ══════════════════════════════════════════════════════════════════════
echo.
echo 🚀 Running ACE Contextual Synthesis Pipeline...
echo.

REM Run the Python script
"%PYTHON%" scripts\phase89-ace-contextual-synthesis.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ══════════════════════════════════════════════════════════════════════
    echo.
    echo ✅ Pipeline Complete!
    echo.
    echo 📊 Results saved to: reports\phase89-ace-synthesis.json
    echo.

    if exist reports\phase89-ace-synthesis.json (
        echo Quick Summary:
        type reports\phase89-ace-synthesis.json | findstr "performance total_time_ms cache_hit"
    )
    echo.
) else (
    echo.
    echo ❌ Pipeline failed with exit code: %ERRORLEVEL%
    echo.
)

pause
