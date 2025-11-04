Param(
  [string]$DatabaseUrl,
  [ValidateSet('migrate','push')]
  [string]$Mode = 'push',
  [switch]$Verbose
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[migrate] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[migrate] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[migrate] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[migrate] $msg" -ForegroundColor Red }

Write-Info "Starting Drizzle migrations (autopick)"

# 1) Determine DATABASE_URL
$envUrl = $env:DATABASE_URL
$adminUrl = $env:ADMIN_DATABASE_URL

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  if (-not [string]::IsNullOrWhiteSpace($envUrl)) {
    $DatabaseUrl = $envUrl
    Write-Info "Using DATABASE_URL from environment"
  } elseif (-not [string]::IsNullOrWhiteSpace($adminUrl)) {
    $DatabaseUrl = $adminUrl
    Write-Info "Using ADMIN_DATABASE_URL from environment"
  } else {
    # Fallbacks based on repo docs (Docker and localhost)
    $dockerUrl = 'postgresql://legal_admin:123456@postgres:5432/legal_ai_db'
    $localUrl  = 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db'

    # Probe ports quickly
    $dockerOpen = $false
    try { $r = Test-NetConnection -ComputerName 'postgres' -Port 5432 -WarningAction SilentlyContinue; $dockerOpen = $r.TcpTestSucceeded } catch {}
    $localOpen = $false
    try { $r = Test-NetConnection -ComputerName 'localhost' -Port 5434 -WarningAction SilentlyContinue; $localOpen = $r.TcpTestSucceeded } catch {}

    if ($localOpen) {
      $DatabaseUrl = $localUrl
      Write-Info "Detected local Postgres on 5434"
    } elseif ($dockerOpen) {
      $DatabaseUrl = $dockerUrl
      Write-Info "Detected Docker Postgres on service 'postgres:5432'"
    } else {
      # Final fallback to common local 5432
      $DatabaseUrl = 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db'
      Write-Warn "No known ports responded; falling back to localhost:5432"
    }
  }
}

Write-Info "DATABASE_URL => $DatabaseUrl"
$env:DATABASE_URL = $DatabaseUrl

# 2) Ensure working dir exists and drizzle config present
try {
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
  $frontend = Join-Path $repoRoot.Path 'sveltekit-frontend'
  $frontend = (Resolve-Path $frontend).Path
} catch {
  Write-Err "Failed to resolve sveltekit-frontend path from script directory: $($_.Exception.Message)"
  exit 1
}
if (-not (Test-Path (Join-Path $frontend 'drizzle.config.ts'))) {
  Write-Err "drizzle.config.ts not found in sveltekit-frontend. Aborting."
  exit 1
}

# 3) Install drizzle-kit locally if missing (best effort)
Push-Location $frontend
try {
  $nodeModules = Join-Path $frontend 'node_modules'
  $binDir = Join-Path $nodeModules '.bin'
  $drizzleCmd = Join-Path $binDir 'drizzle-kit.cmd'
  $hasDrizzle = Test-Path $drizzleCmd
  if (-not $hasDrizzle) {
    Write-Info "Installing drizzle-kit locally (dev dep)"
    npm i -D drizzle-kit | Out-Host
  }
} catch { Write-Warn "Failed to ensure drizzle-kit installed: $($_.Exception.Message)" }

# helper to run drizzle
function Invoke-Drizzle([string]$cmd, [string[]]$args) {
  if ($hasDrizzle) {
    Write-Info "drizzle-kit.cmd $cmd ${args -join ' '}"
    & $drizzleCmd $cmd @args | Out-Host
  } else {
    Write-Info "npx drizzle-kit $cmd ${args -join ' '}"
    npx drizzle-kit $cmd @args | Out-Host
  }
}

# 4) Run action
try {
  $env:FORCE_COLOR = '1'
  if ($Mode -eq 'migrate') {
    Invoke-Drizzle 'generate' @()
    if ($LASTEXITCODE -ne 0) { throw "drizzle-kit generate exited with code $LASTEXITCODE" }
    Invoke-Drizzle 'migrate' @()
  } else {
    Invoke-Drizzle 'push' @()
  }
  if ($LASTEXITCODE -ne 0) {
    throw "drizzle-kit $Mode exited with code $LASTEXITCODE"
  }
  Write-Ok "Migrations completed successfully"
} catch {
  $msg = $_.Exception.Message
  Write-Err "Migration failed: $msg"

  if ($msg -match 'permission denied|must be owner|42501') {
    Write-Warn "Ownership/permission error detected. Retrying with ADMIN_DATABASE_URL if available..."
    if (-not [string]::IsNullOrWhiteSpace($adminUrl)) {
      $env:DATABASE_URL = $adminUrl
      Write-Info "Retry: npx drizzle-kit push (ADMIN_DATABASE_URL)"
      npx drizzle-kit push | Out-Host
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "Migrations succeeded on retry with admin URL"
        Pop-Location
        exit 0
      }
    }
  }
  Pop-Location
  exit 1
}
Pop-Location