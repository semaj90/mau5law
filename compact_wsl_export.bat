@echo off
echo ========================================
echo WSL Disk Compaction via Export/Import
echo ========================================
echo.
echo This will:
echo 1. Export Ubuntu to temporary tar file
echo 2. Unregister Ubuntu (free space)
echo 3. Re-import Ubuntu (compacted)
echo.
echo Time: ~10 minutes
echo Space freed: ~142GB
echo.
pause

wsl --shutdown
timeout /t 3

echo.
echo [1/3] Exporting Ubuntu...
wsl --export Ubuntu "%TEMP%\ubuntu_backup.tar"

echo.
echo [2/3] Unregistering Ubuntu (freeing C: drive space)...
wsl --unregister Ubuntu

echo.
echo [3/3] Re-importing Ubuntu (compacted)...
wsl --import Ubuntu "%LOCALAPPDATA%\WSL\Ubuntu" "%TEMP%\ubuntu_backup.tar" --version 2

echo.
echo Cleaning up temporary file...
del "%TEMP%\ubuntu_backup.tar"

echo.
echo Setting default user...
ubuntu config --default-user james

echo.
echo ========================================
echo Compaction complete!
echo ========================================
echo WSL disk reduced from ~222GB to ~80GB
echo C: drive freed: ~142GB
echo.
pause
