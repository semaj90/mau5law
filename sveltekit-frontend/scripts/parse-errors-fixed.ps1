# Ultra-Fast Error Parser for svelte-check (222 MB log)
# Handles multi-line error format: file:line:col, Error: message..., code context, blank line

param(
    [string]$LogFile = "reports/svelte_raw.log",
    [string]$OutputJsonl = "reports/errors.jsonl"
)

$ErrorActionPreference = "Stop"

Write-Host "📖 Parsing error log with multi-line support..." -ForegroundColor Cyan

$sw = [Diagnostics.Stopwatch]::StartNew()
$reader = [System.IO.StreamReader]::new($LogFile, [System.Text.Encoding]::UTF8)
$jsonlWriter = [System.IO.StreamWriter]::new($OutputJsonl, $false, [System.Text.Encoding]::UTF8)

$eventCount = 0
$fileLocation = $null
$errorMessage = ""
$collectingMessage = $false

try {
    $lineNum = 0
    while (($rawLine = $reader.ReadLine()) -ne $null) {
        $lineNum++

        # Strip ANSI codes and trim
        $line = $rawLine -replace '\x1b\[\d+m', ''
        $line = $line.Trim()

        # Progress every 50k lines
        if ($lineNum % 50000 -eq 0) {
            $elapsed = [int]$sw.Elapsed.TotalSeconds
            Write-Progress -Activity "Parsing" -Status "Line $lineNum, $eventCount events in ${elapsed}s"
        }

        # PATTERN 1: File location (path:line:col)
        # Matches: c:\path\file.ts:123:45
        if ($line -match '^([A-Za-z]:[\\][^:]+):(\d+):(\d+)$') {
            # Flush previous error
            if ($fileLocation -and $errorMessage) {
                $event = @{
                    fingerprint = ($fileLocation + ":" + $errorMessage).GetHashCode().ToString("x8")
                    file = $fileLocation[1]
                    line = [int]$fileLocation[2]
                    col = [int]$fileLocation[3]
                    message = $errorMessage.Substring(0, [Math]::Min(500, $errorMessage.Length))
                    severity = "error"
                    timestamp = [DateTime]::UtcNow.ToString("o")
                } | ConvertTo-Json -Compress

                $jsonlWriter.WriteLine($event)
                $eventCount++
            }

            # Start new error
            $fileLocation = @( $matches[1], $matches[2], $matches[3] )
            $errorMessage = ""
            $collectingMessage = $false
            continue
        }

        # PATTERN 2: Error line (Error: ...)
        if ($line -match '^Error:\s+(.+)') {
            $errorMessage = $matches[1]
            $collectingMessage = $true
            continue
        }

        # PATTERN 3: Continuation of error message (non-indented, not starting with new file path)
        if ($collectingMessage -and $errorMessage -and $line -and !($line -match '^[A-Za-z]:')) {
            # Don't append code lines (they start with spaces after being trimmed from original)
            if (!($rawLine -match '^\s+')) {
                # Continuation of message
                $errorMessage += " " + $line
            }
        }

        # PATTERN 4: Blank line (signals end of error block)
        if (!$line -and $fileLocation -and $errorMessage) {
            $event = @{
                fingerprint = ($fileLocation[0] + ":" + $fileLocation[1] + ":" + $errorMessage).GetHashCode().ToString("x8")
                file = $fileLocation[0]
                line = [int]$fileLocation[1]
                col = [int]$fileLocation[2]
                message = $errorMessage.Substring(0, [Math]::Min(500, $errorMessage.Length))
                severity = "error"
                timestamp = [DateTime]::UtcNow.ToString("o")
            } | ConvertTo-Json -Compress

            $jsonlWriter.WriteLine($event)
            $eventCount++

            $fileLocation = $null
            $errorMessage = ""
            $collectingMessage = $false
        }
    }

    # Flush last error if exists
    if ($fileLocation -and $errorMessage) {
        $event = @{
            fingerprint = ($fileLocation[0] + ":" + $fileLocation[1] + ":" + $errorMessage).GetHashCode().ToString("x8")
            file = $fileLocation[0]
            line = [int]$fileLocation[1]
            col = [int]$fileLocation[2]
            message = $errorMessage.Substring(0, [Math]::Min(500, $errorMessage.Length))
            severity = "error"
            timestamp = [DateTime]::UtcNow.ToString("o")
        } | ConvertTo-Json -Compress

        $jsonlWriter.WriteLine($event)
        $eventCount++
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

# Show sample
Write-Host "`n📋 Sample events (first 3):" -ForegroundColor Yellow
Get-Content $OutputJsonl -TotalCount 3 | ForEach-Object {
    $obj = $_ | ConvertFrom-Json
    Write-Host "  Line $($obj.line): $($obj.message.Substring(0, 80))" -ForegroundColor Gray
}
