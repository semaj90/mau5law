#!/usr/bin/env pwsh

<#
.SYNOPSIS
Phase 72 & 90 Quick Start - YoRHa Legal AI Platform
.DESCRIPTION
One-command startup for Phase 72 Route Command Center and Phase 90 Schema Sync
#>

Write-Host "🕹️  Phase 72 & 90 - YoRHa Legal AI Quick Start" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor Gray

# ============================================================================
# CONFIGURATION
# ============================================================================

$WORKSPACE_ROOT = "c:\Users\james\Videos\deeds-web-app"
$FRONTEND_DIR = "$WORKSPACE_ROOT\sveltekit-frontend"
$SCRIPTS_DIR = "$WORKSPACE_ROOT\scripts"
$LANGEXTRACT_DIR = "$WORKSPACE_ROOT\langextract"

# Database Configuration
$DB_HOST = "localhost"
$DB_PORT = "5434"
$DB_USER = "postgres"
$DB_PASSWORD = "password"
$DB_NAME = "legal_ai_db"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Service Ports
$FRONTEND_PORT = 5173
$LANGEXTRACT_PORT = 8010
$POSTGRES_PORT = 5434
$REDIS_PORT = 6379

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Wait-Port {
	param([int]$Port, [int]$Timeout = 30)
	$start = Get-Date
	while ((Get-Date) -lt $start.AddSeconds($Timeout)) {
		try {
			$conn = New-Object System.Net.Sockets.TcpClient
			$conn.Connect("127.0.0.1", $Port)
			$conn.Close()
			return $true
		}
		catch {
			Start-Sleep -Milliseconds 500
		}
	}
	return $false
}

function Check-Service {
	param([string]$Name, [int]$Port, [string]$HealthUrl)

	try {
		if ($HealthUrl) {
			$response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 3
			if ($response.StatusCode -eq 200) {
				Write-Host "  ✅ $Name (port $Port) - Healthy" -ForegroundColor Green
				return $true
			}
		}
		else {
			$conn = New-Object System.Net.Sockets.TcpClient
			$conn.Connect("127.0.0.1", $Port)
			$conn.Close()
			Write-Host "  ✅ $Name (port $Port) - Online" -ForegroundColor Green
			return $true
		}
	}
	catch {
		Write-Host "  ❌ $Name (port $Port) - Offline" -ForegroundColor Red
		return $false
	}
}

# ============================================================================
# MAIN WORKFLOW
# ============================================================================

Write-Host ""
Write-Host "📋 PHASE 72: Route Command Center" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
Write-Host "Status:"
$phase72_ready = Check-Service "SvelteKit Frontend" $FRONTEND_PORT "http://localhost:$FRONTEND_PORT/all-routes"
$phase72_api = Check-Service "Phase 72 API" $FRONTEND_PORT "http://localhost:$FRONTEND_PORT/api/phase72/routes"

Write-Host ""
Write-Host "Quick Start:"
Write-Host "  1. cd $FRONTEND_DIR"
Write-Host "  2. npm run dev:full"
Write-Host "  3. Open http://localhost:$FRONTEND_PORT/all-routes in browser"
Write-Host ""

if (-not $phase72_ready) {
	Write-Host "  🚀 Start Command:" -ForegroundColor Yellow
	Write-Host "     powershell -NoProfile -ExecutionPolicy Bypass -Command `"cd '$FRONTEND_DIR'; npm run dev:full`""
	Write-Host ""
}

# ============================================================================

Write-Host ""
Write-Host "📊 PHASE 74: LangExtract Service" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
Write-Host "Status:"
$phase74_health = Check-Service "LangExtract" $LANGEXTRACT_PORT "http://127.0.0.1:$LANGEXTRACT_PORT/health"

Write-Host ""
Write-Host "Quick Start:"
Write-Host "  1. cd $LANGEXTRACT_DIR"
Write-Host "  2. pip install -e ."
Write-Host "  3. uvicorn langextract.main:app --host 127.0.0.1 --port $LANGEXTRACT_PORT --reload"
Write-Host ""

if (-not $phase74_health) {
	Write-Host "  🚀 Start Command:" -ForegroundColor Yellow
	Write-Host "     powershell -NoProfile -ExecutionPolicy Bypass -Command `"cd '$LANGEXTRACT_DIR'; uvicorn langextract.main:app --host 127.0.0.1 --port $LANGEXTRACT_PORT --reload`""
	Write-Host ""
}

# ============================================================================

Write-Host ""
Write-Host "🗄️  PHASE 90: Evidence Schema Sync" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
Write-Host "Status:"
Check-Service "PostgreSQL" $POSTGRES_PORT | Out-Null

Write-Host ""
Write-Host "Quick Start:"
Write-Host "  1. Set DATABASE_URL: `$env:DATABASE_URL='$DATABASE_URL'"
Write-Host "  2. Run Sync: node '$SCRIPTS_DIR\phase90-sync-evidence-schema.mjs'"
Write-Host ""

Write-Host "  🚀 One-Command Sync:" -ForegroundColor Yellow
Write-Host "     `$env:DATABASE_URL='$DATABASE_URL'; node '$SCRIPTS_DIR\phase90-sync-evidence-schema.mjs'"
Write-Host ""

# ============================================================================

Write-Host ""
Write-Host "🔗 API ENDPOINTS" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
Write-Host "Phase 72 Routes API:"
Write-Host "  GET  http://localhost:$FRONTEND_PORT/api/phase72/routes"
Write-Host "       → Returns: { routes: Phase72RouteNode[] }"
Write-Host ""
Write-Host "  POST http://localhost:$FRONTEND_PORT/api/phase72/routes"
Write-Host "       Body: { search?: string, filter?: string }"
Write-Host "       → Returns: { routes: Phase72RouteNode[] }"
Write-Host ""

Write-Host "Phase 74 LangExtract:"
Write-Host "  GET  http://127.0.0.1:$LANGEXTRACT_PORT/health"
Write-Host "  GET  http://127.0.0.1:$LANGEXTRACT_PORT/docs (Swagger UI)"
Write-Host ""

# ============================================================================

Write-Host ""
Write-Host "🧪 TEST COMMANDS" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
Write-Host "Test Phase 72 API:"
Write-Host "  curl http://localhost:$FRONTEND_PORT/api/phase72/routes"
Write-Host ""

Write-Host "Test Phase 74 Health:"
Write-Host "  curl http://127.0.0.1:$LANGEXTRACT_PORT/health"
Write-Host ""

Write-Host "Test Phase 90 Schema:"
Write-Host "  psql -U postgres -d $DB_NAME -c 'SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name=''evidence'';'"
Write-Host ""

# ============================================================================

Write-Host ""
Write-Host "📁 IMPORTANT FILES" -ForegroundColor Cyan
Write-Host "━" * 70

Write-Host ""
@(
	@("src/lib/phase72/routeAdapter.ts", "Type definitions + adapter logic"),
	@("src/routes/api/phase72/routes/+server.ts", "API endpoint with 16 canonical routes"),
	@("src/routes/(app)/all-routes/+page.svelte", "NES Command Center UI"),
	@("scripts/phase90-sync-evidence-schema.mjs", "Idempotent schema sync"),
	@("langextract/langextract/main.py", "FastAPI service with 7 endpoints")
) | ForEach-Object {
	Write-Host "  📄 $_[0]" -ForegroundColor Gray
	Write-Host "     └─ $_[1]"
}

Write-Host ""

# ============================================================================

Write-Host ""
Write-Host "✅ IMPLEMENTATION COMPLETE" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Gray

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1️⃣  Start frontend:    npm run dev:full (in $FRONTEND_DIR)"
Write-Host "  2️⃣  Start LangExtract: uvicorn command (see above)"
Write-Host "  3️⃣  Sync schema:       Phase 90 script with DATABASE_URL"
Write-Host "  4️⃣  Test UI:           http://localhost:$FRONTEND_PORT/all-routes"
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  📖 Full docs: $WORKSPACE_ROOT\PHASE72-90-COMPLETE.md"
Write-Host ""
