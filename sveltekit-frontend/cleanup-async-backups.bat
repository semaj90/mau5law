@echo off
REM Cleanup Async Fix Backups
REM Run this after verifying all fixes work correctly

echo ========================================
echo Async Effect Fix - Backup Cleanup
echo ========================================
echo.

REM Count backup files
for /f %%i in ('dir /s /b src\*.backup-async-fix ^| find /c /v ""') do set COUNT=%%i

if "%COUNT%"=="0" (
    echo No backup files found.
    echo All backups have already been removed.
    pause
    exit /b 0
)

echo Found %COUNT% backup files.
echo.
echo These backups were created when fixing async effect patterns.
echo.
choice /M "Are you sure you want to delete all backup files"

if errorlevel 2 (
    echo Cancelled. No files were deleted.
    pause
    exit /b 0
)

echo.
echo Deleting backup files...

REM Delete all backup files
del /s /q src\*.backup-async-fix

echo.
echo Done! Deleted %COUNT% backup files.
echo.
pause
