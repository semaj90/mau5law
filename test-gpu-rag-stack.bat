@echo off
REM Test Complete GPU RAG Stack

echo ========================================
echo   Testing GPU RAG Stack
echo ========================================
echo.

echo [Test 1] Checking Ollama GPU...
curl -s http://localhost:11434/api/tags | findstr "gemma3-legal-optimized"
if %errorlevel%==0 (echo ✓ Ollama GPU: Running) else (echo ✗ Ollama GPU: Not running)

echo.
echo [Test 2] Checking embeddinggemma model...
curl -s http://localhost:11434/api/tags | findstr "embeddinggemma"
if %errorlevel%==0 (echo ✓ embeddinggemma: Available) else (echo ✗ embeddinggemma: Not found)

echo.
echo [Test 3] Checking Qdrant...
curl -s http://localhost:6333/collections | findstr "ws-"
if %errorlevel%==0 (echo ✓ Qdrant: Running) else (echo ✗ Qdrant: Not running)

echo.
echo [Test 4] Checking Redis...
redis-cli -a redis ping 2>nul
if %errorlevel%==0 (echo ✓ Redis: Running) else (echo ✗ Redis: Not running)

echo.
echo [Test 5] Checking LiteLLM...
curl -s http://localhost:4000/health 2>nul | findstr "error"
if %errorlevel%==1 (echo ✓ LiteLLM: Running) else (echo ✗ LiteLLM: Not running)

echo.
echo [Test 6] Testing GPU Embedding Generation...
curl -X POST http://localhost:11434/api/embeddings ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"embeddinggemma\",\"prompt\":\"test legal document\"}" ^
  --max-time 10 2>nul | findstr "embedding"
if %errorlevel%==0 (echo ✓ GPU Embeddings: Working) else (echo ✗ GPU Embeddings: Failed)

echo.
echo [Test 7] Testing RAG Search API...
curl -X POST http://localhost:5173/api/rag/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"contract terms\",\"limit\":3}" ^
  --max-time 15 2>nul | findstr "success"
if %errorlevel%==0 (echo ✓ RAG Search: Working) else (echo ✗ RAG Search: Failed)

echo.
echo ========================================
echo   Test Complete
echo ========================================
echo.

pause
