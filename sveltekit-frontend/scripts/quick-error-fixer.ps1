param(
  [ValidateSet("Analyze","ApplySafe","Full")]
  [string]$Mode = "Analyze",
  [switch]$DryRun
)

function Run-Step([string]$name, [int]$pct, [string]$cmd) {
  Write-Progress -Activity "Codemod Pipeline" -Status $name -PercentComplete $pct
  Write-Host "▶ $name"
  if ($DryRun) { Write-Host "  (dry-run) $cmd"; return }
  iex $cmd
  if ($LASTEXITCODE -ne 0) { throw "Step failed: $name" }
}

try {
  # 0. Pre-flight checks
  $scriptPath = ".\scripts\batch-merger-fixer.mjs"
  if (-not (Test-Path $scriptPath)) { throw "Missing: $scriptPath" }

  # Freeze report name for deterministic diffs
  $env:BATCH_REPORT_STAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

  # Always analyze first so we have a fresh report
  Run-Step "Analyze (AST) Svelte 5 + Bits-UI + imports" 10 "node .\scripts\batch-merger-fixer.mjs"

  if ($Mode -eq "Analyze") { Write-Host "✅ Analyze-only complete."; exit 0 }

  # SAFE AUTOFIXES ONLY (no semantic rewrites)
  Run-Step "Apply SAFE fixes from batch report (import type misuse + trivial text fixes)" 30 "node .\scripts\batch-merger-fixer.mjs --apply-safe"

  if ($Mode -eq "ApplySafe") { Write-Host "✅ Safe fixes applied."; exit 0 }

  # Full hygiene (optional)
  Run-Step "Resolve imports" 60 "npm run imports:resolve-all"
  Run-Step "TypeScript check (ultra-fast)" 80 "npm run check:ultra-fast"
  Run-Step "Svelte check (frontend)" 95 "npm run check:svelte:frontend"

  Write-Progress -Activity "Codemod Pipeline" -Completed
  Write-Host "✅ Full pipeline complete."
} catch {
  Write-Error $_
  exit 1
}

