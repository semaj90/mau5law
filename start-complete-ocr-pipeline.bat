@echo off
REM Complete GPU OCR Pipeline
REM Surya OCR (Python GPU) → langextract-go → Ollama embeddings → Qdrant

echo ========================================================================
echo   Complete GPU OCR Pipeline for Legal AI
echo ========================================================================
echo   Stack: Surya OCR + langextract-go + Ollama + Qdrant
echo ========================================================================
echo.

REM Step 1: Build langextract-go if not already built
echo [1/5] Building langextract-go...
cd langextract-go
if not exist "langextract.exe" (
    echo Compiling Go binary...
    go build -o langextract.exe ./cmd/langextract
    if %errorlevel%==0 (
        echo ✓ langextract-go built successfully
    ) else (
        echo ✗ Failed to build langextract-go
        pause
        exit /b 1
    )
) else (
    echo ✓ langextract.exe already exists
)
cd ..

echo.
echo [2/5] Starting Ollama GPU (for embeddings)...
start "Ollama-GPU" /MIN cmd /c "start-ollama-gpu.bat"
timeout /t 3 /nobreak > nul

echo.
echo [3/5] Starting Qdrant Vector Database...
start "Qdrant" /MIN docker start qdrant 2>nul || docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
timeout /t 3 /nobreak > nul

echo.
echo [4/5] Starting Python GPU OCR Service (Surya + langextract-go)...
start "Python-OCR" cmd /c "cd python-gpu-ocr-service && start-ocr-service.bat"
timeout /t 5 /nobreak > nul

echo.
echo [5/5] Starting SvelteKit Frontend with QUIC...
cd sveltekit-frontend
start "SvelteKit-QUIC" cmd /c "npm run dev:quic"

timeout /t 5 /nobreak > nul

echo.
echo ========================================================================
echo   Complete GPU OCR Pipeline RUNNING!
echo ========================================================================
echo.
echo   Services:
echo   ✓ Surya OCR Service:         http://localhost:8090
echo   ✓ langextract-go:            ../langextract-go/langextract.exe
echo   ✓ Ollama GPU:                http://localhost:11434
echo   ✓ Qdrant:                    http://localhost:6333
echo   ✓ SvelteKit:                 http://localhost:5173
echo.
echo   Test Upload:
echo   curl -X POST http://localhost:5173/api/documents/upload-ocr ^
echo     -F "files=@test-document.pdf"
echo.
echo   OCR Pipeline:
echo   1. Upload PDF/Image → SvelteKit (Port 5173)
echo   2. Forward to Surya OCR → Python GPU Service (Port 8090)
echo   3. Extract entities → langextract-go CLI
echo   4. Generate embedding → Ollama embeddinggemma (Port 11434)
echo   5. Store vectors → Qdrant (Port 6333) + PostgreSQL
echo.
echo ========================================================================
pause
