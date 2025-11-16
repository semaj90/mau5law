param(
  [string] $TopErrorsJson = ".svelte-errors-top.json",
  [string] $OutputDir = ".",
  [int] $MaxPatterns = 10,
  [switch] $Force
)

$root = Split-Path $PSCommandPath -Parent | Split-Path -Parent
Set-Location $root

Write-Host "🤖 Phase67: AI Codemod Plan Generation"
Write-Host "======================================"

if (!(Test-Path $TopErrorsJson)) {
  Write-Error "❌ Top errors JSON not found: $TopErrorsJson"
  exit 1
}

# Load the top errors data
$topErrorsData = Get-Content $TopErrorsJson | ConvertFrom-Json

Write-Host "📊 Loaded $($topErrorsData.topErrorTypes.Count) error patterns"
Write-Host "🎯 Processing top $MaxPatterns patterns"

# Create output directory if it doesn't exist
if (!(Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Function to get Ollama endpoint with model fallback
function Get-OllamaEndpoint {
  param([string]$ModelName)

  $endpoint = $env:OLLAMA_ENDPOINT
  if (!$endpoint) {
    # Default local Ollama daemon
    $endpoint = "http://localhost:11434"
  }

  if (!$ModelName) {
    $ModelName = $env:OLLAMA_MODEL
    if (!$ModelName) {
      $ModelName = "gemma3-legal:latest"
    }
  }

  return @{
    Endpoint = $endpoint
    ModelName = $ModelName
  }
}

# Function to analyze with Ollama (with model fallback)
function Invoke-OllamaAnalysis {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Prompt,
    [Parameter(Mandatory = $true)]
    [string] $InputText,
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
      model = $cfg.ModelName
      messages = @(
        @{
          role = "system"
          content = $Prompt
        },
        @{
          role = "user"
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

# Process each error pattern
$processed = 0
foreach ($errorPattern in $topErrorsData.topErrorTypes | Select-Object -First $MaxPatterns) {
  $processed++
  $patternKey = $errorPattern.key -replace '[^a-zA-Z0-9]', '-'
  $outputFile = Join-Path $OutputDir "svelte-codemod-plan-$patternKey.md"

  if ((Test-Path $outputFile) -and !$Force) {
    Write-Host "⏭️  Skipping existing plan: $outputFile" -ForegroundColor Gray
    continue
  }

  Write-Host ""
  Write-Host "🔧 Processing pattern $processed/$MaxPatterns : $($errorPattern.message)" -ForegroundColor Cyan
  Write-Host "   Frequency: $($errorPattern.count) occurrences" -ForegroundColor Yellow

  # Build the prompt for codemod generation
  $systemPrompt = @"
You are an expert TypeScript/Svelte developer and codemod engineer. You specialize in automated code transformations.

Given a TypeScript error pattern with examples, generate a detailed codemod plan to fix this error across the codebase.

Your response should be a complete codemod specification in Markdown format with:

1. **Error Analysis**: What causes this error and why it occurs
2. **Fix Strategy**: High-level approach to resolve it
3. **Codemod Implementation**: Specific code transformation rules
4. **Edge Cases**: Special situations to handle
5. **Testing Strategy**: How to verify the fix works
6. **Risk Assessment**: Potential issues or breaking changes

Be specific about AST transformations, regex patterns, or jscodeshift rules needed.
Include concrete code examples showing before/after transformations.
Focus on TypeScript/Svelte specific patterns and best practices.
"@

  # Build input text with error details and examples
  $inputText = @"
ERROR PATTERN: $($errorPattern.message)
FREQUENCY: $($errorPattern.count) occurrences
CODE: $($errorPattern.code)

EXAMPLE INSTANCES:
$($errorPattern.examples | ForEach-Object {
  "File: $($_.file)`nLine: $($_.line), Column: $($_.column)`nError: $($_.message)`nRaw: $($_.raw)`n---"
} | Out-String)

Generate a comprehensive codemod plan to automatically fix this error pattern across the entire codebase.
"@

  # Call Ollama for analysis
  $analysis = Invoke-OllamaAnalysis -Prompt $systemPrompt -InputText $inputText

  if ($analysis) {
    # Write the codemod plan
    $markdown = @"
# Codemod Plan: $($errorPattern.message)

**Error Code:** $($errorPattern.code)
**Frequency:** $($errorPattern.count) occurrences
**Pattern Key:** $($errorPattern.key)

## Error Analysis

$($errorPattern.message)

## AI-Generated Codemod Plan

$analysis

## Implementation Notes

- Generated by: gemma3-legal:latest via Ollama
- Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- Input: Top error patterns from TypeScript compilation
- Confidence: High (pattern-based analysis)

## Next Steps

1. Review the codemod plan above
2. Implement the transformation logic
3. Test on a subset of files first
4. Run full codemod across codebase
5. Verify TypeScript compilation passes
"@

    $markdown | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "✅ Generated codemod plan: $outputFile" -ForegroundColor Green
  } else {
    Write-Host "❌ Failed to generate plan for: $($errorPattern.message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "🎉 Phase67 Complete!" -ForegroundColor Green
Write-Host "   📁 Codemod plans saved to: $OutputDir"
Write-Host "   📊 Processed $processed error patterns"
Write-Host ""
Write-Host "Next: Review the generated plans and implement codemods!" -ForegroundColor Cyan