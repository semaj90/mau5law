@echo off
echo ========================================
echo SAFE WSL Disk Compaction
echo ========================================
echo.
echo SAFETY CHECKS:
echo.

REM Check 1: Verify backup exists
if not exist "C:\WSL_Backups\backup_*" (
    echo ❌ ERROR: No backup found in C:\WSL_Backups\
    echo.
    echo Please run backup_wsl_critical_files.bat first!
    pause
    exit /b 1
)

REM Check 2: Verify sufficient temp space (need ~80GB)
for /f "tokens=3" %%a in ('dir /-c %TEMP% ^| find "bytes free"') do set FREE_TEMP=%%a
echo Temp space: %FREE_TEMP% bytes
echo Need: 85899345920 bytes (80GB)
echo.

REM Check 3: Confirm with user
echo This will:
echo   1. Export Ubuntu to backup tar (needs 80GB temp space)
echo   2. Unregister Ubuntu (DELETE current installation)
echo   3. Re-import Ubuntu (restore from backup)
echo.
echo ⚠️  WARNING: Only proceed if you have backups!
echo.
set /p CONFIRM="Type 'YES' to proceed: "
if not "%CONFIRM%"=="YES" (
    echo Cancelled by user.
    pause
    exit /b 0
)

echo.
echo Starting WSL compaction...
echo.

wsl --shutdown
timeout /t 3

echo [1/3] Exporting Ubuntu (this takes 10-15 minutes)...
wsl --export Ubuntu "%TEMP%\ubuntu_backup.tar"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Export failed! Ubuntu NOT modified.
    pause
    exit /b 1
)

echo [2/3] Unregistering Ubuntu...
wsl --unregister Ubuntu

echo [3/3] Re-importing Ubuntu (compacted)...
wsl --import Ubuntu "%LOCALAPPDATA%\WSL\Ubuntu" "%TEMP%\ubuntu_backup.tar" --version 2

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Import failed! Restore from C:\WSL_Backups\
    pause
    exit /b 1
)

echo.
echo Cleaning up temporary file...
del "%TEMP%\ubuntu_backup.tar"

echo.
echo Setting default user...
ubuntu config --default-user james

echo.
echo ========================================
echo ✅ Compaction complete!
echo ========================================
pause
