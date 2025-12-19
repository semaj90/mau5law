@echo off
REM Phase 72 - RAG/KAG Self-Prompting Quickstart
REM Complete LangChain-style contextual engineering pipeline

echo.
echo ========================================
echo   Phase 72: RAG/KAG Self-Prompting
echo ========================================
echo.

cd /d "%~dp0"

REM Check prerequisites
echo [1/6] Checking prerequisites...
echo.

if not exist "reports\latest\project-knowledge-base.tree.json" (
    echo ❌ AST knowledge base not found!
    echo.
    echo Run this first:
    echo   node scripts/ast-error-analyzer.mjs --graph project-knowledge-base.json
    echo.
    pause
    exit /b 1
)

echo ✅ AST knowledge base found
echo.

REM Check Ollama
echo [2/6] Checking Ollama service...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Ollama not running - starting...
    start "" ollama serve
    timeout /t 5 >nul
) else (
    echo ✅ Ollama running
)
echo.

REM Check Qdrant
echo [3/6] Checking Qdrant service...
curl -s http://localhost:6333/collections >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Qdrant not running!
    echo.
    echo Start Qdrant first:
    echo   docker run -p 6333:6333 qdrant/qdrant
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Qdrant running
)
echo.

REM Load knowledge base into RAG/KAG
echo [4/6] Loading knowledge base into Qdrant...
echo.
node scripts/rag-kag-ast-integrator.mjs --kb project-knowledge-base.tree.json --auto-recommendations

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ RAG/KAG integration failed!
    pause
    exit /b 1
)

echo.
echo ✅ RAG/KAG integration complete!
echo.

REM Run self-prompting agent
echo [5/6] Running self-prompting agent...
echo.
echo Task: Prioritize fixing high-error files
echo Iterations: 2
echo.

node --expose-gc --max-old-space-size=8192 scripts/contextual-prompt-engineer.mjs --task "Prioritize fixing files with >100 errors" --iterations 2

if %ERRORLEVEL% neq 0 (
    echo.
    echo ⚠️  Self-prompting agent encountered issues
)

echo.
echo [6/6] Complete!
echo.
echo ========================================
echo   📊 Results Available:
echo ========================================
echo.
echo 1. AST Recommendations:
echo    reports\latest\ast-rag-recommendations.md
echo.
echo 2. Self-Prompting Results:
echo    reports\latest\contextual-prompt-engineering-results.md
echo.
echo 3. Qdrant Knowledge Base:
echo    http://localhost:6333/collections/phase72_ast_knowledge_base
echo.
echo ========================================
echo   🎯 Next Steps:
echo ========================================
echo.
echo Run custom agent tasks:
echo   node scripts\contextual-prompt-engineer.mjs --task "Your task" --iterations 3
echo.
echo Query knowledge base:
echo   curl http://localhost:6333/collections/phase72_ast_knowledge_base/points/scroll
echo.
echo ========================================
echo.

pause
