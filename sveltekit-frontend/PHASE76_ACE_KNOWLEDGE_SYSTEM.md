# 🧠 Phase 76: ACE Knowledge System

**Unified knowledge consolidation + RAG/KAG contextual prompting for LLM-driven code engineering**

## 📊 Overview

Phase 76 consolidates all previous phases (72-75) into a unified knowledge system with advanced LLM prompting capabilities:

- **Phase 72**: 53,227 error embeddings (Qdrant vectors)
- **Phase 73**: Knowledge graph (D3 visualization, routes, APIs, components)
- **Phase 74**: Route inventory (missing imports, duplicates, tests)
- **Phase 75**: GRPO agentic insights (clustering, confidence scores)

### Key Components

1. **Knowledge Consolidator** (`phase76-ace-knowledge-consolidator.mjs`)
   - Merges all phase data into unified knowledge base
   - Builds entity relationships (errors ↔ routes ↔ components)
   - Generates enhanced D3 knowledge graph
   - Creates LLM-optimized prompts

2. **ACE Prompt Engineer** (`phase76-ace-prompt-engineer.mjs`)
   - RAG retrieval from Qdrant embeddings
   - KAG graph traversal for relationships
   - Multi-turn agentic dialogue
   - Tool invocation (tsc, svelte-check, file-read, etc.)
   - Confidence-based decision making

## 🚀 Quick Start

### 1. Complete Embeddings (if needed)

If your embeddings are incomplete (e.g., 42,600/53,227):

```bash
# Resume from checkpoint
npm run embed:resume
```

This will complete the remaining ~10,627 error vectors.

### 2. Run Knowledge Consolidation

```bash
# Build consolidated knowledge base
npm run phase76:consolidate
```

**Output:**
- `reports/phase76/consolidated-knowledge-base.json` (unified KB, ~2-5 MB)
- `reports/phase76/knowledge-graph-enhanced.html` (D3 visualization)
- `reports/phase76/llm-prompts.json` (ACE prompt templates)

### 3. Use ACE Prompt Engineer

**NEW: Multi-LLM Support with Gemini 3 Search Grounding**

The ACE system now supports automatic provider fallback and Google Search grounding:

```bash
# Use automatic provider selection (Ollama → Gemini → Claude → OpenAI)
npm run phase76:ace -- --task "Fix all missing imports in evidence/analyze route" --iterations 2

# Force Gemini 3 with web search for current documentation
LLM_PROVIDER=gemini GEMINI_ENABLE_SEARCH=true npm run phase76:ace -- --task "Fix TypeScript 5.6 compatibility" --iterations 2

# Use Claude for high-quality code generation
LLM_PROVIDER=claude npm run phase76:ace -- --task "Refactor route structure" --iterations 3

# File-specific task with auto-provider
npm run phase76:ace -- --task "Resolve type errors" --file src/routes/(app)/cases/[id]/+page.svelte
```

**Environment Variables:**
```bash
# Provider selection
LLM_PROVIDER=auto          # auto, ollama, gemini, claude, openai
LLM_MODEL=gemini-2.0-flash-exp-1206  # Override default model

# Gemini 3 Search Grounding
GEMINI_API_KEY=your-key-here
GEMINI_ENABLE_SEARCH=true  # Enable Google Search
GEMINI_MODEL=gemini-3-pro-preview  # Or gemini-2.0-flash-exp-1206

# Other providers
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

**Use Cases:**

1. **Error Fixing with Current Context** (Gemini 3 Search):
   ```bash
   LLM_PROVIDER=gemini GEMINI_ENABLE_SEARCH=true npm run phase76:ace -- \
     --task "Fix errors related to latest SvelteKit 2.0 changes"
   ```
   → Gemini searches for current SvelteKit docs and migration guides

2. **Route Consolidation** (Claude for quality):
   ```bash
   LLM_PROVIDER=claude npm run phase76:ace -- \
     --task "Consolidate duplicate route paths" --iterations 3
   ```
   → Claude provides high-quality refactoring with explanations

3. **Fast Local Processing** (Ollama):
   ```bash
   LLM_PROVIDER=ollama npm run phase76:ace -- \
     --task "Add missing type annotations"
   ```
   → Fast, free, runs locally

### 4. View Enhanced Knowledge Graph

```bash
# Open interactive D3 graph
npm run phase76:graph
```

### 5. Complete Pipeline

```bash
# Run all phases in sequence
npm run phase76:full
```

This executes:
1. Phase 73: Knowledge graph building
2. Phase 74: Route inventory
3. Phase 75: GRPO agentic pipeline
4. Phase 76: Knowledge consolidation

## 📚 Architecture

### Knowledge Consolidator Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Phase 76: Consolidator                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Phase 72   │  │  Phase 73   │  │  Phase 74   │         │
│  │  53K errors │→ │  KG + Routes│→ │  Inventory  │         │
│  │  Embeddings │  │  Components │  │  Duplicates │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                 │                 │
│         └────────────────┴─────────────────┘                │
│                          ↓                                   │
│              ┌──────────────────────┐                       │
│              │  Unified Knowledge   │                       │
│              │  Base (JSON)         │                       │
│              │  - Entities          │                       │
│              │  - Relationships     │                       │
│              │  - Insights          │                       │
│              └──────────────────────┘                       │
│                          ↓                                   │
│        ┌─────────────────┴──────────────────┐              │
│        │                                      │              │
│  ┌─────▼──────┐                    ┌────────▼────────┐    │
│  │  D3 Graph  │                    │  ACE Prompts    │    │
│  │  (HTML)    │                    │  (JSON)         │    │
│  └────────────┘                    └─────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ACE Prompt Engineer Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Phase 76: ACE Prompt Engineer                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Task                                                   │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  1. RAG Retrieval  │────→ Qdrant (53,227 vectors)       │
│  │  (Semantic Search) │      Score: 0.7-1.0                │
│  └────────────────────┘      Top-K: 10                     │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  2. KAG Traversal  │────→ Knowledge Graph               │
│  │  (Graph Relations) │      Relationships: errors→routes  │
│  └────────────────────┘      routes→components             │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  3. Build Prompt   │────→ Template Selection            │
│  │  (Contextual)      │      + RAG context                 │
│  └────────────────────┘      + KAG relationships           │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  4. Multi-LLM Call │────→ Auto-Fallback Chain:          │
│  │  (with fallback)   │      1. Ollama (local, fast)       │
│  │                    │      2. Gemini 3 (web search) 🔍   │
│  │                    │      3. Claude (high quality)      │
│  │                    │      4. OpenAI (GPT-4)             │
│  └────────────────────┘                                     │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  5. Confidence?    │────→ ≥85%: Auto-apply ✅           │
│  │  (GRPO-style)      │      70-85%: Manual review ⚠️      │
│  └────────────────────┘      <70%: Invoke tools 🛠️        │
│      │                                                        │
│      ├─── (if <85%) ──┐                                     │
│      │                 ▼                                     │
│      │        ┌────────────────┐                           │
│      │        │  6. Tool Call  │                           │
│      │        │  (tsc, grep,   │                           │
│      │        │   file-read)   │                           │
│      │        └────────────────┘                           │
│      │                 │                                     │
│      │                 ▼                                     │
│      │        ┌────────────────┐                           │
│      │        │  7. Re-prompt  │                           │
│      │        │  (with tools)  │                           │
│      │        └────────────────┘                           │
│      │                 │                                     │
│      └─────────────────┘                                     │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────────────┐                                     │
│  │  Final Solution    │                                     │
│  │  + Confidence      │                                     │
│  │  + Validation      │                                     │
│  └────────────────────┘                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Use Cases

### 1. Error Resolution

**Task**: Fix all import errors in a specific route

```bash
npm run phase76:ace -- --task "Fix missing Button, Card, Input imports in evidence/analyze" --iterations 2
```

**ACE Process**:
1. RAG retrieves similar import errors from 53K embeddings
2. KAG finds related components in $lib/components/ui/
3. Generates import statements with high confidence (>85%)
4. Auto-applies fixes if validation passes

### 2. Route Consolidation

**Task**: Merge duplicate route paths

```bash
npm run phase76:ace -- --task "Consolidate duplicate routes for /evidence/analyze" --iterations 3
```

**ACE Process**:
1. RAG finds similar route structures
2. KAG traverses route→component dependencies
3. Generates consolidation plan with file merges
4. Invokes `grep-search` to find all import references
5. Outputs JSON with `{ action: 'merge', files: [], confidence: 0.XX }`

### 3. Production Readiness

**Task**: Validate production deployment readiness

```bash
npm run phase76:ace -- --task "Generate production readiness report" --iterations 1
```

**ACE Process**:
1. RAG retrieves critical error patterns
2. KAG analyzes route→API→test coverage
3. Calls tools: `tsc`, `svelte-check`, `test-runner`
4. Generates markdown report with ✅/❌ checklist

### 4. Type Error Fixing

**Task**: Resolve complex TypeScript type errors

```bash
npm run phase76:ace -- --task "Fix 'Type X is not assignable to Y' in cases route" --file src/routes/(app)/cases/[id]/+page.svelte --iterations 2
```

**ACE Process**:
1. RAG finds similar type errors in embeddings
2. KAG finds type definitions in $lib/
3. Reads file content with `file-read` tool
4. Generates type-safe fix with validation

## 🛠️ Tools Available

ACE Prompt Engineer can invoke these tools:

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `tsc` | TypeScript compilation check | Validate type errors |
| `svelte-check` | Svelte-specific validation | Check component errors |
| `grep-search` | Regex search across codebase | Find component usage |
| `file-read` | Read file contents | Analyze specific routes |
| `file-write` | Write file contents | Apply fixes |
| `ast-analyzer` | AST-based code analysis | Detect circular deps |
| `web-search` | Search external docs | Find library solutions |
| `test-runner` | Execute test suites | Validate fixes |

## 📊 Data Sources

### Qdrant Collections

```javascript
CONFIG.qdrant.collections = {
  errors: 'phase72_error_patterns',     // 53,227 error vectors
  routes: 'phase73_routes',             // Route embeddings
  knowledge: 'phase73_knowledge_graph'  // Full KB vectors
}
```

### Knowledge Base Structure

```json
{
  "metadata": {
    "timestamp": "2025-12-19T...",
    "version": "76.0",
    "sources": ["phase72", "phase73", "phase74", "phase75"]
  },
  "entities": {
    "errors": [
      {
        "id": "...",
        "file": "src/routes/(app)/cases/[id]/+page.svelte",
        "line": 42,
        "message": "Cannot find name 'Button'",
        "category": "import",
        "source": "phase72"
      }
    ],
    "routes": [...],
    "apis": [...],
    "components": [...]
  },
  "relationships": [
    {
      "from": "error-123",
      "to": "route-456",
      "type": "ERROR_IN_ROUTE",
      "weight": 1.0
    },
    {
      "from": "route-456",
      "to": "component-789",
      "type": "IMPORTS",
      "weight": 0.8
    }
  ],
  "insights": {
    "errorClusters": [...],
    "importIssues": [...],
    "routeDuplicates": [...]
  }
}
```

## 🎨 Prompt Templates

ACE uses pre-built prompt templates for common tasks, powered by **Multi-LLM Router with automatic fallback**.

### Multi-LLM Provider Selection

ACE automatically selects the best LLM provider based on task requirements:

| Task Type | Recommended Provider | Why |
|-----------|---------------------|-----|
| **Error Fixing** | Gemini 3 (search enabled) | Searches current docs for API changes |
| **Code Generation** | Claude Sonnet 4.5 | Highest quality code output |
| **Documentation** | Gemini 3 (search enabled) | Cites official sources |
| **Fast Iterations** | Ollama (local) | No API costs, low latency |
| **General Tasks** | Auto (fallback chain) | Tries all providers in order |

**Automatic Fallback Chain:**
```
Ollama (local) → Gemini 3 (search) → Claude (quality) → OpenAI (GPT-4)
     ↓ fails          ↓ fails           ↓ fails         ↓ final
  Try next         Try next          Try next       Error reported
```

### Error Fixing Prompt (with Gemini 3 Search)

```
You are an expert TypeScript/Svelte error remediation agent with access to:
- 53,227 catalogued errors with 80% embedding coverage
- 75 route files
- 1,154 reusable components
- 10 missing import issues
- **Google Search for current documentation** 🔍

Top errors to address:
1. src/routes/(app)/evidence/analyze/+page.svelte:42 - Cannot find name 'Button'
...

Your task:
1. Analyze error patterns using RAG semantic search
2. Query knowledge graph for related entities
3. **Search for latest TypeScript/Svelte documentation if needed**
4. Generate high-confidence fixes (≥85%)
5. Use tools: tsc, svelte-check, ast-analyzer
6. Validate fixes don't break existing functionality

If fixing errors related to new library versions, search for:
- Migration guides
- Breaking changes documentation
- Official API references
```

### Route Consolidation Prompt

```
You are a SvelteKit route architecture optimizer with:
- 75 active routes
- 1 duplicate route path detected

Duplicate routes found:
- / (multiple files)

Your task:
1. Analyze route usage patterns
2. Identify true duplicates vs intentional overrides
3. Generate consolidation plan with file merges
4. Validate no breaking changes
5. Update all import references

Output: JSON with { action: 'merge'|'keep', files: [], reason: '', confidence: 0-1 }
```

## 🧪 Testing & Validation

### 1. Verify Embeddings

```bash
# Check Qdrant collection
curl http://localhost:6333/collections/phase72_error_patterns
```

Expected:
```json
{
  "result": {
    "points_count": 53227,
    "vectors_count": 53227,
    "status": "green"
  }
}
```

### 2. Test Knowledge Consolidation

```bash
npm run phase76:consolidate
```

Expected output:
```
✅ All phases loaded
   Phase 72: 53,227 errors, 42,600 embeddings
   Phase 73: 75 routes, 19 APIs, 1,154 components
   Phase 74: 10 import issues, 1 duplicates

✅ Built 5,248 relationships
✅ Generated ACE prompts
✅ Knowledge graph saved
✅ Knowledge base saved (2.4 MB)
```

### 3. Test ACE Prompt Engineer

```bash
npm run phase76:ace -- --task "Test RAG+KAG retrieval" --iterations 1
```

Expected:
```
🤖 ACE Contextual Prompt Engineer
Task: Test RAG+KAG retrieval

✅ Knowledge base loaded
✅ ACE prompts loaded

🔄 Iteration 1/1

   📚 RAG Retrieval: Found 10 relevant errors
   🔗 KAG Traversal: Found 15 related entities
   ✍️  Prompt ready (2,456 chars)
   🧠 LLM responded (confidence: 87.5%)

✅ ACE Process Complete
   Final Confidence: 87.5%
   Tools Called: None
   Duration: 3.2s
```

## 📈 Performance

### Benchmarks (Intel i7-12700H, 32GB RAM, RTX 3060)

| Operation | Duration | Memory | Output Size |
|-----------|----------|--------|-------------|
| Knowledge consolidation | 4-6s | 500 MB | 2-5 MB JSON |
| RAG retrieval (top-10) | 0.5-1s | 100 MB | 10 results |
| KAG traversal | 0.2-0.5s | 50 MB | 10-20 relations |
| LLM call (Gemma2:27B) | 5-15s | 12 GB | 1-8K tokens |
| Tool invocation (`tsc`) | 3-10s | 200 MB | stdout |
| Full ACE pipeline (2 iter) | 20-40s | 13 GB | Session JSON + MD |

### Optimization Tips

1. **Embedding completion**: Finish all 53,227 vectors before ACE usage (80% → 100%)
2. **Qdrant caching**: First query slow (~2s), subsequent <0.5s
3. **LLM batching**: Group multiple tasks into single prompt
4. **Tool parallelization**: Run `tsc` + `svelte-check` concurrently

## 🔧 Configuration

### Environment Variables

```bash
# Qdrant
QDRANT_URL=http://localhost:6333

# Ollama
OLLAMA_URL=http://localhost:11434

# Neo4j (optional)
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### Confidence Thresholds

```javascript
CONFIG.confidence = {
  autoApply: 0.85,      // Auto-apply fixes ≥85%
  manualReview: 0.70,   // Manual validation 70-85%
  toolInvocation: 0.50, // Use tools 50-70%
  escalate: 0.50        // Human escalation <50%
}
```

### RAG Parameters

```javascript
CONFIG.qdrant = {
  topK: 10,             // Return top 10 results
  scoreThreshold: 0.7   // Minimum similarity score
}
```

## 📝 Example Session Output

### Session JSON (`session-1734567890123.json`)

```json
{
  "id": "1734567890123",
  "timestamp": "2025-12-19T12:34:50.123Z",
  "task": "Fix missing imports in evidence/analyze",
  "iterations": [
    {
      "number": 1,
      "steps": [
        { "name": "RAG Retrieval", "results": 10, "time": 1234.56 },
        { "name": "KAG Traversal", "results": 8, "time": 1456.78 },
        { "name": "Prompt Generation", "size": 2456, "time": 1467.89 },
        { "name": "LLM Response", "confidence": 0.87, "time": 5678.90 }
      ],
      "solution": "Add the following imports to <script>:\nimport { Button } from '$lib/components/ui/Button.svelte';\n...",
      "confidence": 0.87
    }
  ],
  "finalSolution": "...",
  "confidence": 0.87,
  "toolsCalled": []
}
```

### Solution Markdown (`solution-1734567890123.md`)

```markdown
# ACE Solution - Fix missing imports in evidence/analyze

**Confidence:** 87.0%
**Timestamp:** 2025-12-19T12:34:50.123Z
**Iterations:** 1

## Solution

Add the following imports to `src/routes/(app)/evidence/analyze/+page.svelte`:

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/Button.svelte';
  import { Card } from '$lib/components/ui/Card.svelte';
  import { Input } from '$lib/components/ui/Input.svelte';
  import { Label } from '$lib/components/ui/Label.svelte';
  import { DialogHeader } from '$lib/components/ui/dialog/DialogHeader.svelte';
  import { DialogFooter } from '$lib/components/ui/dialog/DialogFooter.svelte';
  import { Progress } from '$lib/components/ui/progress/Progress.svelte';
</script>
```

## Tools Used

None

## Validation

Run the following to validate:
- `npm run check` (TypeScript validation)
- `npm test` (test suite)
```

## 🎓 Advanced Usage

### Multi-Language Error Consolidation

ACE can handle errors from multiple languages:

```bash
# TypeScript + Svelte
npm run phase76:ace -- --task "Fix all TS2307 module errors across codebase"

# Go microservices (if phase73 detected them)
npm run phase76:ace -- --task "Analyze Go service errors in legal-engine"

# Python scripts
npm run phase76:ace -- --task "Fix Python import errors in RAG crawler"
```

### Custom Prompt Engineering

Create custom prompts in `reports/phase76/llm-prompts.json`:

```json
{
  "customTask": {
    "role": "custom-agent",
    "context": { "myMetric": 123 },
    "prompt": "You are a custom agent. Task: ...",
    "tools": ["tsc", "grep-search"],
    "confidenceThresholds": {
      "autoApply": 0.90
    }
  }
}
```

Then invoke:

```bash
npm run phase76:ace -- --task "custom-task-name"
```

### VS Code Tasks Integration

See `.vscode/tasks.json` for pre-configured tasks:

- **Phase 76: Full Pipeline** - Runs all phases sequentially
- **Phase 76: ACE Quick Fix** - Interactive prompt for quick fixes
- **Phase 76: Knowledge Graph** - Opens enhanced visualization

Keyboard shortcut: `Ctrl+Shift+P` → "Tasks: Run Task" → "Phase 76: ..."

## 🐛 Troubleshooting

### Issue: "Qdrant not available"

**Solution**: Start Qdrant service

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Issue: "Embeddings incomplete (42,600/53,227)"

**Solution**: Resume embedding generation

```bash
npm run embed:resume
```

### Issue: "LLM error: Connection refused"

**Solution**: Verify Ollama is running

```bash
ollama serve
ollama pull gemma2:27b
```

### Issue: "Knowledge base not found"

**Solution**: Run consolidator first

```bash
npm run phase76:consolidate
```

## 📊 Metrics & Monitoring

### Knowledge Base Stats

View in `reports/phase76/consolidated-knowledge-base.json`:

```json
{
  "metadata": {
    "sources": ["phase72", "phase73", "phase74", "phase75"]
  },
  "entities": {
    "errors": 53227,
    "routes": 75,
    "apis": 19,
    "components": 1154
  },
  "embeddings": {
    "total": 42600,
    "coverage": "80.0%"
  }
}
```

### ACE Session Metrics

Track in `reports/phase76/ace-sessions/`:

- Average confidence per task type
- Tool invocation frequency
- Iteration count distribution
- Success rate (confidence ≥85%)

## 🚀 Next Steps

1. **Complete embeddings** to 100% (currently 80%)
2. **Run full pipeline** to validate entire system
3. **Test ACE on real tasks** (import fixes, route consolidation)
4. **Monitor confidence scores** and adjust thresholds
5. **Extend with Neo4j** for advanced KAG queries (optional)
6. **Create custom prompts** for domain-specific tasks

## 📚 Related Documentation

- `PHASE74_EXTENDED_COMPLETE.md` - Import resolution details
- `AGENT_BEST_PRACTICES.md` - GRPO agentic architecture
- `PHASE_READINESS.md` - Production deployment checklist
- `reports/phase73/production-readiness.md` - Validation report

## 🤝 Contributing

To extend Phase 76:

1. Add new prompt templates in `phase76-ace-knowledge-consolidator.mjs`
2. Implement additional tools in `phase76-ace-prompt-engineer.mjs`
3. Enhance D3 visualization with custom node types
4. Add multi-language error parsers (Go, Python, C++)

## 📄 License

MIT License - See LICENSE file for details

---

**Built with**: Node.js 22.x, Ollama (Gemma2:27B), Qdrant, D3.js, SvelteKit 2.x

**Maintained by**: Legal AI Development Team

**Last Updated**: December 19, 2025
