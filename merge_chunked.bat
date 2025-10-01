@echo off
cd /d "%~dp0"
echo ========================================
echo Gemma3 Chunked Streaming Merge
echo ========================================
echo.
echo Strategy: Save after each shard
echo Memory: Ultra low (one shard at a time)
echo.
pause

python merge_gemma3_chunked.py

pause
