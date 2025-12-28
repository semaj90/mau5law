#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix Phase 87 RAG Middleware Configuration

.DESCRIPTION
    Updates Phase 87 container to use correct Phase 76 service ports and credentials

.EXAMPLE
    .\fix-phase87-config.ps1
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host "`n🔧 Phase 87 Configuration Fix" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Phase 87 is running
$phase87Running = docker ps --filter "name=phase87-rag-middleware" --format "{{.Names}}" 2>$null

if ($phase87Running) {
    Write-Host "✅ Phase 87 container found: $phase87Running" -ForegroundColor Green

    Write-Host "`n📋 Current Configuration:" -ForegroundColor Yellow
    docker exec phase87-rag-middleware env | Select-String "DATABASE_URL|COUCHDB_URL|QDRANT_URL|REDIS_URL"

    Write-Host "`n⚠️  Issues Detected:" -ForegroundColor Yellow
    Write-Host "   1. DATABASE_URL uses port 5434 (should be 5432)" -ForegroundColor Red
    Write-Host "   2. COUCHDB_URL uses credentials admin:legal_ai_pass (should be admin:password)" -ForegroundColor Red
    Write-Host "   3. DATABASE_URL uses database 'legal' (should be 'legal_ai_db')" -ForegroundColor Red

    Write-Host "`n🔄 Recommended Fix:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Update docker-compose.middleware.yml environment section:" -ForegroundColor White
    Write-Host ""
    Write-Host @"
services:
  rag-kag-middleware:
    environment:
      # Fixed PostgreSQL connection
      DATABASE_URL: postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db

      # Fixed CouchDB credentials
      COUCHDB_URL: http://admin:password@host.docker.internal:5984

      # These are correct ✅
      QDRANT_URL: http://host.docker.internal:6333
      REDIS_URL: redis://host.docker.internal:6379
      OLLAMA_URL: http://host.docker.internal:11434
      EMBEDDING_MODEL: embeddinggemma:latest
      LLM_MODEL: gemma3-legal:latest
"@ -ForegroundColor Green

    Write-Host "`n🛠️  Apply Fix?" -ForegroundColor Yellow
    $response = Read-Host "Apply fix automatically? (y/N)"

    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "`n📝 Updating docker-compose.middleware.yml..." -ForegroundColor Cyan

        $composeFile = "docker-compose.middleware.yml"
        if (Test-Path $composeFile) {
            # Backup original
            Copy-Item $composeFile "$composeFile.backup" -Force
            Write-Host "   ✅ Backup created: $composeFile.backup" -ForegroundColor Green

            # Read and update
            $content = Get-Content $composeFile -Raw

            # Fix DATABASE_URL
            $content = $content -replace 'postgresql://user:pass@host\.docker\.internal:5434/legal', 'postgresql://legal_admin:123456@host.docker.internal:5432/legal_ai_db'

            # Fix COUCHDB_URL
            $content = $content -replace 'http://admin:legal_ai_pass@host\.docker\.internal:5984', 'http://admin:password@host.docker.internal:5984'

            # Write updated content
            Set-Content $composeFile $content -NoNewline
            Write-Host "   ✅ Configuration updated" -ForegroundColor Green

            # Restart container
            Write-Host "`n🔄 Restarting Phase 87 container..." -ForegroundColor Cyan
            docker-compose -f $composeFile down
            Start-Sleep -Seconds 2
            docker-compose -f $composeFile up -d

            Write-Host "`n⏳ Waiting for container to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5

            # Verify
            Write-Host "`n✅ New Configuration:" -ForegroundColor Green
            docker exec phase87-rag-middleware env | Select-String "DATABASE_URL|COUCHDB_URL|QDRANT_URL|REDIS_URL"

            # Test connectivity
            Write-Host "`n🧪 Testing Service Connectivity..." -ForegroundColor Cyan

            # PostgreSQL
            try {
                $pgTest = docker exec phase87-rag-middleware sh -c "nc -zv host.docker.internal 5432 2>&1"
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ PostgreSQL (5432): Connected" -ForegroundColor Green
                } else {
                    Write-Host "   ❌ PostgreSQL (5432): Failed" -ForegroundColor Red
                }
            } catch {
                Write-Host "   ⚠️  PostgreSQL: Unable to test (nc not installed)" -ForegroundColor Yellow
            }

            # CouchDB
            try {
                $couchTest = Invoke-RestMethod -Uri "http://localhost:5984/_all_dbs" -Credential ([PSCredential]::new('admin', (ConvertTo-SecureString 'password' -AsPlainText -Force))) -ErrorAction Stop
                Write-Host "   ✅ CouchDB (5984): Connected ($($couchTest.Count) databases)" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ CouchDB (5984): Failed - $_" -ForegroundColor Red
            }

            # Qdrant
            try {
                $qdrantTest = Invoke-RestMethod -Uri "http://localhost:6333/collections" -ErrorAction Stop
                Write-Host "   ✅ Qdrant (6333): Connected ($($qdrantTest.result.collections.Count) collections)" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Qdrant (6333): Failed - $_" -ForegroundColor Red
            }

            # Redis
            try {
                $redisTest = docker exec phase87-rag-middleware sh -c "nc -zv host.docker.internal 6379 2>&1"
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ Redis (6379): Connected" -ForegroundColor Green
                } else {
                    Write-Host "   ❌ Redis (6379): Failed" -ForegroundColor Red
                }
            } catch {
                Write-Host "   ⚠️  Redis: Unable to test (nc not installed)" -ForegroundColor Yellow
            }

            # Ollama
            try {
                $ollamaTest = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -ErrorAction Stop
                Write-Host "   ✅ Ollama (11434): Connected (version $($ollamaTest.version))" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Ollama (11434): Failed - $_" -ForegroundColor Red
            }

            Write-Host "`n🎉 Phase 87 configuration fix complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "  1. Test RAG middleware: Invoke-RestMethod -Uri 'http://localhost:8765/health'" -ForegroundColor White
            Write-Host "  2. Check logs: docker logs phase87-rag-middleware --tail 50" -ForegroundColor White
            Write-Host "  3. View architecture: Get-Content DOCKER_ARCHITECTURE_VISUAL.txt" -ForegroundColor White

        } else {
            Write-Host "   ❌ docker-compose.middleware.yml not found in current directory" -ForegroundColor Red
            Write-Host "   💡 Run this script from: C:\Users\james\Videos\deeds-web-app" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n⏭️  Fix skipped. Manual update required." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Edit docker-compose.middleware.yml manually with the configuration above." -ForegroundColor White
    }

} else {
    Write-Host "❌ Phase 87 container not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Start Phase 87:" -ForegroundColor Cyan
    Write-Host "  docker-compose -f docker-compose.middleware.yml up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
}

Write-Host ""
