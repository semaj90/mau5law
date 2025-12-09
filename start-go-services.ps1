#!/usr/bin/env pwsh

<#
.SYNOPSIS
Start all Go services for Phase 14 deployment

.DESCRIPTION
Starts:
1. Phase 72 Ingest Service (port 8089)
2. QUIC Bridge (port 8090)
3. WebSocket Orchestrator (port 8091)
#>

Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "STARTING GO SERVICES - Phase 14 Deployment"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

# Check if services are already running
Write-Host "Checking for existing services..."
$phase72 = Get-Process -Name "phase72-ingest-service" -ErrorAction SilentlyContinue
$quic = Get-Process -Name "quic-bridge" -ErrorAction SilentlyContinue
$ws = Get-Process -Name "ws-orchestrator" -ErrorAction SilentlyContinue

if ($phase72) {
  Write-Host "⚠️  Phase 72 Ingest Service already running (PID: $($phase72.Id))"
}
if ($quic) {
  Write-Host "⚠️  QUIC Bridge already running (PID: $($quic.Id))"
}
if ($ws) {
  Write-Host "⚠️  WebSocket Orchestrator already running (PID: $($ws.Id))"
}

Write-Host ""
Write-Host "Starting services..."
Write-Host ""

# Start Phase 72 Ingest Service
Write-Host "1️⃣  Starting Phase 72 Ingest Service..."
if (Test-Path "go-services/phase72-ingest/main.go") {
  Start-Process -FilePath "go" -ArgumentList "run", "go-services/phase72-ingest/main.go" -NoNewWindow -PassThru | Out-Null
  Write-Host "   ✅ Phase 72 Ingest Service started (port 8089)"
  Write-Host "   📍 Endpoint: http://localhost:8089/health"
} else {
  Write-Host "   ❌ Phase 72 Ingest Service not found"
}

Write-Host ""

# Start QUIC Bridge
Write-Host "2️⃣  Starting QUIC Bridge..."
if (Test-Path "go-services/quic-bridge/main.go") {
  Start-Process -FilePath "go" -ArgumentList "run", "go-services/quic-bridge/main.go" -NoNewWindow -PassThru | Out-Null
  Write-Host "   ✅ QUIC Bridge started (port 8090)"
  Write-Host "   📍 Endpoint: http://localhost:8090/health"
} else {
  Write-Host "   ❌ QUIC Bridge not found"
}

Write-Host ""

# Start WebSocket Orchestrator
Write-Host "3️⃣  Starting WebSocket Orchestrator..."
if (Test-Path "go-services/ws-orchestrator/main.go") {
  Start-Process -FilePath "go" -ArgumentList "run", "go-services/ws-orchestrator/main.go" -NoNewWindow -PassThru | Out-Null
  Write-Host "   ✅ WebSocket Orchestrator started (port 8091)"
  Write-Host "   📍 Endpoint: http://localhost:8091/health"
} else {
  Write-Host "   ❌ WebSocket Orchestrator not found"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "SERVICES STARTED"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

Write-Host "📊 Service Status:"
Write-Host "  • Phase 72 Ingest: http://localhost:8089/health"
Write-Host "  • QUIC Bridge: http://localhost:8090/health"
Write-Host "  • WebSocket Orchestrator: http://localhost:8091/health"
Write-Host ""

Write-Host "🧪 Test Commands:"
Write-Host "  curl http://localhost:8089/health"
Write-Host "  curl http://localhost:8090/health"
Write-Host "  curl http://localhost:8091/health"
Write-Host ""

Write-Host "📝 Next Steps:"
Write-Host "  1. Test RAG/KAG API endpoints"
Write-Host "  2. Test GPU Phase 72 error clustering"
Write-Host "  3. Deploy to production"
Write-Host ""
