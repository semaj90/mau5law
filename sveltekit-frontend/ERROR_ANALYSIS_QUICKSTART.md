# ⚡ Quick Reference - Error Analysis & Healing

## 🚀 One-Command Solutions

```powershell
npm run errors:cached        # Smart cached collection (FAST!)
npm run pipeline:full        # Complete analysis + healing
npm run graph:open           # View interactive error graph
npm run heal:dry-run         # Preview AI fixes
```

## ⚡ NEW: Cached Error Collection

**Ultra-fast error checking with Redis caching:**

```powershell
# First run: checks all files (~30s for 1000 files)
npm run errors:cached

# Subsequent runs: only checks changed files (~2s!)
npm run errors:cached

# Force recheck all files
npm run errors:cached:force

# Clear cache and start fresh
npm run errors:cached:clear

# Skip Qdrant embeddings (faster)
npm run errors:cached:no-qdrant
```

**How it works:**
- ✅ Hashes file contents (SHA-256)
- ✅ Stores results in Redis with 24h TTL
- ✅ Only re-checks files that changed
- ✅ Generates embeddings with Ollama
- ✅ Stores in Qdrant for semantic search
- ✅ Outputs to JSONL format

## 📊 Common Workflows

**Daily Health Check** (Lightning Fast!)
```powershell
npm run errors:cached && npm run graph:open
```

**Quick Auto-Fix**
```powershell
npm run heal:agentic -- --max 10
```

**Share with AI Assistant**
```powershell
npm run errors:cached
code reports/latest/errors.jsonl
```

## 📁 Key Files

**Generated Reports**: `reports/latest/`
- `vscode-problems.md` ← **Send to Copilot/Claude**
- `error-graph.html` ← **Open in browser**
- `enhanced-ast-kb.tree.json` ← Knowledge base
- `healing-report.md` ← Fix summary

**Scripts**: `scripts/`
- `enhanced-ast-analyzer.mjs`
- `vscode-problems-collector.mjs`
- `error-graph-visualizer.mjs`
- `agentic-healing-orchestrator.mjs`

## 🎯 NPM Scripts

| Command | Action |
|---------|--------|
| `ast:analyze` | Analyze all files |
| `problems:collect` | Collect errors |
| `graph:visualize` | Generate graph |
| `graph:open` | **Open in browser** |
| `heal:agentic` | Auto-fix |
| `pipeline:full` | **Run all** |

## 📚 Docs

- `ERROR_ANALYSIS_README.md` - Full guide
- `PHASE72_ENHANCED_COMPLETE.md` - Summary
