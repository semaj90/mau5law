# Phase 66-79: Complete Error Analysis & Remediation Pipeline

**Last Updated:** 2025-12-25
**Status:** ✅ Production Ready
**Error Reduction:** 73.8% (16,733 → 4,391 errors)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Detailed Pipeline Phases](#detailed-pipeline-phases)
5. [Scripts Reference](#scripts-reference)
6. [Pattern Definitions](#pattern-definitions)
7. [RAG/Vector Indexing](#ragvector-indexing)
8. [ACE Contextual Prompting](#ace-contextual-prompting)
9. [Maintenance & Iteration](#maintenance--iteration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Phase 66-79 pipeline is a **comprehensive, agentic error remediation system** that:

- **Captures** TypeScript/Svelte errors from build tools
- **Normalizes** them into a unified JSONL schema
- **Clusters** by pattern with regex-based classification
- **Ranks** by impact score (severity × frequency × architectural weight)
- **Indexes** into Qdrant vector database for semantic search
- **Auto-fixes** using deterministic pattern-based transformations
- **Learns** from successful fixes via contextual prompting (ACE)

### Key Metrics

| Metric | Value |
|--------|-------|
| **Initial Errors** | 16,733 |
| **Current Errors** | 4,391 |
| **Reduction** | 73.8% (12,342 fixed) |
| **Auto-Fixable Patterns** | 5/13 (38%) |
| **Manual Patterns** | 8/13 (62%) |
| **Avg Fix Time** | 2-5 minutes per file |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PHASE 66-79 PIPELINE                    │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  1. CAPTURE  │  svelte-check, tsc, vitest, eslint
  └──────┬───────┘
         │ Raw error logs
         ▼
  ┌──────────────┐
  │ 2. NORMALIZE │  error-ingest.mjs → JSONL schema
  └──────┬───────┘  {runId, commit, file, line, code, message, fingerprint}
         │
         ▼
  ┌──────────────┐
  │ 3. CLUSTER   │  patterns.json → patternId classification
  └──────┬───────┘  Regex matching + domain tagging
         │
         ▼
  ┌──────────────┐
  │  4. RANK     │  error-leaderboard.mjs → impact scores
  └──────┬───────┘  Score = errorCount × categoryWeight × severityWeight
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
  ┌──────────────┐                     ┌──────────────┐
  │ 5A. AUTO-FIX │                     │ 5B. INDEX    │
  └──────┬───────┘                     └──────┬───────┘
         │ phase79-pattern-fixer.mjs          │ error-index-qdrant.mjs
         │ Deterministic patches              │ Ollama embeddings
         │                                     │ Qdrant vector DB
         ▼                                     ▼
  ┌──────────────┐                     ┌──────────────┐
  │ 6. VALIDATE  │                     │ 6. SEARCH    │
  └──────┬───────┘                     └──────┬───────┘
         │ Re-run checks                      │ error-search.mjs
         │ Compare error counts               │ Semantic queries
         │                                     │
         └─────────────┬───────────────────────┘
                       │
                       ▼
                ┌──────────────┐
                │  7. LEARN    │  ACE contextual prompting
                └──────────────┘  Update patterns.json with examples
                                  Feed successful fixes to LLM context
```

---

## Quick Start

### Prerequisites

```powershell
# Verify infrastructure
docker ps | Select-String -Pattern "qdrant|redis|ollama"

# Should show:
# - qdrant/qdrant:latest (port 6333)
# - redis:alpine (port 6379)
# - ollama/ollama (port 11434)

# Test Ollama embedding model
curl http://localhost:11434/api/tags | ConvertFrom-Json | Select-Object -ExpandProperty models | Where-Object { $_.name -like "*embedding*" }
```

### 30-Second Demo

```powershell
# 1. Capture errors
$runId = "demo-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node scripts/error-ingest.mjs --run $runId

# 2. Generate leaderboard (top 1000)
node scripts/error-leaderboard.mjs --run $runId --top 1000

# 3. Index into Qdrant
node scripts/error-index-qdrant.mjs --run $runId --batch 50

# 4. Semantic search
node scripts/error-search.mjs --query "database type errors" --top 10

# 5. Apply auto-fixes
node scripts/phase79-pattern-fixer.mjs --apply --pattern db-import
```

### Full Pipeline Run

```powershell
# Run complete Phase 79 pipeline
.\scripts\run-phase79-pipeline.ps1
```

---

## Detailed Pipeline Phases

### Phase 1: Capture Diagnostics

**Goal:** Collect raw errors from all build tools
**Script:** `error-ingest.mjs`
**Input:** `svelte-check`, `tsc --noEmit`, `vitest run`, `eslint`
**Output:** `logs/errors/<runId>.jsonl`

```powershell
# Manual capture
npx svelte-check --output machine > reports/svelte-check-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt

# Automated (recommended)
node scripts/error-ingest.mjs --run phase79-$(Get-Date -Format 'yyyyMMdd-HHmmss')
```

**Schema:**
```typescript
{
  runId: string;           // "phase79-20251225-143022"
  commit: string;          // "1c79f4e"
  timestamp: string;       // ISO 8601
  tool: string;            // "svelte-check"
  file: string;            // "src/routes/+page.svelte"
  line: number;            // 42
  column: number;          // 15
  code: string;            // "ts(2304)"
  message: string;         // "Cannot find name 'foo'"
  snippet: string;         // Code context
  severity: string;        // "error" | "warning" | "info"
  fingerprint: string;     // SHA256 hash (16 chars)
  patternId?: string;      // Assigned in Phase 3
  priority?: number;       // Assigned in Phase 3
  severityWeight?: number; // Assigned in Phase 3
  domains?: string[];      // Assigned in Phase 3
}
```

### Phase 2: Pattern Clustering

**Goal:** Classify errors by known patterns
**Script:** `error-ingest.mjs` (automatic)
**Input:** `patterns.json`
**Output:** Errors with `patternId`, `priority`, `severityWeight`, `domains`

**Pattern Matching Algorithm:**
```javascript
for (const pattern of patterns) {
  const regex = new RegExp(pattern.regex, 'i');
  if (regex.test(error.message) || regex.test(error.snippet)) {
    error.patternId = pattern.id;
    error.priority = pattern.priority;
    error.severityWeight = pattern.severityWeight;
    error.domains = pattern.domains;
    break;
  }
}
```

**Current Patterns:** 13 total
- Auto-fixable: 5 patterns (db-import, drizzle-enum, env-type-declarations, import-type-runtime, missing-await)
- Manual: 8 patterns (lucia-adapter, async-effect-unwrap, readonly-mutation, type-any-fallback, duplicate-identifier, grpc-type-mismatch, flatbuffers-schema, quic-protocol-error)

### Phase 3: Impact Ranking

**Goal:** Prioritize fixes by business impact
**Script:** `error-leaderboard.mjs`
**Input:** `logs/errors/<runId>.jsonl`
**Output:** `reports/phase79-leaderboard/<runId>-leaderboard.md`

**Impact Score Formula:**
```javascript
impactScore = (errorCount × categoryWeight × avgSeverityWeight) × cascadeMultiplier

// Category weights (architectural importance)
const ARCHITECTURE_MAP = {
  'routes-pages': 10,      // P0: User-facing routes
  'routes-server': 10,     // P0: API endpoints
  'api-endpoints': 10,     // P0: REST APIs
  'database': 9,           // P0: Data layer
  'auth': 9,               // P0: Security
  'grpc-services': 7,      // P2: Backend services
  'protobuf': 6,           // P2: Schemas
  'flatbuffers': 6,        // P2: Schemas
  'quic-protocol': 5,      // P2: Networking
  'components': 5,         // P1: UI
  'stores': 6,             // P1: State
  'utils': 4,              // P2: Helpers
  'types': 3               // P2: Type defs
};

// Cascade multiplier (errors that block other files)
cascadeMultiplier = (category === 'routes-pages' || category === 'api-endpoints') ? 1.5 : 1.0;
```

**Example Output:**
```markdown
## 🎯 Top 1000 Files by Impact Score

| Rank | File | Errors | Category | Weight | Impact | Fix Priority |
|------|------|--------|----------|--------|--------|--------------|
| 1 | `src/routes/api/chat/+server.ts` | 42 | api-endpoints | 10 | 630 | **P0** |
| 2 | `src/lib/server/db/schema-postgres.ts` | 15 | database | 9 | 203 | **P0** |
| 3 | `src/routes/+page.svelte` | 8 | routes-pages | 10 | 120 | **P0** |
```

### Phase 4: Deterministic Auto-Fix

**Goal:** Apply safe, pattern-based transformations
**Script:** `phase79-pattern-fixer.mjs`
**Input:** `patterns.json`, error classification
**Output:** Modified source files, `reports/fix-log-<runId>.json`

**Supported Patterns:**

| Pattern ID | Description | Auto-Fix | Example |
|------------|-------------|----------|---------|
| `db-import` | Named `db` import instead of default | ✅ | `import { db }` → `import db` |
| `drizzle-enum` | Enum mismatch (active→open) | ✅ | `status='active'` → `status='open'` |
| `env-type-declarations` | Missing env imports | ✅ | Add `import { DATABASE_URL } from '$env/static/private'` |
| `import-type-runtime` | Type-only import used at runtime | ✅ | `import type { User }` → `import { type User }` |
| `missing-await` | Promise not awaited | ✅ | `fn()` → `await fn()` |

**Usage:**
```powershell
# Dry run (preview only)
node scripts/phase79-pattern-fixer.mjs --pattern db-import

# Apply fixes
node scripts/phase79-pattern-fixer.mjs --pattern db-import --apply

# Apply all auto-fixable patterns (priority order)
node scripts/phase79-pattern-fixer.mjs --apply
```

**Fix Log Schema:**
```typescript
{
  runId: string;
  commit: string;
  timestamp: string;
  patternId: string;
  file: string;
  line: number;
  status: "success" | "failed" | "skipped";
  diff?: string;      // Unified diff of changes
  error?: string;     // Failure reason
}
```

### Phase 5A: Validation Loop

**Goal:** Verify fixes don't introduce regressions
**Script:** `error-ingest.mjs` (re-run)

```powershell
# After applying fixes
$beforeCount = 4391
node scripts/phase79-pattern-fixer.mjs --apply --pattern db-import

# Re-capture errors
$runId = "verify-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node scripts/error-ingest.mjs --run $runId

# Compare
$afterCount = (Get-Content "logs/errors/$runId-stats.json" | ConvertFrom-Json).totalErrors
$reduction = $beforeCount - $afterCount
Write-Host "Reduction: $reduction errors ($([math]::Round(($reduction / $beforeCount) * 100, 1))%)"
```

### Phase 5B: Vector Indexing (RAG)

**Goal:** Enable semantic search over error corpus
**Script:** `error-index-qdrant.mjs`
**Dependencies:** Ollama (embeddinggemma:latest), Qdrant
**Output:** Qdrant collection `phase79_errors`

**Architecture:**
```
Error JSONL → Ollama Embeddings (1024-dim) → Qdrant Points
                                                   ↓
                                            Cosine Similarity Search
```

**Embedding Text Format:**
```
File: src/routes/+page.svelte
Error Code: ts(2304)
Message: Cannot find name 'db'
Pattern: db-import
Domains: backend, database
Snippet: const users = await db.select()...
```

**Usage:**
```powershell
# Index errors (creates collection if needed)
node scripts/error-index-qdrant.mjs --run phase79-20251225-143022 --batch 50

# Recreate collection (drops existing)
node scripts/error-index-qdrant.mjs --run phase79-20251225-143022 --recreate
```

**Collection Stats:**
```powershell
# Query Qdrant directly
Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_errors" |
  Select-Object -ExpandProperty result |
  Format-Table points_count, vectors_count, status
```

### Phase 6: Semantic Search

**Goal:** Natural language queries over indexed errors
**Script:** `error-search.mjs`
**Input:** User query string
**Output:** Ranked error results with similarity scores

**Query Examples:**
```powershell
# Find database-related errors
node scripts/error-search.mjs --query "database connection and type errors" --top 10

# Search for import issues
node scripts/error-search.mjs --query "cannot find name import missing" --top 20

# High confidence matches only
node scripts/error-search.mjs --query "lucia auth adapter" --threshold 0.7
```

**Output Format:**
```
📊 SEARCH RESULTS (10 matches)

1. src/lib/server/db/index.ts:15:8
   Score: 92.3%
   Error: [ts(2304)] Cannot find name 'db'
   Pattern: db-import (Priority: 1)
   Domains: backend, database
   Snippet: const users = await db.select()...

2. src/routes/api/users/+server.ts:8:12
   Score: 89.1%
   Error: [ts(2304)] Cannot find name 'db'
   Pattern: db-import (Priority: 1)
   Domains: backend, database
```

**Pattern Analysis:**
```
📋 PATTERN ANALYSIS

db-import:
   Occurrences: 156
   Affected Files: 42
   Avg Relevance: 88.5%

env-type-declarations:
   Occurrences: 89
   Affected Files: 34
   Avg Relevance: 76.2%
```

### Phase 7: ACE Contextual Prompting

**Goal:** Feed successful fixes to LLM for learning
**Script:** `phase76-ace-prompt-engineer.mjs`
**Integration:** Phase 79 → Phase 76 ACE

**Context Pack Schema:**
```typescript
{
  error: {
    file: string;
    line: number;
    code: string;
    message: string;
  };
  pattern: {
    id: string;
    description: string;
    priority: number;
  };
  fixTemplate: string;        // From patterns.json
  examplePatch: string;        // Successful diff from fix-log
  similarErrors: Array<{      // From Qdrant search
    file: string;
    message: string;
    score: number;
  }>;
  codeContext: string;         // Surrounding code from AST
}
```

**Usage:**
```powershell
# Analyze file with contextual prompting
node scripts/phase76-ace-prompt-engineer.mjs --task "Fix database import errors in src/lib/server/db/index.ts"

# Use Gemini with web search
$env:LLM_PROVIDER="gemini"
$env:GEMINI_ENABLE_SEARCH="true"
node scripts/phase76-ace-prompt-engineer.mjs --task "Suggest fixes for Svelte 5 rune migration"

# Use Ollama (local)
$env:LLM_PROVIDER="ollama"
$env:OLLAMA_MODEL="gemma3-legal:latest"
node scripts/phase76-ace-prompt-engineer.mjs --task "Fix TypeScript errors in API routes"
```

**Prompt Template:**
```
You are analyzing TypeScript/Svelte errors in a production codebase.

ERROR CONTEXT:
File: {{error.file}}
Line: {{error.line}}
Error: [{{error.code}}] {{error.message}}

KNOWN PATTERN:
ID: {{pattern.id}}
Description: {{pattern.description}}
Fix Template: {{fixTemplate}}

SUCCESSFUL EXAMPLE:
{{examplePatch}}

SIMILAR ERRORS (from vector search):
{{#each similarErrors}}
- {{file}}: {{message}} ({{score}}% match)
{{/each}}

CODE CONTEXT:
```typescript
{{codeContext}}
```

TASK: Suggest a precise fix for this error following the pattern template.
```

---

## Scripts Reference

### Core Pipeline Scripts

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `error-ingest.mjs` | Capture & normalize errors | svelte-check output | `logs/errors/<runId>.jsonl` |
| `error-leaderboard.mjs` | Rank errors by impact | JSONL logs | `reports/phase79-leaderboard/<runId>-leaderboard.md` |
| `error-index-qdrant.mjs` | Vector indexing | JSONL logs | Qdrant collection |
| `error-search.mjs` | Semantic search | User query | Ranked results |
| `phase79-pattern-fixer.mjs` | Auto-fix patterns | patterns.json | Modified files + fix-log |

### Phase 72-79 Integration Scripts

| Script | Purpose | Notes |
|--------|---------|-------|
| `phase72-auto-iterate.mjs` | 3-cycle GPU clustering | Calls Phase 79 for fixes |
| `phase78-brain-pass.mjs` | AST analysis + ACE | Feeds Phase 79 patterns |
| `phase79-cognitive-engine.mjs` | Ollama + Gemini RAG | Uses Phase 79 search |
| `phase79-streaming-error-analyzer.mjs` | Memory-efficient analysis | 16 categories |
| `phase79-architecture-analyzer.mjs` | 40+ category breakdown | Routes/API/gRPC/QUIC |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `validate-env.mjs` | Pre-pipeline environment check |
| `llm-router.mjs` | Multi-LLM provider abstraction |
| `test-knowledge-query.mjs` | Test Qdrant integration |

---

## Pattern Definitions

**File:** `patterns.json`

### Pattern Schema

```typescript
{
  id: string;                // Unique identifier
  description: string;       // Human-readable description
  regex: string;             // Error message/snippet matcher (unescaped)
  fixTemplate?: string;      // Patch template (optional)
  priority: number;          // 1-999 (lower = more important)
  severityWeight: number;    // 1-10 impact multiplier
  domains: string[];         // ["frontend", "backend", "database", etc.]
  examples?: Array<{         // Before/after examples
    before: string;
    after: string;
  }>;
  manual?: boolean;          // Cannot auto-fix
  notes?: string;            // Additional context
}
```

### Adding New Patterns

1. **Identify Pattern:**
   ```powershell
   # Find repeated errors
   node scripts/error-leaderboard.mjs --run latest | Select-String -Pattern "ts(####)"
   ```

2. **Define Pattern:**
   ```json
   {
     "id": "my-new-pattern",
     "description": "Brief description of error",
     "regex": "Error message regex pattern",
     "fixTemplate": "Code template for fix",
     "priority": 5,
     "severityWeight": 4,
     "domains": ["frontend"],
     "examples": [{
       "before": "const x = foo;",
       "after": "const x = await foo();"
     }]
   }
   ```

3. **Add to `patterns.json`:**
   ```powershell
   # Validate JSON
   Get-Content patterns.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
   ```

4. **Test Pattern:**
   ```powershell
   # Re-ingest with new pattern
   node scripts/error-ingest.mjs --run test-pattern-$(Get-Date -Format 'yyyyMMdd-HHmmss')

   # Check classification
   node scripts/error-leaderboard.mjs --run test-pattern-* | Select-String -Pattern "my-new-pattern"
   ```

### Pattern Priority Levels

| Priority Range | Category | Description |
|----------------|----------|-------------|
| 1-3 | **Critical** | Blocks builds, security issues |
| 4-6 | **High** | Breaks functionality, type safety |
| 7-9 | **Medium** | Cosmetic, deprecated APIs |
| 10+ | **Low** | Best practices, code style |

---

## RAG/Vector Indexing

### Qdrant Collection Setup

**Collection Name:** `phase79_errors`
**Vector Dimensions:** 1024 (embeddinggemma:latest)
**Distance Metric:** Cosine Similarity
**Indexing Threshold:** Auto (Qdrant default)

**Collection Schema:**
```json
{
  "vectors": {
    "size": 1024,
    "distance": "Cosine"
  },
  "payload_schema": {
    "runId": "keyword",
    "commit": "keyword",
    "file": "text",
    "code": "keyword",
    "message": "text",
    "patternId": "keyword",
    "priority": "integer",
    "severityWeight": "integer",
    "domains": "keyword"
  }
}
```

### Embedding Generation

**Model:** `embeddinggemma:latest` (Ollama)
**Batch Size:** 50 errors per request
**Rate Limit:** None (local Ollama)
**Timeout:** 30s per batch

**Embedding Pipeline:**
```javascript
// 1. Generate rich text representation
const text = [
  `File: ${error.file}`,
  `Error Code: ${error.code}`,
  `Message: ${error.message}`,
  `Pattern: ${error.patternId}`,
  `Domains: ${error.domains.join(', ')}`,
  error.snippet ? `Snippet: ${error.snippet}` : ''
].filter(Boolean).join('\n');

// 2. Call Ollama
const response = await fetch('http://localhost:11434/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({
    model: 'embeddinggemma:latest',
    prompt: text
  })
});

// 3. Extract embedding
const { embedding } = await response.json(); // Float32Array[1024]

// 4. Upsert to Qdrant
await fetch('http://localhost:6333/collections/phase79_errors/points', {
  method: 'PUT',
  body: JSON.stringify({
    points: [{
      id: error.fingerprint,
      vector: embedding,
      payload: { ...error }
    }]
  })
});
```

### Search Query Optimization

**Threshold Tuning:**
```powershell
# High precision (fewer, better matches)
node scripts/error-search.mjs --query "lucia auth" --threshold 0.8 --top 5

# High recall (more matches, lower confidence)
node scripts/error-search.mjs --query "type errors" --threshold 0.5 --top 20

# Balanced (recommended)
node scripts/error-search.mjs --query "database issues" --threshold 0.7 --top 10
```

**Filter by Metadata:**
```javascript
// Custom query with payload filtering
const response = await fetch('http://localhost:6333/collections/phase79_errors/points/search', {
  method: 'POST',
  body: JSON.stringify({
    vector: queryEmbedding,
    limit: 10,
    filter: {
      must: [
        { key: "patternId", match: { value: "db-import" } },
        { key: "priority", range: { lt: 5 } } // Only P0-P4
      ]
    }
  })
});
```

---

## ACE Contextual Prompting

### Integration with Phase 76 ACE

**Flow:**
```
Phase 79 Error Search → Context Pack → Phase 76 ACE → LLM Prompt → Fix Suggestion
```

**Context Pack Builder:**
```javascript
async function buildContextPack(error) {
  // 1. Get pattern definition
  const pattern = patterns.find(p => p.id === error.patternId);

  // 2. Search similar errors
  const similarErrors = await searchSimilarErrors(error.message, 5);

  // 3. Load fix examples from log
  const examplePatch = await loadSuccessfulFix(error.patternId);

  // 4. Extract code context (AST)
  const codeContext = await extractCodeContext(error.file, error.line, 10);

  return {
    error: {
      file: error.file,
      line: error.line,
      code: error.code,
      message: error.message
    },
    pattern: {
      id: pattern.id,
      description: pattern.description,
      priority: pattern.priority
    },
    fixTemplate: pattern.fixTemplate || "No template available",
    examplePatch: examplePatch || "No successful fix recorded",
    similarErrors: similarErrors.map(e => ({
      file: e.payload.file,
      message: e.payload.message,
      score: Math.round(e.score * 100)
    })),
    codeContext
  };
}
```

### LLM Provider Configuration

**Ollama (Local):**
```powershell
$env:LLM_PROVIDER="ollama"
$env:OLLAMA_URL="http://localhost:11434"
$env:OLLAMA_MODEL="gemma3-legal:latest"
```

**Gemini (Google):**
```powershell
$env:LLM_PROVIDER="gemini"
$env:GEMINI_API_KEY="your-api-key"
$env:GEMINI_MODEL="gemini-2.0-flash-exp"
$env:GEMINI_ENABLE_SEARCH="true"  # Enable web search grounding
```

**Claude (Anthropic):**
```powershell
$env:LLM_PROVIDER="claude"
$env:ANTHROPIC_API_KEY="your-api-key"
```

**OpenAI (GPT-4):**
```powershell
$env:LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="your-api-key"
```

### Prompt Engineering Best Practices

1. **Include Code Context:**
   - ✅ "Fix this error in context: [10 lines before + error + 10 lines after]"
   - ❌ "Fix this error: Cannot find name 'db'"

2. **Provide Pattern Examples:**
   - ✅ "Here's a successful fix for this pattern: [diff]"
   - ❌ "This is a common error, please fix it"

3. **Specify Constraints:**
   - ✅ "Only modify the import statement, preserve all other code"
   - ❌ "Fix all errors in this file"

4. **Request Explanation:**
   - ✅ "Explain why this fix works and any side effects"
   - ❌ "Just give me the fixed code"

---

## Maintenance & Iteration

### Weekly Error Reduction Loop

```powershell
# 1. Monday: Baseline measurement
$runId = "weekly-$(Get-Date -Format 'yyyyMMdd')"
node scripts/error-ingest.mjs --run $runId
node scripts/error-leaderboard.mjs --run $runId --top 1000

# 2. Tuesday-Thursday: Auto-fix priority patterns
$patterns = @('db-import', 'drizzle-enum', 'env-type-declarations', 'import-type-runtime', 'missing-await')
foreach ($pattern in $patterns) {
  Write-Host "Fixing pattern: $pattern" -ForegroundColor Yellow
  node scripts/phase79-pattern-fixer.mjs --pattern $pattern --apply

  # Validate after each pattern
  $afterRun = "verify-$pattern-$(Get-Date -Format 'yyyyMMdd')"
  node scripts/error-ingest.mjs --run $afterRun
}

# 3. Friday: Manual pattern triage
node scripts/error-search.mjs --query "manual patterns" --top 50
# Review top manual errors, create new auto-fix patterns

# 4. Weekend: Re-index for next week
node scripts/error-index-qdrant.mjs --run $runId --recreate
```

### Pattern Evolution

**Track Success Rates:**
```powershell
# Analyze fix logs
$fixLogs = Get-ChildItem -Path "reports/fix-log-*.json"
$stats = $fixLogs | ForEach-Object {
  $log = Get-Content $_.FullName | ConvertFrom-Json
  $total = $log.Length
  $success = ($log | Where-Object { $_.status -eq "success" }).Length
  [PSCustomObject]@{
    Pattern = $log[0].patternId
    Total = $total
    Success = $success
    Rate = [math]::Round(($success / $total) * 100, 1)
  }
} | Group-Object -Property Pattern | ForEach-Object {
  $sum = $_.Group | Measure-Object -Property Total -Sum
  $succ = $_.Group | Measure-Object -Property Success -Sum
  [PSCustomObject]@{
    Pattern = $_.Name
    Total = $sum.Sum
    Success = $succ.Sum
    SuccessRate = [math]::Round(($succ.Sum / $sum.Sum) * 100, 1)
  }
}

$stats | Sort-Object -Property SuccessRate -Descending | Format-Table
```

**Promote Manual to Auto-Fix:**
```powershell
# 1. Identify stable manual pattern with high success rate
# 2. Create deterministic transformation in phase79-pattern-fixer.mjs
# 3. Update patterns.json: remove "manual: true"
# 4. Test on subset of files
# 5. Commit to main pipeline
```

### Knowledge Base Consolidation

**Quarterly Cleanup:**
```powershell
# 1. Archive old run logs
$cutoffDate = (Get-Date).AddDays(-90)
Get-ChildItem -Path "logs/errors" -Filter "*.jsonl" |
  Where-Object { $_.LastWriteTime -lt $cutoffDate } |
  Compress-Archive -DestinationPath "logs/archive/errors-$(Get-Date -Format 'yyyy-Q').zip"

# 2. Deduplicate central log
$unique = Get-Content "data/errors.ndjson" |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Sort-Object -Property fingerprint -Unique |
  ForEach-Object { $_ | ConvertTo-Json -Compress }
$unique | Out-File "data/errors-deduped.ndjson"
Move-Item -Path "data/errors-deduped.ndjson" -Destination "data/errors.ndjson" -Force

# 3. Vacuum Qdrant collection
Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_errors/points/vacuum" -Method POST

# 4. Export successful patterns
$successPatterns = Get-Content "patterns.json" | ConvertFrom-Json
$successPatterns.patterns | Where-Object { -not $_.manual } |
  ConvertTo-Json -Depth 10 |
  Out-File "patterns-auto-fixable.json"
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors in scripts

**Cause:** Missing Node.js dependencies
**Fix:**
```powershell
cd sveltekit-frontend
npm install
```

#### 2. Ollama embedding fails

**Cause:** Model not pulled or Ollama not running
**Fix:**
```powershell
# Check Ollama status
curl http://localhost:11434/api/tags

# Pull embedding model
ollama pull embeddinggemma:latest

# Verify
ollama list | Select-String "embeddinggemma"
```

#### 3. Qdrant connection refused

**Cause:** Qdrant not running or wrong port
**Fix:**
```powershell
# Start Qdrant
docker start qdrant

# Or run new container
docker run -d -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant:latest

# Test connection
Invoke-RestMethod -Uri "http://localhost:6333/collections"
```

#### 4. Pattern not matching errors

**Cause:** Regex syntax error or escaped strings
**Fix:**
```javascript
// ❌ Wrong (escaped)
"regex": "Cannot find name \\'db\\'"

// ✅ Correct (unescaped in JSON)
"regex": "Cannot find name 'db'"

// Test regex
const pattern = "Cannot find name 'db'";
const message = "Error: Cannot find name 'db'";
console.log(new RegExp(pattern, 'i').test(message)); // true
```

#### 5. Auto-fixer modifies wrong files

**Cause:** Overly broad regex pattern
**Fix:**
```json
{
  "regex": "import.*db.*from.*\\$lib/server/db",

  // Add file path constraints
  "filePatterns": ["src/lib/server/**", "src/routes/api/**"],

  // Exclude tests
  "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### Performance Optimization

#### Slow Error Ingestion

**Symptoms:** `error-ingest.mjs` takes >5 minutes
**Cause:** Large svelte-check output
**Fix:**
```powershell
# Use streaming parser instead
node scripts/phase79-streaming-error-analyzer.mjs

# Or limit file scope
npx svelte-check --workspace src/routes --output machine
```

#### Qdrant Indexing Timeout

**Symptoms:** `error-index-qdrant.mjs` fails mid-batch
**Cause:** Ollama API timeout or Qdrant overload
**Fix:**
```powershell
# Reduce batch size
node scripts/error-index-qdrant.mjs --run $runId --batch 25

# Increase Ollama timeout (in script)
# Edit error-index-qdrant.mjs, line ~50:
const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  signal: AbortSignal.timeout(60000) // 60s instead of 30s
});
```

### Debugging

**Enable Verbose Logging:**
```powershell
$env:DEBUG="phase79:*"
node scripts/error-ingest.mjs --run debug-run
```

**Inspect JSONL Logs:**
```powershell
# View latest run
$latestRun = Get-ChildItem -Path "logs/errors" -Filter "*.jsonl" | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
Get-Content $latestRun.FullName | Select-Object -First 10 | ForEach-Object { $_ | ConvertFrom-Json | Format-List }
```

**Query Qdrant Directly:**
```powershell
# Get collection info
Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_errors" | ConvertTo-Json -Depth 5

# Search by fingerprint
Invoke-RestMethod -Uri "http://localhost:6333/collections/phase79_errors/points/<fingerprint>" | ConvertTo-Json
```

---

## Appendix: File Structure

```
sveltekit-frontend/
├── scripts/
│   ├── error-ingest.mjs               # Phase 1: Capture & normalize
│   ├── error-leaderboard.mjs          # Phase 3: Rank by impact
│   ├── error-index-qdrant.mjs         # Phase 5B: Vector indexing
│   ├── error-search.mjs               # Phase 6: Semantic search
│   ├── phase79-pattern-fixer.mjs      # Phase 4: Auto-fix
│   ├── phase79-cognitive-engine.mjs   # Phase 7: ACE integration
│   ├── phase79-streaming-error-analyzer.mjs
│   ├── phase79-architecture-analyzer.mjs
│   ├── validate-env.mjs               # Environment validation
│   └── llm-router.mjs                 # Multi-LLM abstraction
├── patterns.json                      # Pattern definitions
├── logs/
│   └── errors/
│       ├── <runId>.jsonl              # Per-run error logs
│       └── <runId>-stats.json         # Per-run statistics
├── data/
│   └── errors.ndjson                  # Central error log (all runs)
└── reports/
    └── phase79-leaderboard/
        └── <runId>-leaderboard.md     # Ranked error reports
```

---

## Quick Reference

### Essential Commands

```powershell
# Full pipeline
$runId = "phase79-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node scripts/error-ingest.mjs --run $runId
node scripts/error-leaderboard.mjs --run $runId --top 1000
node scripts/error-index-qdrant.mjs --run $runId --batch 50
node scripts/error-search.mjs --query "your query" --top 10
node scripts/phase79-pattern-fixer.mjs --apply

# Check error count
$output = npx svelte-check 2>&1 | Out-String
$errorCount = ([regex]::Matches($output, "Error:")).Count
Write-Host "Current Errors: $errorCount"

# View leaderboard
Get-Content "reports/phase79-leaderboard/*-leaderboard.md" | Select-Object -First 50
```

### Key Metrics to Track

- **Total Error Count:** Target <1,000 (currently 4,391)
- **Auto-Fix Success Rate:** Target >75%
- **Pattern Coverage:** Target >90% of errors matched to patterns
- **Indexing Completeness:** Qdrant points_count == total errors
- **Weekly Reduction Rate:** Target 5-10% reduction per week

---

**Document Version:** 1.0.0
**Last Verified:** 2025-12-25
**Maintained By:** Phase 79 Pipeline Team
**License:** Internal Use Only
