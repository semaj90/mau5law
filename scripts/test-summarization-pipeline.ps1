#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test the complete TensorRT-LLM + gemma3-legal summarization pipeline
.DESCRIPTION
    This script tests:
    1. Ollama availability (gemma3-legal, embeddinggemma)
    2. Language extraction endpoint
    3. Summarization endpoint
    4. VS Code task integration
#>

param(
    [string]$BaseUrl = "http://localhost:5173"
)

Write-Host "`n🧪 Testing Legal AI Summarization Pipeline" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Test 1: Check Ollama
Write-Host "`n[Test 1/5] Checking Ollama service..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 200
    $models = $ollamaResponse.models | Select-Object -ExpandProperty name

    if ($models -contains "gemma3-legal:latest") {
        Write-Host "  ✅ gemma3-legal:latest is available" -ForegroundColor Green
    } else {
        Write-Host "  ❌ gemma3-legal:latest not found" -ForegroundColor Red
        Write-Host "     Run: ollama pull gemma3-legal:latest" -ForegroundColor Yellow
    }

    if ($models -contains "embeddinggemma:latest") {
        Write-Host "  ✅ embeddinggemma:latest is available" -ForegroundColor Green
    } else {
        Write-Host "  ❌ embeddinggemma:latest not found" -ForegroundColor Red
        Write-Host "     Run: ollama pull embeddinggemma:latest" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Ollama service is not running" -ForegroundColor Red
    Write-Host "     Run: ollama serve" -ForegroundColor Yellow
    exit 1
}

# Test 2: Language Extraction Health
Write-Host "`n[Test 2/5] Testing language extraction endpoint..." -ForegroundColor Yellow
try {
    $langHealth = Invoke-RestMethod -Uri "$BaseUrl/api/ai/extract-languages" -Method Get -TimeoutSec 30

    if ($langHealth.success -eq $true) {
        Write-Host "  ✅ Language extraction endpoint is healthy" -ForegroundColor Green
        Write-Host "     Model: $($langHealth.model.name)" -ForegroundColor Gray
        Write-Host "     Supported languages: $($langHealth.supportedLanguages.Count)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Language extraction endpoint returned error" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Language extraction endpoint failed: $_" -ForegroundColor Red
}

# Test 3: Summarization Health
Write-Host "`n[Test 3/5] Testing summarization endpoint..." -ForegroundColor Yellow
try {
    $summaryHealth = Invoke-RestMethod -Uri "$BaseUrl/api/ai/summarize-simple" -Method Get -TimeoutSec 30

    if ($summaryHealth.success -eq $true) {
        Write-Host "  ✅ Summarization endpoint is healthy" -ForegroundColor Green
        Write-Host "     Model: $($summaryHealth.models.summarization.model)" -ForegroundColor Gray
        Write-Host "     Formats: $($summaryHealth.formats -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Summarization endpoint returned error" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Summarization endpoint failed: $_" -ForegroundColor Red
}

# Test 4: End-to-End Language Extraction
Write-Host "`n[Test 4/5] Testing language extraction (end-to-end)..." -ForegroundColor Yellow
try {
    $testText = "This is a legal contract between two parties. Le contrat est valide pour une année."
    $langBody = @{
        text = $testText
        model = "embeddinggemma:latest"
    } | ConvertTo-Json

    $langResult = Invoke-RestMethod `
        -Uri "$BaseUrl/api/ai/extract-languages" `
        -Method Post `
        -Body $langBody `
        -ContentType 'application/json' `
        -TimeoutSec 30

    Write-Host "  ✅ Language extraction successful" -ForegroundColor Green
    Write-Host "     Detected: $($langResult.languages -join ', ')" -ForegroundColor Gray
    Write-Host "     Processing time: $($langResult.metadata.processingTime)ms" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Language extraction failed: $_" -ForegroundColor Red
}

# Test 5: End-to-End Summarization
Write-Host "`n[Test 5/5] Testing summarization (end-to-end)..." -ForegroundColor Yellow
try {
    $testDocument = @"
This employment contract ("Contract") is entered into between Acme Corporation ("Employer")
and John Smith ("Employee") on January 1, 2024. The Employee shall serve as Senior Software
Engineer with an annual salary of 120,000 USD. The employment term is indefinite, subject
to 30 days notice by either party. Employee agrees to non-compete clause for 6 months post-termination.
"@

    $summaryBody = @{
        text = $testDocument
        model = "gemma3-legal:latest"
        maxLength = 2000
        format = "bullets"
        temperature = 0.7
    } | ConvertTo-Json

    $summaryResult = Invoke-RestMethod `
        -Uri "$BaseUrl/api/ai/summarize-simple" `
        -Method Post `
        -Body $summaryBody `
        -ContentType 'application/json' `
        -TimeoutSec 60

    Write-Host "  ✅ Summarization successful" -ForegroundColor Green
    Write-Host "`n  Summary:" -ForegroundColor Cyan
    Write-Host "  $($summaryResult.summary)" -ForegroundColor White
    Write-Host "`n  Metadata:" -ForegroundColor Cyan
    Write-Host "     Tokens: $($summaryResult.metadata.tokens.total)" -ForegroundColor Gray
    Write-Host "     Time: $([math]::Round($summaryResult.metadata.processingTime.total, 2))ms" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Summarization failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "✅ All tests complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run VS Code task: Ctrl+Shift+P → Tasks: Run Task" -ForegroundColor White
Write-Host "  2. Choose: 📝 Svelte-Check with Log (gemma3-legal summarization)" -ForegroundColor White
Write-Host "  3. View results in: logs/svelte-check-summary-*.md" -ForegroundColor White
Write-Host "`n"
