#!/usr/bin/env pwsh
<#
.SYNOPSIS
    YoRHa Development Environment Cleanup Script
.DESCRIPTION
    Cleans up development environment: removes old logs, clears caches,
    optimizes disk space, and removes unused Docker resources.
.PARAMETER DryRun
    Show what would be cleaned without actually doing it
.PARAMETER Aggressive
    More aggressive cleanup (removes more files)
.PARAMETER Force
    Skip confirmation prompts
.EXAMPLE
    .\cleanup-dev.ps1 -DryRun
    .\cleanup-dev.ps1 -Aggressive
    .\cleanup-dev.ps1 -Force
#>

param(
    [switch]$DryRun,
    [switch]$Aggressive,
    [switch]$Force
)

# -------------------------------
# Configuration
# -------------------------------
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDir

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$White = "White"

# -------------------------------
# Functions
# -------------------------------
function Write-Header {
    param([string]$text)
    Write-Host "=== $text ===" -ForegroundColor $Cyan
}

function Write-Action {
    param([string]$text, [string]$color = $White)
    Write-Host "  → $text" -ForegroundColor $color
}

function Write-Success {
    param([string]$text)
    Write-Host "  ✓ $text" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$text)
    Write-Host "  ⚠ $text" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$text)
    Write-Host "  ✗ $text" -ForegroundColor $Red
}

function Get-FolderSize {
    param([string]$path)
    if (Test-Path $path) {
        $size = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1GB, 2)
    }
    return 0
}

function Remove-OldFiles {
    param([string]$path, [int]$daysOld = 30, [string]$pattern = "*")

    if (!(Test-Path $path)) { return 0 }

    $cutoffDate = (Get-Date).AddDays(-$daysOld)
    $files = Get-ChildItem -Path $path -File -Recurse -Include $pattern -ErrorAction SilentlyContinue |
             Where-Object { $_.LastWriteTime -lt $cutoffDate }

    $totalSize = 0
    foreach ($file in $files) {
        $totalSize += $file.Length
        if (!$DryRun) {
            try {
                Remove-Item $file.FullName -Force -ErrorAction Stop
            } catch {
                Write-Warning "Failed to remove: $($file.FullName)"
            }
        }
    }

    return [math]::Round($totalSize / 1MB, 2)
}

# -------------------------------
# Main Cleanup Logic
# -------------------------------
Write-Header "YoRHa Development Environment Cleanup"
Write-Host "Workspace: $workspaceRoot" -ForegroundColor $White
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' }) | Aggressive: $Aggressive | Force: $Force" -ForegroundColor $Yellow
Write-Host ""

$totalSpaceFreed = 0
$cleanupActions = @()

# 1. Clean old log files
Write-Header "Cleaning Log Files"
$logSize = Remove-OldFiles -path "$workspaceRoot\logs" -daysOld 7 -pattern "*.log"
if ($logSize -gt 0) {
    Write-Action "Removed $logSize MB of old log files (>7 days)" -color $Green
    $totalSpaceFreed += $logSize
    $cleanupActions += "Removed old log files"
} else {
    Write-Action "No old log files to remove" -color $White
}

# 2. Clean .cache directories
Write-Header "Cleaning Cache Directories"
$cacheDirs = @(
    "$workspaceRoot\.cache",
    "$workspaceRoot\sveltekit-frontend\.cache",
    "$workspaceRoot\sveltekit-frontend\node_modules\.cache"
)

foreach ($cacheDir in $cacheDirs) {
    if (Test-Path $cacheDir) {
        $beforeSize = Get-FolderSize $cacheDir
        if ($beforeSize -gt 1.0 -or $Aggressive) {
            if (!$DryRun) {
                try {
                    Remove-Item $cacheDir -Recurse -Force -ErrorAction Stop
                    Write-Action "Removed cache directory: $(Split-Path $cacheDir -Leaf) ($beforeSize GB)" -color $Green
                    $totalSpaceFreed += ($beforeSize * 1024)
                    $cleanupActions += "Cleaned $(Split-Path $cacheDir -Leaf) cache"
                } catch {
                    Write-Warning "Failed to remove cache directory: $cacheDir"
                }
            } else {
                Write-Action "Would remove cache directory: $(Split-Path $cacheDir -Leaf) ($beforeSize GB)" -color $Yellow
            }
        } else {
            Write-Action "Cache directory $(Split-Path $cacheDir -Leaf) is small ($beforeSize GB), skipping" -color $White
        }
    }
}

# 3. Clean NPM cache
Write-Header "Cleaning NPM Cache"
try {
    if (!$DryRun) {
        $npmOutput = npm cache clean --force 2>&1
        Write-Action "Cleaned NPM cache" -color $Green
        $cleanupActions += "Cleaned NPM cache"
    } else {
        Write-Action "Would clean NPM cache" -color $Yellow
    }
} catch {
    Write-Warning "NPM cache clean failed: $($_.Exception.Message)"
}

# 4. Clean Docker resources
Write-Header "Cleaning Docker Resources"
try {
    # Remove dangling images
    $danglingImages = docker images -f "dangling=true" -q
    if ($danglingImages) {
        if (!$DryRun) {
            docker rmi $danglingImages 2>$null | Out-Null
            Write-Action "Removed dangling Docker images" -color $Green
            $cleanupActions += "Removed dangling Docker images"
        } else {
            Write-Action "Would remove dangling Docker images" -color $Yellow
        }
    } else {
        Write-Action "No dangling Docker images found" -color $White
    }

    # Remove stopped containers (older than 1 hour)
    $stoppedContainers = docker ps -a --filter "status=exited" --filter "status=created" --format "{{.ID}} {{.CreatedAt}}"
    foreach ($container in $stoppedContainers) {
        $parts = $container -split " "
        $containerId = $parts[0]
        $createdAt = [DateTime]::Parse($parts[1..($parts.Length-1)] -join " ")

        if ((Get-Date) - $createdAt -gt [TimeSpan]::FromHours(1)) {
            if (!$DryRun) {
                docker rm $containerId 2>$null | Out-Null
                Write-Action "Removed old stopped container: $containerId" -color $Green
                $cleanupActions += "Removed old containers"
            } else {
                Write-Action "Would remove old stopped container: $containerId" -color $Yellow
            }
        }
    }

    # Clean Docker build cache
    if (!$DryRun) {
        docker builder prune -f 2>$null | Out-Null
        Write-Action "Cleaned Docker build cache" -color $Green
        $cleanupActions += "Cleaned Docker build cache"
    } else {
        Write-Action "Would clean Docker build cache" -color $Yellow
    }

} catch {
    Write-Warning "Docker cleanup failed: $($_.Exception.Message)"
}

# 5. Clean temporary files
Write-Header "Cleaning Temporary Files"
$tempPatterns = @("*.tmp", "*.temp", "*.bak", "*.old")
foreach ($pattern in $tempPatterns) {
    $tempSize = Remove-OldFiles -path $workspaceRoot -daysOld 1 -pattern $pattern
    if ($tempSize -gt 0) {
        Write-Action "Removed $tempSize MB of $pattern files" -color $Green
        $totalSpaceFreed += $tempSize
        $cleanupActions += "Removed temporary files"
    }
}

# 6. Aggressive cleanup (if requested)
if ($Aggressive) {
    Write-Header "Aggressive Cleanup Mode"

    # Remove node_modules/.cache in all subdirectories
    $nodeCacheDirs = Get-ChildItem -Path $workspaceRoot -Directory -Recurse |
                     Where-Object { $_.Name -eq "node_modules" } |
                     ForEach-Object { Join-Path $_.FullName ".cache" }

    foreach ($cacheDir in $nodeCacheDirs) {
        if (Test-Path $cacheDir) {
            $cacheSize = Get-FolderSize $cacheDir
            if (!$DryRun) {
                Remove-Item $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Action "Removed aggressive cache: $cacheDir ($cacheSize GB)" -color $Green
                $totalSpaceFreed += ($cacheSize * 1024)
                $cleanupActions += "Aggressive cache cleanup"
            } else {
                Write-Action "Would remove aggressive cache: $cacheDir ($cacheSize GB)" -color $Yellow
            }
        }
    }

    # Clean Python cache files
    $pycFiles = Get-ChildItem -Path $workspaceRoot -Recurse -Include "__pycache__", "*.pyc", "*.pyo" -ErrorAction SilentlyContinue
    $pycCount = $pycFiles.Count
    if ($pycCount -gt 0) {
        if (!$DryRun) {
            $pycFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Action "Removed $pycCount Python cache directories/files" -color $Green
            $cleanupActions += "Cleaned Python cache"
        } else {
            Write-Action "Would remove $pycCount Python cache directories/files" -color $Yellow
        }
    }
}

# -------------------------------
# Summary
# -------------------------------
Write-Header "Cleanup Summary"

if ($cleanupActions.Count -gt 0) {
    Write-Host "Actions performed:" -ForegroundColor $White
    foreach ($action in $cleanupActions) {
        Write-Success $action
    }
} else {
    Write-Host "No cleanup actions were needed." -ForegroundColor $White
}

Write-Host ""
Write-Host "Estimated space freed: $([math]::Round($totalSpaceFreed, 2)) MB" -ForegroundColor $Green

if ($DryRun) {
    Write-Host ""
    Write-Warning "This was a DRY RUN - no files were actually removed."
    Write-Host "Run without -DryRun to perform actual cleanup." -ForegroundColor $White
}

Write-Host ""
Write-Success "YoRHa cleanup complete!"