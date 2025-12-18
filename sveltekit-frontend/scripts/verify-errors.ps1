$ErrorActionPreference = "Stop"
if (Test-Path reports/errors.jsonl) {
    Get-Content reports/errors.jsonl -TotalCount 3 | ForEach-Object {
        $obj = $_ | ConvertFrom-Json
        $msg = if ($obj.message.Length -gt 80) { $obj.message.Substring(0, 80) } else { $obj.message }
        Write-Host "$($obj.file):$($obj.line) - $msg"
    }
} else {
    Write-Host "reports/errors.jsonl not found"
}
