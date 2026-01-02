#!/usr/bin/env pwsh
# Phase 89: Enhanced Codebase Indexer Demo
# Shows comment extraction + LLM summary + auto-tagging + vector search

Write-Host "================================================================================`n" -ForegroundColor Cyan
Write-Host "🚀 Phase 89: Enhanced Codebase Indexer Demo" -ForegroundColor Cyan
Write-Host "   Ripgrep Comments + gemma3:270m Summary + embeddinggemma + Qdrant" -ForegroundColor Cyan
Write-Host "`n================================================================================`n" -ForegroundColor Cyan

# 1. Index a batch of key files
Write-Host "1️⃣ Indexing key codebase files (limit 10)..." -ForegroundColor Yellow
Write-Host ""

python scripts/phase89-enhanced-codebase-indexer.py --dir src/lib/services --limit 10

Write-Host "`n" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan

# 2. Search for specific functionality
Write-Host "2️⃣ Searching for 'Qdrant vector search and indexing'..." -ForegroundColor Yellow
Write-Host ""

python scripts/phase89-enhanced-codebase-indexer.py --search "Qdrant vector search and indexing"

Write-Host "`n" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan

# 3. Search for ACE-related code
Write-Host "3️⃣ Searching for 'ACE error fixing and clustering'..." -ForegroundColor Yellow
Write-Host ""

python scripts/phase89-enhanced-codebase-indexer.py --search "ACE error fixing and clustering"

Write-Host "`n" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan

# 4. Show collection stats
Write-Host "4️⃣ Collection statistics..." -ForegroundColor Yellow
Write-Host ""

$stats = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase89_codebase_index" -Method GET
Write-Host "   Collection: phase89_codebase_index" -ForegroundColor White
Write-Host "   Points: $($stats.result.points_count)" -ForegroundColor White
Write-Host "   Vector size: $($stats.result.config.params.vectors.size)" -ForegroundColor White
Write-Host "   Distance: $($stats.result.config.params.vectors.distance)" -ForegroundColor White

Write-Host "`n" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan
Write-Host "✅ Demo complete! Next steps:" -ForegroundColor Green
Write-Host "   • Run FastMCP server: python scripts/fastmcp-codebase-indexer.py --server" -ForegroundColor White
Write-Host "   • Index full codebase: python scripts/phase89-enhanced-codebase-indexer.py --dir src --limit 100" -ForegroundColor White
Write-Host "   • Search semantically: python scripts/phase89-enhanced-codebase-indexer.py --search 'your query'" -ForegroundColor White
Write-Host "`n" -ForegroundColor Green
