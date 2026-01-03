param([string]$Routes="src/routes")

$patterns = @(
  @{ a='\[id\]'; b='\[caseId\]'; hint='cases param conflict ([id] vs [caseId])' },
  @{ a='\[userId\]'; b='\[uid\]'; hint='user param conflict ([userId] vs [uid])' }
)

$hits = @()

foreach ($p in $patterns) {
  $aResults = rg -l --hidden --glob '!.git' --glob '!node_modules' "$($p.a)" $Routes 2>$null
  $bResults = rg -l --hidden --glob '!.git' --glob '!node_modules' "$($p.b)" $Routes 2>$null

  if ($aResults -and $bResults) {
    $hits += [pscustomobject]@{
      conflict=$p.hint
      pattern_a=$p.a
      pattern_b=$p.b
      count_a=($aResults | Measure-Object).Count
      count_b=($bResults | Measure-Object).Count
    }
  }
}

if ($hits.Count -gt 0) {
  Write-Host "❌ Route param conflicts detected:" -ForegroundColor Red
  $hits | Format-Table -AutoSize
  Write-Host ""
  Write-Host "Fix: Use ONE canonical param name per resource type." -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Route param guard passed - no conflicts detected." -ForegroundColor Green
exit 0
