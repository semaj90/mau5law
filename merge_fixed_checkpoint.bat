@echo off
cd /d "%~dp0"
echo ========================================
echo Merging Fixed FP16 Checkpoint
echo ========================================
echo.
echo Input:  gemma3_trtllm_checkpoint (FP16)
echo Output: rank0.safetensors
echo.
pause

python merge_fixed_checkpoint.py

pause
