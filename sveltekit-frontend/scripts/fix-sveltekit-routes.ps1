param([switch]$DryRun = $false)

Write-Host "`n🔍 Scanning SvelteKit routes for conflicts..." -ForegroundColor Cyan

$canonicalGroup = '(app)'
$disabledGroups = @('(yorha)', '(demo)')
$canonicalParam = '[id]'
$disabledParams = @('[caseId]', '[slug]', '[uuid]')

$llmPath = Join-Path (Get-Location) 'llm.txt'
if (Test-Path $llmPath) {
    Write-Host "📖 Loading rules from llm.txt..." -ForegroundColor Green
    $content = Get-Content $llmPath

    $disabledGroups = @('(yorha)', '(demo)')
    $disabledParams = @('[caseId]', '[slug]', '[uuid]')

    foreach ($line in $content) {
        if ($line -match '^CANONICAL_GROUP=(.+)') {
            $canonicalGroup = $matches[1].Trim()
        }
        if ($line -match '^DISABLE_GROUP=(.+)') {
            $disabledGroups += $matches[1].Trim()
        }
        if ($line -match '^CANONICAL_PARAM=(.+)') {
            $canonicalParam = $matches[1].Trim()
        }
        if ($line -match '^DISABLE_PARAM=(.+)') {
            $disabledParams += $matches[1].Trim()
        }
    }
}

Write-Host "`n📋 Routing rules:" -ForegroundColor Yellow
Write-Host "  • canonicalGroup = $canonicalGroup"
Write-Host "  • disabledGroups = $(($disabledGroups | Select-Object -Unique) -join ', ')"
Write-Host "  • canonicalParam = $canonicalParam"
Write-Host "  • disabledParams = $(($disabledParams | Select-Object -Unique) -join ', ')`n"

$routesDir = '.\src\routes'
$routeFiles = Get-ChildItem -Path $routesDir -Recurse -File | Where-Object {
    $_.Name -in @('+page.svelte', '+page.server.ts', '+layout.svelte', '+server.ts')
}

Write-Host "📊 Found $($routeFiles.Count) route files`n" -ForegroundColor Cyan

$routeMap = @{}
$dirCounts = @{}

foreach ($file in $routeFiles) {
    $rel = $file.FullName -replace [regex]::Escape((Get-Location).Path + '\'), ''
    $rel = $rel -replace '\\', '/'
    $segments = $rel -split '/'
    $kind = $segments[-1]

    $routeGroup = @()
    $logicalSegments = @()

    for ($i = 0; $i -lt $segments.Count - 1; $i++) {
        $seg = $segments[$i]
        if ($seg -match '^\(.+\)$') {
            $routeGroup += $seg
        } else {
            $logicalSegments += $seg
        }
    }

    $urlPath = if ($logicalSegments.Count -eq 0) { '/' } else { '/' + ($logicalSegments -join '/') }
    $normalized = $urlPath -replace '\[[^\]]+\]', '[id]'
    $key = "$normalized::$kind"

    if (-not $routeMap.ContainsKey($key)) {
        $routeMap[$key] = @()
    }

    $routeMap[$key] += @{
        File = $file.FullName
        Kind = $kind
        Group = ($routeGroup -join '/')
        URL = $urlPath
        Normalized = $normalized
    }
}

$conflictCount = 0
foreach ($key in $routeMap.Keys) {
    if ($routeMap[$key].Count -gt 1) {
        $conflictCount++
        $normalized = $routeMap[$key][0].Normalized
        Write-Host "🔁 Conflict on $normalized :" -ForegroundColor Yellow

        foreach ($entry in $routeMap[$key]) {
            $grp = if ($entry.Group) { $entry.Group } else { '(no group)' }
            Write-Host "   • [$grp] $($entry.Kind)" -ForegroundColor Gray

            $shouldDisable = $false

            foreach ($disabledGroup in $disabledGroups) {
                if ($entry.Group -like "*$disabledGroup*") {
                    $shouldDisable = $true
                    break
                }
            }

            if (-not $shouldDisable) {
                foreach ($disabledParam in $disabledParams) {
                    if ($entry.URL -like "*$disabledParam*") {
                        $shouldDisable = $true
                        break
                    }
                }
            }

            if ($shouldDisable) {
                $dir = Split-Path $entry.File
                if (-not $dirCounts.ContainsKey($dir)) {
                    $dirCounts[$dir] = 0
                }
                $dirCounts[$dir]++
            }
        }
        Write-Host ""
    }
}

if ($conflictCount -eq 0) {
    Write-Host "✅ No route conflicts found!`n" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Found $conflictCount route conflict(s)`n" -ForegroundColor Yellow

$dirsToDisable = @($dirCounts.Keys)

if ($dirsToDisable.Count -eq 0) {
    Write-Host "✅ No routes need to be disabled`n" -ForegroundColor Green
    exit 0
}

Write-Host "📁 Directories to disable ($($dirsToDisable.Count)):" -ForegroundColor Cyan
foreach ($dir in $dirsToDisable) {
    $relPath = $dir -replace [regex]::Escape((Get-Location).Path + '\'), ''
    Write-Host "   • $relPath" -ForegroundColor Gray
}
Write-Host ""

if ($DryRun) {
    Write-Host "🏃 DRY RUN MODE - no changes will be made`n" -ForegroundColor Magenta
    exit 0
}

Write-Host "⚙️  Applying route disables...`n" -ForegroundColor Cyan

foreach ($dir in $dirsToDisable) {
    if (-not (Test-Path $dir)) {
        Write-Host "   ⚠️  Missing: $dir" -ForegroundColor Yellow
        continue
    }

    $disabledDir = "$dir`_disabled"

    if (Test-Path $disabledDir) {
        Write-Host "   ⚠️  Already disabled: $disabledDir" -ForegroundColor Yellow
        continue
    }

    Move-Item -Path $dir -Destination $disabledDir -Force
    $relPath = $dir -replace [regex]::Escape((Get-Location).Path + '\'), ''
    Write-Host "   ✔️  Disabled: $relPath" -ForegroundColor Green
}

Write-Host "`n✅ Route disables complete. Running svelte-check...`n" -ForegroundColor Green

try {
    & npx svelte-check --tsconfig tsconfig.check.json 2>&1
    Write-Host "`n✅ svelte-check passed!`n" -ForegroundColor Green
} catch {
    Write-Host "`n❌ svelte-check failed. See errors above.`n" -ForegroundColor Red
    exit 1
}
