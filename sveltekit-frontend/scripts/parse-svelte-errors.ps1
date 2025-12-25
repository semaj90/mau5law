#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Parse svelte-check output into structured JSONL format
.DESCRIPTION
    Extracts file paths, line numbers, columns, and error messages from svelte-check output
.PARAMETER InputFile
    Path to raw svelte-check output file
.PARAMETER OutputFile
    Path to write structured JSONL output
.PARAMETER RunId
    Unique run identifier for tracking
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,

    [Parameter(Mandatory=$true)]
    [string]$OutputFile,

    [Parameter(Mandatory=$true)]
    [string]$RunId
)

Write-Host "📊 Parsing svelte-check errors..." -ForegroundColor Cyan
Write-Host "   Input: $InputFile" -ForegroundColor Gray
Write-Host "   Output: $OutputFile" -ForegroundColor Gray

# Read raw output
$content = Get-Content -Path $InputFile -Raw

# Split into lines
$lines = $content -split "`n"

$errors = @()
$currentFile = $null
$currentLine = 0
$currentColumn = 0

foreach ($line in $lines) {
    $line = $line.Trim()

    # Pattern 1: File path with line:column
    # Example: c:\Users\james\...\file.ts:123:45
    if ($line -match '^([a-zA-Z]:[^:]+\.(ts|svelte|js)):(\d+):(\d+)\s*$') {
        $currentFile = $matches[1]
        $currentLine = [int]$matches[3]
        $currentColumn = [int]$matches[4]
        continue
    }

    # Pattern 2: Error message
    # Example: Error: Cannot redeclare block-scoped variable 'documentChunks'.
    # Example: Error: Type 'string' is not assignable to type 'number' (ts(2322))
    if ($line -match '^Error:\s*(.+?)\s*(\(ts\((\d+)\)\))?\s*\.?\s*$') {
        if ($currentFile) {
            $message = $matches[1].Trim()
            $tsCode = if ($matches[3]) { $matches[3] } else { "unknown" }

            $errorObj = @{
                runId = $RunId
                file = $currentFile
                line = $currentLine
                column = $currentColumn
                code = "ts($tsCode)"
                message = $message
                tool = "svelte-check"
                timestamp = (Get-Date).ToString("o")
            }

            $errors += $errorObj

            # Reset for next error
            $currentFile = $null
        }
    }
}

Write-Host "✅ Parsed $($errors.Count) errors" -ForegroundColor Green

# Write to JSONL (one JSON object per line)
$jsonlLines = $errors | ForEach-Object {
    $_ | ConvertTo-Json -Compress -Depth 10
}

$jsonlLines | Set-Content -Path $OutputFile -Encoding UTF8

Write-Host "✅ Saved to $OutputFile" -ForegroundColor Green

# Return count for pipeline
return $errors.Count
