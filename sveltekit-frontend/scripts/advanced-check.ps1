# Advanced Error Analysis Pipeline v2.0 (Progress + Heartbeat + JSONL)
# Runs svelte-check with real progress bars, timeout protection, and streaming logs
# Outputs JSONL events + fix-plan for batch processing

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportsRoot = Join-Path (Get-Location) "reports"
$runDir = Join-Path $reportsRoot "runs\$timestamp"

# Ensure run directory exists
if (!(Test-Path $runDir)) { New-Item -ItemType Directory -Path $runDir -Force | Out-Null }

$rawLogFile = Join-Path $runDir "svelte_raw.log"
$jsonlFile = Join-Path $runDir "error-events.jsonl"
$fixPlanFile = Join-Path $runDir "fix-plan.json"

# Ensure reports directory exists
if (!(Test-Path $reportsRoot)) { New-Item -ItemType Directory -Path $reportsRoot | Out-Null }

function Invoke-LoggedProcess {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$ArgumentList,
    [Parameter(Mandatory=$true)][string]$LogPath,
    [string]$Activity = "Running process",
    [int]$TimeoutSec = 900,
    [int]$HeartbeatMs = 250
  )

  $ErrorActionPreference = "Stop"
  New-Item -ItemType Directory -Force (Split-Path $LogPath) | Out-Null
  if (Test-Path $LogPath) { Remove-Item $LogPath -Force }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ($ArgumentList -join " ")
  $psi.WorkingDirectory = (Get-Location).Path
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.CreateNoWindow = $true
  # Ensure environment variables are passed (crucial for NODE_OPTIONS)
  $psi.EnvironmentVariables["NODE_OPTIONS"] = "--max-old-space-size=8192"

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi

  $sw = [Diagnostics.Stopwatch]::StartNew()
  $lines = 0
  $lastLine = ""
  $writer = [System.IO.StreamWriter]::new($LogPath, $true, [System.Text.Encoding]::UTF8)
  try {
    if (-not $p.Start()) { throw "Failed to start process: $FilePath" }

    while (-not $p.HasExited) {
      # drain stdout
      while (-not $p.StandardOutput.EndOfStream) {
        $line = $p.StandardOutput.ReadLine()
        if ($null -ne $line) {
          $lastLine = $line
          $lines++
          $writer.WriteLine($line)
        }
      }
      # drain stderr
      while (-not $p.StandardError.EndOfStream) {
        $eline = $p.StandardError.ReadLine()
        if ($null -ne $eline) {
          $lastLine = $eline
          $lines++
          $writer.WriteLine($eline)
        }
      }

      $elapsed = [int]$sw.Elapsed.TotalSeconds
      $pct = if ($TimeoutSec -gt 0) { [math]::Min(99, [int](($elapsed / $TimeoutSec) * 100)) } else { 0 }
      $status = "Elapsed ${elapsed}s | Lines $lines | Last: " + ($lastLine.Substring(0, [Math]::Min(120, $lastLine.Length)))
      Write-Progress -Activity $Activity -Status $status -PercentComplete $pct

      if ($TimeoutSec -gt 0 -and $sw.Elapsed.TotalSeconds -ge $TimeoutSec) {
        try { $p.Kill() } catch {}
        throw "$Activity timed out after $TimeoutSec seconds. Log: $LogPath"
      }
      Start-Sleep -Milliseconds $HeartbeatMs
    }

    # final drain after exit
    while (-not $p.StandardOutput.EndOfStream) { $writer.WriteLine($p.StandardOutput.ReadLine()); $lines++ }
    while (-not $p.StandardError.EndOfStream)  { $writer.WriteLine($p.StandardError.ReadLine());  $lines++ }

    Write-Progress -Activity $Activity -Completed
    return @{
      ExitCode = $p.ExitCode
      Lines    = $lines
      LogPath  = $LogPath
    }
  }
  finally {
    $writer.Flush()
    $writer.Dispose()
    if ($p) { $p.Dispose() }
  }
}

# ============================================================
# PHASE 1: Run Svelte Check (Streamed)
# ============================================================
Write-Host "1️⃣  Running svelte-check (streaming to $rawLogFile)..." -ForegroundColor Yellow

# Use cmd /c to run npm/npx correctly on Windows
$checkResult = Invoke-LoggedProcess `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm run check:svelte:frontend") `
    -LogPath $rawLogFile `
    -Activity "Svelte Check Analysis" `
    -TimeoutSec 900

Write-Host "   Done. ExitCode: $($checkResult.ExitCode) | Lines: $($checkResult.Lines)" -ForegroundColor Cyan

# ============================================================
# PHASE 2: Analyze Logs (Node.js Stream)
# ============================================================
Write-Host "`n2️⃣  Analyzing logs -> JSONL..." -ForegroundColor Yellow

if (Test-Path "scripts/analyze-errors-simd.mjs") {
    node scripts/analyze-errors-simd.mjs $rawLogFile $jsonlFile $fixPlanFile

    if (Test-Path $jsonlFile) {
        $eventCount = (Get-Content $jsonlFile | Measure-Object -Line).Lines
        Write-Host "✅ Created $jsonlFile ($eventCount events)" -ForegroundColor Cyan
    }

    if (Test-Path $fixPlanFile) {
        $planSize = (Get-Item $fixPlanFile).Length
        Write-Host "✅ Created $fixPlanFile ($planSize bytes)" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️ scripts/analyze-errors-simd.mjs not found!" -ForegroundColor Red
}

# ============================================================
# PHASE 3: Batch fixer (optional)
# ============================================================
Write-Host "`n3️⃣  Preparing batch fixer..." -ForegroundColor Yellow

if (Test-Path $fixPlanFile) {
    Write-Host "   Fix plan ready at: $fixPlanFile" -ForegroundColor Cyan
    Write-Host "   Run: node scripts/batch-merger-fixer.mjs --apply-safe" -ForegroundColor Yellow
} else {
    Write-Host "   ⏭️  No fix plan generated yet" -ForegroundColor Gray
}

# Update "latest" links (Atomic-ish copy)
Write-Host "🔄 Updating latest links..." -ForegroundColor DarkGray
Copy-Item $jsonlFile "$reportsRoot/error-events.jsonl" -Force
Copy-Item $fixPlanFile "$reportsRoot/fix-plan.json" -Force
Copy-Item $rawLogFile "$reportsRoot/svelte_raw.log" -Force

# ============================================================
# Summary
# ============================================================
Write-Host "`n✨ Pipeline Complete!" -ForegroundColor Green
Write-Host "📂 Run Directory: $runDir" -ForegroundColor Cyan
Write-Host "📝 Raw Log: $rawLogFile" -ForegroundColor Gray
Write-Host "📋 JSONL Events: $jsonlFile" -ForegroundColor Gray
Write-Host "📊 Fix Plan: $fixPlanFile" -ForegroundColor Gray
Write-Host ""