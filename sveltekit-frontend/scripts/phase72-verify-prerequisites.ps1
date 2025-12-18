#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Phase 72 KAG Prerequisites Verification & Setup

.DESCRIPTION
    Verifies and sets up all requirements for Phase 72 KAG integration:
    1. Redis connection (port 4005)
    2. Node.js ioredis package
    3. SIMD JSON parser (optional)
    4. Ollama (optional, for future RAG)

    Creates a comprehensive verification report.

.EXAMPLE
    .\phase72-verify-prerequisites.ps1
    Run all verification checks

.EXAMPLE
    .\phase72-verify-prerequisites.ps1 -AutoFix
    Run checks and attempt to fix issues automatically
#>

param(
    [switch]$AutoFix,
    [switch]$SkipOptional
)

$ErrorActionPreference = "Continue"

# ==================== Colors ====================

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "🔍 $Message" -ForegroundColor Cyan
    Write-Host ("─" * 70) -ForegroundColor DarkGray
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "  ❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ️  $Message" -ForegroundColor Gray
}

# ==================== Verification Results ====================

$results = @{
    redis = @{ ok = $false; message = "" }
    ioredis = @{ ok = $false; message = "" }
    simd = @{ ok = $false; message = ""; optional = $true }
    ollama = @{ ok = $false; message = ""; optional = $true }
    scripts = @{ ok = $false; message = "" }
}

# ==================== Header ====================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Phase 72 KAG Prerequisites Verification                     ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ==================== Check 1: Redis Connection ====================

Write-Step "Checking Redis Connection (port 4005)"

try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("127.0.0.1", 4005)
    $tcpClient.Close()

    Write-Success "Redis is running on 127.0.0.1:4005"
    $results.redis.ok = $true
    $results.redis.message = "Connected successfully"
} catch {
    Write-Failure "Redis is NOT running on 127.0.0.1:4005"
    $results.redis.ok = $false
    $results.redis.message = $_.Exception.Message

    if ($AutoFix) {
        Write-Info "Attempting to start Redis..."
        $redisPath = "..\..\redis-latest\redis-server.exe"
        if (Test-Path $redisPath) {
            Start-Process -NoNewWindow -FilePath $redisPath -ArgumentList "--port 4005"
            Start-Sleep -Seconds 2

            # Recheck
            try {
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $tcpClient.Connect("127.0.0.1", 4005)
                $tcpClient.Close()
                Write-Success "Redis started successfully"
                $results.redis.ok = $true
            } catch {
                Write-Failure "Failed to start Redis automatically"
            }
        } else {
            Write-Warning "Redis executable not found at $redisPath"
            Write-Info "Please start Redis manually:"
            Write-Host "  cd c:\Users\james\Videos\deeds-web-app" -ForegroundColor Yellow
            Write-Host "  .\redis-latest\redis-server.exe --port 4005" -ForegroundColor Yellow
        }
    } else {
        Write-Info "To start Redis, run:"
        Write-Host "  cd c:\Users\james\Videos\deeds-web-app" -ForegroundColor Yellow
        Write-Host "  .\redis-latest\redis-server.exe --port 4005" -ForegroundColor Yellow
    }
}

# ==================== Check 2: ioredis Package ====================

Write-Step "Checking ioredis Package"

$packageJsonPath = ".\package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $hasIoredis = $null -ne $packageJson.dependencies.ioredis -or $null -ne $packageJson.devDependencies.ioredis

    if ($hasIoredis) {
        # Check if installed
        $nodeModulesPath = ".\node_modules\ioredis"
        if (Test-Path $nodeModulesPath) {
            Write-Success "ioredis is installed"
            $results.ioredis.ok = $true
            $results.ioredis.message = "Package found in node_modules"
        } else {
            Write-Warning "ioredis is in package.json but not installed"
            $results.ioredis.ok = $false
            $results.ioredis.message = "Not installed (need npm install)"

            if ($AutoFix) {
                Write-Info "Installing ioredis..."
                npm install ioredis
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "ioredis installed successfully"
                    $results.ioredis.ok = $true
                } else {
                    Write-Failure "Failed to install ioredis"
                }
            } else {
                Write-Info "To install ioredis, run:"
                Write-Host "  npm install ioredis" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Failure "ioredis not in package.json"
        $results.ioredis.ok = $false
        $results.ioredis.message = "Not in dependencies"

        if ($AutoFix) {
            Write-Info "Adding ioredis to package.json..."
            npm install ioredis --save
            if ($LASTEXITCODE -eq 0) {
                Write-Success "ioredis added and installed"
                $results.ioredis.ok = $true
            } else {
                Write-Failure "Failed to add ioredis"
            }
        } else {
            Write-Info "To add ioredis, run:"
            Write-Host "  npm install ioredis --save" -ForegroundColor Yellow
        }
    }
} else {
    Write-Failure "package.json not found"
    $results.ioredis.ok = $false
    $results.ioredis.message = "package.json not found"
}

# ==================== Check 3: KAG Scripts ====================

Write-Step "Checking KAG Scripts"

$scriptsToCheck = @(
    ".\scripts\kag-fix-store.mjs",
    ".\scripts\integrate-kag-into-fixer.mjs",
    ".\scripts\kag-rag-dashboard.mjs",
    ".\scripts\phase72-kag-quickstart.ps1"
)

$allScriptsExist = $true
foreach ($script in $scriptsToCheck) {
    if (Test-Path $script) {
        Write-Success "$(Split-Path $script -Leaf) exists"
    } else {
        Write-Failure "$(Split-Path $script -Leaf) NOT FOUND"
        $allScriptsExist = $false
    }
}

if ($allScriptsExist) {
    $results.scripts.ok = $true
    $results.scripts.message = "All KAG scripts found"
} else {
    $results.scripts.ok = $false
    $results.scripts.message = "Some scripts missing"
}

# ==================== Check 4: SIMD JSON Parser (Optional) ====================

if (-not $SkipOptional) {
    Write-Step "Checking SIMD JSON Parser (Optional)"

    $simdPath = "..\..\go-microservice\json-ultra-simd-parser.exe"
    if (Test-Path $simdPath) {
        Write-Success "SIMD JSON parser binary found"
        $results.simd.ok = $true
        $results.simd.message = "Binary exists"

        # Check if running
        $simdRunning = Get-Process -Name "json-ultra-simd-parser" -ErrorAction SilentlyContinue
        if ($simdRunning) {
            Write-Info "SIMD parser is already running"
        } else {
            Write-Info "SIMD parser exists but not running (optional for Phase 72)"
            Write-Info "To start: cd go-microservice; .\json-ultra-simd-parser.exe --port 8096"
        }
    } else {
        Write-Warning "SIMD JSON parser not found (optional - not required for KAG)"
        $results.simd.ok = $false
        $results.simd.message = "Binary not found (optional)"
    }
}

# ==================== Check 5: Ollama (Optional) ====================

if (-not $SkipOptional) {
    Write-Step "Checking Ollama (Optional, for future RAG)"

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Success "Ollama is running on http://localhost:11434"
        $results.ollama.ok = $true
        $results.ollama.message = "Service running"
    } catch {
        Write-Warning "Ollama is NOT running (optional - not required for KAG)"
        $results.ollama.ok = $false
        $results.ollama.message = "Service not running (optional)"
        Write-Info "To start: ollama serve"
    }
}

# ==================== Summary Report ====================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Verification Summary                                         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$requiredChecks = @("redis", "ioredis", "scripts")
$allRequiredOk = $true

foreach ($check in $requiredChecks) {
    $result = $results[$check]
    $status = if ($result.ok) { "✅ PASS" } else { "❌ FAIL" }
    $statusColor = if ($result.ok) { "Green" } else { "Red" }

    Write-Host "  $check" -NoNewline
    Write-Host (" " * (20 - $check.Length)) -NoNewline
    Write-Host $status -ForegroundColor $statusColor -NoNewline
    Write-Host "  $($result.message)" -ForegroundColor Gray

    if (-not $result.ok) {
        $allRequiredOk = $false
    }
}

# Optional checks
if (-not $SkipOptional) {
    Write-Host ""
    Write-Host "  Optional Components:" -ForegroundColor Gray

    foreach ($check in @("simd", "ollama")) {
        $result = $results[$check]
        $status = if ($result.ok) { "✅ AVAILABLE" } else { "⚠️  OPTIONAL" }
        $statusColor = if ($result.ok) { "Green" } else { "Yellow" }

        Write-Host "  $check" -NoNewline
        Write-Host (" " * (20 - $check.Length)) -NoNewline
        Write-Host $status -ForegroundColor $statusColor -NoNewline
        Write-Host "  $($result.message)" -ForegroundColor Gray
    }
}

Write-Host ""

# ==================== Next Steps ====================

if ($allRequiredOk) {
    Write-Host "🎉 All required prerequisites verified!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Integrate KAG:" -ForegroundColor White
    Write-Host "     node scripts/integrate-kag-into-fixer.mjs --apply" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Test KAG:" -ForegroundColor White
    Write-Host "     node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 50" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  3. Monitor learning:" -ForegroundColor White
    Write-Host "     node scripts/kag-rag-dashboard.mjs --watch" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "⚠️  Some required prerequisites are missing." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To fix automatically, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\phase72-verify-prerequisites.ps1 -AutoFix" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ==================== Save Report ====================

$reportPath = "reports\phase72-prerequisites-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"

if (!(Test-Path "reports")) {
    New-Item -ItemType Directory -Path "reports" -Force | Out-Null
}

$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "📝 Verification report saved: $reportPath" -ForegroundColor Gray
Write-Host ""
