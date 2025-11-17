@echo off
echo Starting batch TypeScript syntax fix...
echo.

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%.."

cd "%FRONTEND_DIR%"

echo Finding all TypeScript files...
for /r "src" %%f in (*.ts) do (
    echo Processing: %%f
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%fix-typescript-syntax.ps1" -Path "%%f" 2>nul
)

for /r "src" %%f in (*.tsx) do (
    echo Processing: %%f
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%fix-typescript-syntax.ps1" -Path "%%f" 2>nul
)

echo.
echo Batch syntax fix completed!