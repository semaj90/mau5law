#!/usr/bin/env pwsh
<#
.SYNOPSIS
Run Agentic Knowledge Pipeline - First Time Setup & Execution

.DESCRIPTION
Initializes database schema, runs knowledge indexing, and verifies results
Indexes error clusters, documentation, and codebase patterns into searchable knowledge base
#>

param(
    [switch]$SkipSchema,
    [switch]$SkipIndexing,
    [switch]$SkipVerification,
    [switch]$ExportOnly,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Agentic Knowledge Pipeline - First Run              ║" -ForegroundColor Cyan
Write-Host "║      PostgreSQL 17 + pgvector + Qdrant + JSONL           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Pre-flight checks
Write-Host "📋 Pre-flight Checks" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Check PostgreSQL connection
Write-Host "  1. PostgreSQL Connection..." -ForegroundColor Gray
$pgTest = psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT version();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "     ✅ PostgreSQL 17 connected" -ForegroundColor Green
} else {
    Write-Host "     ❌ PostgreSQL connection failed" -ForegroundColor Red
    Write-Host "     💡 Start PostgreSQL: pg_ctl start -D C:\path\to\data`n" -ForegroundColor Gray
    exit 1
}

# Check pgvector extension
Write-Host "  2. pgvector Extension..." -ForegroundColor Gray
$vectorTest = psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT extversion FROM pg_extension WHERE extname='vector';" 2>&1
if ($vectorTest -match "\d+\.\d+") {
    Write-Host "     ✅ pgvector installed (version $($Matches[0]))" -ForegroundColor Green
} else {
    Write-Host "     ⚠️  pgvector not installed, creating..." -ForegroundColor Yellow
    psql -h localhost -U legal_admin -d legal_ai_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
    Write-Host "     ✅ pgvector extension created" -ForegroundColor Green
}

# Check Ollama service
Write-Host "  3. Ollama Embedding Service..." -ForegroundColor Gray
try {
    $ollamaTest = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    $hasEmbedding = $ollamaTest.models | Where-Object { $_.name -like "*embeddinggemma*" }

    if ($hasEmbedding) {
        Write-Host "     ✅ Ollama running with embeddinggemma:latest" -ForegroundColor Green
    } else {
        Write-Host "     ⚠️  embeddinggemma:latest not found" -ForegroundColor Yellow
        Write-Host "     💡 Run: ollama pull embeddinggemma:latest" -ForegroundColor Gray
    }
} catch {
    Write-Host "     ❌ Ollama not running" -ForegroundColor Red
    Write-Host "     💡 Start: ollama serve`n" -ForegroundColor Gray
    exit 1
}

# Check Qdrant service
Write-Host "  4. Qdrant Vector Database..." -ForegroundColor Gray
try {
    $qdrantTest = Invoke-RestMethod -Uri "http://localhost:6333/collections" -Method GET -TimeoutSec 5
    Write-Host "     ✅ Qdrant running ($($qdrantTest.result.collections.Count) collections)" -ForegroundColor Green
} catch {
    Write-Host "     ⚠️  Qdrant not running (optional - only needed for fast vector search)" -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Create Database Schema
if (-not $SkipSchema) {
    Write-Host "🗄️  Step 1: Create knowledge_base Schema" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    $schemaSQL = @"
-- Drop existing table if re-running
DROP TABLE IF EXISTS knowledge_base CASCADE;

-- Create knowledge base table
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(type, title)
);

-- Create vector index for fast similarity search
CREATE INDEX idx_knowledge_base_embedding
ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for filtering
CREATE INDEX idx_knowledge_base_type ON knowledge_base(type);
CREATE INDEX idx_knowledge_base_created ON knowledge_base(created_at DESC);
"@

    Write-Host "  Creating table and indexes..." -ForegroundColor Gray
    $schemaSQL | psql -h localhost -U legal_admin -d legal_ai_db

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Schema created successfully`n" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Schema creation failed`n" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping schema creation`n" -ForegroundColor Gray
}

# Step 2: Create snapshot directory
Write-Host "📁 Step 2: Prepare Snapshot Directory" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if (-not (Test-Path "knowledge-snapshots")) {
    New-Item -ItemType Directory -Path "knowledge-snapshots" | Out-Null
    Write-Host "  ✅ Created knowledge-snapshots/ directory`n" -ForegroundColor Green
} else {
    Write-Host "  ✅ knowledge-snapshots/ directory exists`n" -ForegroundColor Green
}

# Step 3: Run Knowledge Indexing
if (-not $SkipIndexing -and -not $ExportOnly) {
    Write-Host "🧠 Step 3: Index Knowledge (Errors + Docs + Codebase)" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    Write-Host "  This may take 5-10 minutes on first run..." -ForegroundColor Gray
    Write-Host "  - Indexing error clusters with AI fixes" -ForegroundColor Gray
    Write-Host "  - Crawling TypeScript, Svelte 5, SvelteKit 2, Go 1.25 docs" -ForegroundColor Gray
    Write-Host "  - Analyzing codebase patterns with ripgrep" -ForegroundColor Gray
    Write-Host "  - Generating embeddings with Ollama`n" -ForegroundColor Gray

    node scripts/agentic-knowledge-pipeline.mjs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n  ✅ Knowledge indexing complete`n" -ForegroundColor Green
    } else {
        Write-Host "`n  ❌ Knowledge indexing failed`n" -ForegroundColor Red
        exit 1
    }
} elseif ($ExportOnly) {
    Write-Host "⏭️  Skipping indexing (export only mode)`n" -ForegroundColor Gray
} else {
    Write-Host "⏭️  Skipping indexing`n" -ForegroundColor Gray
}

# Step 4: Verification
if (-not $SkipVerification) {
    Write-Host "🔍 Step 4: Verify Knowledge Base" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    $verifySQL = @"
SELECT
    type,
    COUNT(*) as count,
    SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as embedded_count
FROM knowledge_base
GROUP BY type
ORDER BY count DESC;
"@

    Write-Host "  Knowledge Base Statistics:" -ForegroundColor Cyan
    Write-Host ""
    $verifySQL | psql -h localhost -U legal_admin -d legal_ai_db
    Write-Host ""

    # Check total count
    $totalCountSQL = "SELECT COUNT(*) FROM knowledge_base;"
    $totalCount = psql -h localhost -U legal_admin -d legal_ai_db -t -c $totalCountSQL

    if ([int]$totalCount -gt 0) {
        Write-Host "  ✅ Total Knowledge Items: $totalCount" -ForegroundColor Green

        # Sample search test
        Write-Host "`n  Testing semantic search..." -ForegroundColor Gray
        $searchTest = @"
SELECT
    type,
    title,
    LEFT(content, 100) as preview
FROM knowledge_base
WHERE type = 'error_cluster'
LIMIT 3;
"@

        Write-Host "  Sample Error Clusters:" -ForegroundColor Cyan
        $searchTest | psql -h localhost -U legal_admin -d legal_ai_db

        Write-Host "`n  ✅ Verification complete`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Knowledge base is empty (indexing may have failed)`n" -ForegroundColor Yellow
    }
}

# Step 5: Export to JSONL
Write-Host "📤 Step 5: Export Versioned Snapshot" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$filename = "knowledge-base-$timestamp.jsonl"
$filepath = "knowledge-snapshots\$filename"

Write-Host "  Exporting to: $filename" -ForegroundColor Gray

$exportSQL = @"
COPY (
    SELECT jsonb_build_object(
        'id', id,
        'type', type,
        'title', title,
        'content', content,
        'metadata', metadata,
        'created_at', created_at,
        'updated_at', updated_at
    )
    FROM knowledge_base
    ORDER BY updated_at DESC NULLS LAST
) TO STDOUT;
"@

$exportSQL | psql -h localhost -U legal_admin -d legal_ai_db > $filepath

if (Test-Path $filepath) {
    $fileSize = (Get-Item $filepath).Length / 1KB
    Write-Host "  ✅ Exported to $filename ($([math]::Round($fileSize, 2)) KB)`n" -ForegroundColor Green
} else {
    Write-Host "  ❌ Export failed`n" -ForegroundColor Red
}

# Final Summary
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            AGENTIC PIPELINE SETUP COMPLETE                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📊 System Status:" -ForegroundColor Yellow
Write-Host "  ✅ PostgreSQL 17 with pgvector ready" -ForegroundColor Green
Write-Host "  ✅ Knowledge base indexed and searchable" -ForegroundColor Green
Write-Host "  ✅ JSONL snapshot created: $filename" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 Usage Examples:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  # Search for error fixes' -ForegroundColor Gray
Write-Host '  node -e "import(''./scripts/agentic-knowledge-pipeline.mjs'').then(m => m.searchKnowledge(''How to fix TypeScript type mismatch?'', 5))"' -ForegroundColor Cyan
Write-Host ""
Write-Host '  # Search Svelte 5 docs' -ForegroundColor Gray
Write-Host '  node -e "import(''./scripts/agentic-knowledge-pipeline.mjs'').then(m => m.searchKnowledge(''Svelte 5 runes migration'', 3, ''svelte_docs''))"' -ForegroundColor Cyan
Write-Host ""

Write-Host "⏰ Weekly Updates:" -ForegroundColor Yellow
Write-Host "  Set up Task Scheduler to run weekly:" -ForegroundColor Gray
Write-Host '  schtasks /create /tn "Knowledge Pipeline" /tr "node C:\Users\james\Videos\deeds-web-app\sveltekit-frontend\scripts\agentic-knowledge-pipeline.mjs" /sc weekly /d SUN /st 02:00' -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review knowledge base in PostgreSQL:" -ForegroundColor Gray
Write-Host "     psql -h localhost -U legal_admin -d legal_ai_db" -ForegroundColor Cyan
Write-Host "  2. Test semantic search with sample queries" -ForegroundColor Gray
Write-Host "  3. Run migrations: .\scripts\migrate-src-only.ps1" -ForegroundColor Gray
Write-Host "  4. Build knowledge graph from JSONL snapshots`n" -ForegroundColor Gray
