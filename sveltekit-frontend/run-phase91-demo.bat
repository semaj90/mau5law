@echo off
REM Phase 91: GPU Tensor Clustering Demo - Complete ACE Pipeline

SET PYTHON=C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║        Phase 91: GPU Tensor Clustering - Semantic Stratification ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🎯 Demo Workflow:
echo    1️⃣  Check Qdrant collection status
echo    2️⃣  Run GPU clustering (8 context domains)
echo    3️⃣  Test cluster-aware semantic search
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Step 1: Check status
echo 📊 Step 1: Checking Qdrant collection...
echo.
"%PYTHON%" -c "from qdrant_client import QdrantClient; c = QdrantClient(host='localhost', port=6333); info = c.get_collection('phase89_cache_index'); print(f'   Points: {info.points_count}'); print(f'   Status: {info.status}')"
echo.
pause

REM Step 2: Run clustering
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo ⚡ Step 2: Running GPU K-Means clustering...
echo.
echo    Model: embeddinggemma:latest (768-dim)
echo    GPU: RTX 3060 Ti (FP16 acceleration)
echo    Clusters: 8 (Code, Docs, Configs, React, TypeScript, etc.)
echo.
"%PYTHON%" scripts\phase91-tensor-clustering.py --clusters 8 --batch-size 16 --max-cards 100
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Clustering failed
    pause
    exit /b 1
)
echo.
pause

REM Step 3: Test semantic search
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 🔍 Step 3: Testing cluster-aware semantic search...
echo.
echo Query 1: "Svelte 5 runes migration patterns"
echo.
call run-ace-search.bat "Svelte 5 runes migration patterns" --limit 3
echo.
pause

echo.
echo Query 2: "TypeScript strict mode errors"
echo.
call run-ace-search.bat "TypeScript strict mode errors" --limit 3
echo.
pause

echo.
echo Query 3: "Docker container configuration"
echo.
call run-ace-search.bat "Docker container configuration" --limit 3
echo.

echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo ✅ Phase 91 Demo Complete!
echo.
echo 📊 Next Steps:
echo    - Check reports/phase91_cluster_stats.json for cluster analysis
echo    - Run full clustering on all 36k+ cards: phase91-tensor-clustering.py
echo    - Integrate cluster routing in ACE search pipeline
echo.
pause
