$hot = Get-Content reports/phase82_hot10.txt
$lines = Get-Content reports/tsc-hot10-v2.txt

foreach ($f in $hot) {
  Write-Host "`n=== $f ==="
  $lines |
    Where-Object { $_ -like "*$f*" -and $_ -match "error TS" } |
    ForEach-Object { if ($_ -match "error TS\d+:\s*(.+)$") { $matches[1].Trim() } } |
    Group-Object | Sort-Object Count -Descending |
    Select-Object -First 8 Count, Name |
    Format-Table -AutoSize
}