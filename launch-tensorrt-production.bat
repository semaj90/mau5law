@echo off
REM TensorRT-LLM Production Launcher
REM Activates Python 3.12 environment and launches TensorRT-LLM server
REM Date: September 16, 2025

echo ========================================
echo TensorRT-LLM Legal AI Production Server
echo ========================================
echo.

REM Activate TensorRT-LLM environment
echo Activating TensorRT-LLM Python 3.12 environment...
call C:\Users\james\Videos\deeds-web-app\tensorrt_llm_env\Scripts\activate.bat

REM Set environment variables
echo Loading environment configuration...
set CUDA_VISIBLE_DEVICES=0
set TENSORRT_CACHE_DIR=C:\Users\james\Videos\deeds-web-app\tensorrt_cache
set MODEL_DIR=C:\Users\james\Videos\deeds-web-app\models\gemma3-legal-q4km
set ENGINE_DIR=C:\Users\james\Videos\deeds-web-app\engines\gemma3-legal-q4km

REM Verify environment
echo.
echo Verifying TensorRT-LLM environment...
python -c "
import sys
print('✅ Python Version:', sys.version)
print('✅ Python Path:', sys.executable)

try:
    import tensorrt_llm
    print('✅ TensorRT-LLM:', tensorrt_llm.__version__)
except ImportError as e:
    print('❌ TensorRT-LLM Error:', e)

try:
    import tensorrt as trt
    print('✅ TensorRT:', trt.__version__)
except ImportError as e:
    print('❌ TensorRT Error:', e)

try:
    import torch
    print('✅ PyTorch:', torch.__version__)
    print('✅ CUDA Available:', torch.cuda.is_available())
    if torch.cuda.is_available():
        print('✅ GPU:', torch.cuda.get_device_name(0))
except ImportError as e:
    print('❌ PyTorch Error:', e)
"

echo.
echo Starting TensorRT-LLM production server...
echo Server will be available at: http://localhost:8100
echo.

REM Launch the production server
python tensorrt-llm-legal-production.py

pause