# Phase 88: Testing & Learning Pipeline

## Overview
Comprehensive error fixing test suite that validates KB retrieval, generates fixes, and updates the knowledge base with both successful patterns and negative reinforcements (what NOT to do).

## Test Cases (8 Real-World Errors)

### Svelte 5 Migration Errors
1. **`svelte-export-let`**: Legacy `export let` → `$props()`
2. **`svelte-reactive-statement`**: Reactive `$:` → `$derived()` + `$effect()`
3. **`svelte-onmount-deprecated`**: `onMount()` → `$effect()`

### SvelteKit 2 Routing
4. **`sveltekit-index-route`**: `index.svelte` → `+page.svelte`

### TypeScript Common Errors
5. **`ts-void-type-value`**: Using `void` as value instead of type
6. **`ts-cannot-find-module`**: Missing package installation

### Database & ORM
7. **`drizzle-raw-sql`**: Raw SQL → Drizzle ORM builder
8. **`pgvector-wrong-operator`**: Wrong distance operator (`<>` → `<->`)

## Pipeline Flow

```
Error → knowledge_retrieve → KB Context → Generate Fix → Validate → Log
                                                                       ↓
                                                          Update Qdrant with:
                                                          - Positive examples
                                                          - Negative reinforcements
```

## Usage

### Quick Start (Recommended)
```powershell
.\scripts\phase88-test-and-learn.ps1
```
**What it does**:
1. Runs 8 error fix tests
2. Queries KB for each error pattern
3. Validates fixes match expected patterns
4. Logs results to `reports/kb-error-fixes.jsonl`
5. Updates Qdrant with learned patterns

**Expected output**:
```
🧪 Phase 88: Testing Error Fixes with KB Grounding
================================================

📝 Test: svelte-export-let
   Error: TS2304 - 'export let' is legacy Svelte 3/4 syntax
   Query: "Svelte 5 component props how to replace export let"
   📊 KB Results: 5 contexts (top score: 0.823, method: hybrid)
   ✅ PASS: Fix matches expected pattern
      Sources: svelte.dev/docs/runes, bits-ui.com/docs/...

...

📊 Test Summary
================================================
Total tests: 8
✅ Passed: 6
❌ Failed: 2
Pass rate: 75.0%

📄 Results logged to: reports/kb-error-fixes.jsonl

📚 Knowledge Base Reinforcement Learning:
   Total error patterns stored: 8
   Positive examples: 6
   Negative reinforcements: 2
```

### Individual Steps

**Run tests only**:
```powershell
node scripts/phase88-test-error-fixes.mjs
```

**Update KB from test results**:
```powershell
node scripts/phase88-update-kb-from-fixes.mjs
```

**View learned patterns**:
```powershell
Get-Content reports/kb-error-fixes.jsonl | ConvertFrom-Json | Format-Table test_id, validation_passed, error_code
```

## Log Format (JSONL)

Each test creates a JSON log entry:

**Positive Example** (validation passed):
```json
{
  "timestamp": "2025-12-28T10:30:00.000Z",
  "test_id": "svelte-export-let",
  "error_code": "TS2304",
  "error_message": "'export let' is legacy Svelte 3/4 syntax",
  "query": "Svelte 5 component props how to replace export let",
  "kb_retrieval_method": "hybrid",
  "kb_result_count": 5,
  "kb_top_score": 0.823,
  "kb_sources": ["svelte.dev/docs/runes", "bits-ui.com/docs/..."],
  "generated_fix": "let { count = 0, name } = $props();",
  "expected_fix": "let { count = 0, name } = $props();",
  "validation_passed": true,
  "tags": ["svelte5", "props", "migration"],
  "negative_patterns": null
}
```

**Negative Reinforcement** (validation failed):
```json
{
  "timestamp": "2025-12-28T10:30:05.000Z",
  "test_id": "ts-void-type-value",
  "error_code": "TS2749",
  "error_message": "'void' only refers to a type",
  "query": "TypeScript void type error cannot use as value",
  "kb_retrieval_method": "fallback_qdrant",
  "kb_result_count": 2,
  "kb_top_score": 0.456,
  "kb_sources": ["typescript.org/docs/..."],
  "generated_fix": "return void;",
  "expected_fix": "return;",
  "validation_passed": false,
  "tags": ["typescript", "async", "types"],
  "negative_patterns": {
    "bad_code": "return void;",
    "why_bad": "'void' only refers to a type, but is being used as a value",
    "generated_but_wrong": "return void;"
  }
}
```

## KB Update Process

After tests run, `phase88-update-kb-from-fixes.mjs`:

1. **Reads JSONL log**
2. **Generates embeddings** for each pattern (positive + negative)
3. **Stores in Qdrant** with metadata:
   - **Positive examples**: Store successful fix pattern
   - **Negative reinforcements**: Store what NOT to do + why it's wrong

**Qdrant payload structure**:
```javascript
{
  type: 'error_fix',
  validation_status: 'positive' | 'negative',
  test_id: 'svelte-export-let',
  error_code: 'TS2304',
  error_message: '...',
  query: '...',
  solution: 'let { count } = $props();',  // Correct fix
  tags: ['svelte5', 'props', 'migration'],
  timestamp: '2025-12-28T10:30:00.000Z',
  kb_sources: ['svelte.dev/docs/runes'],

  // For negative examples only:
  bad_code: 'export let count = 0;',
  why_bad: 'Legacy Svelte 3/4 syntax',
  wrong_attempt: 'export let count: number = 0;'  // What we tried but failed
}
```

## Integration with Autonomous Agent

After running this pipeline, the Phase 86 autonomous loop will:

1. **Query KB** with `knowledge_retrieve`
2. **Get both**:
   - ✅ Positive examples (correct patterns)
   - ❌ Negative reinforcements (patterns to avoid)
3. **Generate fix** avoiding known bad patterns
4. **Apply + validate**
5. **Log new outcome** to JSONL for continuous learning

## Expected Pass Rates

| Scenario | Pass Rate | Action |
|----------|-----------|--------|
| After full ingestion | 80-100% | ✅ Ready for production |
| Partial ingestion | 50-80% | ⚠️ Run `phase88-quick-start.ps1` |
| No ingestion | 0-50% | ❌ Run full KB setup |

## Maintenance

**After framework updates**:
```powershell
# Re-run tests to capture new patterns
.\scripts\phase88-test-and-learn.ps1

# Check if new errors appear
Get-Content reports/kb-error-fixes.jsonl | ConvertFrom-Json | Where-Object { $_.timestamp -gt (Get-Date).AddDays(-1) }
```

**Monthly cleanup**:
```powershell
# Archive old logs
Move-Item reports/kb-error-fixes.jsonl "reports/archive/kb-error-fixes-$(Get-Date -Format 'yyyy-MM').jsonl"

# Re-run tests to refresh KB
.\scripts\phase88-test-and-learn.ps1
```

## Troubleshooting

**No KB results**:
- Run ingestion: `.\scripts\phase88-quick-start.ps1`
- Check Qdrant: `curl http://localhost:6333/collections/phase76_knowledge_base`

**Low pass rate (<50%)**:
- Verify FastMCP running: `curl http://localhost:3002/health`
- Check Ollama models: `curl http://localhost:11434/api/tags`
- Re-run verification: `.\scripts\phase88-verify-kb.ps1 -Full`

**Embedding generation fails**:
- Check Ollama: `ollama list`
- Pull embedding model: `ollama pull embeddinggemma`

## Files Created

- `scripts/phase88-test-error-fixes.mjs` - Test runner (8 real-world errors)
- `scripts/phase88-update-kb-from-fixes.mjs` - KB updater (positive + negative)
- `scripts/phase88-test-and-learn.ps1` - Complete pipeline orchestrator
- `reports/kb-error-fixes.jsonl` - Learning log (append-only)

---

**Status**: ✅ Ready to test. Run `.\scripts\phase88-test-and-learn.ps1` to begin.
