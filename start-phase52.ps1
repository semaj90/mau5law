<#
 YoRHa Legal AI – Phase 52 Auto Launcher (Dynamic Env)
#>

$ErrorActionPreference = "Stop"
$root       = "C:\Users\james\Videos\deeds-web-app"
$envFile    = Join-Path $root ".env.phase52.local"
$goServer   = Join-Path $root "go-microservice\simd-http-server.exe"
$svelteRoot = Join-Path $root "sveltekit-frontend"
$nodeScript = Join-Path $svelteRoot "scripts\phase52-ast-repair.mjs"

# --- Load local env vars dynamically -----------------------------------
if (Test-Path $envFile) {
    Write-Host "🔧 Loading environment from $envFile"
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#') { return }              # skip comments
        if ($_ -match '^\s*$') { return }              # skip blanks
        $pair = $_ -split '=',2
        if ($pair.Length -eq 2) {
            $key = $pair[0].Trim()
            $val = $pair[1].Trim()
            [Environment]::SetEnvironmentVariable($key, $val)
        }
    }
} else {
    Write-Warning "No .env.phase52.local found; using defaults."
    $env:REDIS_URL = "redis://127.0.0.1:6379"
    $env:REDIS_PASSWORD = "redis"
}

# --- Optional: dynamically detect Redis container IP -------------------
try {
    $redisContainer = (docker ps --filter "name=legal-ai-redis" --format "{{.ID}}")
    if ($redisContainer) {
        $redisIP = (docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $redisContainer)
        if ($redisIP) {
            Write-Host "🔍 Detected Redis container at $redisIP"
            $env:REDIS_URL = "redis://$redisIP:6379"
        } else {
            Write-Host "⚠️  Could not resolve Redis IP; using $env:REDIS_URL"
        }
    }
} catch {
    Write-Warning "Docker not available; using $env:REDIS_URL"
}

# --- Launch Go HTTP fallback server -----------------------------------
Write-Host "🚀 Starting SIMD HTTP fallback server..."
$serverProc = Start-Process -FilePath $goServer -WindowStyle Hidden -PassThru

# --- Wait until the parser is reachable -------------------------------
Write-Host "⏳ Waiting for $env:SIMD_HTTP_URL ..."
$timeout = 30
for ($i = 0; $i -lt $timeout; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "$($env:SIMD_HTTP_URL)/version" -TimeoutSec 1 -ErrorAction Stop
        if ($resp.version) { Write-Host "✅ SIMD server online."; break }
    } catch { Start-Sleep -Seconds 1 }
    if ($i -eq ($timeout - 1)) {
        Write-Error "Server did not start within $timeout s."
        Stop-Process -Id $serverProc.Id -Force; exit 1
    }
}

# --- Run Node Phase 52 pipeline ---------------------------------------
Write-Host "🧩 Launching Phase 52 AST Repair..."
Push-Location $svelteRoot
try {
    node $nodeScript
} finally {
    Pop-Location
    if ($serverProc -and !$serverProc.HasExited) {
        Write-Host "🧹 Stopping fallback server..."
        Stop-Process -Id $serverProc.Id -Force
    }
}
Write-Host "✅ Phase 52 Auto completed."

# --- Run verify-ffi-cuda benchmark ------------------------------------
Write-Host "📊 Running Verify-FFI-CUDA post-benchmark..."
$verifyScript = Join-Path $root "sveltekit-frontend\scripts\verify-ffi-cuda.ps1"
if (Test-Path $verifyScript) {
    & pwsh -ExecutionPolicy Bypass -File $verifyScript
} else {
    Write-Warning "verify-ffi-cuda.ps1 not found; skipping telemetry."
}