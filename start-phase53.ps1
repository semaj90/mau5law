<#
Phase 53 – Agentic Gemma3-Legal Fix Loop
Chains after Phase 52; uses Redis embeddings and Gemma3-Legal:latest
#>

Write-Host "🧠 Starting Phase 53 – Agentic LLM Fix Loop..." -ForegroundColor Cyan

# Load .env
$envPath = "C:\Users\james\Videos\deeds-web-app\.env.phase52.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.+)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
    Write-Host "✅ Loaded environment from $envPath"
}

# Verify Redis connectivity
try {
    $pong = docker exec legal-ai-redis redis-cli ping
    if ($pong -like "*PONG*") { Write-Host "✅ Redis reachable." }
    else { Write-Host "⚠️ Redis check failed." -ForegroundColor Yellow }
} catch { Write-Host "⚠️ Redis CLI not available." -ForegroundColor Yellow }

# Launch Node agentic fix loop
Set-Location "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
Write-Host "🤖 Running Gemma3-Legal agentic repair..." -ForegroundColor Cyan
node scripts/phase53-agentic-fix.mjs

Write-Host "✅ Phase 53 complete." -ForegroundColor Green