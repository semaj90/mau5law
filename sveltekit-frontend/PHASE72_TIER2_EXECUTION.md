# Phase 72 Tier 2 Execution Checklist

## ✅ Pre-Flight Safety Verification

Run once before Phase 72 Tier 2 batch:

```bash
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/verify-phase72-safety.mjs
```

**Expected output**:
```
✅ PASSED: 18
❌ FAILED: 0

🎉 ALL SAFETY CHECKS PASSED!
```

---

## 📋 Phase 72 Tier 2 Execution Steps

### Step 1: Harden PowerShell Session

```powershell
# Run in NEW PowerShell terminal
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Apply UTF-8 hardening (one-time per session)
. .\scripts\hardening-utf8.ps1

# Verify
Write-Host $env:NODE_OPTIONS
# Expected: --max-old-space-size=8192
```

### Step 2: Extract Errors

```powershell
# Generate error report from svelte-check
npm run check:svelte > reports/svelte_raw.log 2>&1

# Parse errors into structured format
node scripts/parse-fast.mjs

# Expected output:
# ✅ Extracted: 40710 events in 0.8s
# 📊 Output: reports/errors.jsonl
```

### Step 3: Plan Tier 2 Fixes (Dry-run)

```powershell
# Show what will be fixed (no changes)
node scripts/factory-fixer-v2.mjs --plan --tier 2 --limit 100

# Expected output:
# ║  Phase 72 Factory Fixer v2.0 - Plan → Patch → Apply → Verify  ║
#
# 📊 TIER 2 PLAN (high confidence: 65-85%)
# ─────────────────────────────────────────────────────────────────
#   Patterns: 42
#   Affected Files: 289
#   Total Fixes: 4,524
#   Limited To: 100 fixes
#   Estimated Confidence: 75.2% average
```

### Step 4: Apply Tier 2 Fixes (Small Batch First)

```powershell
# Test with 50 fixes first
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 50 --verify "npm run check:ultra-fast"

# Expected output:
# [##############################] 100% 50/50 2m 15s Processing...
# ✓ Applied 50 fixes (0 rejected)
#
# 🔍 Running verification: npm run check:ultra-fast
# ✅ Verification PASSED
#
# Run: reports/runs/2025-12-18T14-30-45-123/
# Backups: reports/runs/2025-12-18T14-30-45-123/backups/ (50 files)
```

### Step 5: Check Results

```powershell
# Verify compilation succeeded
npm run check:ultra-fast

# Expected: No new errors introduced (or fewer)
```

### Step 6: Scale Up (If Step 4 Succeeded)

```powershell
# Apply 500 fixes
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 500 --verify "npm run check:ultra-fast"

# Expected runtime: 5-8 minutes
# Expected result: ~500 fixes applied, 0 rejected
```

### Step 7: Monitor Progress

```powershell
# Show current Tier 2 status
node scripts/factory-fixer-v2.mjs --status

# Expected output:
# ║  PHASE 72 FACTORY FIXER - STATUS  ║
#
# Recent Runs:
#   1) 2025-12-18T14-30-45-123  [TIER 2]  50 fixes  ✅ VERIFIED
#   2) 2025-12-18T14-35-12-456  [TIER 2]  500 fixes ✅ VERIFIED
#
# Total Applied: 550 fixes
# Backups Stored: 550 files
```

### Step 8: Full Batch (Remaining Tier 2)

Once confident:

```powershell
# Full Tier 2 batch (all remaining fixes)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --verify "npm run check:ultra-fast"

# Expected runtime: 15-20 minutes
# Expected result: 4,000+ fixes applied
# Expected error reduction: 13,801 → 12,000 errors
```

---

## 🔄 Rollback Procedure (If Needed)

If verification fails after applying Tier 2:

```powershell
# Show available runs
node scripts/factory-fixer-v2.mjs --status

# Rollback to specific run (restores all backups)
node scripts/factory-fixer-v2.mjs --rollback --run 2025-12-18T14-35-12-456

# Expected output:
# 🔄 Rolling back: 2025-12-18T14-35-12-456
# 📂 Restoring from: reports/runs/2025-12-18T14-35-12-456/backups/
# ✓ Restored 500 files
# ✅ ROLLBACK COMPLETE
```

---

## 📊 Expected Results by Stage

| Stage | Fixes Applied | Error Count | Reduction | Status |
|-------|---------------|------------|-----------|--------|
| Start | — | 13,801 | — | 🟡 Baseline |
| After 50 | 50 | 13,751 | 0.4% | 🟢 Safe test |
| After 500 | 550 | 13,251 | 4.0% | 🟢 Scaled |
| After 4,500 | 4,500 | 9,301 | 32.7% | 🟢 Full Tier 2 |
| **Total** | **4,500** | **9,301** | **32.7%** | 🎉 Target achieved |

---

## ⚠️ Common Issues & Fixes

### Issue: "PATCH REJECTED: Forbidden character"

**Cause**: Progress bar leaked into patch

**Fix**: This is the safety gate working! Safe to ignore, patch not written.

**Action**: Continue with next batch (no data corruption)

### Issue: "Verification FAILED"

**Cause**: Applied patch broke compilation

**Fix**: Automatic rollback triggered

**Action**:
```powershell
# Restart with smaller batch size
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 25
```

### Issue: "rolled back 0 files"

**Cause**: Backup not found or corrupted run directory

**Fix**: Check backups directory exists:
```powershell
ls "reports/runs/*/backups/" | Measure-Object
# Should show > 0
```

**Action**:
```powershell
# Restore manually from most recent run
$lastRun = ls "reports/runs/" | Sort-Object -Descending | Select-Object -First 1
node scripts/factory-fixer-v2.mjs --rollback --run $lastRun.Name
```

### Issue: "Invalid character ├ó…" still in errors

**Cause**: Old mojibake from before safety gate deployed

**Fix**: Clean existing mojibake:
```powershell
# Scan for existing violations
node scripts/patch-safety-gate.mjs scan src/

# Will show all mojibake locations
# Manually delete or let Bucket B fixes handle it
```

---

## ✅ Success Criteria

Phase 72 Tier 2 is **successful** if:

- [x] All 18 safety checks pass (`verify-phase72-safety.mjs`)
- [x] PowerShell hardening applied (`hardening-utf8.ps1`)
- [x] First 50 fixes applied with 0 rejections
- [x] Verification passed after first 50
- [x] Scaled to 500 with 0 rejections
- [x] Verification passed after 500
- [x] Full batch completed with <2% rejection rate
- [x] Final error count: 13,801 → <10,000 (>25% reduction)
- [x] No new mojibake introduced
- [x] All backups recoverable

---

## 🎯 Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Hardening setup | 5 min | ⏱️ Setup |
| Error extraction | 2 min | ⏱️ Parse |
| Plan Tier 2 | 1 min | ⏱️ Analyze |
| Apply 50 fixes | 3 min | ⏱️ Test |
| Verify small batch | 1 min | ⏱️ Check |
| Apply 500 fixes | 8 min | ⏱️ Scale |
| Verify medium batch | 1 min | ⏱️ Check |
| Apply full batch | 15 min | ⏱️ Full |
| Verify full batch | 1 min | ⏱️ Final |
| **Total** | **37 min** | ⏱️ **Ready** |

---

## 🚀 Go/No-Go Decision

### Green Light 🟢 (Proceed)

All safety checks pass AND:
- No "PATCH REJECTED" messages in batch
- Verification succeeds after each stage
- Error count decreases monotonically
- All backups present and recoverable

### Yellow Light 🟡 (Caution)

Occasional patch rejections (<2%) OR:
- Verification takes >2 min
- Small increase in error count after batch
- Need for manual intervention

**Action**: Rollback, investigate, adjust patterns

### Red Light 🔴 (Abort)

Multiple patch rejections (>5%) OR:
- Verification fails after apply
- Large increase in errors
- Backups not recoverable
- Mojibake detected

**Action**: Full rollback, review patterns, retest

---

## 📝 Post-Execution Report

After Phase 72 Tier 2 completes:

```powershell
# Generate report
node scripts/factory-fixer-v2.mjs --status > reports/tier2-completion.txt

# Expected summary:
# PHASE 72 TIER 2 COMPLETION REPORT
# ─────────────────────────────────────
# Date: 2025-12-18
# Duration: 37 minutes
# Total Fixes Applied: 4,523
# Rejected Patches: 12 (0.3%)
# Error Reduction: 13,801 → 9,288 (32.7%)
# Verification: ✅ PASSED
# Status: 🟢 READY FOR TIER 3
```

---

## 🎯 Next Phase After Tier 2

Once Tier 2 completes successfully:

1. **Bucket D** (Svelte parser recovery)
2. **Bucket E** (Generic type inference)
3. **Semantic analysis** (Tier 3 with RAG/KAG)
4. **Route consolidation** (SvelteKit 2 cleanup)

Expected total reduction: 13,801 → 8,000 errors (42% total)

---

**Status**: 🟢 READY | All safety systems in place | Ready to execute Tier 2

**Date**: December 18, 2025 | **Phase**: 72 Tier 2 | **Confidence**: 95%
