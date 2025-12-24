# Svelte 5 Event Handler Migration Script
# Converts legacy on:event to onclick patterns

param(
    [string]$Path = "src",
    [switch]$DryRun,
    [switch]$IncludeQuarantined
)

Write-Host "🔄 Svelte 5 Event Handler Migration" -ForegroundColor Cyan
Write-Host ""

$replacements = @(
    @{ Old = 'on:click='; New = 'onclick=' }
    @{ Old = 'on:submit='; New = 'onsubmit=' }
    @{ Old = 'on:change='; New = 'onchange=' }
    @{ Old = 'on:input='; New = 'oninput=' }
    @{ Old = 'on:focus='; New = 'onfocus=' }
    @{ Old = 'on:blur='; New = 'onblur=' }
    @{ Old = 'on:keydown='; New = 'onkeydown=' }
    @{ Old = 'on:keyup='; New = 'onkeyup=' }
    @{ Old = 'on:keypress='; New = 'onkeypress=' }
    @{ Old = 'on:mouseenter='; New = 'onmouseenter=' }
    @{ Old = 'on:mouseleave='; New = 'onmouseleave=' }
    @{ Old = 'on:mouseover='; New = 'onmouseover=' }
    @{ Old = 'on:mouseout='; New = 'onmouseout=' }
    @{ Old = 'on:load='; New = 'onload=' }
)

$paths = @($Path)
if ($IncludeQuarantined) {
    $paths += "quarantined-routes", "sveltekit-evidence/src"
}

$totalFiles = 0
$totalReplacements = 0

foreach ($searchPath in $paths) {
    if (-not (Test-Path $searchPath)) {
        Write-Host "⚠️  Path not found: $searchPath" -ForegroundColor Yellow
        continue
    }

    Write-Host "📁 Processing: $searchPath" -ForegroundColor Green

    $files = Get-ChildItem -Path $searchPath -Recurse -Include *.svelte -File

    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw
        $modified = $false
        $fileReplacements = 0

        foreach ($replacement in $replacements) {
            if ($content -match [regex]::Escape($replacement.Old)) {
                $count = ([regex]::Matches($content, [regex]::Escape($replacement.Old))).Count
                if ($count -gt 0) {
                    $fileReplacements += $count
                    $modified = $true

                    if (-not $DryRun) {
                        $content = $content.Replace($replacement.Old, $replacement.New)
                    }

                    Write-Host "  ✓ $($file.Name): $count × $($replacement.Old) → $($replacement.New)" -ForegroundColor Gray
                }
            }
        }

        if ($modified) {
            $totalFiles++
            $totalReplacements += $fileReplacements

            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -NoNewline
            }
        }
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Files modified: $totalFiles" -ForegroundColor White
Write-Host "  Total replacements: $totalReplacements" -ForegroundColor White

if ($DryRun) {
    Write-Host ""
    Write-Host "ℹ️  DRY RUN - No files were modified" -ForegroundColor Yellow
    Write-Host "   Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ Migration complete!" -ForegroundColor Green
}
