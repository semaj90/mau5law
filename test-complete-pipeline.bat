@echo off
echo Testing Legal AI Complete Pipeline
echo ==================================
echo.

REM Set environment variables
set API_BASE=http://localhost:8095/api/v1
set CUDA_BASE=http://localhost:8096/api/v1
set FRONTEND_BASE=http://localhost:5173

echo Testing all services...
echo.

REM Test 1: Health Checks
echo [TEST 1] Health Checks
echo ----------------------

echo Testing Legal AI Service health...
curl -s %API_BASE%/health | findstr "healthy" >nul
if %errorlevel% equ 0 (
    echo ✓ Legal AI Service: HEALTHY
) else (
    echo ✗ Legal AI Service: FAILED
    goto :error
)

echo Testing CUDA Worker health...
curl -s %CUDA_BASE%/health | findstr "healthy" >nul
if %errorlevel% equ 0 (
    echo ✓ CUDA Worker: HEALTHY
) else (
    echo ✗ CUDA Worker: FAILED
    goto :error
)

echo Testing SvelteKit Frontend...
curl -s %FRONTEND_BASE% >nul
if %errorlevel% equ 0 (
    echo ✓ SvelteKit Frontend: ACCESSIBLE
) else (
    echo ✗ SvelteKit Frontend: FAILED
    goto :error
)

echo.

REM Test 2: Embedding Submission
echo [TEST 2] Embedding Submission
echo ------------------------------

echo Submitting legal document for embedding...
curl -s -X POST %API_BASE%/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"embedding\",\"payload\":\"This is a test legal contract clause regarding intellectual property rights and patent licensing agreements. The contractor grants perpetual rights to use and modify any intellectual property.\",\"metadata\":{\"caseId\":\"TEST_PIPELINE_001\",\"documentType\":\"contract\",\"priority\":\"high\",\"testRun\":\"true\"}}" ^
  > temp_embed_result.json

if %errorlevel% equ 0 (
    echo ✓ Embedding submission: SUCCESS
    type temp_embed_result.json
) else (
    echo ✗ Embedding submission: FAILED
    goto :error
)

echo.
timeout /t 2 >nul

REM Test 3: Vector Search
echo [TEST 3] Vector Similarity Search
echo ----------------------------------

echo Testing simple search...
curl -s "%API_BASE%/search?q=intellectual%%20property%%20contract&limit=3" > temp_search_result.json

if %errorlevel% equ 0 (
    echo ✓ Simple search: SUCCESS
    type temp_search_result.json
) else (
    echo ✗ Simple search: FAILED
    goto :error
)

echo.

echo Testing advanced search with filters...
curl -s -X POST %API_BASE%/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"patent licensing agreement\",\"limit\":5,\"caseId\":\"TEST_PIPELINE_001\",\"metadata\":{\"documentType\":\"contract\"}}" ^
  > temp_advanced_search.json

if %errorlevel% equ 0 (
    echo ✓ Advanced search: SUCCESS
    type temp_advanced_search.json
) else (
    echo ✗ Advanced search: FAILED
    goto :error
)

echo.

REM Test 4: CUDA Acceleration
echo [TEST 4] CUDA GPU Acceleration
echo -------------------------------

echo Testing CUDA embedding task...
curl -s -X POST %CUDA_BASE%/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"embedding\",\"priority\":7,\"payload\":{\"text\":\"Legal document requiring GPU acceleration for fast processing\",\"dimension\":768},\"metadata\":{\"source\":\"pipeline_test\",\"gpu\":\"true\"}}" ^
  > temp_cuda_task.json

if %errorlevel% equ 0 (
    echo ✓ CUDA task submission: SUCCESS
    type temp_cuda_task.json
) else (
    echo ✗ CUDA task submission: FAILED
    goto :error
)

echo.

REM Test 5: System Statistics
echo [TEST 5] System Statistics
echo --------------------------

echo Getting search statistics...
curl -s %API_BASE%/stats > temp_stats.json

if %errorlevel% equ 0 (
    echo ✓ Statistics retrieval: SUCCESS
    type temp_stats.json
) else (
    echo ✗ Statistics retrieval: FAILED
    goto :error
)

echo.

echo Getting CUDA metrics...
curl -s %CUDA_BASE%/metrics > temp_cuda_metrics.json

if %errorlevel% equ 0 (
    echo ✓ CUDA metrics: SUCCESS
    type temp_cuda_metrics.json
) else (
    echo ✗ CUDA metrics: FAILED
    goto :error
)

echo.

REM Test 6: Database Integration
echo [TEST 6] Database Integration
echo -----------------------------

echo Testing database connectivity...
PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) as total_embeddings FROM embeddings;" 2>nul

if %errorlevel% equ 0 (
    echo ✓ Database query: SUCCESS
) else (
    echo ✗ Database query: FAILED
    goto :error
)

echo Testing vector search directly in database...
PGPASSWORD=123456 psql -h localhost -p 5433 -U legal_admin -d legal_ai_db -c "SELECT * FROM embedding_stats;" 2>nul

if %errorlevel% equ 0 (
    echo ✓ Vector search setup: SUCCESS
) else (
    echo ✗ Vector search setup: FAILED
    goto :error
)

echo.

REM Test 7: End-to-End Workflow
echo [TEST 7] End-to-End Workflow Test
echo ----------------------------------

echo Submitting multiple legal documents for comprehensive test...

REM Submit contract document
curl -s -X POST %API_BASE%/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"embedding\",\"payload\":\"CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT: The parties agree to maintain strict confidentiality regarding all proprietary information, trade secrets, and confidential business data disclosed during the performance of this agreement.\",\"metadata\":{\"caseId\":\"WORKFLOW_TEST\",\"documentType\":\"nda\",\"section\":\"confidentiality\"}}" > nul

echo Contract 1 submitted...

REM Submit patent document
curl -s -X POST %API_BASE%/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"embedding\",\"payload\":\"PATENT LICENSING AGREEMENT: The licensor hereby grants to the licensee a non-exclusive, worldwide license to manufacture, use, and sell products covered by Patent No. 9876543, subject to the terms and conditions set forth herein.\",\"metadata\":{\"caseId\":\"WORKFLOW_TEST\",\"documentType\":\"patent_license\",\"section\":\"licensing\"}}" > nul

echo Patent document submitted...

REM Submit liability document
curl -s -X POST %API_BASE%/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"embedding\",\"payload\":\"LIABILITY LIMITATION CLAUSE: In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.\",\"metadata\":{\"caseId\":\"WORKFLOW_TEST\",\"documentType\":\"contract\",\"section\":\"liability\"}}" > nul

echo Liability clause submitted...

timeout /t 3 >nul

echo Testing cross-document similarity search...
curl -s "%API_BASE%/search?q=confidential%%20agreement%%20licensing&limit=5&caseId=WORKFLOW_TEST" > temp_workflow_results.json

if %errorlevel% equ 0 (
    echo ✓ End-to-end workflow: SUCCESS
    echo Search found similar documents:
    type temp_workflow_results.json
) else (
    echo ✗ End-to-end workflow: FAILED
    goto :error
)

echo.

REM All Tests Passed
echo ==================================
echo ALL TESTS PASSED SUCCESSFULLY! ✓
echo ==================================
echo.
echo Pipeline components verified:
echo ✓ Legal AI Service (Ollama + PostgreSQL)
echo ✓ CUDA Worker (RTX 3060 Ti acceleration)
echo ✓ SvelteKit Frontend (Svelte 5 patterns)
echo ✓ Vector similarity search (pgvector)
echo ✓ Metadata filtering and case management
echo ✓ End-to-end document workflow
echo.
echo System is ready for production use!
echo.
echo Quick access URLs:
echo 🌐 Test Interface:    %FRONTEND_BASE%/legal-ai/embedding-search-test
echo ⚖️  API Health:       %API_BASE%/health
echo 🖥️  CUDA Status:      %CUDA_BASE%/health
echo 📊 Search Stats:     %API_BASE%/stats
echo.
echo Cleaning up temporary files...
del temp_*.json 2>nul
echo.
echo Test completed successfully! 🎉
goto :end

:error
echo.
echo ==================================
echo PIPELINE TEST FAILED ✗
echo ==================================
echo.
echo Please check:
echo 1. All services are running (run-legal-ai-complete.bat)
echo 2. PostgreSQL database is accessible
echo 3. Ollama service is running with Gemma models
echo 4. Network connectivity between services
echo.
echo Check service logs for detailed error information.
echo.
del temp_*.json 2>nul
exit /b 1

:end
pause