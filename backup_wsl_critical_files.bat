@echo off
echo ========================================
echo WSL Critical Files Backup
echo ========================================
echo.
echo Backing up to C:\WSL_Backups\
echo.

set BACKUP_DIR=C:\WSL_Backups\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
mkdir "%BACKUP_DIR%"

echo [1/3] Backing up checkpoint directory...
wsl --distribution Ubuntu tar -czf "%BACKUP_DIR%\gemma3_checkpoint.tar.gz" -C /home/james gemma3_trtllm_checkpoint 2>&1

echo [2/3] Backing up Python environment...
wsl --distribution Ubuntu tar -czf "%BACKUP_DIR%\trt_env_310.tar.gz" -C /home/james trt_env_310 2>&1

echo [3/3] Backing up conversion scripts...
wsl --distribution Ubuntu tar -czf "%BACKUP_DIR%\scripts.tar.gz" -C /home/james *.py *.sh 2>&1

echo.
echo ========================================
echo Backup complete!
echo ========================================
echo Location: %BACKUP_DIR%
echo.
dir "%BACKUP_DIR%"
echo.
pause
