@echo off
cd /d "%~dp0"
echo ========================================
echo Gemma3 rank0.safetensors Merge
echo ========================================
echo.
echo Input:  5 FP16 shards (22.8GB)
echo Output: rank0.safetensors
echo Memory: 15GB RAM + 4GB swap available
echo.
echo Strategy: WSL-native merge with progress
echo.
pause

wsl bash -c "python3 /home/james/merge_rank0_final.py"

pause
