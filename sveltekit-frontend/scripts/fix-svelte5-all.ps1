# Svelte 5 Migration - One-Shot Fix Script
# Fixes: on: events, <svelte:component>, lucide imports, self-closing tags

Write-Host "🔧 Svelte 5 Migration Cleanup Starting..." -ForegroundColor Cyan

# STEP 1: Fix on: event directives → event attributes
Write-Host "`n1️⃣ Converting on: directives to event attributes..." -ForegroundColor Yellow
$files = Get-ChildItem src -Recurse -Filter *.svelte
$eventCount = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content

  $content = $content -replace 'on:click=', 'onclick='
  $content = $content -replace 'on:submit=', 'onsubmit='
  $content = $content -replace 'on:change=', 'onchange='
  $content = $content -replace 'on:input=', 'oninput='
  $content = $content -replace 'on:keydown=', 'onkeydown='
  $content = $content -replace 'on:keyup=', 'onkeyup='
  $content = $content -replace 'on:focus=', 'onfocus='
  $content = $content -replace 'on:blur=', 'onblur='
  $content = $content -replace 'on:mouseenter=', 'onmouseenter='
  $content = $content -replace 'on:mouseleave=', 'onmouseleave='

  if ($content -ne $original) {
    Set-Content $file.FullName $content
    $eventCount++
    Write-Host "  ✓ $($file.FullName)" -ForegroundColor Green
  }
}
Write-Host "  → Fixed $eventCount files" -ForegroundColor Green

# STEP 2: Fix lucide-svelte imports
Write-Host "`n2️⃣ Fixing lucide-svelte imports..." -ForegroundColor Yellow
$lucideCount = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content

  # Fix: import X from "lucide-svelte/icons/x" → import { X } from "lucide-svelte"
  $content = $content -replace 'import\s+(\w+)\s+from\s+["\']lucide-svelte/icons/[^"\']+["\']', 'import { $1 } from "lucide-svelte"'

  # Fix: import { X } from "lucide-svelte/icons" → import { X } from "lucide-svelte"
  $content = $content -replace 'from\s+["\']lucide-svelte/icons["\']', 'from "lucide-svelte"'

  if ($content -ne $original) {
    Set-Content $file.FullName $content
    $lucideCount++
    Write-Host "  ✓ $($file.FullName)" -ForegroundColor Green
  }
}
Write-Host "  → Fixed $lucideCount files" -ForegroundColor Green

# STEP 3: Fix self-closing non-void tags
Write-Host "`n3️⃣ Fixing self-closing non-void tags..." -ForegroundColor Yellow
$tagCount = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content

  # Fix <div ... /> → <div ...></div>
  $content = $content -replace '<div([^>]*?)\s*/>', '<div$1></div>'

  # Fix <span ... /> → <span ...></span>
  $content = $content -replace '<span([^>]*?)\s*/>', '<span$1></span>'

  # Fix <section ... /> → <section ...></section>
  $content = $content -replace '<section([^>]*?)\s*/>', '<section$1></section>'

  if ($content -ne $original) {
    Set-Content $file.FullName $content
    $tagCount++
    Write-Host "  ✓ $($file.FullName)" -ForegroundColor Green
  }
}
Write-Host "  → Fixed $tagCount files" -ForegroundColor Green

# STEP 4: Remove <svelte:component> usage
Write-Host "`n4️⃣ Removing <svelte:component> patterns..." -ForegroundColor Yellow
$componentCount = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content

  # Fix: <svelte:component this={X} ... /> → <X ... />
  $content = $content -replace '<svelte:component\s+this=\{([^}]+)\}([^>]*?)\s*/>', '<$1$2 />'

  if ($content -ne $original) {
    Set-Content $file.FullName $content
    $componentCount++
    Write-Host "  ✓ $($file.FullName)" -ForegroundColor Green
  }
}
Write-Host "  → Fixed $componentCount files" -ForegroundColor Green

# STEP 5: Summary
Write-Host "`n✅ Svelte 5 Migration Complete!" -ForegroundColor Green
Write-Host "  • Event directives: $eventCount files"
Write-Host "  • Lucide imports: $lucideCount files"
Write-Host "  • Self-closing tags: $tagCount files"
Write-Host "  • Svelte components: $componentCount files"
Write-Host "`n🔍 Verifying fixes..." -ForegroundColor Cyan

# Verify no remaining issues
$onCount = (rg "on:" src --glob "*.svelte" 2>$null | Measure-Object -Line).Lines
$lucideIssues = (rg "lucide-svelte/icons" src --glob "*.svelte" 2>$null | Measure-Object -Line).Lines
$componentIssues = (rg "<svelte:component" src --glob "*.svelte" 2>$null | Measure-Object -Line).Lines

if ($onCount -eq 0 -and $lucideIssues -eq 0 -and $componentIssues -eq 0) {
  Write-Host "✅ All fixes verified!" -ForegroundColor Green
} else {
  Write-Host "⚠️ Remaining issues found:" -ForegroundColor Yellow
  if ($onCount -gt 0) { Write-Host "  • on: directives: $onCount" }
  if ($lucideIssues -gt 0) { Write-Host "  • lucide imports: $lucideIssues" }
  if ($componentIssues -gt 0) { Write-Host "  • svelte:component: $componentIssues" }
}

Write-Host "`n🚀 Ready to build!" -ForegroundColor Cyan
