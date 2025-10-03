# Launch VS Code with Claude Code configured to use local Ollama gemma3-legal model
# This script configures environment variables to route Claude Code through LiteLLM proxy

Write-Host "🚀 Launching VS Code with Ollama gemma3-legal integration..." -ForegroundColor Cyan

# Check if LiteLLM is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Headers @{"Authorization"="Bearer sk-1234"} -ErrorAction Stop
    Write-Host "✅ LiteLLM proxy is running on port 4000" -ForegroundColor Green
} catch {
    Write-Host "❌ LiteLLM proxy is not running!" -ForegroundColor Red
    Write-Host "   Starting LiteLLM proxy..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-File", "C:\Users\james\Videos\deeds-web-app\start-litellm-proxy.ps1"
    Start-Sleep -Seconds 5
}

# Set environment variables for Claude Code to use LiteLLM proxy
$env:ANTHROPIC_BASE_URL = "http://localhost:4000"
$env:ANTHROPIC_API_KEY = "sk-1234"

Write-Host "✅ Environment configured:" -ForegroundColor Green
Write-Host "   ANTHROPIC_BASE_URL = $env:ANTHROPIC_BASE_URL" -ForegroundColor White
Write-Host "   ANTHROPIC_API_KEY  = $env:ANTHROPIC_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "🤖 Claude Code will now use: Ollama gemma3-legal:latest" -ForegroundColor Magenta
Write-Host "   (via LiteLLM proxy at localhost:4000)" -ForegroundColor Gray
Write-Host ""

# Launch VS Code with environment variables
& code "C:\Users\james\Videos\deeds-web-app"

Write-Host "✅ VS Code launched successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Keep the LiteLLM proxy window open while using Claude Code." -ForegroundColor Yellow
