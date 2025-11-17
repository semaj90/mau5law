@echo off
REM WSL2 VHDX Optimization Batch Script
REM This script provides step-by-step instructions for optimizing WSL2 VHDX files

REM Require administrative privileges so WSL can be shut down and VHDX files attached
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] This script must be run from an elevated (Run as Administrator) PowerShell or CMD.
    echo     Right-click the shell icon and choose "Run as administrator", then re-run this script.
    echo.
    pause
    exit /b 1
)

echo WSL2 VHDX Optimization Helper
echo ==============================
echo.
echo This script will help you optimize your WSL2 VHDX files to reclaim disk space.
echo.
echo IMPORTANT: This process requires administrator privileges.
echo.
echo Step 1: Shutdown WSL and Docker
echo -------------------------------
wsl --shutdown
echo WSL shutdown complete. Please also quit Docker Desktop if running.
echo.
pause

echo.
echo Step 2: Finding VHDX files
echo --------------------------
echo Looking for WSL VHDX files...
echo.
echo Common locations:
echo - Docker: %LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx
echo - Ubuntu: %LOCALAPPDATA%\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\ext4.vhdx
echo - WSL: %LOCALAPPDATA%\wsl\*\ext4.vhdx
echo.
echo Found files:
dir "%LOCALAPPDATA%\Docker\wsl\disk\*.vhdx" /b 2>nul
dir "%LOCALAPPDATA%\Packages\CanonicalGroupLimited.Ubuntu*\LocalState\*.vhdx" /b 2>nul
dir "%LOCALAPPDATA%\wsl\*\*.vhdx" /b 2>nul
echo.
pause

echo.
echo Step 3: Manual Optimization Instructions
echo ----------------------------------------
echo Since this script cannot run diskpart automatically, please follow these steps:
echo.
echo 1. Open Disk Management (Win+X → Disk Management or run: diskmgmt.msc)
echo 2. Choose Action → Attach VHD
echo 3. Browse to one of the VHDX files listed above
echo 4. Check "Read-only" and click OK
echo 5. When the disk appears, right-click it → Properties
echo 6. Go to Tools tab → Click "Optimize" (or "Optimize/Defragment" in ribbon)
echo 7. Select the attached VHD disk and click Optimize
echo 8. After completion, right-click the disk → Detach VHD
echo 9. UNCHECK "Delete the virtual hard disk after removing it"
echo.
echo Repeat for each VHDX file you want to optimize.
echo.
echo After all optimizations are complete, you can restart WSL/Docker.
echo.
pause

echo.
echo Alternative: PowerShell Script
echo -----------------------------
echo If you prefer automated optimization, run the PowerShell script as Administrator:
echo.
echo cd "%~dp0"
echo powershell -ExecutionPolicy Bypass -File "optimize-wsl-vhdx.ps1"
echo.
echo The PowerShell script will automatically find and optimize VHDX files.
echo.
pause
