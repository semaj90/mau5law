# Phase 79 RAG/KAG System - Quick Deploy

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Phase 79: RAG/KAG System - Deployment & Testing         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the sveltekit-frontend directory" -ForegroundColor Red
    exit 1
}

# Step 1: Check Services
Write-Host "📋 Step 1: Checking Required Services..." -ForegroundColor Yellow

Write-Host "`n  Checking Ollama..." -NoNewline
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 -UseBasicParsing
    Write-Host " ✅" -ForegroundColor Green
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "    Start Ollama: ollama serve" -ForegroundColor Yellow
}

Write-Host "  Checking Qdrant..." -NoNewline
try {
    $qdrantResponse = Invoke-WebRequest -Uri "http://localhost:6333/health" -Method GET -TimeoutSec 3 -UseBasicParsing
    Write-Host " ✅" -ForegroundColor Green
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "    Start Qdrant: docker run -p 6333:6333 qdrant/qdrant" -ForegroundColor Yellow
}

Write-Host "  Checking PostgreSQL..." -NoNewline
try {
    $pgCheck = psql -U legal_admin -d legal_ai_db -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "    Check DATABASE_URL in .env" -ForegroundColor Yellow
}

# Step 2: Install Dependencies
Write-Host "`n📦 Step 2: Installing Dependencies..." -ForegroundColor Yellow
$packages = @("@qdrant/js-client-rest", "minio", "postgres", "glob")
foreach ($pkg in $packages) {
    if (!(npm list $pkg 2>$null)) {
        Write-Host "  Installing $pkg..." -ForegroundColor Cyan
        npm install $pkg --save
    }
}
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Step 3: Initialize Database
Write-Host "`n🗄️ Step 3: Initializing Database..." -ForegroundColor Yellow
Write-Host "  Creating knowledge_base table and Qdrant collections..." -ForegroundColor Cyan

if (Test-Path "scripts/knowledge-base-setup.mjs") {
    node scripts/knowledge-base-setup.mjs
    Write-Host "  ✅ Database initialized" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  knowledge-base-setup.mjs not found - skipping" -ForegroundColor Yellow
}

# Step 4: Index Codebase
Write-Host "`n📚 Step 4: Indexing Codebase..." -ForegroundColor Yellow
Write-Host "  This will index TypeScript/Svelte files in src/" -ForegroundColor Cyan
Write-Host "  Estimated time: 2-5 minutes" -ForegroundColor Cyan

$indexChoice = Read-Host "`n  Do you want to index the codebase now? (y/n)"
if ($indexChoice -eq 'y') {
    npm run index:codebase
    Write-Host "`n  ✅ Codebase indexed" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped - you can run 'npm run index:codebase' later" -ForegroundColor Yellow
}

# Step 5: Index Errors
Write-Host "`n⚠️ Step 5: Indexing Error Patterns..." -ForegroundColor Yellow
Write-Host "  This will index error patterns from PostgreSQL" -ForegroundColor Cyan

$errorsChoice = Read-Host "`n  Do you want to index error patterns now? (y/n)"
if ($errorsChoice -eq 'y') {
    npm run index:errors
    Write-Host "`n  ✅ Errors indexed" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped - you can run 'npm run index:errors' later" -ForegroundColor Yellow
}

# Step 6: Verify Installation
Write-Host "`n✅ Step 6: Verification" -ForegroundColor Yellow
Write-Host "`nChecking Qdrant collections..." -ForegroundColor Cyan

try {
    $codebaseCollection = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_codebase" -Method GET
    $errorsCollection = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_error_analysis" -Method GET

    Write-Host "`n  📊 Collection Statistics:" -ForegroundColor Green
    Write-Host "    • Codebase vectors: $($codebaseCollection.result.points_count)" -ForegroundColor White
    Write-Host "    • Error vectors: $($errorsCollection.result.points_count)" -ForegroundColor White
} catch {
    Write-Host "  ⚠️  Could not fetch collection stats" -ForegroundColor Yellow
}

# Final Instructions
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Phase 79 RAG/KAG System Ready!                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📖 Next Steps:`n" -ForegroundColor Cyan

Write-Host "  1. Start the dev server:" -ForegroundColor White
Write-Host "     npm run dev`n" -ForegroundColor Yellow

Write-Host "  2. Open the dashboard:" -ForegroundColor White
Write-Host "     http://localhost:5175/indexing`n" -ForegroundColor Yellow

Write-Host "  3. Test searches:" -ForegroundColor White
Write-Host "     npm run search:codebase" -ForegroundColor Yellow
Write-Host "     npm run search:errors`n" -ForegroundColor Yellow

Write-Host "  4. View documentation:" -ForegroundColor White
Write-Host "     • RAG_KAG_INDEX.md (Start here!)" -ForegroundColor Yellow
Write-Host "     • RAG_KAG_QUICK_REFERENCE.md (Commands)" -ForegroundColor Yellow
Write-Host "     • CODEBASE_INDEXER_GUIDE.md (Detailed guide)`n" -ForegroundColor Yellow

Write-Host "🔧 Useful Commands:`n" -ForegroundColor Cyan
Write-Host "  npm run indexing:ui       # Open indexing dashboard" -ForegroundColor White
Write-Host "  npm run knowledge:ui      # Open knowledge base UI" -ForegroundColor White
Write-Host "  npm run services:check    # Check service health" -ForegroundColor White
Write-Host "  npm run setup:all         # Full setup (DB + indexing)" -ForegroundColor White
Write-Host "  npm run test:all          # Run all tests`n" -ForegroundColor White

Write-Host "📚 Documentation:`n" -ForegroundColor Cyan
Write-Host "  • Full guides in sveltekit-frontend/" -ForegroundColor White
Write-Host "  • Testing: RAG_KAG_TESTING_GUIDE.md" -ForegroundColor White
Write-Host "  • Architecture: PHASE79_RAG_KAG_COMPLETE.md`n" -ForegroundColor White

Write-Host "✨ Happy coding! Your RAG/KAG system is ready to enhance Phase 79!" -ForegroundColor Green
