param(
    [int]$limit = 1000,
    [string]$root = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
)

Write-Host "🔍 Svelte-Check Error Logger" -ForegroundColor Cyan
Write-Host "Limit: $limit errors" -ForegroundColor Yellow
Write-Host ""

# Create logs directory
$logDir = "$root/../logs/svelte-check"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$logFile = "$logDir/svelte-check-errors_$timestamp.txt"
$summaryFile = "$logDir/svelte-check-summary_$timestamp.txt"

Write-Host "Running svelte-check..." -ForegroundColor Yellow

# Run svelte-check and capture output
$output = @()
try {
    $result = & npm run check:svelte 2>&1
    $output = $result -split "`n"
} catch {
    Write-Host "Error running svelte-check: $_" -ForegroundColor Red
    exit 1
}

# Parse errors
$errors = @()
$currentError = @()

foreach ($line in $output) {
    if ($line -match "error TS\d+|Error:|^[A-Za-z].*\.svelte") {
        if ($currentError.Count -gt 0) {
            $errors += @{
                text = $currentError -join "`n"
                type = if ($currentError[0] -match "error TS") { "TypeScript" } else { "Svelte" }
            }
        }
        $currentError = @($line)
    } elseif ($line.Trim() -ne "" -and $currentError.Count -gt 0) {
        $currentError += $line
    }
}

if ($currentError.Count -gt 0) {
    $errors += @{
        text = $currentError -join "`n"
        type = if ($currentError[0] -match "error TS") { "TypeScript" } else { "Svelte" }
    }
}

# Limit errors
$topErrors = $errors | Select-Object -First $limit

Write-Host "✅ Found $($errors.Count) total errors" -ForegroundColor Green
Write-Host "📝 Logging top $($topErrors.Count) errors..." -ForegroundColor Yellow
Write-Host ""

# Write detailed log
$logContent = @"
SVELTE-CHECK ERROR LOG
Generated: $(Get-Date)
Total Errors: $($errors.Count)
Top Errors Logged: $($topErrors.Count)
================================================================================

"@

$logContent += ($topErrors | ForEach-Object { $_.text + "`n`n" }) -join ""

$logContent | Out-File -FilePath $logFile -Encoding UTF8

# Write summary
$summary = @"
SVELTE-CHECK ERROR SUMMARY
Generated: $(Get-Date)
================================================================================

Total Errors Found: $($errors.Count)
TypeScript Errors: $($errors | Where-Object { $_.type -eq "TypeScript" } | Measure-Object).Count
Svelte Errors: $($errors | Where-Object { $_.type -eq "Svelte" } | Measure-Object).Count

Top 10 Error Types:
"@

$errorTypes = $errors | Group-Object { $_.text.Split("`n")[0] } | Sort-Object Count -Descending | Select-Object -First 10

$errorTypes | ForEach-Object {
    $summary += "`n  - $($_.Count)x: $($_.Name.Substring(0, [Math]::Min(80, $_.Name.Length)))"
}

$summary += "`n`nFull error log: $logFile`n"

$summary | Out-File -FilePath $summaryFile -Encoding UTF8

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host $summary
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor Green
Write-Host "  - Detailed log: $logFile" -ForegroundColor Green
Write-Host "  - Summary: $summaryFile" -ForegroundColor Green
