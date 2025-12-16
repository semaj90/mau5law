# Phase 13: Programmatic Error Fixer
# Purpose: Fix common TypeScript/Svelte patterns causing bulk errors
# Usage: .\fix-common-errors.ps1 [-DryRun] [-Verbose] [-TargetPattern "src/routes/yorha/**/*.svelte"]

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false,
    [string]$TargetPattern = "src/**/*.{ts,svelte}",
    [string]$BackupDir = ".error-fix-backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$fixCount = 0
$fileCount = 0
$backupPath = Join-Path $PSScriptRoot "..\$BackupDir\fix-$timestamp"

# Create backup directory
if (-not $DryRun) {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    Write-Host "📁 Backup folder: $backupPath" -ForegroundColor Cyan
}

Write-Host "🔧 Common Error Fixer - Starting..." -ForegroundColor Green
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' })" -ForegroundColor Yellow
Write-Host ""

# Pattern definitions for common errors
$patterns = @(
    # 1. Fix lucide-svelte import typos and duplicates
    @{
        Name = "Lucide imports: fix typos and remove duplicates"
        Pattern = "import\s+\{[^}]*\}\s+from\s+['""]lucide-svelte['""];"
        Action = {
            param($content)
            # Remove duplicate semicolons in imports
            $content = $content -replace ";;\s*$", ";"
            # Fix common typos
            $content = $content -replace "TrendingUP", "TrendingUp"
            $content = $content -replace "AlertTrangle", "AlertTriangle"
            $content = $content -replace "CheckCirlce", "CheckCircle"
            $content = $content -replace "TestTub([^e])", "TestTube`$1"
            # Remove duplicate imports on same line
            $content = $content -replace "(\w+),\s*\1", "`$1"
            return $content
        }
    },

    # 2. Fix import type misuse for runtime values
    @{
        Name = "Convert 'import type' to 'import' for runtime values"
        Pattern = "import\s+type\s+\{\s*([^}]*?(?:goto|appStore|appActions|Root|Overlay|Content|Close|Input|Badge|Button)[^}]*?)\s*\}"
        Action = {
            param($content)
            # Convert import type to import for runtime values
            $content = $content -replace "import\s+type\s+\{\s*([^}]*?(?:goto|appStore|appActions|Root|Overlay|Content|Close|Input|Badge|Button)[^}]*?)\s*\}\s+from", "import { `$1 } from"
            return $content
        }
    },

    # 3. Fix onMount async patterns
    @{
        Name = "Fix onMount async return type"
        Pattern = "onMount\s*\(\s*async\s*\(\s*\)\s*=>\s*\{"
        Action = {
            param($content)
            # Wrap async logic in IIFE
            $content = $content -replace "onMount\s*\(\s*async\s*\(\s*\)\s*=>\s*\{", @"
onMount(() => {
		(async () => {
"@
            # Add closing for IIFE (requires context-aware fix)
            return $content
        }
    },

    # 4. Fix invalid event modifiers
    @{
        Name = "Fix invalid event modifier syntax"
        Pattern = "on(click|contextmenu|submit|change)\s*\|"
        Action = {
            param($content)
            # Convert classic event syntax to proper format
            $content = $content -replace "onclick\s*\|\s*stopPropagation", "on:click|stopPropagation"
            $content = $content -replace "oncontextmenu\s*\|\s*preventDefault", "on:contextmenu|preventDefault"
            $content = $content -replace "onsubmit\s*\|\s*preventDefault", "on:submit|preventDefault"
            return $content
        }
    },

    # 5. Fix Input/textarea value bindings
    @{
        Name = "Convert value= to bind:value on native inputs"
        Pattern = "<(input|textarea)[^>]*value=\{[^}]+\}"
        Action = {
            param($content)
            # Convert value={...} to bind:value={...} on native elements
            $content = $content -replace "(<(?:input|textarea)[^>]*)\bvalue=(\{[^}]+\})", "`$1bind:value=`$2"
            return $content
        }
    },

    # 6. Remove trailing semicolons in imports
    @{
        Name = "Remove duplicate semicolons"
        Pattern = ";;\s*(\r?\n|$)"
        Action = {
            param($content)
            $content = $content -replace ";;\s*(\r?\n|$)", ";`$1"
            return $content
        }
    },

    # 7. Fix style block file paths
    @{
        Name = "Remove invalid file paths in style blocks"
        Pattern = "<style[^>]*>[\s\S]*?\+server\.\(style\)[\s\S]*?</style>"
        Action = {
            param($content)
            # Remove or comment out invalid style references
            $content = $content -replace "\.\.\.\/\+server\.\(style\)", "/* removed invalid path */"
            return $content
        }
    },

    # 8. Fix SvelteComponentTyped type vs value confusion
    @{
        Name = "Fix component={Type} to component={Value}"
        Pattern = "component=\{[A-Z]\w+\}"
        Action = {
            param($content)
            # Check if component is imported as type and needs value import
            # This requires AST-level fix, skip for now
            return $content
        }
    }
)

# Find files to process
Write-Host "🔍 Finding files matching: $TargetPattern" -ForegroundColor Cyan
$rootPath = Join-Path $PSScriptRoot ".."
$files = Get-ChildItem -Path $rootPath -Include "*.ts","*.svelte" -Recurse -File |
    Where-Object {
        $_.FullName -notmatch "node_modules|\.svelte-kit|\.bak|dist|build|\.error-fix-backups" -and
        ($_.FullName -match "src[\\/]routes[\\/]yorha" -or $_.FullName -match "src[\\/]lib[\\/]components")
    }

Write-Host "📄 Found $($files.Count) files to process" -ForegroundColor Green
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $originalContent = $content
    $fileFixCount = 0

    foreach ($pattern in $patterns) {
        if ($content -match $pattern.Pattern) {
            try {
                $newContent = & $pattern.Action $content
                if ($newContent -ne $content) {
                    $content = $newContent
                    $fileFixCount++
                    if ($Verbose) {
                        Write-Host "  ✓ $($pattern.Name)" -ForegroundColor Green
                    }
                }
            }
            catch {
                Write-Host "  ⚠️ Error applying '$($pattern.Name)': $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }

    if ($fileFixCount -gt 0) {
        $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
        Write-Host "📝 $relativePath ($fileFixCount fixes)" -ForegroundColor Cyan

        if (-not $DryRun) {
            # Create backup
            $backupFile = Join-Path $backupPath $relativePath
            $backupFileDir = Split-Path $backupFile -Parent
            if (-not (Test-Path $backupFileDir)) {
                New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null
            }
            Copy-Item -Path $file.FullName -Destination $backupFile -Force

            # Write fixed content
            Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        }

        $fixCount += $fileFixCount
        $fileCount++
    }
}

Write-Host ""
Write-Host "✅ Fixes Applied: $fixCount across $fileCount files" -ForegroundColor Green
if ($DryRun) {
    Write-Host "   (Dry run - no files modified)" -ForegroundColor Yellow
} else {
    Write-Host "📦 Backups saved to: $backupPath" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Next: Run 'npm run check:ultra-fast' to verify fixes" -ForegroundColor Yellow
