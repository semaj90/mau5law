@echo off
echo ========================================
echo WSL Disk Compaction
echo ========================================
echo.
echo This will reclaim ~134GB freed space from WSL
echo.

wsl --shutdown
timeout /t 3

echo Running diskpart to compact WSL virtual disk...
echo.

diskpart /s "%~dp0compact_wsl.txt"

echo.
echo ========================================
echo Compaction complete!
echo ========================================
pause
