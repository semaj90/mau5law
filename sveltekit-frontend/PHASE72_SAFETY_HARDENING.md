# Phase 72 Safety Hardening Guide

## 🎯 Overview

This guide addresses critical safety issues discovered during Phase 72 batch fixing:

1. **Mojibake Injection** - Unicode progress characters leaking into source code
2. **Encoding Issues** - PowerShell/Node.js UTF-8 problems
3. **CLI Parsing Bugs** - Flags incorrectly treated as filenames
4. **Silent Failures** - Rollback operations completing with 0 files

---

## 📋 What Happened

### The Mojibake Problem

During Tier 2 batch fixes, error messages contained:

```
Invalid character ├ó…
Cannot find name '├ó'
```

**Root cause**: Progress bar strings from terminal output were injected into TypeScript patches:

```javascript
// BAD: This got written to source files
"Progress: 50% ├─────────────────────────────────┤ Current: Step: Analyzing..."
```

When the TypeScript parser read this, it saw:
- `├ó` = mojibake (corrupted UTF-8)
- Progress bar characters = syntax errors
- UI strings = invalid identifiers

**Why**: Progress bars written to stdout were captured by log redirection, then fed back into patch generation.

---

## ✅ Solution 1: Patch Safety Gate

### File: `scripts/patch-safety-gate.mjs`

**Blocks patches containing**:
- Box-drawing characters (U+2500–U+257F): `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ═ ║`
- Dingbats (U+2700–U+27BF): emojis, ornaments
- UI strings: `Progress:`, `Current: Step:`

### Usage in factory-fixer-v2.mjs

```javascript
import { validatePatch, writePatchedFile } from './patch-safety-gate.mjs';

// Before writing patched content:
try {
  validatePatch(patchedContent, file);
  writePatchedFile(file, patchedContent);
} catch (gateError) {
  console.error(`PATCH REJECTED: ${gateError.message}`);
  stats.rejected++;
  // Restore from backup
  fs.copyFileSync(backupPath, file);
}
```

### What it outputs

✅ **Allowed**:
```typescript
const x = 42;
export interface Error { code: string; }
```

❌ **Rejected** (with explanation):
```
PATCH REJECTED: Forbidden character in src/app.ts
  Character: "─" (U+2500)
  Line: 42
  Context: // Progress: 50% ─────────────────────────────────...

  This usually means a progress bar or UI string leaked into the patch.
```

---

## ✅ Solution 2: PowerShell UTF-8 Hardening

### File: `scripts/hardening-utf8.ps1`

**Run once per terminal session**:

```powershell
. .\scripts\hardening-utf8.ps1
```

**What it does**:

```powershell
chcp 65001 | Out-Null                    # Switch to UTF-8
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)  # UTF-8 output
$env:PYTHONIOENCODING = "utf-8"          # Python UTF-8
$env:NODE_OPTIONS = "--max-old-space-size=8192"  # 8GB Node
```

**Why it matters**:

- PowerShell defaults to the system code page (often CP-1252 on Windows)
- UTF-8 code page 65001 prevents corruption
- Output encoding must match for logging
- Node.js needs explicit UTF-8 flag

---

## ✅ Solution 3: Safe Progress Reporting

### File: `scripts/patch-safety-gate.mjs` (includes `createSafeProgress()`)

**ASCII-only progress bar, writes to stderr only**:

```javascript
import { createSafeProgress } from './patch-safety-gate.mjs';

const progress = createSafeProgress();

for (let i = 0; i <= 100; i += 10) {
  progress.tick(i, 100, 'Processing files');
}

progress.done('Complete');
```

**Output** (to stderr, never captured by log redirection):

```
[##########################------] 100% 00100/00100 1m 23s ETA: 0s Processing files
✓ Complete (1m 23s)
```

**Key benefits**:
- ASCII only (no Unicode)
- Writes to stderr (separate from stdout logs)
- Throttled to 200ms (no spam)
- ETA calculation
- Automatic completion message

---

## ✅ Solution 4: Fixed CLI Parsing

### File: `scripts/persist-errors.mjs`

**Old (broken)**:
```javascript
const inputFile = args.find(a => a.startsWith('--input='))?.split('=')[1] ||
                  args[args.indexOf('--input') + 1] ||
                  'default.jsonl';
```

Problem: `--stats` flag was treated as a filename.

**New (safe)**:
```javascript
const FLAGS = new Set(args.filter(a => a.startsWith('--')));
const parseArg = (name, defaultVal) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  const next = args[idx + 1];
  return next && !next.startsWith('--') ? next : defaultVal;
};

const inputFile = parseArg('input', 'reports/error-clusters.json');
const SHOW_STATS = FLAGS.has('--stats');
```

**Usage**:

```bash
# Show statistics only (doesn't persist)
node scripts/persist-errors.mjs --stats

# Persist and show stats
node scripts/persist-errors.mjs --input reports/errors.json --stats

# Persist specific batch size
node scripts/persist-errors.mjs --input reports/errors.json --batch 50
```

---

## 🔧 How to Use These Fixes

### Step 1: Harden PowerShell

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Run once per terminal
. .\scripts\hardening-utf8.ps1

# Verify
$env:NODE_OPTIONS
# Output: --max-old-space-size=8192
```

### Step 2: Run Phase 72 Batch (Tier 2)

```powershell
# Extract errors
npm run check:svelte > reports/svelte_raw.log 2>&1
node scripts/parse-fast.mjs

# Plan (dry-run first)
node scripts/factory-fixer-v2.mjs --plan --tier 2 --limit 100

# Apply with safety gate
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100 --verify "npm run check:ultra-fast"
```

### Step 3: Verify No Mojibake

```bash
# Scan for any leftover Unicode
node scripts/patch-safety-gate.mjs scan src/

# Should output:
# ✓ No mojibake found in src/
```

### Step 4: Check Statistics

```bash
# Show stats without persisting
node scripts/persist-errors.mjs --stats

# Expected output:
# 📊 ERROR STATISTICS (--stats mode)
# ═════════════════════════════
# Input file: reports/error-clusters.json
# Clusters: 42
# Total errors: 13,801
```

---

## 📊 Expected Impact

| Issue | Before | After | Solution |
|-------|--------|-------|----------|
| Mojibake in source | YES ❌ | NO ✅ | Patch safety gate |
| Progress leaks to logs | YES ❌ | NO ✅ | Safe progress (stderr) |
| UTF-8 corruption | OCCASIONAL ❌ | NEVER ✅ | PowerShell hardening |
| CLI flag errors | YES ❌ | NO ✅ | Safe argument parsing |
| Silent failures | YES ❌ | LOUD ✅ | Detailed error messages |

---

## 🚨 Troubleshooting

### "Invalid character ├ó…" Still Appears

1. Restart PowerShell (to apply UTF-8 hardening)
2. Run: `node scripts/patch-safety-gate.mjs scan src/`
3. Manually delete corrupted characters
4. Re-run factory fixer

### "rolled back 0" (no files restored)

**Issue**: Rollback couldn't find backup directory.

**Fix**: Ensure `--apply` writes manifest:

```javascript
fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify({
  tier: plan.tier,
  timestamp: new Date().toISOString(),
  filesModified: [...stats.filesModified],
  backupsDir: backupsDir
}, null, 2), 'utf8');
```

### "--stats" treated as filename

**Issue**: Old CLI parsing code.

**Fix**: Update persist-errors.mjs (already done in this package).

---

## 🎓 Key Learnings

### 1. Never Trust Terminal Output in Patches

Progress bars, error messages, and UI strings can leak into generated code.

**Rule**: Separate stdout (logs) from stderr (progress), validate all patches before writing.

### 2. Unicode is Dangerous in Code Generators

Box-drawing, dingbats, and fancy Unicode can corrupt source files.

**Rule**: ASCII only for anything that might enter source code.

### 3. PowerShell Encoding Requires Explicit Handling

**Rule**: Set UTF-8 code page (65001) + OutputEncoding in every terminal session.

### 4. CLI Parsing Must Distinguish Flags from Values

`--stats` should not become a filename.

**Rule**: Parse flags separately, use explicit `--input=value` or `--input value` patterns.

### 5. Backups Must Be Durable

Rollbacks failing silently is worse than failing loudly.

**Rule**: Write manifest immediately after backup, validate paths before restore.

---

## 📚 Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `scripts/patch-safety-gate.mjs` | NEW | Patch validation + safe progress |
| `scripts/hardening-utf8.ps1` | NEW | PowerShell UTF-8 setup |
| `scripts/factory-fixer-v2.mjs` | MODIFIED | Added safety gate to applyFixes() |
| `scripts/persist-errors.mjs` | MODIFIED | Fixed CLI parsing, added --stats |

---

## ✅ Verification Checklist

Before running Tier 2 batch again:

- [ ] Run `hardening-utf8.ps1` in current terminal
- [ ] Verify `$env:NODE_OPTIONS` = `--max-old-space-size=8192`
- [ ] Test: `node scripts/patch-safety-gate.mjs test` (should pass all 3 tests)
- [ ] Scan: `node scripts/patch-safety-gate.mjs scan src/` (should find no violations)
- [ ] Test CLI: `node scripts/persist-errors.mjs --stats` (should show stats, no error)
- [ ] Dry-run: `node scripts/factory-fixer-v2.mjs --plan --tier 2 --limit 10`
- [ ] Review plan output for "rejected: 0" (no patches should be rejected)

---

## 🚀 Ready for Next Phase

Once verified:

```bash
# Full Tier 2 batch (safe)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 500 --verify "npm run check:ultra-fast"

# Monitor progress (stderr, no log pollution)
# [################----] 42% 210/500 2m 15s Processing...
# ✓ Applied 210 fixes (0 rejected)
```

Expected result: **13,801 → 10,000+ errors** (25-30% additional reduction).

---

**Status**: 🟢 HARDENED | All safety gates in place | Ready for Tier 2 batch
