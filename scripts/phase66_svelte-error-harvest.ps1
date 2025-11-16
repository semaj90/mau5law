param(
  [int] $TopErrorTypes = 100,
  [int] $ExamplesPerType = 5
)

$root = Split-Path $PSCommandPath -Parent | Split-Path -Parent
Set-Location $root

Write-Host "◆ Phase66: Harvest & Rank svelte-check Errors"
Write-Host "--------------------------------------------"

# 1) Run svelte-check and capture log
.\scripts\run-svelte-check.ps1 -OutputLog ".svelte-errors-raw.log"

# 2) Parse log → JSONL
npm run parse:svelte-errors

# 3) Rank errors → top JSON
npm run rank:svelte-errors -- ".svelte-errors.jsonl" ".svelte-errors-top.json" $TopErrorTypes $ExamplesPerType

Write-Host ""
Write-Host "✅ Phase66 complete."
Write-Host "   Raw log:              .svelte-errors-raw.log"
Write-Host "   Parsed errors (JSONL): .svelte-errors.jsonl"
Write-Host "   Ranked top errors:     .svelte-errors-top.json"