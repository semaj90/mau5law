# Phase 13: Codemod Bits UI Imports Script
# Purpose: Fix old Bits UI import paths to new format
# Usage: .\codemod-bitsui-imports.ps1 [-DryRun] [-BackupDir "backups"] [-Verbose]

param(
    [switch]$DryRun = $false,
    [string]$BackupDir = "backups",
    [switch]$Verbose = $false
)

# Configuration
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = "codemod-bitsui-imports_$timestamp.md"
$backupPath = Join-Path $BackupDir "bitsui-backup_$timestamp"

# Import patterns to fix
$importPatterns = @(
    @{
        Old = "from '@bits-ui/svelte/components/(\w+)'"
        New = "from '@bits-ui/svelte'"
        Description = "Fix component imports"
    },
    @{
        Old = "from '@bits-ui/svelte/components'"
        New = "from '@bits-ui/svelte'"
        Description = "Fix components directory imports"
    },
    @{
        Old = "from '@bits-ui/svelte/types'"
        New = "from '@bits-ui/svelte'"
        Description = "Fix types imports"
    }
)

# Initialize report
$report = @"
# Bits UI Import Codemod Report
**Generated:** $timestamp
**Mode:** $(if ($DryRun) { "DRY RUN" } else { "EXECUTE" })

## Summary

"@

$filesModified = 0
$importsFixed = 0
$errors = @()

Write-Host "Starting Bits UI import codemod..." -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { "DRY RUN" } else { "EXECUTE" })" -ForegroundColor Yellow

# Find all Svelte and TypeScript files
$files = Get-ChildItem -Path "src" -Recurse -Include "*.svelte", "*.ts", "*.tsx" -ErrorAction SilentlyContinue

Write-Host "Found $($files.Count) files to scan" -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $originalContent = $content
    $fileModified = $false
    $fileImportsFixed = 0

    foreach ($pattern in $importPatterns) {
        if ($content -match $pattern.Old) {
            $fileModified = $true
            $matches = [regex]::Matches($content, $pattern.Old)
            $fileImportsFixed += $matches.Count

            if ($Verbose) {
                Write-Host "  Found: $($pattern.Description) in $($file.Name)" -ForegroundColor Gray
            }

            $content = $content -replace $pattern.Old, $pattern.New
        }
    }

    if ($fileModified) {
        $filesModified++
        $importsFixed += $fileImportsFixed

        if (-not $DryRun) {
            # Create backup
            if (-not (Test-Path $backupPath)) {
                New-Item -ItemType Directory -Path $backupPath | Out-Null
            }

            $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ""
            $backupFile = Join-Path $backupPath $relativePath
            $backupFileDir = Split-Path $backupFile -Parent

            if (-not (Test-Path $backupFileDir)) {
                New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null
            }

            Copy-Item -Path $file.FullName -Destination $backupFile -Force

            # Write modified content
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8

            Write-Host "✅ Modified: $($file.Name) ($fileImportsFixed imports fixed)" -ForegroundColor Green
        } else {
            Write-Host "🔍 Would modify: $($file.Name) ($fileImportsFixed imports)" -ForegroundColor Cyan
        }
    }
}

$report += @"
- **Files Scanned:** $($files.Count)
- **Files Modified:** $filesModified
- **Imports Fixed:** $importsFixed
- **Status:** $(if ($importsFixed -eq 0) { "✅ No changes needed" } else { "✅ Complete" })

## Details

### Modified Files ($filesModified)
"@

if ($filesModified -gt 0) {
    $report += "`n"
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        $fileModified = $false
        foreach ($pattern in $importPatterns) {
            if ($content -match $pattern.Old) {
                $fileModified = $true
                break
            }
        }

        if ($fileModified) {
            $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path + "\"), ""
            $report += "- $relativePath`n"
        }
    }
} else {
    $report += "`nNo files needed modification.`n"
}

$report += @"

### Import Patterns Fixed
"@

foreach ($pattern in $importPatterns) {
    $report += "`n- **$($pattern.Description)**`n"
    $report += "  - Old: \`$($pattern.Old)\``n"
    $report += "  - New: \`$($pattern.New)\``n"
}

$report += @"

## Backup Information
"@

if ($filesModified -gt 0 -and -not $DryRun) {
    $report += "`n- **Backup Location:** $backupPath`n"
    $report += "- **Backup Timestamp:** $timestamp`n"
    $report += "- **Files Backed Up:** $filesModified`n"
} else {
    $report += "`nNo backups created (dry run or no changes).`n"
}

$report += @"

## Recommendations
"@

if ($DryRun) {
    $report += "`n✅ Dry run complete. Review changes above and run without -DryRun to apply.`n"
} elseif ($importsFixed -eq 0) {
    $report += "`n✅ All imports are already in the correct format.`n"
} else {
    $report += "`n✅ Imports have been updated. Backups saved to: $backupPath`n"
}

# Save report
$report | Out-File -FilePath $reportFile -Encoding UTF8

# Display summary
Write-Host "`n" -ForegroundColor Cyan
Write-Host "Codemod Complete" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Files Scanned:    $($files.Count)" -ForegroundColor Cyan
Write-Host "Files Modified:   $filesModified" -ForegroundColor $(if ($filesModified -eq 0) { "Green" } else { "Yellow" })
Write-Host "Imports Fixed:    $importsFixed" -ForegroundColor $(if ($importsFixed -eq 0) { "Green" } else { "Yellow" })
Write-Host "`nReport saved to: $reportFile" -ForegroundColor Cyan

if ($filesModified -gt 0 -and -not $DryRun) {
    Write-Host "Backups saved to: $backupPath" -ForegroundColor Cyan
}

if ($Verbose) {
    Write-Host "`nDetailed Report:" -ForegroundColor Yellow
    Write-Host $report
}

exit 0
