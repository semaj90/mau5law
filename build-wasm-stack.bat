@echo off
echo 🚀 Building WASM + CUDA Legal AI Stack
echo =====================================

echo.
echo 📦 Step 1: Installing WASM dependencies...
cd wasm
if not exist node_modules (
    echo Installing AssemblyScript dependencies...
    npm install --save-dev assemblyscript json-as
) else (
    echo Dependencies already installed
)

echo.
echo 🔧 Step 2: Building WASM module...
echo Building optimized WASM binary...
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ WASM build failed
    pause
    exit /b 1
)
echo ✅ WASM module built successfully

echo.
echo 🏗️ Step 3: Building CUDA Mock Gateway...
cd ..\cuda-mock-gateway
echo Building Go service...
go mod tidy
go build -o cuda-mock-gateway.exe server.go
if %ERRORLEVEL% NEQ 0 (
    echo ❌ CUDA gateway build failed
    pause
    exit /b 1
)
echo ✅ CUDA mock gateway built successfully

echo.
echo 📋 Step 4: Verification...
cd ..
echo Checking build artifacts:
if exist "sveltekit-frontend\static\wasm\simd_parser.wasm" (
    echo ✅ WASM binary: sveltekit-frontend\static\wasm\simd_parser.wasm
) else (
    echo ❌ WASM binary not found
)

if exist "cuda-mock-gateway\cuda-mock-gateway.exe" (
    echo ✅ CUDA gateway: cuda-mock-gateway\cuda-mock-gateway.exe
) else (
    echo ❌ CUDA gateway not found
)

echo.
echo 🎯 Next Steps:
echo 1. Start CUDA gateway: cd cuda-mock-gateway && cuda-mock-gateway.exe
echo 2. Start SvelteKit: cd sveltekit-frontend && npm run dev
echo 3. Open evidence board: http://localhost:5174/evidenceboard
echo 4. Drag complaint.pdf onto fabric.js canvas
echo.
echo 📄 Test with: .\go-microservice\download_complaint (2).pdf
echo.
pause