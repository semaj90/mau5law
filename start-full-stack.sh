#!/bin/bash
# YoRHa Legal AI Platform - Full Stack Startup Script
# Starts Advanced AI Integration + SvelteKit Frontend

echo "🚀 Starting YoRHa Legal AI Platform with Advanced AI Integration"
echo

# Check if Python is available
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js and try again."
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
fi

# Install Python dependencies for Advanced AI
echo "📦 Installing Advanced AI dependencies..."
$PYTHON_CMD -m pip install -r requirements-advanced-ai.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd sveltekit-frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi
cd ..

echo "✅ Dependencies installed successfully"
echo

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down services..."
    kill $API_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start Advanced AI API in background
echo "🧠 Starting Advanced AI Integration API on port 8001..."
$PYTHON_CMD advanced-ai-api.py &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start SvelteKit development server in background
echo "⚡ Starting SvelteKit Frontend on port 5173..."
cd sveltekit-frontend
npm run dev &
FRONTEND_PID=$!

# Wait for services
echo
echo "🎉 Services started successfully!"
echo "📊 Advanced AI API: http://localhost:8001"
echo "🌐 Frontend: http://localhost:5173"
echo "📄 Evidence AI: http://localhost:5173/evidence-ai"
echo
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait