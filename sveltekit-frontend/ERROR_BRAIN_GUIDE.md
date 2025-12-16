# Error-Brain System Guide

**Status:** ✅ Production-Ready (with guardrails)
**Version:** 1.0.0
**Last Updated:** December 15, 2025

---

## Overview

The **Error-Brain** system provides automated TypeScript/Svelte error analysis, patch generation, and safe application with full observability.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Error-Brain Core                                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Analyzer   │→│ Diff Engine  │→│   Applier    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ↓                  ↓                 ↓         │
│  ┌──────────────────────────────────────────────────┐ │
│  │            Run Tracker (JSON files)              │ │
│  └──────────────────────────────────────────────────┘ │
│         ↓                                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │   Transport Layer (SSE / Redis / Both)           │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Flags

Control via environment variables:

```bash
# Master switch
ERROR_BRAIN_ENABLED=true|false

# Transport selection
ERROR_BRAIN_TRANSPORT=none|sse|redis|both

# Application mode
ERROR_BRAIN_APPLY_MODE=off|safe|full

# Safety limits
ERROR_BRAIN_MAX_PATCH_SIZE=100
ERROR_BRAIN_CONFIDENCE_MIN=0.7
ERROR_BRAIN_DRY_RUN=true|false

# Optional: Internal auth
ERROR_BRAIN_AUTH_TOKEN=<secret>
```

### Apply Modes

| Mode | Behavior |
|------|----------|
| `off` | Analyze only, no file changes |
| `safe` | Apply patches with confidence ≥70% and size ≤100 lines |
| `full` | Apply all patches (⚠️ use with caution) |

---

## Quick Start

### 1. Enable the System

```bash
# .env
ERROR_BRAIN_ENABLED=true
ERROR_BRAIN_TRANSPORT=none
ERROR_BRAIN_APPLY_MODE=off
ERROR_BRAIN_DRY_RUN=true
```

### 2. Check Status

```bash
curl http://localhost:5173/api/internal/error-brain/status
```

Expected response:
```json
{
  "enabled": true,
  "config": {
    "transport": "none",
    "applyMode": "off",
    "maxPatchSize": 100,
    "confidenceThreshold": 0.7,
    "dryRunDefault": true
  }
}
```

### 3. Create a Run

```bash
curl -X POST http://localhost:5173/api/internal/error-brain/runs \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "maxPatchSize": 50,
    "confidenceThreshold": 0.8
  }'
```

Response:
```json
{
  "runId": "run-1734334800000-a1b2c3d4",
  "state": "queued",
  "message": "Run created successfully"
}
```

### 4. Execute Analysis (Example)

```bash
# Using the batch-merger-fixer with error-brain integration
BATCH_REPORT_STAMP=2025-12-15_14-30-00 \
node scripts/batch-merger-fixer-v2.mjs --analyze
```

### 5. Check Run Status

```bash
curl http://localhost:5173/api/internal/error-brain/runs/run-1734334800000-a1b2c3d4
```

### 6. Apply Patches (Safe Mode)

```bash
# Enable safe application
ERROR_BRAIN_APPLY_MODE=safe \
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async
```

### 7. Verify Results

```bash
npm run check:ultra-fast
```

---

## Safety Checklist

Before running in production:

- [ ] `ERROR_BRAIN_DRY_RUN=true` is set
- [ ] `ERROR_BRAIN_APPLY_MODE=off` or `safe`
- [ ] `ERROR_BRAIN_MAX_PATCH_SIZE` is reasonable (≤100)
- [ ] `ERROR_BRAIN_CONFIDENCE_MIN` is high (≥0.7)
- [ ] Backups exist (`git stash` or backup script)
- [ ] CI runs analyzer in dry-run mode only
- [ ] Team knows how to rollback (see Incident Response)

---

## File Structure

```
sveltekit-frontend/
├── scripts/
│   ├── diff/
│   │   ├── generator.mjs      # Diff generation
│   │   ├── applier.mjs        # Patch application
│   │   └── reporter.mjs       # Report generation
│   └── batch-merger-fixer-v2.mjs  # Main analyzer
├── src/
│   ├── lib/server/error-brain/
│   │   ├── feature-flags.ts   # Config loader
│   │   ├── middleware.ts      # Guards & headers
│   │   └── run-tracker.ts     # Progress tracking
│   └── routes/api/internal/error-brain/
│       ├── status/+server.ts       # Health check
│       ├── runs/+server.ts         # List/create runs
│       └── runs/[runId]/+server.ts # Run details
└── reports/
    ├── patches/
    │   └── <stamp>/
    │       ├── *.diff          # Unified diffs
    │       ├── *.patch.json    # Structured patches
    │       ├── apply-log.json  # Application log
    │       └── SUMMARY.md      # Human-readable report
    └── runs/
        └── run-*.json          # Run metadata
```

---

## Integration with Existing Scripts

### batch-merger-fixer-v2.mjs

```javascript
import { RunTracker } from '../src/lib/server/error-brain/run-tracker.js';
import { generatePatch } from './diff/generator.mjs';
import { applyPatch } from './diff/applier.mjs';

// Create run
const tracker = new RunTracker(undefined, {
  dryRun: true,
  maxPatchSize: 100,
  confidenceThreshold: 0.7
});

tracker.setState('analyzing');
// ... scan files ...
tracker.incrementCounter('filesScanned', files.length);

tracker.setState('proposing');
// ... generate patches ...
for (const patch of patches) {
  tracker.addPatch(patch.filePath);
  tracker.incrementCounter('patchesProposed');
}

tracker.setState('applying');
// ... apply patches ...
for (const result of results) {
  if (result.success) {
    tracker.incrementCounter('patchesApplied');
  } else {
    tracker.incrementCounter('patchesRejected');
    tracker.addError({
      code: 'PATCH_FAILED',
      message: result.error,
      file: result.filePath
    });
  }
}

tracker.setState('done');
```

---

## Idempotency Guarantee

All operations are **idempotent**:

- Running analyzer twice produces same results
- Applying same patch twice is safe (hash guard prevents re-application)
- Reports are timestamped (no overwrites)
- `BATCH_REPORT_STAMP` env var controls deterministic naming

---

## CI Integration

See `.github/workflows/error-brain-check.yml`:

```yaml
name: Error-Brain Dry-Run Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run error-brain analyzer (dry-run only)
        env:
          ERROR_BRAIN_ENABLED: true
          ERROR_BRAIN_DRY_RUN: true
          ERROR_BRAIN_APPLY_MODE: off
        run: node scripts/batch-merger-fixer-v2.mjs --analyze

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: error-brain-reports
          path: reports/
```

---

## Performance

| Operation | Time | Memory |
|-----------|------|--------|
| Analyze 4451 files | ~30s | <2GB |
| Generate 100 patches | ~5s | <500MB |
| Apply 100 patches | ~10s | <500MB |

---

## Troubleshooting

### "Error-brain is disabled"

**Solution:** Set `ERROR_BRAIN_ENABLED=true` in `.env`

### "Hash mismatch" when applying patch

**Cause:** File was modified after patch was generated

**Solution:** Re-run analyzer to generate fresh patches

### "Exceeds safety cap"

**Cause:** Patch too large (>100 lines by default)

**Solution:**
1. Increase `ERROR_BRAIN_MAX_PATCH_SIZE` (use caution)
2. Or manually review and split the change

### High memory usage

**Solution:** Use batch processing:
```bash
NODE_OPTIONS="--max-old-space-size=3072" \
node scripts/batch-merger-fixer-v2.mjs --analyze
```

---

## Next Steps

1. Read [ERROR_BRAIN_INCIDENTS.md](./ERROR_BRAIN_INCIDENTS.md) for recovery procedures
2. Test in dry-run mode extensively
3. Enable `safe` mode for low-risk fixes
4. Monitor runs via `/api/internal/error-brain/runs`
5. Gradually increase confidence as system proves reliable

---

**Questions?** Check existing runs:
```bash
curl http://localhost:5173/api/internal/error-brain/runs | jq
```
