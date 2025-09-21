@echo off
echo Running WSL compact...
diskpart /s compact-ubuntu.txt
echo Compact complete!
pause