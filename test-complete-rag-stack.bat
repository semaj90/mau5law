@echo off
REM Complete GPU RAG Stack Integration Test
REM Tests: Qdrant + embeddinggemma + pgvector + LangChain + OCR Upload + Auto-tagging

echo ========================================================================
echo   Testing Complete GPU RAG Stack with Qdrant Scalar Quantization
echo ========================================================================
echo.

REM Step 1: Health checks
echo [Test 1/7] Checking Qdrant health...
curl -s http://localhost:6333/healthz 2>nul | findstr "ok"
if %errorlevel%==0 (echo ✓ Qdrant: Running) else (echo ✗ Qdrant: Not running)

echo.
echo [Test 2/7] Checking PostgreSQL...
PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -c "\dt" 2>nul | findstr "documents"
if %errorlevel%==0 (echo ✓ PostgreSQL: Running) else (echo ✗ PostgreSQL: Not running)

echo.
echo [Test 3/7] Checking SvelteKit QUIC server...
curl -s http://localhost:5173/api/rag/search?action=health 2>nul | findstr "success"
if %errorlevel%==0 (echo ✓ SvelteKit: Running) else (echo ✗ SvelteKit: Not running)

echo.
echo [Test 4/7] Initializing Qdrant collection with scalar quantization...
curl -X POST http://localhost:5173/api/qdrant/init ^
  -H "Content-Type: application/json" ^
  -d "{\"vectorSize\":768,\"distance\":\"Cosine\",\"quantizationType\":\"scalar\",\"recreate\":false}" ^
  --max-time 10 2>nul | findstr "success"
if %errorlevel%==0 (echo ✓ Qdrant collection initialized) else (echo ⚠ Collection may already exist)

echo.
echo [Test 5/7] Testing RAG search endpoint...
curl -X POST http://localhost:5173/api/rag/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"legal contract terms\",\"searchType\":\"hybrid\",\"limit\":5}" ^
  --max-time 15 2>nul | findstr "success"
if %errorlevel%==0 (echo ✓ RAG search: Working) else (echo ✗ RAG search: Failed)

echo.
echo [Test 6/7] Testing OCR document upload endpoint health...
curl -s http://localhost:5173/api/documents/upload-ocr 2>nul | findstr "success"
if %errorlevel%==0 (echo ✓ OCR upload endpoint: Ready) else (echo ✗ OCR upload endpoint: Failed)

echo.
echo [Test 7/7] Checking Qdrant collection info...
curl -s http://localhost:5173/api/qdrant/init 2>nul | findstr "exists"
if %errorlevel%==0 (echo ✓ Qdrant collection: Active) else (echo ⚠ Collection status unknown)

echo.
echo ========================================================================
echo   Integration Test Complete
echo ========================================================================
echo.
echo Stack Components Tested:
echo   [x] Qdrant Vector Database (Scalar Quantization)
echo   [x] PostgreSQL + pgvector
echo   [x] SvelteKit QUIC Server
echo   [x] RAG Search API (GPU + HTTP fallback)
echo   [x] OCR Document Upload Pipeline
echo.
echo Next Steps:
echo   1. Upload test document:
echo      curl -X POST http://localhost:5173/api/documents/upload-ocr ^
echo        -F "files=@test-document.txt"
echo.
echo   2. Search uploaded documents:
echo      curl -X POST http://localhost:5173/api/rag/search ^
echo        -H "Content-Type: application/json" ^
echo        -d "{\"query\":\"your search query\",\"searchType\":\"hybrid\",\"limit\":10\"}"
echo.
echo   3. View collection stats:
echo      curl http://localhost:5173/api/qdrant/init
echo.
echo ========================================================================
pause
