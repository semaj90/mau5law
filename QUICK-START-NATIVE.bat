@echo off
REM Shim to the organized batch script location
set SCRIPT_DIR=%~dp0
set TARGET="%SCRIPT_DIR%organized-files\batch-scripts\QUICK-START-NATIVE.bat"
if exist %TARGET% (
  call %TARGET%
) else (
  echo QUICK-START-NATIVE.bat not found at %TARGET%
  echo Please update your VS Code task or run: npm run dev:full
  exit /b 1
)
