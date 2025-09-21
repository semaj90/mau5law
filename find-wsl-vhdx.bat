@echo off
echo Looking for WSL VHDX files...
echo.

echo Checking AppData\Local\Packages...
if exist "%LOCALAPPDATA%\Packages" (
    dir /s /b "%LOCALAPPDATA%\Packages\*Ubuntu*\*.vhdx" 2>nul
    dir /s /b "%LOCALAPPDATA%\Packages\*CanonicalGroup*\*.vhdx" 2>nul
) else (
    echo AppData\Local\Packages not found
)

echo.
echo Checking Docker Desktop...
if exist "%LOCALAPPDATA%\Docker" (
    dir /s /b "%LOCALAPPDATA%\Docker\*.vhdx" 2>nul
) else (
    echo Docker directory not found
)

echo.
echo Checking Program Files...
dir /s /b "C:\Program Files\*.vhdx" 2>nul

echo.
echo Done searching for VHDX files.
pause