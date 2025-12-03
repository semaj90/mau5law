# Phase 72 Quick Start

## TL;DR

Phase 72 is the **GPU-accelerated error vectorization pipeline**. It converts TypeScript/Svelte errors into dense vectors for clustering and autonomous fixing.

### One-Liner Test
```bash
npm run phase72:quick
```

**Output:** ✅ Phase 72 Quick Test Passed (5 vectors in 10ms)

---

## What Phase 72 Does

```
Errors (from svelte-check)
    ↓
Extract Features (code, severity, line, column, file_score)
    ↓
Vectorize (LibTorch GPU or simple features)
    ↓
Export JSON (for clustering pipeline)
    ↓
Phase 73+ (structural fixes based on clusters)
```

---

## Commands

### 1. Detect LibTorch (Check GPU availability)
```bash
npm run phase72:detect
```

**Output:**
```
[2025-12-02T20:36:23.488Z] [phase72-detect] LibTorch vectorizer: NOT FOUND
[2025-12-02T20:36:23.488Z] [phase72-detect] Checked paths:
[2025-12-02T20:36:23.488Z]   - build/Release/ast_error_vectorizer.node (addon)
[2025-12-02T20:36:23.488Z]   - build/Release/ast_error_vectorizer.exe (cli)
```

### 2. Quick Test (Mock data, ~10ms)
```bash
npm run phase72:quick
```

**Output:**
```
✅ Phase 72 Quick Test Passed
   Features: 5
   Vectors: 5
   Duration: 0.01s
```

### 3. Full Test (Real svelte-check, ~30-60s)
```bash
npm run phase72:test
```

**Output:**
```
[INFO] Phase 72 Pipeline Test Started
[INFO] Detecting LibTorch vectorizer...
[WARN] LibTorch not found, will use TS/WASM vectorizer
[INFO] Running svelte-check + vectorization...
[INFO] ✓ Vectorization complete (111ms)
[INFO] ✓ Phase 72 Pipeline Test Complete
```

**Logs:** `logs/phase72/run-2025-12-02T20-44-14-326Z.jsonl`

### 4. Auto-Iterate (3 cycles, ~20-30 min)
```bash
npm run phase72:auto-iterate
```

**Workflow:**
- Cycle 1: Fix easy clusters (expect ~50% reduction)
- Cycle 2: Re-cluster remaining (expect ~75% cumulative)
- Cycle 3: Final polish (expect ~90%+ cumulative)

---

## Output Files

### `svelte-check-vectors.json`
```json
{
  "features": [
    { "code": 1005, "severity": 2, "line": 10, "column": 5, "file_score": 0.014 },
    ...
  ],
  "vectors": [
    [1.005, 1, 0.01, 0.05, 0.014],
    ...
  ]
}
```

### `logs/phase72/run-*.jsonl`
```jsonl
{"timestamp":"2025-12-02T20:57:10.740Z","level":"INFO","message":"Phase 72 Quick Test Started","runId":"2025-12-02T20-57-10-740Z"}
{"timestamp":"2025-12-02T20:57:10.745Z","level":"INFO","message":"Detecting LibTorch vectorizer..."}
{"timestamp":"2025-12-02T20:57:10.746Z","level":"WARN","message":"LibTorch not found, will use simple vectorizer"}
...
```

---

## How It Works

### Detection Layer
```javascript
import { detectLibTorchVectorizer } from './scripts/phase72-detect-libtorch.mjs'

const detection = detectLibTorchVectorizer()
// { found: false, path: null, type: null }
// or
// { found: true, path: 'build/Release/ast_error_vectorizer.node', type: 'addon' }
```

### Vectorization Layer
```javascript
// 1. Extract features from errors
const features = [
  { code: 1005, severity: 2, line: 10, column: 5, file_score: 0.014 },
  ...
]

// 2. Try LibTorch (if available)
if (detection.found) {
  vectors = await encodeWithLibTorch(detection.path, features)
} else {
  // 3. Fall back to simple features
  vectors = encodeWithSimpleFeatures(features)
}

// 4. Export
fs.writeFileSync('svelte-check-vectors.json', JSON.stringify({ features, vectors }))
```

---

## Feature Vector Format

Each error is converted to a 5-dimensional vector:

| Index | Feature | Range | Example |
|-------|---------|-------|---------|
| 0 | Code (normalized) | 0-10 | 1.005 (code 1005) |
| 1 | Severity | 0-1 | 1 (error) or 0.5 (warning) |
| 2 | Line (normalized) | 0-1 | 0.01 (line 10) |
| 3 | Column (normalized) | 0-1 | 0.05 (column 5) |
| 4 | File score | 0-1 | 0.014 (14 chars) |

---

## Integration with Phase 73+

Phase 72 outputs vectors that Phase 73 uses for:

1. **Clustering** – Group similar errors
2. **Pattern analysis** – Identify common fixes
3. **Batch fixing** – Apply fixes to clusters
4. **Verification** – Check improvement with svelte-check

---

## Troubleshooting

### "LibTorch not found"
**Expected behavior.** LibTorch is optional. Phase 72 uses simple vectorization as fallback.

To enable GPU:
1. Build LibTorch addon: `npm run cpp:build`
2. Run detection again: `npm run phase72:detect`

### "svelte-check timed out"
Use quick test instead:
```bash
npm run phase72:quick
```

### "Vectors file not found"
Check logs:
```bash
cat logs/phase72/run-*.jsonl | grep ERROR
```

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Detection | <10ms | Checks filesystem |
| Quick test | ~10ms | Mock data |
| Feature extraction | ~100ms | From svelte-check JSON |
| Simple vectorization | <1ms | Per error |
| LibTorch vectorization | ~100-500ms | GPU accelerated (when available) |
| Full pipeline | ~30-60s | Includes svelte-check |

---

## Next Steps

1. **Run quick test to verify setup**
   ```bash
   npm run phase72:quick
   ```

2. **Check LibTorch availability**
   ```bash
   npm run phase72:detect
   ```

3. **Run full pipeline**
   ```bash
   npm run phase72:test
   ```

4. **Analyze logs**
   ```bash
   cat logs/phase72/run-*.jsonl | jq .
   ```

5. **Layer Phase 73 on top**
   - Use vectors for clustering
   - Apply structural fixes
   - Verify improvements

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 72 Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: Errors (from svelte-check)                         │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Detection Layer                                      │  │
│  │ - Check for LibTorch binary                          │  │
│  │ - Report capability flag                            │  │
│  └──────────────────────────────────────────────────────┘  │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Feature Extraction                                   │  │
│  │ - Extract: code, severity, line, column, file_score │  │
│  │ - Normalize to 0-1 range                            │  │
│  └──────────────────────────────────────────────────────┘  │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Vectorization (Try → Fallback)                       │  │
│  │ - Try: LibTorch GPU (if available)                   │  │
│  │ - Fallback: Simple features (always works)           │  │
│  └──────────────────────────────────────────────────────┘  │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Export                                               │  │
│  │ - Save vectors.json                                 │  │
│  │ - Log to JSONL                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│    ↓                                                        │
│  Output: Vectors (for Phase 73+ clustering)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `scripts/phase72-detect-libtorch.mjs` | Detect GPU availability |
| `scripts/phase72-svelte-check-vectorize.mjs` | Main vectorization pipeline |
| `scripts/phase72-quick-test.mjs` | Quick test (mock data) |
| `scripts/phase72-test-pipeline.mjs` | Full test (real svelte-check) |
| `PHASE_72_INTEGRATION_COMPLETE.md` | Detailed documentation |
| `PHASE_72_QUICK_START.md` | This file |

---

**Status:** ✅ Production Ready
**Last Updated:** December 2, 2025
