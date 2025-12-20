@echo off
REM Phase 72 - Full Agentic Healing Pipeline
REM Orchestrates error generation, AST analysis, RAG integration, and Multi-AI healing

echo.
echo ============================================================
echo   Phase 72 - Agentic Healing Pipeline
echo ============================================================
echo.

REM 1. Generate Errors
echo [1/4] Generating errors (TSC + Svelte)...
node scripts/generate-errors-jsonl.mjs --tool tsc
if %errorlevel% neq 0 (
    echo [!] Error generation failed
    pause
    exit /b 1
)

REM 2. AST Analysis with Error Mapping
echo.
echo [2/4] Running AST Analysis (including Svelte files)...
node scripts/ast-error-analyzer.mjs --graph project-knowledge-base.json --errors reports/latest/errors.jsonl
if %errorlevel% neq 0 (
    echo [!] AST analysis failed
    pause
    exit /b 1
)

REM 3. RAG/KAG Integration
echo.
echo [3/4] Integrating with RAG/KAG (Qdrant)...
node scripts/rag-kag-ast-integrator.mjs --auto-recommendations
if %errorlevel% neq 0 (
    echo [!] RAG integration failed
    pause
    exit /b 1
)

REM 4. Multi-AI Meta-Analysis
echo.
echo [4/4] Running Multi-AI Meta-Analysis...
node scripts/multi-ai-meta-analyzer.mjs --compare-all
if %errorlevel% neq 0 (
    echo [!] Meta-analysis failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Agentic Healing Pipeline Complete!
echo ============================================================
echo.
echo   Outputs:
echo   - Errors: reports/latest/errors.jsonl
echo   - Knowledge Base: reports/latest/project-knowledge-base.tree.json
echo   - Recommendations: reports/latest/ast-rag-recommendations.md
echo   - Meta-Analysis: reports/latest/multi-ai-meta-analysis.md
echo.
echo   Next: Review the meta-analysis and apply fixes.
echo.
pause
