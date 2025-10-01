@echo off
echo ========================================
echo Gemma3 Checkpoint Shard Merger
echo ========================================
echo.
echo This will merge 5 shards (22GB total) into rank0.safetensors
echo.
echo Requirements:
echo   - Python 3.10+ with safetensors installed
echo   - At least 25GB free RAM
echo   - WSL Ubuntu running
echo.
pause

python merge_gemma3_shards_fixed.py

pause
