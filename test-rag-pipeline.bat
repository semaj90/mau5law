@echo off
REM ================================================================================
REM RAG PIPELINE TEST SCRIPT
REM ================================================================================
REM Tests the complete RAG pipeline:
REM 1. Upload document to MinIO
REM 2. Generate embeddings
REM 3. Store in Qdrant/pgvector
REM 4. Query with RAG
REM 5. Get AI-generated answer
REM ================================================================================

echo.
echo ========================================
echo  TESTING RAG PIPELINE
echo ========================================
echo.

REM Test 1: Health Check
echo [TEST 1] Health checks...
echo Testing Enhanced RAG Service...
curl -s http://localhost:8095/health
echo.
echo Testing Qdrant...
curl -s http://localhost:6333/
echo.
echo Testing MinIO...
curl -s http://localhost:9000/minio/health/live
echo.

REM Test 2: Document Ingest
echo [TEST 2] Document ingestion...
echo Creating test legal document...
curl -X POST http://localhost:8095/api/rag/ingest ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Test Legal Contract\",\"content\":\"This is a test legal contract between Party A and Party B. The parties agree to the following terms and conditions...\",\"file_type\":\"text/plain\",\"metadata\":{\"test\":true}}"
echo.

REM Test 3: RAG Query
echo [TEST 3] RAG query...
timeout /t 3 /nobreak >nul
echo Querying: "What are the parties in the contract?"
curl -X POST http://localhost:8095/api/rag/query ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"What are the parties in the contract?\",\"max_results\":5,\"include_context\":true}"
echo.

REM Test 4: Evidence Upload (SvelteKit API)
echo [TEST 4] Evidence upload via SvelteKit API...
echo Testing evidence upload endpoint...
curl -s http://localhost:5173/api/evidence/upload
echo.

REM Test 5: AI Chat Integration
echo [TEST 5] AI chat integration...
echo Testing chat endpoint...
curl -X POST http://localhost:5173/api/v1/ai/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Summarize the test contract\"}],\"model\":\"gemma3-legal:latest\"}"
echo.

echo.
echo ========================================
echo  TESTS COMPLETE
echo ========================================
echo.
echo Check the output above for any errors.
echo All services should respond with JSON data.
echo.
pause
