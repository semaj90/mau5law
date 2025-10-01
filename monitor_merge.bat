@echo off
echo ========================================
echo Monitoring rank0.safetensors Growth
echo ========================================
echo.
echo Checking every 2 seconds...
echo Press Ctrl+C to stop
echo.

:loop
wsl bash -c "du -h /home/james/gemma3_trtllm_checkpoint/rank0.safetensors 2>&1 || echo 'Waiting for file to appear...'"
timeout /t 2 >nul
goto loop
