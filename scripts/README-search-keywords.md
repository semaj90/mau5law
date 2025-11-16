# PowerShell Keyword Search Tool with Ollama AI Analysis

A powerful interactive search tool that combines glob patterns, ripgrep functionality, awk-style output formatting, and AI-powered analysis using PowerShell and Ollama.

## Features

- **Interactive Mode**: Prompts for search terms, file patterns, and options
- **Glob Support**: Uses PowerShell's built-in globbing for file pattern matching
- **Ripgrep Integration**: Automatically uses ripgrep if available for faster searches
- **Awk-style Output**: Formats results in columns like traditional Unix tools
- **Context Lines**: Shows surrounding lines for context
- **Multiple Keywords**: Search for multiple terms simultaneously
- **Case Sensitivity**: Optional case-sensitive matching
- **Inverse Search**: Find files that do NOT contain keywords
- **Ollama AI Analysis**: Get AI-powered insights and actionable next steps from search results
- **Legal AI Integration**: Specialized prompts for legal/compliance codebase analysis

## Usage

### Interactive Mode with AI Analysis (Recommended)

Run the interactive search with Ollama analysis:

```powershell
.\scripts\search-keywords.ps1 -Interactive
```

You'll be prompted for:
- Keywords (comma-separated, e.g., 'error,function,TODO')
- Search path
- Include patterns (glob format)
- Exclude patterns (optional)
- Context lines
- Whether to use ripgrep
- Case sensitivity
- **Whether to use Ollama AI analysis with prettier code suggestions**

### Command Line Mode with AI Analysis

```powershell
# Normal search with AI analysis
.\scripts\search-keywords.ps1 -Keywords "error,function" -Include "*.ts,*.js" -UseOllama

# Inverse search with AI analysis (find files WITHOUT keywords)
.\scripts\search-keywords.ps1 -Keywords "deprecated" -Inverse -UseOllama
```

### Parameters

- `-Keywords`: Comma-separated list of search terms
- `-Path`: Base directory to search (default: current directory)
- `-Include`: File patterns to include (e.g., "*.ts,*.js,*.svelte")
- `-Exclude`: File patterns to exclude
- `-UseRipgrep`: Force use of ripgrep (if available)
- `-CaseSensitive`: Enable case-sensitive matching
- `-Context`: Number of context lines to show (default: 2)
- `-Interactive`: Enable interactive mode
- `-Inverse`: Find files that do NOT contain the keywords
- `-UseOllama`: Enable Ollama AI analysis of search results

## Ollama Configuration

Configure your Ollama endpoint and model:

```powershell
# Set environment variables (per session or in profile)
$env:OLLAMA_ENDPOINT = "http://localhost:11434"
$env:OLLAMA_MODEL = "gemma3-legal:latest"
```

**Model Fallback Chain:**
1. `gemma3-legal:latest` (primary - specialized for legal/compliance analysis)
2. `gemma3:270m` (fallback - general purpose analysis)

The script automatically tries models in order and uses the first available one.

## VS Code Tasks

### Main Workspace Tasks
- **🔍 Ollama Search Codebase**: Interactive search with Ollama AI analysis
- **🔍 Interactive Keyword Search (All Files)**: Full interactive search
- **🔍 Search TypeScript/JavaScript Files**: Search TS/JS/Svelte files
- **🔍 Search Python Files**: Search Python files
- **🔍 Search Configuration Files**: Search JSON/YAML/config files
- **🔍 Search Documentation Files**: Search MD/TXT/doc files
- **🔍 Quick Error Search (TypeScript)**: Pre-configured error search
- **🔍 Quick Function Search (TypeScript)**: Pre-configured function search
- **🔍 Search with Ripgrep (Force)**: Force ripgrep usage

### Frontend Workspace Tasks
- **🔍 Interactive Keyword Search (Frontend)**: Frontend-focused search
- **🔍 Search Frontend Code (TS/JS/Svelte)**: Frontend code search
- **🔍 Quick Error Search (Frontend)**: Frontend error search
- **🔍 Search Component Props/Events**: Svelte component search

## Examples with AI Analysis

### Example 1: Inverse Search - Files WITHOUT "function"

```powershell
.\scripts\search-keywords.ps1 -Keywords "function" -Include "*.ps1" -Path scripts -Inverse -UseOllama
```

**Results:** Found 6 PowerShell scripts that don't contain "function"

**Ollama Analysis:**
```
🤖 Ollama Analysis:
==================
These PowerShell scripts appear to be specialized utilities for different phases of a legal AI system:

1. build-tensorrt-engines-rtx8gb.ps1 - GPU-accelerated model building for 8GB RTX cards
2. check-phase66-health.ps1 - Health monitoring for Phase 66 services
3. search-with-rg.ps1 - Alternative ripgrep-based search tool
4. start-rtx8gb-service.ps1 - Service launcher for RTX 8GB configurations
5. start-tensorrt-llm.ps1 - TensorRT LLM service initialization
6. wire-phase66-env.ps1 - Environment configuration for Phase 66

Next steps:
1. Open build-tensorrt-engines-rtx8gb.ps1 line 15 to check GPU memory allocation
2. Review check-phase66-health.ps1 for service monitoring patterns
3. Compare search-with-rg.ps1 with search-keywords.ps1 for feature parity
4. Check start-rtx8gb-service.ps1 for proper CUDA initialization
5. Verify wire-phase66-env.ps1 environment variable handling
```

### Example 2: Normal Search - Files WITH "function"

```powershell
.\scripts\search-keywords.ps1 -Keywords "function" -Include "*.ps1" -Path scripts -UseOllama
```

**Results:** Found 67 matches across PowerShell scripts

**Ollama Analysis:**
```
🤖 Ollama Analysis:
==================
**1. `scripts\search-keywords.ps1` - Interactive PowerShell Search Tool**

*   **Purpose:** This script is a PowerShell tool designed to search for keywords within files. It aims to provide a flexible and interactive way to find specific terms within a codebase or set of documents.

*   **Key Features & Functions:**
    *   **Interactive Mode:** Allows users to input search parameters (keywords, file paths, etc.) through prompts.
    *   **Globbing:** Uses glob patterns (e.g., `*.ts`, `*.js`) to specify which files to search.
    *   **Ripgrep Fallback:** Attempts to use `ripgrep` (a fast grep alternative) for searching. If `ripgrep` isn't available, it falls back to using PowerShell's built-in search capabilities.
    *   **Ollama Integration:** The script includes functions for AI analysis of search results.
    *   **Modular Design:** Broken down into smaller, reusable functions like Test-Ripgrep, Get-OllamaEndpoint, Invoke-OllamaAnalysis, etc.

*   **Next Steps:**
    1. Open scripts\search-keywords.ps1 line 69 to review ripgrep availability check
    2. Check Get-OllamaEndpoint function (line 79) for proper model configuration
    3. Verify Invoke-OllamaAnalysis implementation (line 108) for API integration
    4. Test the Main function (line 250) with different search scenarios
```

### Example 3: Legal/Compliance Search

```powershell
# Search for TODOs and FIXMEs with AI roadmap
.\scripts\search-keywords.ps1 -Keywords "TODO|FIXME" -Path src -UseOllama

# Search for broken function references
.\scripts\search-keywords.ps1 -Keywords "getOllamaEndpoint" -Path . -UseOllama
```

## Output Format

Results are formatted in awk-style columns:

```
scripts\search-keywords.ps1:69:function Test-Ripgrep {
scripts\search-keywords.ps1-70-    try {
scripts\search-keywords.ps1:71:        $null = Get-Command rg -ErrorAction Stop
scripts\search-keywords.ps1-72-        return $true
scripts\search-keywords.ps1-73-    } catch {
```

- Column 1: File path and line number
- Column 2: Context lines (prefixed with -)
- Column 3: Match lines (with line numbers)
- Column 4: Line content

## AI Analysis Features

The Ollama integration provides:

1. **Search Result Summarization**: Understand what the matches represent
2. **Code Quality Analysis**: Identify code smells, formatting issues, and areas needing Prettier/ESLint fixes
3. **Prettier Code Suggestions**: Provides specific prettier-formatted code examples for messy or inconsistent code
4. **Codebase Insights**: Identify patterns and relationships
5. **Actionable Next Steps**: Concrete suggestions for investigation
6. **Bug Detection**: Call out obvious issues, security problems, or performance issues
7. **Legal/Compliance Focus**: Specialized analysis for legal AI systems

### AI Prompt Template

```
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
```

## Performance

- **Ripgrep Mode**: Fastest, uses ripgrep's optimized search algorithms
- **PowerShell Mode**: Fallback when ripgrep unavailable, still efficient for most use cases
- **Large Result Sets**: Automatically limits display to first 50 results with option to save all to file
- **AI Analysis**: Truncates input at 8000 characters to avoid timeouts

## Integration with Legal AI System

This search tool integrates with the broader legal AI system:

- Can search through error logs and analysis files
- Useful for finding patterns in legal document processing
- Helps locate specific error codes or function calls
- Supports the phase46 indexer workflow for document analysis
- Provides AI insights specialized for legal/compliance codebases

## Requirements

- PowerShell 5.1 or higher
- Optional: ripgrep (`rg` command) for enhanced performance
- Ollama service running locally (for AI analysis)
- File system access to search directories

## Tips

1. Use comma-separated keywords for multiple search terms
2. Glob patterns support wildcards: `*`, `?`, `[abc]`
3. Exclude patterns use the same syntax as include patterns
4. Context lines help understand code surrounding matches
5. Interactive mode is recommended for complex searches
6. Results can be piped to files: `| Out-File results.txt`
7. Use `-UseOllama` for AI-powered analysis of search results
8. Inverse search with `-Inverse` finds files that don't contain keywords
9. Legal AI model provides specialized analysis for compliance codebases