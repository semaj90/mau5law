@echo off
echo ========================================
echo Gemma3 Streaming Merge (Low Memory)
echo ========================================
echo.
echo This version loads tensors one at a time
echo Requires: 25-30GB free RAM
echo.
pause

python merge_gemma3_streaming.py

pause
