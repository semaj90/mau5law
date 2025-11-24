@echo off
REM YoRHa Legal AI Platform - Full Stack Startup Script
REM Starts Advanced AI Integration + SvelteKit Frontend

echo 🚀 Starting YoRHa Legal AI Platform with Advanced AI Integration
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js and try again.
    pause
    exit /b 1
)

REM Install Python dependencies for Advanced AI
echo 📦 Installing Advanced AI dependencies...
pip install -r requirements-advanced-ai.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
cd sveltekit-frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)
cd ..

echo ✅ Dependencies installed successfully
echo.

REM Start Advanced AI API in background
echo 🧠 Starting Advanced AI Integration API on port 8001...
start "Advanced AI API" cmd /c "python advanced-ai-api.py"

REM Wait a moment for API to start
timeout /t 3 /nobreak >nul

REM Start SvelteKit development server
echo ⚡ Starting SvelteKit Frontend on port 5173...
cd sveltekit-frontend
npm run dev

pause