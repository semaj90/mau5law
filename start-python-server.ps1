# Direct Python Legal AI Server - No Docker Required
# Uses your local Python 3.12 environment with GPU support

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🐍 PYTHON-ONLY LEGAL AI SETUP" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "💡 Bypassing Docker to use your local Python 3.12" -ForegroundColor Yellow
Write-Host ""

# Check Python version
$pythonVersion = python --version 2>&1
Write-Host "🐍 Python: $pythonVersion" -ForegroundColor Green

# Check if GPU is available
try {
    $gpuInfo = nvidia-smi --query-gpu=name --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎮 GPU: $gpuInfo" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ No GPU detected, will use CPU mode" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Blue

# Install compatible versions for Python 3.12
pip install --upgrade pip

# Install PyTorch with CUDA support for Python 3.13
Write-Host "⚡ Installing PyTorch with CUDA..." -ForegroundColor Blue
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install FastAPI and dependencies
Write-Host "🌐 Installing FastAPI stack..." -ForegroundColor Blue
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0

# Install ML dependencies
Write-Host "🧠 Installing ML libraries..." -ForegroundColor Blue
pip install transformers==4.44.0 numpy==1.24.3 pydantic==2.5.0 requests==2.31.0

Write-Host ""
Write-Host "🚀 Starting Legal AI server..." -ForegroundColor Green

# Start the server directly
python tensorrt-llm-production-server.py

Write-Host ""
Write-Host "✅ Server should be running at http://localhost:8100" -ForegroundColor Green
Write-Host "🧪 Test with: curl http://localhost:8100/health" -ForegroundColor Gray