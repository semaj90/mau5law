# Start LiteLLM Proxy for Claude Code to use Ollama gemma3-legal
Write-Host "Starting LiteLLM Proxy on port 4000..." -ForegroundColor Green

# Kill any existing LiteLLM process
Get-Process litellm -ErrorAction SilentlyContinue | Stop-Process -Force

# Set UTF-8 encoding to fix Unicode error
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Start LiteLLM proxy
& "C:\Users\james\AppData\Roaming\Python\Python313\Scripts\litellm.exe" --config "C:\Users\james\Videos\deeds-web-app\litellm_config.yaml" --port 4000
