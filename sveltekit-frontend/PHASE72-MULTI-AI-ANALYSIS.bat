@echo off
REM Phase 72 - Multi-AI Meta-Analysis Quick Start
REM Sends recommendations to multiple AI systems for comparative analysis

echo.
echo ============================================================
echo   Phase 72 - Multi-AI Meta-Analysis System
echo ============================================================
echo.

REM Check if recommendations exist
if not exist "reports\latest\ast-rag-recommendations.md" (
    echo [!] No recommendations found. Run RAG/KAG integration first:
    echo     node scripts\rag-kag-ast-integrator.mjs --auto-recommendations
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking services...
echo.

REM Check Ollama
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ollama not running on port 11434
    echo     Start with: ollama serve
    pause
    exit /b 1
)
echo [+] Ollama running

REM Check Qdrant
curl -s http://localhost:6333/collections >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Qdrant not running on port 6333
    echo     Start with: cd qdrant-windows ^&^& qdrant.exe
    pause
    exit /b 1
)
echo [+] Qdrant running

echo.
echo [2/4] Running Ollama-only analysis...
echo.

node scripts\multi-ai-meta-analyzer.mjs

if %errorlevel% neq 0 (
    echo.
    echo [!] Analysis failed. Check error above.
    pause
    exit /b 1
)

echo.
echo [3/4] Want to compare with Google Gemini? (requires API key)
echo.
set /p COMPARE_GEMINI="Compare with Gemini? (y/n): "

if /i "%COMPARE_GEMINI%"=="y" (
    echo.
    echo Running multi-AI comparison...
    node scripts\multi-ai-meta-analyzer.mjs --compare-all
)

echo.
echo [4/4] Want to augment with web search? (requires Brave API key)
echo.
set /p WEB_SEARCH="Enable web search? (y/n): "

if /i "%WEB_SEARCH%"=="y" (
    echo.
    echo Running with web search augmentation...
    node scripts\multi-ai-meta-analyzer.mjs --with-web-search --compare-all
)

echo.
echo ============================================================
echo   Multi-AI Meta-Analysis Complete!
echo ============================================================
echo.
echo   Results: reports\latest\multi-ai-meta-analysis.md
echo   Vector Store: http://localhost:6333/dashboard#/collections/phase72_meta_analysis
echo.
echo   Next steps:
echo   1. Review multi-ai-meta-analysis.md
echo   2. Compare insights from different models
echo   3. Query vector store for related documentation
echo   4. Implement prioritized recommendations
echo.

pause
