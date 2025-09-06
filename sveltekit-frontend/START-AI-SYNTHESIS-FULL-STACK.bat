@echo off
setlocal

REM Move to the script directory
cd /d "%~dp0" || goto :err

REM Check for Node.js and npm
node -v >nul 2>&1 || (echo Node.js not found. Install Node.js from https://nodejs.org && exit /b 1)
npm -v >nul 2>&1 || (echo npm not found. Install npm (comes with Node) && exit /b 1)

echo Installing dependencies (will use npm ci if package-lock exists)...
if exist package-lock.json (
  npm ci || (echo "npm ci failed, trying npm install" && npm install) || goto :err
) else (
  npm install || goto :err
)

echo Starting SvelteKit dev server in a new window...
start "SvelteKit Dev" cmd /k "npm run dev"

echo Dev server launched.
exit /b 0

:err
echo An error occurred. Check the output above for details.
exit /b 1
