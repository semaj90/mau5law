@echo off
echo ========================================
echo Gemma3 Optimized Merge
echo ========================================
echo.
echo Installing tqdm for progress bar...
python -m pip install tqdm --quiet
echo.
echo Starting merge...
echo.

python merge_gemma3_optimized.py

pause
