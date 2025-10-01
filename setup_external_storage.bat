@echo off
echo ========================================
echo Setup External Storage for WSL
echo ========================================
echo.
echo This creates a storage location on C: drive
echo and symlinks it into WSL, preventing data loss
echo during WSL maintenance.
echo.

REM Create storage directory on Windows side
mkdir "C:\WSL_Storage\checkpoints"
mkdir "C:\WSL_Storage\models"
mkdir "C:\WSL_Storage\backups"

echo Created storage directories on C:
echo.

REM Create symlinks inside WSL
wsl --distribution Ubuntu ln -sf /mnt/c/WSL_Storage/checkpoints /home/james/checkpoints
wsl --distribution Ubuntu ln -sf /mnt/c/WSL_Storage/models /home/james/models
wsl --distribution Ubuntu ln -sf /mnt/c/WSL_Storage/backups /home/james/backups

echo.
echo ========================================
echo ✅ External storage configured!
echo ========================================
echo.
echo Usage in WSL:
echo   ~/checkpoints -> C:\WSL_Storage\checkpoints
echo   ~/models      -> C:\WSL_Storage\models
echo   ~/backups     -> C:\WSL_Storage\backups
echo.
echo These directories survive WSL reinstalls!
echo.
pause
