@echo off
echo ========================================
echo WSL Diskpart Compaction (NO DATA LOSS)
echo ========================================
echo.
echo This method is SAFER - it compacts the disk
echo without exporting/importing Ubuntu.
echo.
echo Requirements:
echo   - Run as Administrator
echo   - WSL must be shut down
echo.
pause

wsl --shutdown
timeout /t 3

echo.
echo Creating diskpart script...
echo.

REM Create diskpart commands
(
echo select vdisk file="%LOCALAPPDATA%\Packages\CanonicalGroupLimited.Ubuntu_79rhkp1fndgsc\LocalState\ext4.vhdx"
echo attach vdisk readonly
echo compact vdisk
echo detach vdisk
) > "%TEMP%\compact_wsl_diskpart.txt"

echo Running diskpart...
echo.

diskpart /s "%TEMP%\compact_wsl_diskpart.txt"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Diskpart failed. Common issues:
    echo   - Not running as Administrator
    echo   - WSL is still running (run wsl --shutdown)
    echo   - Hyper-V not available
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Compaction complete!
echo ========================================
echo.
echo Your Ubuntu files are INTACT.
echo Freed space returned to C: drive.
echo.
pause
