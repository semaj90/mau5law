<#
.SYNOPSIS
  Batch-repair Svelte 5 migration & TypeScript syntax errors
.DESCRIPTION
  Applies multiple codemod passes to fix:
  - orphan {/if}, missing {#if}
  - bad object syntax `{ from string }`
  - import errors (lucide-svelte / .svelte defaults)
  - missing lang="ts"
  - CSS colon fixes
  - unknown → any casts
  - wrap reactive vars in $state(...)
  Logs changes into migration-fixes-YYYYMMDD-HHmm.log
.EXAMPLE
  .\fix-svelte5-migration.ps1
  .\fix-svelte5-migration.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [string]$RootPath = "C:\Users\james\Videos\deeds-web-app\sveltekit-frontend"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$logFile = Join-Path $RootPath "migration-fixes-$timestamp.log"
$summaryFile = Join-Path $RootPath "migration-summary-$timestamp.json"

# Statistics tracking
$stats = @{
    TotalFiles = 0
    ModifiedFiles = 0
    RulesApplied = @{}
    Errors = @()
    StartTime = Get-Date
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage
    if ($Level -eq "ERROR") {
        Write-Host $logMessage -ForegroundColor Red
    } elseif ($Level -eq "WARN") {
        Write-Host $logMessage -ForegroundColor Yellow
    } else {
        Write-Host $logMessage
    }
}

function Increment-RuleCounter {
    param([string]$RuleName)
    if (-not $stats.RulesApplied.ContainsKey($RuleName)) {
        $stats.RulesApplied[$RuleName] = 0
    }
    $stats.RulesApplied[$RuleName]++
}

function Apply-Codemods {
    param(
        [string]$Content,
        [string]$FilePath,
        [ref]$Applied
    )
    
    $modified = $Content
    $rulesApplied = @()
    $fileExt = [System.IO.Path]::GetExtension($FilePath)

    # ========== PHASE 1: HTML/Svelte Structure ==========
    
    # Rule 1: Remove stray </div> before {/if}
    if ($modified -match '</div>\s*\{/if\}') {
        $modified = $modified -replace '</div>\s*(\{/if\})', '$1'
        $rulesApplied += "orphan-div-before-endif"
    }
    
    # Rule 2: Add missing {#if} before orphan {/if}
    if ($modified -match '\{/if\}' -and $modified -notmatch '\{#if') {
        # This is complex - log for manual review
        Write-Log "WARNING: Found {/if} without {#if} in $FilePath" "WARN"
    }
    
    # Rule 3: Ensure <script> tags have lang="ts"
    if ($modified -match '<script(?!\s+lang)>') {
        $modified = $modified -replace '<script>', '<script lang="ts">'
        $rulesApplied += "add-script-lang-ts"
    }
    
    # Rule 4: Replace {@render children?.()} with <slot />
    if ($modified -match '\{@render\s+children\?\.\(\)\}') {
        $modified = $modified -replace '\{@render\s+children\?\.\(\)\}', '<slot />'
        $rulesApplied += "render-to-slot"
    }

    # ========== PHASE 2: Object Literal Syntax ==========
    
    # Rule 5: Fix { from string } to { from: string }
    if ($modified -match '\{\s*from\s+string\s*;') {
        $modified = $modified -replace '\{\s*from\s+string\s*;', '{ from: string;'
        $rulesApplied += "fix-object-from-type"
    }
    
    # Rule 6: Fix shorthand object properties
    if ($modified -match '\{\s*from\s+([a-zA-Z0-9_]+)\s*,\s*to\s+([a-zA-Z0-9_]+)\s*,\s*type\s+([a-zA-Z0-9_]+)\s*\}') {
        $modified = $modified -replace '\{\s*from\s+([a-zA-Z0-9_]+)\s*,\s*to\s+([a-zA-Z0-9_]+)\s*,\s*type\s+([a-zA-Z0-9_]+)\s*\}', '{ from: $1, to: $2, type: $3 }'
        $rulesApplied += "fix-object-shorthand"
    }
    
    # Rule 7: Fix property assignments in objects (skip - too aggressive)
    # Disabled: causes "from 'module'" imports to break
    # if ($modified -match "from\s+'([^']+)'") {
    #     $modified = $modified -replace "from\s+'([^']+)'", "from: '$1'"
    #     $rulesApplied += "fix-from-property"
    # }

    # ========== PHASE 3: Import Fixes ==========
    
    # Rule 8: Fix lucide-svelte imports (named to default)
    if ($modified -match 'import\s+\{\s*([A-Z][A-Za-z0-9_]*)\s*\}\s+from\s+[''"]lucide-svelte[''"]') {
        $modified = $modified -replace 'import\s+\{\s*([A-Z][A-Za-z0-9_]*)\s*\}\s+from\s+([''"])lucide-svelte\2', 'import $1 from $2lucide-svelte$2'
        $rulesApplied += "fix-lucide-imports"
    }
    
    # Rule 9: Fix .svelte imports (default to named) - ONLY for components
    if ($modified -match 'import\s+([A-Z][A-Za-z0-9_]+)\s+from\s+[''"](.+\.svelte)[''"]') {
        # Only apply if it looks like a component (PascalCase)
        $modified = $modified -replace 'import\s+([A-Z][A-Za-z0-9_]+)\s+from\s+([''"])(.+\.svelte)\2', 'import { $1 } from $2$3$2'
        $rulesApplied += "fix-svelte-named-imports"
    }

    # ========== PHASE 4: CSS Fixes ==========
    
    if ($fileExt -eq '.svelte' -or $fileExt -eq '.css') {
        # Rule 10: Fix CSS property colons
        if ($modified -match '(position|display|flex|grid)\s+[a-z-]+;') {
            $modified = $modified -replace '(position|display|flex|grid)\s+([a-z-]+);', '$1: $2;'
            $rulesApplied += "fix-css-colons"
        }
        
        # Rule 11: Fix position values
        if ($modified -match '(top|left|right|bottom|width|height)\s+\d') {
            $modified = $modified -replace '(top|left|right|bottom|width|height)\s+(\d+[a-z%]*)', '$1: $2'
            $rulesApplied += "fix-css-position-values"
        }
    }

    # ========== PHASE 5: TypeScript Cleanup ==========
    
    # Rule 12: unknown → any
    if ($modified -match ':\s*unknown\b') {
        $modified = $modified -replace ':\s*unknown\b', ': any'
        $rulesApplied += "unknown-to-any"
    }
    
    # Rule 13: never[] → any[]
    if ($modified -match 'never\[\]') {
        $modified = $modified -replace 'never\[\]', 'any[]'
        $rulesApplied += "never-array-to-any-array"
    }

    # ========== PHASE 6: $state Migration ==========
    
    # Rule 14: Wrap array literals in $state() for .svelte files
    if ($fileExt -eq '.svelte') {
        # Only wrap if not already wrapped
        if ($modified -match 'let\s+[a-zA-Z0-9_]+\s*=\s*\[' -and $modified -notmatch '\$state\(') {
            $modified = $modified -replace 'let\s+([a-zA-Z0-9_]+)\s*=\s*(\[[^\]]*\])', 'let $1 = $state($2)'
            $rulesApplied += "wrap-array-in-state"
        }
        
        # Rule 15: Wrap object literals in $state()
        if ($modified -match 'let\s+[a-zA-Z0-9_]+\s*=\s*\{' -and $modified -notmatch '\$state\(') {
            $modified = $modified -replace 'let\s+([a-zA-Z0-9_]+)\s*=\s*(\{[^}]*\})', 'let $1 = $state($2)'
            $rulesApplied += "wrap-object-in-state"
        }
    }

    # ========== PHASE 7: Event Handler Migration ==========
    
    # Rule 16: on:click → onclick
    if ($modified -match 'on:click=') {
        $modified = $modified -replace 'on:click=', 'onclick='
        $rulesApplied += "on-click-to-onclick"
    }
    
    # Rule 17: on:input → oninput
    if ($modified -match 'on:input=') {
        $modified = $modified -replace 'on:input=', 'oninput='
        $rulesApplied += "on-input-to-oninput"
    }
    
    # Rule 18: on:submit → onsubmit
    if ($modified -match 'on:submit=') {
        $modified = $modified -replace 'on:submit=', 'onsubmit='
        $rulesApplied += "on-submit-to-onsubmit"
    }
    
    # Rule 19: on:change → onchange
    if ($modified -match 'on:change=') {
        $modified = $modified -replace 'on:change=', 'onchange='
        $rulesApplied += "on-change-to-onchange"
    }

    # ========== PHASE 8: Cleanup & Formatting ==========
    
    # Rule 20: Remove trailing whitespace
    if ($modified -match '\s+$') {
        $modified = $modified -replace '\s+\n', "`n"
        $rulesApplied += "remove-trailing-whitespace"
    }
    
    # Rule 21: Normalize multiple blank lines
    if ($modified -match '\n{3,}') {
        $modified = $modified -replace '\n{3,}', "`n`n"
        $rulesApplied += "normalize-blank-lines"
    }

    # Update applied rules
    foreach ($rule in $rulesApplied) {
        Increment-RuleCounter $rule
    }
    
    $Applied.Value = $rulesApplied
    return $modified
}

# ========== MAIN EXECUTION ==========

Write-Log "========================================" "INFO"
Write-Log "SVELTE 5 MIGRATION AUTO-FIX" "INFO"
Write-Log "========================================" "INFO"
Write-Log "Root Path: $RootPath" "INFO"
Write-Log "Timestamp: $timestamp" "INFO"
Write-Log "Dry Run: $DryRun" "INFO"
Write-Log "" "INFO"

# Validate root path
if (-not (Test-Path $RootPath)) {
    Write-Log "ERROR: Root path does not exist: $RootPath" "ERROR"
    exit 1
}

# Get all target files - only from src/ directory
Write-Log "Scanning for files..." "INFO"
$srcPath = Join-Path $RootPath "src"
if (-not (Test-Path $srcPath)) {
    Write-Log "WARNING: src/ directory not found, scanning entire root" "WARN"
    $srcPath = $RootPath
}

$files = Get-ChildItem -Path $srcPath -Include *.svelte,*.ts,*.js,*.css -Recurse -ErrorAction SilentlyContinue |
    Where-Object { 
        $_.FullName -notmatch 'node_modules|\.git|build|\.svelte-kit|dist|\.backup|archive|test-results'
    }

$stats.TotalFiles = $files.Count
Write-Log "Found $($files.Count) files to process" "INFO"
Write-Log "" "INFO"

# Process each file
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $original = $content
        
        $appliedRules = @()
        $modified = Apply-Codemods -Content $content -FilePath $file.FullName -Applied ([ref]$appliedRules)
        
        if ($modified -ne $original) {
            $stats.ModifiedFiles++
            
            Write-Log "✔ Modified: $($file.FullName)" "INFO"
            Write-Log "  Rules applied: $($appliedRules -join ', ')" "INFO"
            
            # Log diff
            Write-Log "  --- DIFF START ---" "INFO"
            $originalLines = $original -split "`n"
            $modifiedLines = $modified -split "`n"
            
            $diff = Compare-Object -ReferenceObject $originalLines -DifferenceObject $modifiedLines |
                Select-Object -First 20  # Limit diff output
            
            foreach ($line in $diff) {
                if ($line.SideIndicator -eq '=>') {
                    Write-Log "  + $($line.InputObject)" "INFO"
                } elseif ($line.SideIndicator -eq '<=') {
                    Write-Log "  - $($line.InputObject)" "INFO"
                }
            }
            Write-Log "  --- DIFF END ---" "INFO"
            Write-Log "" "INFO"
            
            # Apply changes if not dry run
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $modified -NoNewline -ErrorAction Stop
            }
        }
    } catch {
        $errorMsg = "Error processing $($file.FullName): $($_.Exception.Message)"
        Write-Log $errorMsg "ERROR"
        $stats.Errors += $errorMsg
    }
}

# ========== FINAL SUMMARY ==========

$stats.EndTime = Get-Date
$stats.Duration = ($stats.EndTime - $stats.StartTime).TotalSeconds

Write-Log "" "INFO"
Write-Log "========================================" "INFO"
Write-Log "MIGRATION COMPLETE" "INFO"
Write-Log "========================================" "INFO"
Write-Log "Total files scanned: $($stats.TotalFiles)" "INFO"
Write-Log "Files modified: $($stats.ModifiedFiles)" "INFO"
Write-Log "Duration: $([math]::Round($stats.Duration, 2)) seconds" "INFO"
Write-Log "" "INFO"
Write-Log "Rules Applied:" "INFO"
foreach ($rule in $stats.RulesApplied.GetEnumerator() | Sort-Object Value -Descending) {
    Write-Log "  - $($rule.Key): $($rule.Value) times" "INFO"
}

if ($stats.Errors.Count -gt 0) {
    Write-Log "" "WARN"
    Write-Log "Errors encountered: $($stats.Errors.Count)" "WARN"
    foreach ($error in $stats.Errors) {
        Write-Log "  - $error" "ERROR"
    }
}

# Save JSON summary
$stats | ConvertTo-Json -Depth 10 | Set-Content $summaryFile
Write-Log "" "INFO"
Write-Log "Summary saved to: $summaryFile" "INFO"
Write-Log "Log saved to: $logFile" "INFO"

if ($DryRun) {
    Write-Log "" "WARN"
    Write-Log "DRY RUN MODE - No files were modified" "WARN"
    Write-Log "Run without -DryRun flag to apply changes" "WARN"
}

Write-Log "" "INFO"
Write-Log "========================================" "INFO"
Write-Log "PHASE 7: WORKER-BASED CODEMODS" "INFO"
Write-Log "========================================" "INFO"

$workerScript = Join-Path $RootPath "scripts\codemods\run-worker-codemods.mjs"

if (Test-Path $workerScript) {
    Write-Log "Running worker-based import and type fixes..." "INFO"
    
    if (-not $DryRun) {
        try {
            $workerOutput = & node $workerScript 2>&1
            foreach ($line in $workerOutput) {
                Write-Log $line "INFO"
            }
            Write-Log "Worker codemods complete!" "INFO"
        } catch {
            Write-Log "Error running worker codemods: $($_.Exception.Message)" "ERROR"
        }
    } else {
        Write-Log "Skipping worker codemods in dry-run mode" "WARN"
    }
} else {
    Write-Log "Worker codemod script not found, skipping Phase 7" "WARN"
}

Write-Log "" "INFO"
Write-Log "========================================" "INFO"
Write-Log "PHASE 8: AST NORMALIZATION" "INFO"
Write-Log "========================================" "INFO"

# Check if scripts/codemods exists
$scriptsPath = Join-Path $RootPath "scripts"
$astScript = Join-Path $scriptsPath "codemods\ast-normalize.mjs"

if (Test-Path $astScript) {
    Write-Log "Running AST normalization with ts-morph..." "INFO"
    
    # Check if dependencies are installed
    $packageJson = Join-Path $scriptsPath "package.json"
    $nodeModules = Join-Path $scriptsPath "node_modules"
    
    if (-not (Test-Path $nodeModules)) {
        Write-Log "Installing codemod dependencies..." "INFO"
        Push-Location $scriptsPath
        & npm install --no-audit --no-fund 2>&1 | Out-Null
        Pop-Location
    }
    
    # Run AST normalization with 8GB heap
    try {
        if (-not $DryRun) {
            $astOutput = & node --max-old-space-size=8192 $astScript 2>&1
            foreach ($line in $astOutput) {
                Write-Log $line "INFO"
            }
            Write-Log "AST normalization complete!" "INFO"
        } else {
            Write-Log "Skipping AST normalization in dry-run mode" "WARN"
        }
    } catch {
        Write-Log "Error running AST normalization: $($_.Exception.Message)" "ERROR"
    }
} else {
    Write-Log "AST normalization script not found at: $astScript" "WARN"
    Write-Log "To enable Phase 8, ensure scripts/codemods/ast-normalize.mjs exists" "INFO"
}

Write-Log "" "INFO"
Write-Log "Next steps:" "INFO"
Write-Log "  1. Review the log file for changes" "INFO"
Write-Log "  2. Run: npm run check" "INFO"
Write-Log "  3. Run: npx svelte-check" "INFO"
Write-Log "  4. Test your application" "INFO"
