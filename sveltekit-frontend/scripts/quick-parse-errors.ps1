# High-Performance Error Parser (PowerShell)
# Handles multi-line error messages properly

param(
    [string]$LogFile = "reports/svelte_raw.log",
    [string]$OutputJsonl = "reports/errors.jsonl"
)

$ErrorActionPreference = "Stop"

Write-Host "📖 Parsing error log..." -ForegroundColor Cyan

# Pre-count total lines for progress
$totalLines = (Measure-Object -InputObject (Get-Content $LogFile -Raw) -Line).Lines
$sw = [Diagnostics.Stopwatch]::StartNew()

$reader = [System.IO.StreamReader]::new($LogFile, [System.Text.Encoding]::UTF8)
$jsonlWriter = [System.IO.StreamWriter]::new($OutputJsonl, $false, [System.Text.Encoding]::UTF8)

$eventCount = 0
$lineNum = 0
$currentError = $null

function Add-Event {
    param($file, $line, $col, $message)
    script:eventCount++

    # Strip ANSI codes
    $message = $message -replace '\x1b\[\d+m', ''
    $file = $file -replace '\x1b\[\d+m', ''    $event = @{
        fingerprint = ""
        file = $file.Trim()
        line = $line
        col = $col
        message = $message.Trim().Substring(0, [Math]::Min(500, $message.Length))
        severity = "error"
        timestamp = [DateTime]::UtcNow.ToString("o")
    } | ConvertTo-Json -Compress

    $jsonlWriter.WriteLine($event)
}

try {
    while (($rawLine = $reader.ReadLine()) -ne $null) {
        $lineNum++
        $line = $rawLine.Trim()

        # Progress every 5000 lines
        if ($lineNum % 5000 -eq 0) {
            $pct = [int](($lineNum / $totalLines) * 100)
            $elapsed = [int]$sw.Elapsed.TotalSeconds
            Write-Progress -Activity "Parsing" -Status "$eventCount events, ${pct}% @ ${elapsed}s" -PercentComplete $pct
        }

        # Detect file location: path:line:col
        if ($line -match '^([A-Za-z]:[\\][^:]+):(\d+):(\d+)$') {
            # Flush previous error if exists
            if ($currentError) {
                Add-Event @currentError
            }
            $currentError = @{
                file = $matches[1]
                line = [int]$matches[2]
                col = [int]$matches[3]
                message = ""
                inMessage = $false
                inCode = $false
            }
            continue
        }

        if (!$currentError) { continue }

        # Detect error start: "Error: ..."
        if ($line -match '^Error:\s+(.+)') {
            $currentError.message = $matches[1]
            $currentError.inMessage = $true
            $currentError.inCode = $false
            continue
        }

        # If we're collecting the message
        if ($currentError.inMessage -and !$currentError.inCode) {
            # Check if line is indented (code starts)
            if ($line -match '^\s+') {
                $currentError.inCode = $true
            }
            # Otherwise, add to message (multi-line continuation)
            elseif ($line -and !($line -match '^[A-Za-z]:')) {
                $currentError.message += " " + $line
            }
            # Blank line signals end
            elseif (!$line) {
                if ($currentError.message) {
                    Add-Event @currentError
                    $currentError = $null
                }
            }
        }
    }

    # Flush last error
    if ($currentError -and $currentError.message) {
        Add-Event @currentError
    }

    Write-Progress -Activity "Parsing" -Completed
}
finally {
    $jsonlWriter.Flush()
    $jsonlWriter.Dispose()
    $reader.Dispose()
}

$elapsed = [int]$sw.Elapsed.TotalSeconds
Write-Host "`n✅ Extracted: $eventCount events in ${elapsed}s" -ForegroundColor Green
Write-Host "📊 Output: $OutputJsonl" -ForegroundColor Cyan
