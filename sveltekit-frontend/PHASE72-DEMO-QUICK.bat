@echo off
REM Phase 72 - RAG/KAG Quick Demo
REM Run with existing services-kb.tree.json

echo.
echo ========================================
echo   Phase 72: RAG/KAG Demo (Quick Start)
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking services...
echo.

curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Ollama not running - starting...
    start "" ollama serve
    timeout /t 3 >nul
) else (
    echo ✅ Ollama running
)

curl -s http://localhost:6333/collections >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Qdrant not running
    echo Starting Qdrant...
    cd qdrant-windows
    start "" qdrant.exe
    cd ..
    timeout /t 3 >nul
) else (
    echo ✅ Qdrant running
)

echo.
echo [2/3] Running RAG/KAG Integration Demo...
echo.
echo Using: services-kb.tree.json (test dataset)
echo This demonstrates the system with a small dataset.
echo.

node scripts/rag-kag-ast-integrator.mjs --kb services-kb.tree.json --auto-recommendations

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Demo failed - check logs above
    pause
    exit /b 1
)

echo.
echo [3/3] Running Self-Prompting Agent Demo...
echo.
echo Task: Analyze codebase patterns
echo.

node scripts/contextual-prompt-engineer.mjs --task "Analyze TypeScript patterns and suggest improvements" --iterations 1

echo.
echo ========================================
echo   ✅ Demo Complete!
echo ========================================
echo.
echo 📊 Results:
echo.
echo 1. RAG Recommendations:
echo    reports\latest\ast-rag-recommendations.md
echo.
echo 2. Agent Analysis:
echo    reports\latest\contextual-prompt-engineering-results.md
echo.
echo 3. Qdrant Collection:
echo    http://localhost:6333/dashboard
echo.
echo ========================================
echo   🚀 Next: Full Project Analysis
echo ========================================
echo.
echo When the full AST analysis completes (~5-10 min),
echo run the full pipeline:
echo.
echo   PHASE72-QUICKSTART.bat
echo.
echo This will process all 2,242 TypeScript files!
echo.
echo ========================================
echo.

pause
