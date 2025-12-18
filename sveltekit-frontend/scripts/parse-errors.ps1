# Quick Error Parser & Progress Reporter
# Reads svelte_raw.log and extracts errors with real-time progress

param(
    [string]$LogFile = "reports/svelte_raw.log",
    [string]$OutputJsonl = "reports/errors.jsonl",
    [string]$OutputFixPlan = "reports/fix-plan.json"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $LogFile)) {
    Write-Host "❌ Log file not found: $LogFile" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $LogFile
$fileSize = $fileInfo.Length
Write-Host "📖 Parsing $([math]::Round($fileSize / 1MB, 1)) MB log file..." -ForegroundColor Cyan

$reader = [System.IO.StreamReader]::new($LogFile, [System.Text.Encoding]::UTF8)
$eventCount = 0
$lineNum = 0
$lastProgress = 0
$sw = [Diagnostics.Stopwatch]::StartNew()

# JSONL output
$jsonlWriter = [System.IO.StreamWriter]::new($OutputJsonl, $false, [System.Text.Encoding]::UTF8)
$errorsByCategory = @{
    'import-type-misuse' = @()
    'type-mismatch' = @()
    'async-function' = @()
    'unused-variable' = @()
    'other' = @()
}

try {
    $currentError = $null

    while (($line = $reader.ReadLine()) -ne $null) {
        $lineNum++
        $line = $line.Trim()

        # Progress every 10000 lines
        if ($lineNum % 10000 -eq 0) {
            $pct = [math]::Min(100, [int](($reader.BaseStream.Position / $fileSize) * 100))
            $elapsed = [int]$sw.Elapsed.TotalSeconds
            Write-Progress -Activity "Parsing errors" -Status "Line $lineNum, Events $eventCount, $pct% @ ${elapsed}s" -PercentComplete $pct
            $lastProgress = $pct
        }

        # Skip empty lines unless we're in an error
        if (!$line) {
            if ($currentError -and $currentError.message) {
                # Emit error
                $fp = [System.Security.Cryptography.SHA256]::Create()
                $hash = [BitConverter]::ToString($fp.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$($currentError.file):$($currentError.line):$($currentError.message)"))).Replace("-", "").Substring(0, 12)

                $event = @{
                    fingerprint = $hash
                    file = $currentError.file
                    line = $currentError.line
                    col = $currentError.col
                    message = $currentError.message
                    category = $currentError.category
                    severity = "error"
                    timestamp = [DateTime]::UtcNow.ToString("o")
                } | ConvertTo-Json -Compress

                $jsonlWriter.WriteLine($event)
                $errorsByCategory[$currentError.category] += @($event)
                $eventCount++
                $currentError = $null
            }
            continue
        }

        # Detect file location: "path/to/file.ts:line:col"
        if ($line -match '^[A-Za-z]:.*?:\d+:\d+$') {
            # Flush previous
            if ($currentError -and $currentError.message) {
                $event = @{
                    fingerprint = [BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$($currentError.file):$($currentError.line):$($currentError.message)"))).Replace("-", "").Substring(0, 12)
                    file = $currentError.file
                    line = $currentError.line
                    col = $currentError.col
                    message = $currentError.message
                    category = $currentError.category
                    severity = "error"
                    timestamp = [DateTime]::UtcNow.ToString("o")
                } | ConvertTo-Json -Compress
                $jsonlWriter.WriteLine($event)
                $eventCount++
            }

            # Parse new error location
            if ($line -match '^(.+?):(\d+):(\d+)$') {
                $currentError = @{
                    file = $matches[1]
                    line = [int]$matches[2]
                    col = [int]$matches[3]
                    message = ""
                    code = @()
                    category = "other"
                    inCode = $false
                }
            }
            continue
        }

        # Skip non-error lines if we don't have a current error location
        if (!$currentError) { continue }

        # Detect "Error: ..." lines
        if ($line -match '^(Error|Warning):\s+(.+)$') {
            $currentError.message = $matches[2]

            # Categorize
            $msg = $currentError.message.ToLower()
            $file = $currentError.file.ToLower()
            if ($msg -like "*'import type'*" -or $msg -like "*import type*") {
                $currentError.category = "import-type-misuse"
            }
            elseif ($msg -like "*is not assignable to type*" -or $msg -like "*type*") {
                $currentError.category = "type-mismatch"
            }
            elseif ($msg -like "*async*" -and ($msg -like "*onmount*" -or $msg -like "*effect*")) {
                $currentError.category = "async-function"
            }
            elseif ($msg -like "*declared but never used*" -or $msg -like "*unused*") {
                $currentError.category = "unused-variable"
            }
            continue
        }

        # Code sample lines (indented)
        if ($currentError.message -and ($line.StartsWith(" ") -or $line.StartsWith("`t"))) {
            $currentError.inCode = $true
            $currentError.code += $line
        }
    }

    # Flush last error
    if ($currentError -and $currentError.message) {
        $event = @{
            fingerprint = [BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$($currentError.file):$($currentError.line):$($currentError.message)"))).Replace("-", "").Substring(0, 12)
            file = $currentError.file
            line = $currentError.line
            col = $currentError.col
            message = $currentError.message
            category = $currentError.category
            severity = "error"
            timestamp = [DateTime]::UtcNow.ToString("o")
        } | ConvertTo-Json -Compress
        $jsonlWriter.WriteLine($event)
        $eventCount++
    }

    Write-Progress -Activity "Parsing errors" -Completed

}
finally {
    $jsonlWriter.Flush()
    $jsonlWriter.Dispose()
    $reader.Dispose()
}

$elapsed = [int]$sw.Elapsed.TotalSeconds
Write-Host "`n✅ Parsed: $lineNum lines, $eventCount events in ${elapsed}s" -ForegroundColor Green
Write-Host "📋 Wrote to: $OutputJsonl" -ForegroundColor Cyan

# Generate fix plan
$categoryCounts = @{}
@('import-type-misuse', 'type-mismatch', 'async-function', 'unused-variable', 'other') | ForEach-Object {
    $categoryCounts[$_] = ($errorsByCategory[$_] | Measure-Object).Count
}

$fixPlan = @{
    generated = [DateTime]::UtcNow.ToString("o")
    summary = @{
        totalErrors = $eventCount
        byCategory = $categoryCounts
    }
    tiers = @(
        @{
            tier = 1
            name = "Safe Deterministic"
            description = "100% confidence"
            count = $categoryCounts['unused-variable']
        }
        @{
            tier = 2
            name = "Semi-Safe"
            description = "95% confidence"
            count = $categoryCounts['async-function']
        }
        @{
            tier = 3
            name = "Manual Review"
            description = "High-risk patterns"
            count = $categoryCounts['import-type-misuse'] + $categoryCounts['type-mismatch']
        }
    )
} | ConvertTo-Json -Depth 10 | Set-Content $OutputFixPlan

Write-Host "📊 Wrote to: $OutputFixPlan" -ForegroundColor Cyan

Write-Host "`n✨ Summary:" -ForegroundColor Yellow
$categoryCounts.Keys | ForEach-Object {
    if ($categoryCounts[$_] -gt 0) {
        Write-Host "  $_`: $($categoryCounts[$_])" -ForegroundColor Gray
    }
}

Write-Host "`n📋 Next: run batch-merger-fixer.mjs for tier-based fixes" -ForegroundColor Cyan
