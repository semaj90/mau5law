# Batch Fixer v2 – Quick Reference Card

## In 30 Seconds

```bash
# See what needs fixing
node scripts/batch-merger-fixer-v2.mjs --analyze

# Fix onMount patterns (41 files ready)
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async

# Check & add missing barrel exports
node scripts/batch-merger-fixer-v2.mjs --report-barrels
node scripts/batch-merger-fixer-v2.mjs --fix-barrels

# Review Bits-UI v2 issues (manual)
node scripts/batch-merger-fixer-v2.mjs --report-bitsui
```

## What Each Command Does

| Command | Does What | Time | Result |
|---------|-----------|------|--------|
| `--analyze` | Scan & categorize all issues | <2s | Shows counts + top files |
| `--fix-onmount-async` | Transform async callbacks | ~5s | 41 files fixed |
| `--report-barrels` | Find missing exports | ~2s | List 6-10 issues |
| `--fix-barrels` | Auto-add exports (safe) | ~1s | Updates index.ts |
| `--report-bitsui` | Show v2 migration tasks | ~2s | 74 issues with line#s |

## Current Status

```
📊 Analysis Results
├── onMount(async): 41 files ✅ FIXED
├── Barrel exports: 6 missing ⏳ READY TO FIX
└── Bits-UI v2: 74 issues 📋 MANUAL (surgical report ready)
```

## One-Minute Workflow

```bash
# 1. Dry-run to preview (no modifications)
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async --dry-run

# 2. Apply fixes
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async
node scripts/batch-merger-fixer-v2.mjs --fix-barrels

# 3. Validate
npm run check:ultra-fast

# 4. Done! 🎉
```

## Common Questions

**Q: Will it corrupt my files?**
A: No. Uses idempotent patterns; only modifies files that actually need changes. Validates file existence before edits.

**Q: Can I undo?**
A: Yes. Use `git checkout` to revert, or use `--dry-run` first to preview.

**Q: How long does it take?**
A: ~10 seconds for full analysis + fixes on 1,514 files.

**Q: What about Bits-UI issues?**
A: Those are manual (74 instances). Use the surgical report with line numbers to find and fix each one.

**Q: Can I run it multiple times?**
A: Yes! Idempotency guard prevents re-fixing. Safe to run again.

## Troubleshooting

**Issue**: Errors reported but nothing changed
**Fix**: Use `--analyze` first to see breakdown by priority

**Issue**: Want to see changes before applying?
**Fix**: Add `--dry-run` flag to any fix command

**Issue**: TypeScript still errors?
**Fix**: Those are pre-existing API parse errors (minified stubs). Safe to ignore for now.

---

**Location**: `sveltekit-frontend/scripts/batch-merger-fixer-v2.mjs`
**Docs**: `sveltekit-frontend/BATCH_FIXER_V2_GUIDE.md`
**Updated**: Dec 15, 2025
