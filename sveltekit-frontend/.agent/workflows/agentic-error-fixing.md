---
description: How to use the ACE Command Center for agentic error fixing and route optimization
---

# ACE Agentic Error Fixing Workflow

## Overview
This workflow provides a systematic approach to reducing the ~71k TypeScript/Svelte errors in the codebase using automated scripts, backup file restoration, and knowledge graph updates.

## Prerequisites
- Node.js 18+
- All Docker services running (Qdrant, Redis, PostgreSQL)
- `.bak` files available for restoration

## Step 1: Analyze Current Error State
// turbo
```bash
npx svelte-check --threshold error --output machine 2>&1 | Select-Object -First 1000 | Out-File -FilePath "logs/svelte-check-top-1000.txt" -Encoding utf8
```

Review: `logs/ERROR_ANALYSIS_RECOMMENDATIONS.md`

## Step 2: Import Type Fixes (Dry Run)
// turbo
```bash
node scripts/fix-import-type.mjs src --verbose
```

Review the output. If satisfied, apply:
```bash
node scripts/fix-import-type.mjs src --apply
```

## Step 3: Event Handler Migration (Dry Run)
// turbo
```bash
node scripts/fix-svelte5-events.mjs src
```

Review the output. If satisfied, apply:
```bash
node scripts/fix-svelte5-events.mjs src --apply
```

## Step 4: Backup File Restoration

### Find Backup Files
// turbo
```bash
Get-ChildItem -Path "src/lib/components" -Filter "*.bak" -Recurse | Select-Object -First 20
```

### Compare Backup to Current
```bash
# View backup file
cat src/lib/components/ai/AutomatedLegalResearch.svelte.backup

# Compare with current (if exists)
diff src/lib/components/ai/AutomatedLegalResearch.svelte src/lib/components/ai/AutomatedLegalResearch.svelte.backup
```

### Restore if Backup is Clean
```bash
# Copy backup to main file
Copy-Item src/lib/components/ai/AutomatedLegalResearch.svelte.backup src/lib/components/ai/AutomatedLegalResearch.svelte
```

## Step 5: Run Svelte Check After Each Fix
// turbo
```bash
npx svelte-check --threshold error 2>&1 | Select-Object -Last 5
```

## Step 6: Update Knowledge Graph

After applying fixes, update these files:
- `GEMINI.md` - Error analysis section
- `CLAUDE.md` - Priority files section
- `copilot.md` - Error Analysis section

### Log to Qdrant (Optional)
```bash
# Index fix results
curl -X POST http://localhost:6333/collections/error-fixes/points \
  -H "Content-Type: application/json" \
  -d @logs/import-type-fixes-report.json
```

## Error Category Priority

| Priority | Category | Est. Errors | Fix Method |
|----------|----------|-------------|------------|
| 1 | `import type` misuse | 10,000+ | `fix-import-type.mjs` |
| 2 | Svelte 4 events | 5,000+ | `fix-svelte5-events.mjs` |
| 3 | Object corruption | 20,000+ | Backup restore / manual |
| 4 | Module exports | 5,000+ | Fix barrel files |
| 5 | Type mismatches | 10,000+ | Use Svelte5 components |

## Available Scripts

| Script | Purpose | Mode |
|--------|---------|------|
| `fix-import-type.mjs` | Fix `import type` used as value | dry-run/apply |
| `fix-svelte5-events.mjs` | Migrate event handlers | dry-run/apply |

## Reports Generated

- `logs/svelte-check-top-1000.txt` - Raw error output
- `logs/ERROR_ANALYSIS_RECOMMENDATIONS.md` - Fix strategies
- `logs/import-type-fixes-report.json` - Import fix results
- `logs/svelte5-events-report.json` - Event migration results

## Svelte 5 Component Replacement

Replace corrupted components with new Svelte 5 versions:

```typescript
import {
  Svelte5Button, Svelte5Dialog, Svelte5Input, Svelte5Select,
  Svelte5Checkbox, Svelte5Switch, Svelte5Tabs, Svelte5Tooltip,
  Svelte5Alert, Svelte5Badge, Svelte5Progress, Svelte5Card,
  Svelte5Avatar, Svelte5Slider, Svelte5RadioGroup, Svelte5DropdownMenu
} from '$lib/components/ui/svelte5-index';
```

## Success Criteria

- [ ] Errors reduced from 71k to <5k
- [ ] Dev server starts without 500 errors
- [ ] All routes load without compilation errors
- [ ] Svelte 5 components render correctly
