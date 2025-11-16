#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Interactive PowerShell search tool with glob, ripgrep, and awk-like functionality
.DESCRIPTION
    Searches for keywords in files using glob patterns, with ripgrep fallback and awk-style processing.
    Supports inverse search (find files WITHOUT keywords) and Ollama AI analysis.
.PARAMETER Keywords
    Keywords to search for (comma-separated)
.PARAMETER Path
    Base path to search in (default: current directory)
.PARAMETER Include
    File patterns to include (glob format, e.g., "*.ts,*.js")
.PARAMETER Exclude
    File patterns to exclude (glob format)
.PARAMETER UseRipgrep
    Force use of ripgrep if available
.PARAMETER CaseSensitive
    Case-sensitive search
.PARAMETER Context
    Number of context lines to show
.PARAMETER Inverse
    Inverse search - find files that do NOT contain the keywords
.PARAMETER UseOllama
    Use Ollama gemma3-legal model for AI analysis of results
.PARAMETER Interactive
    Interactive mode - prompts for all parameters
.EXAMPLE
    .\search-keywords.ps1 -Keywords "error,function" -Include "*.ts,*.js"
.EXAMPLE
    .\search-keywords.ps1 -Interactive
.EXAMPLE
    .\search-keywords.ps1 -Keywords "deprecated" -Inverse -UseOllama
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Keywords,

    [Parameter(Mandatory=$false)]
    [string]$Path = ".",

    [Parameter(Mandatory=$false)]
    [string]$Include = "*",

    [Parameter(Mandatory=$false)]
    [string]$Exclude,

    [Parameter(Mandatory=$false)]
    [switch]$UseRipgrep,

    [Parameter(Mandatory=$false)]
    [switch]$CaseSensitive,

    [Parameter(Mandatory=$false)]
    [int]$Context = 2,

    [Parameter(Mandatory=$false)]
    [switch]$Interactive,

    [Parameter(Mandatory=$false)]
    [switch]$Inverse,

    [Parameter(Mandatory=$false)]
    [switch]$UseOllama
)

# Function to check if ripgrep is available
function Test-Ripgrep {
    try {
        $null = Get-Command rg -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Function to get Ollama endpoint with model fallback
function Get-OllamaEndpoint {
    [CmdletBinding()]
    param(
        [string] $ModelName
    )

    # 1. Base URL
    $endpoint = $env:OLLAMA_ENDPOINT
    if ([string]::IsNullOrWhiteSpace($endpoint)) {
        # Default local Ollama daemon
        $endpoint = "http://localhost:11434"
    }

    # 2. Model name with fallback logic
    if (-not $ModelName -or [string]::IsNullOrWhiteSpace($ModelName)) {
        # Try gemma3-legal:latest first, fallback to gemma3:270m
        $ModelName = $env:OLLAMA_MODEL
        if ([string]::IsNullOrWhiteSpace($ModelName)) {
            $ModelName = "gemma3-legal:latest"
        }
    }

    [pscustomobject]@{
        Endpoint  = $endpoint.TrimEnd('/')
        ModelName = $ModelName
    }
}

# Function to analyze with Ollama (with model fallback)
function Invoke-OllamaAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Prompt,             # high-level instruction

        [Parameter(Mandatory = $true)]
        [string] $InputText,          # ripgrep results / code context

        [string] $ModelName
    )

    $modelsToTry = @()
    if ($ModelName) {
        $modelsToTry = @($ModelName)
    } else {
        # Default fallback chain: gemma3-legal:latest -> gemma3:270m
        $modelsToTry = @("gemma3-legal:latest", "gemma3:270m")
    }

    foreach ($model in $modelsToTry) {
        $cfg = Get-OllamaEndpoint -ModelName $model

        # Ollama "chat" style API: POST /api/chat
        $body = @{
            model    = $cfg.ModelName
            messages = @(
                @{
                    role    = "system"
                    content = $Prompt
                },
                @{
                    role    = "user"
                    content = $InputText
                }
            )
            stream = $false
        } | ConvertTo-Json -Depth 6

        $url = "$($cfg.Endpoint)/api/chat"

        try {
            $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
            # Ollama chat responses come back as {model, created_at, message:{role,content}, done, ...}
            if ($response.message -and $response.message.content) {
                Write-Host "Using model: $($cfg.ModelName)" -ForegroundColor DarkGray
                return $response.message.content
            }

            # Fallback for older/other shapes
            return ($response | ConvertTo-Json -Depth 6)
        }
        catch {
            Write-Warning "Failed to call Ollama with model '$($cfg.ModelName)' at $url`: $($_.Exception.Message)"
            if ($model -eq $modelsToTry[-1]) {
                # Last model in the list, give up
                return $null
            }
            # Try next model
            continue
        }
    }

    return $null
}

# Function to get user input interactively
function Get-InteractiveInput {
    param([string]$Prompt, [string]$Default = "")

    $input = Read-Host "$Prompt $(if ($Default) { "[$Default]" } else { '' })"
    if ([string]::IsNullOrWhiteSpace($input) -and $Default) {
        return $Default
    }
    return $input
}

# Function to perform glob-based file search
function Get-FilesByGlob {
    param(
        [string]$BasePath,
        [string[]]$IncludePatterns,
        [string[]]$ExcludePatterns = @()
    )

    $files = @()

    foreach ($pattern in $IncludePatterns) {
        try {
            # Use Get-ChildItem with proper glob handling
            $searchPath = Join-Path $BasePath "*"
            $files += Get-ChildItem -Path $searchPath -Recurse -File -ErrorAction SilentlyContinue |
                     Where-Object {
                         $fileName = $_.Name
                         $matchesPattern = $false
                         foreach ($pat in $IncludePatterns) {
                             if ($fileName -like $pat) {
                                 $matchesPattern = $true
                                 break
                             }
                         }
                         $matchesPattern -and ($ExcludePatterns.Count -eq 0 -or -not ($ExcludePatterns | Where-Object { $fileName -like $_ }))
                     }
        } catch {
            Write-Warning "Error with pattern '$pattern': $_"
        }
    }

    return $files | Select-Object -Unique
}

# Function to search with PowerShell (fallback)
function Search-WithPowerShell {
    param(
        [string[]]$SearchTerms,
        [System.IO.FileInfo[]]$Files,
        [int]$ContextLines = 2,
        [switch]$CaseSensitive,
        [switch]$Inverse
    )

    $matchedFiles = @()

    foreach ($file in $Files) {
        try {
            # Read file content line by line using StreamReader
            $contentArray = @()
            $reader = [System.IO.StreamReader]::new($file.FullName)
            while ($null -ne ($line = $reader.ReadLine())) {
                $contentArray += $line
            }
            $reader.Close()
            $fileHasMatch = $false

            foreach ($line in $contentArray) {
                foreach ($term in $SearchTerms) {
                    if ($line -like "*$term*") {
                        $fileHasMatch = $true
                        break
                    }
                }
                if ($fileHasMatch) { break }
            }

            if ($Inverse -and -not $fileHasMatch) {
                # For inverse search, include files that don't contain any of the terms
                $matchedFiles += $file.FullName
            } elseif (-not $Inverse -and $fileHasMatch) {
                # For normal search, include files that contain at least one of the terms
                $matchedFiles += $file.FullName
            }
        } catch {
            # Skip files that can't be read
            continue
        }
    }

    return $matchedFiles
}

# Main execution
function Main {
    Write-Host "🔍 PowerShell Keyword Search Tool" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan

    # Interactive mode - ask for input if not provided via parameters
    if ($Interactive -or -not $Keywords -or -not $Path) {
        Write-Host ""
        Write-Host "Interactive Search Mode:" -ForegroundColor Magenta
        Write-Host "======================" -ForegroundColor Magenta
        $Keywords = Get-InteractiveInput "Enter keywords (comma-separated, e.g., 'error,function,TODO')" $Keywords
        $Path = Get-InteractiveInput "Search path" $Path
        $Include = Get-InteractiveInput "Include patterns (glob)" $Include
        $Exclude = Get-InteractiveInput "Exclude patterns (glob)" ""
        $Context = [int](Get-InteractiveInput "Context lines" $Context.ToString())
        $useRipgrep = [bool]($UseRipgrep -or (Get-InteractiveInput "Use ripgrep if available? (y/n)" "y") -eq "y")
        $CaseSensitive = [bool]($CaseSensitive -or (Get-InteractiveInput "Case sensitive? (y/n)" "n") -eq "y")
        $Inverse = [bool]($Inverse -or (Get-InteractiveInput "Inverse search (find files WITHOUT keywords)? (y/n)" "n") -eq "y")
        $UseOllama = [bool]($UseOllama -or (Get-InteractiveInput "Use Ollama analysis? (y/n)" "n") -eq "y")
    }

    # Parse inputs
    $searchTerms = $Keywords -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $includePatterns = $Include -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $excludePatterns = if ($Exclude) { $Exclude -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } } else { @() }

    if (-not $searchTerms) {
        Write-Error "No keywords provided"
        exit 1
    }

    Write-Host ""
    Write-Host "Search Configuration:" -ForegroundColor Yellow
    Write-Host "  Keywords: $($searchTerms -join ', ')"
    Write-Host "  Path: $Path"
    Write-Host "  Include: $($includePatterns -join ', ')"
    if ($excludePatterns) { Write-Host "  Exclude: $($excludePatterns -join ', ')" }
    Write-Host "  Context: $Context lines"
    Write-Host "  Case Sensitive: $CaseSensitive"
    Write-Host "  Inverse Search: $Inverse"
    Write-Host "  Use Ollama Analysis: $UseOllama"

    # Check for ripgrep
    $ripgrepAvailable = Test-Ripgrep
    $useRipgrep = $UseRipgrep -or ($ripgrepAvailable -and -not $PSBoundParameters.ContainsKey('UseRipgrep'))

    Write-Host "  Using ripgrep: $useRipgrep $(if ($ripgrepAvailable) { '(available)' } else { '(not available)' })"

    Write-Host ""
    Write-Host "Searching..." -ForegroundColor Green

    $startTime = Get-Date

    # Capture output instead of just writing it
    $rgOutput = @()
    $matches = @()

    if ($useRipgrep -and $ripgrepAvailable -and -not $Inverse) {
        # Use ripgrep for normal searches only
        $rgArgs = @("--line-number", "--with-filename")

        if ($Context -gt 0) {
            $rgArgs += "--context=$Context"
        }

        if ($CaseSensitive) {
            $rgArgs += "--case-sensitive"
        }

        # Add glob patterns
        foreach ($pattern in $includePatterns) {
            $rgArgs += "--glob=$pattern"
        }

        foreach ($pattern in $excludePatterns) {
            $rgArgs += "--glob=!$pattern"
        }

        foreach ($term in $searchTerms) {
            try {
                $output = & rg @rgArgs $term $Path 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $rgOutput += $output
                }
            } catch {
                Write-Warning "Ripgrep search failed for '$term': $_"
            }
        }

        $matches = $rgOutput | Where-Object { $_ -ne "" }
    } elseif ($useRipgrep -and $ripgrepAvailable -and $Inverse) {
        # Use PowerShell fallback for inverse searches
        $files = Get-FilesByGlob -BasePath $Path -IncludePatterns $includePatterns -ExcludePatterns $excludePatterns
        Write-Host "Found $($files.Count) files to search..."
        $results = Search-WithPowerShell -SearchTerms $searchTerms -Files $files -ContextLines $Context -CaseSensitive:$CaseSensitive -Inverse:$Inverse
        $matches = $results
    } else {
        # Use PowerShell fallback
        $files = Get-FilesByGlob -BasePath $Path -IncludePatterns $includePatterns -ExcludePatterns $excludePatterns
        Write-Host "Found $($files.Count) files to search..."
        $results = Search-WithPowerShell -SearchTerms $searchTerms -Files $files -ContextLines $Context -CaseSensitive:$CaseSensitive -Inverse:$Inverse
        $matches = $results
    }

    $endTime = Get-Date
    $duration = $endTime - $startTime

    Write-Host ""
    Write-Host "Results ($($matches.Count) matches found in $([math]::Round($duration.TotalSeconds, 2))s):" -ForegroundColor Green
    Write-Host "=".PadRight(80, "=") -ForegroundColor Green

    if ($matches.Count -eq 0) {
        Write-Host "No matches found." -ForegroundColor Yellow
    } else {
        # Display results
        if ($matches.Count -gt 50) {
            $matches | Select-Object -First 50 | ForEach-Object { Write-Host $_ }
            Write-Host ""
            Write-Host "... ($($matches.Count - 50) more results)" -ForegroundColor Gray
            Write-Host "Use ' | Out-File results.txt' to save all results" -ForegroundColor Cyan
        } else {
            $matches | ForEach-Object { Write-Host $_ }
        }
    }

    Write-Host ""
    Write-Host "Search completed." -ForegroundColor Green

    # Ollama analysis
    if ($UseOllama -and $matches.Count -gt 0) {
        Write-Host ""
        Write-Host "🤖 Ollama Analysis (gemma3-legal:latest → gemma3:270m fallback):" -ForegroundColor Blue
        Write-Host "=================================================================" -ForegroundColor Blue

        # Truncate if huge (avoid sending a megabyte of text)
        $joined = ($matches -join "`n")
        $maxChars = 8000
        if ($joined.Length -gt $maxChars) {
            $joined = $joined.Substring(0, $maxChars) + "`n...[truncated]..."
        }

        $prompt = @"
You are an AI assistant analyzing ripgrep search results from a large codebase.

The text you receive is a list of matches in the form:
  path/to/file.ext:line:column: matching line of code

TASKS:
1. Summarize what these matches are about and their purpose in the codebase.
2. **Code Quality Analysis**: Identify any code smells, formatting issues, or areas that could benefit from Prettier/ESLint fixes.
3. **Prettier Code Suggestions**: Provide specific prettier-formatted code examples for any messy or inconsistent code you see.
4. Suggest the *next 3–5 concrete edits* or investigations in the codebase (which files/lines to open, what to change, what to refactor).
5. If there are obvious bugs, security issues, or performance problems, call them out explicitly.
6. Keep the answer concise but actionable, using bullet points and code examples where helpful.
"@

        $analysis = Invoke-OllamaAnalysis -Prompt $prompt -InputText $joined

        if ($analysis) {
            Write-Host $analysis -ForegroundColor Cyan
        } else {
            Write-Host "No analysis returned from Ollama (see warnings above)." -ForegroundColor Yellow
        }
    }
}

# Run main function
Main