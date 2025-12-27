$ErrorActionPreference = "Stop"

Write-Host "Running TSC to get fresh errors..."
cmd /c "npx tsc --noEmit --skipLibCheck > reports/tsc-raw.txt 2>&1"

Write-Host "Analyzing errors..."
$raw = Get-Content reports\tsc-raw.txt

$first = @{}  # file -> @{ line=; col=; msg=; code= }
foreach ($l in $raw) {
  if ($l -match "^(?<file>src/[^()]+)\((?<line>\d+),(?<col>\d+)\): error (?<code>TS\d+): (?<msg>.+)$") {
    $f = $matches.file.Trim()
    # Normalize path separators
    $f = $f -replace '/', '\'
    if (-not $first.ContainsKey($f)) {
      $first[$f] = @{
        line = [int]$matches.line
        col  = [int]$matches.col
        code = $matches.code
        msg  = $matches.msg
      }
    }
  }
}

$out = New-Object System.Collections.Generic.List[string]
foreach ($kv in $first.GetEnumerator() | Sort-Object Name) {
  $f = $kv.Key
  $e = $kv.Value
  $line = $e.line
  $start = [Math]::Max(1, $line - 6)
  $count = 15

  $out.Add("")
  $out.Add("=== $f ($($e.code)) line $line col $($e.col) :: $($e.msg) ===")

  if (Test-Path $f) {
    $content = Get-Content $f
    $slice = $content | Select-Object -Skip ($start-1) -First $count
    $n = $start
    foreach ($s in $slice) {
      $out.Add(("{0,5}: {1}" -f $n, $s))
      $n++
    }
  } else {
    $out.Add("MISSING_FILE_ON_DISK")
  }
}

$out | Set-Content reports\first-errors_context.txt -Encoding utf8
Write-Host "wrote=reports\first-errors_context.txt  files=$($first.Count)"
