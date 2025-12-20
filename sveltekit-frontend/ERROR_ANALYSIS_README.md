# Enhanced Error Analysis & Agentic Healing System - Phase 72+

A comprehensive system for analyzing, visualizing, and automatically fixing errors across multiple languages (TypeScript, JavaScript, Svelte, Go, Python, C++/CUDA).

## 🎯 Overview

This system provides:
- **Universal AST Analysis**: Parse and analyze all source files including .svelte components
- **VS Code Problem Integration**: Collect all compiler/linter errors
- **Interactive Error Graph**: Visual graph with clickable links to files
- **Agentic Healing**: AI-powered automatic error fixing using Ollama (local) and Gemini API
- **Comprehensive Reporting**: Detailed Markdown reports for AI assistants

## 🚀 Quick Start

### Full Pipeline (Recommended)

Run the complete analysis and healing pipeline:

\`\`\`powershell
npm run pipeline:full
\`\`\`

This will:
1. Analyze all source files (TS, JS, Svelte, Go, Python, C++)
2. Collect VS Code diagnostics
3. Generate interactive error graph
4. Run AI-powered healing

### Dry Run (Safe Mode)

Test the pipeline without making any changes:

\`\`\`powershell
npm run pipeline:dry-run
\`\`\`

## 📊 Individual Tools

### 1. AST Analyzer

Analyzes all files and creates a knowledge base with dependency graphs.

\`\`\`powershell
# Analyze entire src directory
npm run ast:analyze

# Analyze specific directory
npm run ast:analyze:dir -- --dir src/lib/services

# Custom output
node scripts/enhanced-ast-analyzer.mjs --dir src --output reports/custom-kb.tree.json
\`\`\`

**Output**: \`reports/latest/enhanced-ast-kb.tree.json\`

**Features**:
- Parses .svelte files (extracts script content)
- Analyzes TypeScript/JavaScript with ts-morph
- Basic parsing for Go, Python, C++/CUDA
- Progress bars for all operations
- Detects imports, exports, symbols
- Groups files into semantic clusters

### 2. VS Code Problems Collector

Collects all errors and warnings from type checkers and linters.

\`\`\`powershell
# Collect TypeScript and Svelte errors
npm run problems:collect

# Include Go and Python errors
npm run problems:collect:all

# Custom options
node scripts/vscode-problems-collector.mjs --go --python --cpp
\`\`\`

**Output**:
- \`reports/latest/vscode-problems.json\` (structured data)
- \`reports/latest/vscode-problems.md\` (AI-readable report)

**Features**:
- Runs tsc (TypeScript compiler)
- Runs svelte-check
- Parses Go compiler output (optional)
- Parses Python mypy output (optional)
- Groups by file, severity, language
- Generates Markdown for AI assistants

### 3. Error Graph Visualizer

Creates an interactive D3.js graph showing all files, dependencies, and errors.

\`\`\`powershell
# Generate graph
npm run graph:visualize

# Open in browser
npm run graph:open
\`\`\`

**Output**: \`reports/latest/error-graph.html\`

**Features**:
- Force-directed graph layout
- Click nodes to open in VS Code (\`vscode://file/...\`)
- Color-coded by error severity:
  - 🟢 Green: Clean (no errors)
  - 🟠 Orange: Has warnings
  - 🔴 Red: Has errors
  - 🟣 Purple: Many errors (5+)
- Filter by file type and error status
- Search for specific files
- Interactive controls (link distance, charge strength)
- Shows missing imports as dashed lines
- Tooltip with file details

### 4. Agentic Healing Orchestrator

AI-powered automatic error fixing using Ollama and Gemini API.

\`\`\`powershell
# Run healing (applies fixes)
npm run heal:agentic

# Dry run (shows what would be fixed)
npm run heal:dry-run

# Limit number of fixes
npm run heal:max -- --max 10
\`\`\`

**Output**:
- \`reports/latest/healing-report.json\` (structured data)
- \`reports/latest/healing-report.md\` (summary report)

**Features**:
- Routes errors to appropriate AI:
  - TypeScript/JavaScript/Svelte → Ollama (Gemma3)
  - Go/Python/C++/CUDA → Gemini API
- Groups similar errors for batch fixing
- Uses AST knowledge base for context
- Validates fixes before applying
- Tracks success/failure metrics
- Progress indicators

## 📁 Output Files

All reports are saved in \`reports/latest/\`:

| File | Description |
|------|-------------|
| \`enhanced-ast-kb.tree.json\` | Complete knowledge base with file analysis |
| \`vscode-problems.json\` | All VS Code diagnostics (structured) |
| \`vscode-problems.md\` | Markdown report for AI assistants |
| \`error-graph.html\` | Interactive visualization |
| \`healing-report.json\` | Healing results (structured) |
| \`healing-report.md\` | Healing summary |

## 🔧 Configuration

### Environment Variables

Create \`.env\` with:

\`\`\`env
# Ollama (for TypeScript/JavaScript/Svelte)
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3-legal:latest

# Gemini API (for Go/Python/C++)
GEMINI_API_KEY=your_api_key_here
\`\`\`

### Advanced Options

#### AST Analyzer

\`\`\`powershell
node scripts/enhanced-ast-analyzer.mjs \\
  --dir src \\
  --output reports/custom.json \\
  --include-tests \\
  --parallel 8
\`\`\`

#### Problems Collector

\`\`\`powershell
node scripts/vscode-problems-collector.mjs \\
  --output reports/problems.json \\
  --no-tsc \\
  --no-svelte-check \\
  --go \\
  --python
\`\`\`

#### Healing Orchestrator

\`\`\`powershell
node scripts/agentic-healing-orchestrator.mjs \\
  --problems reports/latest/vscode-problems.json \\
  --kb reports/latest/enhanced-ast-kb.tree.json \\
  --output reports/healing.json \\
  --dry-run \\
  --max 50
\`\`\`

## 🎨 Workflows

### Daily Development Workflow

1. **Morning Analysis**:
   \`\`\`powershell
   npm run pipeline:analyze-only
   npm run graph:open
   \`\`\`

2. **Review errors** in interactive graph

3. **Auto-fix simple errors**:
   \`\`\`powershell
   npm run heal:agentic -- --max 20
   \`\`\`

4. **Verify fixes**:
   \`\`\`powershell
   npm run problems:collect
   \`\`\`

### Pre-Commit Check

\`\`\`powershell
npm run pipeline:analyze-only
\`\`\`

### CI/CD Integration

\`\`\`yaml
- name: Error Analysis
  run: npm run pipeline:dry-run

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: error-reports
    path: reports/latest/
\`\`\`

## 🤖 AI Assistant Integration

The system generates Markdown reports optimized for AI assistants:

### Send to GitHub Copilot

\`\`\`powershell
code reports/latest/vscode-problems.md
\`\`\`

Then ask Copilot:
> "Review this error report and suggest fixes for the top 10 errors"

### Send to Claude Code

\`\`\`powershell
# Copy report to clipboard
Get-Content reports/latest/vscode-problems.md | Set-Clipboard

# Or reference in .claud_context
echo "reports/latest/vscode-problems.md" >> .claud_context
\`\`\`

### Use with Gemini API

The healing orchestrator automatically sends error context to Gemini for:
- Go errors
- Python errors
- C++/CUDA errors

## 📈 Statistics & Metrics

After running the pipeline, view statistics:

\`\`\`powershell
# View healing report
code reports/latest/healing-report.md

# View problem summary
code reports/latest/vscode-problems.md
\`\`\`

**Tracked Metrics**:
- Total files analyzed
- Files by type (TS, JS, Svelte, Go, Python, C++)
- Total errors/warnings
- Fix attempts
- Success rate by language
- Missing imports

## 🔍 Troubleshooting

### "Knowledge base not found"

Run the AST analyzer first:
\`\`\`powershell
npm run ast:analyze
\`\`\`

### "Gemini API key not configured"

Add to \`.env\`:
\`\`\`env
GEMINI_API_KEY=your_key_here
\`\`\`

Or run without Gemini (TypeScript/Svelte only):
\`\`\`powershell
npm run problems:collect  # Skip --go --python
\`\`\`

### "Ollama not responding"

Start Ollama service:
\`\`\`powershell
ollama serve
ollama pull gemma3-legal:latest
\`\`\`

### Progress bars not showing

Install dependencies:
\`\`\`powershell
npm install cli-progress chalk
\`\`\`

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                   Master Pipeline                           │
│                                                               │
│  1. AST Analysis → 2. Problems → 3. Graph → 4. Healing      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  TS/JS/Svelte│ │   Go/Python  │ │   C++/CUDA   │
      │              │ │              │ │              │
      │   Ollama     │ │   Gemini API │ │  Gemini API  │
      │   (Local)    │ │   (Cloud)    │ │   (Cloud)    │
      └──────────────┘ └──────────────┘ └──────────────┘
\`\`\`

## 📚 Further Reading

- **AST Analysis**: Uses [ts-morph](https://ts-morph.com/) for TypeScript analysis
- **Graph Visualization**: Built with [D3.js](https://d3js.org/)
- **AI Integration**: Uses [Ollama](https://ollama.ai/) and [Google Gemini](https://ai.google.dev/)

## 🤝 Contributing

To add support for new languages:

1. Add parser in \`enhanced-ast-analyzer.mjs\`
2. Add error collector in \`vscode-problems-collector.mjs\`
3. Add AI routing in \`agentic-healing-orchestrator.mjs\`

## 📝 License

Part of the YoRHa Legal AI project.
