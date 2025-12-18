# PHASE 72: UTF-8 HARDENING FOR POWERSHELL
# Run once per terminal session before compilation checks
#
# This prevents:
# - Mojibake (corrupted Unicode) in progress bars
# - Box-drawing character injection into source files
# - Encoding errors in logs
#
# Usage:
#   . .\scripts\hardening-utf8.ps1
#   npm run check:svelte
#   node scripts/factory-fixer-v2.mjs --apply --tier 2

# Set UTF-8 code page
chcp 65001 | Out-Null

# Force UTF-8 everywhere
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# Python UTF-8
$env:PYTHONIOENCODING = "utf-8"

# Node.js 8GB memory
$env:NODE_OPTIONS = "--max-old-space-size=8192"

# Log to stdout only (not progress to stdout)
$env:FORCE_COLOR = "1"

Write-Host "✓ PowerShell UTF-8 Hardening Applied" -ForegroundColor Green
Write-Host "  - Code page: 65001 (UTF-8)" -ForegroundColor Cyan
Write-Host "  - Output encoding: UTF-8" -ForegroundColor Cyan
Write-Host "  - Python encoding: UTF-8" -ForegroundColor Cyan
Write-Host "  - Node.js memory: 8GB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready for Phase 72 compilation chain." -ForegroundColor Yellow
