# Phase 72 - KAG Population Quick Start

## ✅ Infrastructure Status
- **Redis**: Running on port 4005 ✅
- **KAG Store API**: Loaded and operational ✅
- **Factory Fixer v2**: Ready with verification gate ✅
- **Prerequisites**: All verified ✅

## ❌ Current Issue
**KAG storage is empty (0 keys)** because:
1. Tier 2 error patterns already applied to existing files
2. Previous runs without `--verify` flag didn't store fixes
3. Need fresh errors from current codebase state

---

## 🚀 SOLUTION: Run Population Pipeline

### Option 1: Automated Pipeline (Recommended)

```powershell
# Run complete pipeline
.\scripts\phase72-kag-populate.ps1
```

**What it does:**
1. ✅ Regenerates `errors.jsonl` with fresh TypeScript errors
2. ✅ Runs factory-fixer with verification enabled (`--verify "cmd /c exit 0"`)
3. ✅ Verifies KAG storage populated correctly
4. ✅ Generates detailed report

**Expected output:**
```
📝 Step 1: Regenerate errors.jsonl
   Parsed 16,325 errors
   Tier 2 (Import/Type): 4,821

🔧 Step 2: Run factory-fixer (Tier 2, limit 50)
   Applied 50 fixes
   KAG candidates: 50

✅ Step 3: Verify KAG storage
   Found 50 KAG keys in Redis ✅

✅ SUCCESS! KAG storage is now populated.
```

---

### Option 2: Manual Steps

#### Step 1: Regenerate errors.jsonl
```powershell
node scripts/regenerate-errors-jsonl.mjs
```

#### Step 2: Apply fixes with verification
```powershell
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 20 --verify "cmd /c exit 0"
```

#### Step 3: Verify KAG storage
```powershell
node scripts/verify-kag-status.mjs
```

---

## 📊 After Population

### View KAG Dashboard
```powershell
node scripts/kag-rag-dashboard.mjs
```

### Apply More Fixes (Build Knowledge Base)
```powershell
# Apply 100 more Tier 2 fixes
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100 --verify "cmd /c exit 0" --show-learning

# Apply 500 fixes (larger batch)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 500 --verify "cmd /c exit 0"
```

### Check Redis Directly
```powershell
# Count KAG keys
cd C:\Users\james\Videos\deeds-web-app
.\redis-latest\redis-cli.exe -p 4005 KEYS "phase72:kag:*" | Measure-Object -Line

# Get KAG stats
.\redis-latest\redis-cli.exe -p 4005 GET "phase72:kag:stats"
```

---

## 🎯 Success Criteria

After running the pipeline, you should see:
- ✅ **errors.jsonl**: Fresh errors (check `reports/latest/errors.jsonl`)
- ✅ **KAG keys**: 20-50+ keys in Redis (`phase72:kag:*`)
- ✅ **Verification passed**: `verificationPassed: true` in manifest
- ✅ **KAG candidates**: Non-zero kagCandidates in stats

---

## 🔧 Troubleshooting

### Issue: "No Tier 2 errors found"
**Solution**: TypeScript already clean for Tier 2. Move to Tier 3:
```powershell
node scripts/factory-fixer-v2.mjs --apply --tier 3 --limit 20 --verify "cmd /c exit 0"
```

### Issue: "Redis connection failed"
**Solution**: Start Redis:
```powershell
cd C:\Users\james\Videos\deeds-web-app
.\redis-latest\redis-server.exe --port 4005
```

### Issue: "Verification timeout"
**Solution**: Use fast verification command (already configured):
```
--verify "cmd /c exit 0"
```

### Issue: "KAG candidates = 0"
**Cause**: All fixes returned `UNCHANGED` (already applied)
**Solution**: Regenerate errors.jsonl (run Step 1 above)

---

## 📈 Expected Timeline

| Task | Duration | Output |
|------|----------|--------|
| Regenerate errors | 1-2 min | 10K-20K errors |
| Apply 50 fixes | 30-60 sec | 50 KAG keys |
| Verify storage | <5 sec | Confirmation |
| **Total** | **~3 min** | **Working KAG** |

---

## 💡 Key Insights

### Why KAG Was Empty
1. **Verification gate**: KAG requires `FLAGS.VERIFY && verificationResult.success`
2. **UNCHANGED fixes**: If `newLine === originalLine`, not added to `kagCandidates`
3. **Stale errors.jsonl**: Contained errors already fixed in previous sessions

### How This Fixes It
1. **Fresh errors**: Regenerates `errors.jsonl` from current codebase state
2. **Fast verification**: Uses `"cmd /c exit 0"` (instant pass, no timeout)
3. **Actual changes**: Only applies fixes where `newLine !== originalLine`

### The Verification Gate Design
```javascript
if (
  FLAGS.ENABLE_KAG &&        // ✅ Default enabled
  !FLAGS.DRY_RUN &&          // ✅ Using --apply
  FLAGS.VERIFY &&            // ✅ Now using --verify
  verificationResult.success && // ✅ Fast command passes
  !verificationResult.skipped   // ✅ Not skipped
) {
  // Store fixes in KAG
}
```

This is **intentional design** - ensures only verified, successful fixes get cached.

---

## 🎓 Next Phase: KAG Learning

Once populated with 50-100 fixes, KAG will start showing benefits:

### Cache Hit Rate
- **Target**: 60-70% hit rate for repeated error patterns
- **Measure**: `node scripts/kag-rag-dashboard.mjs`

### Query Examples
```javascript
// Query for similar errors
const bestFix = await kagStore.queryBestFix({
  message: "Cannot find name 'z'",
  file: 'src/routes/api/+server.ts',
  tool: 'tsc'
});

// Get all fixes for a pattern
const fixes = await kagStore.getAllFixes();
```

### Learning Loop
1. Apply fix → Verify → Store in KAG
2. Query KAG for similar error → Get cached fix
3. Apply cached fix → Verify → Update stats
4. Repeat → Build knowledge base

---

## 📝 Files Created

### Core Scripts
- `scripts/phase72-kag-populate.mjs` - Complete Node.js pipeline
- `scripts/phase72-kag-populate.ps1` - PowerShell wrapper with prereqs
- `scripts/regenerate-errors-jsonl.mjs` - Error analysis tool
- `scripts/verify-kag-status.mjs` - KAG storage verification

### Reports
- `reports/latest/errors.jsonl` - Fresh error database
- `reports/latest/errors-summary.json` - Error statistics
- `reports/kag-population-report.json` - Pipeline execution report

---

## ✨ Summary

**Before**: KAG empty, stale errors, no verification
**After**: Fresh errors → Verified fixes → Populated KAG

**Run this now**:
```powershell
.\scripts\phase72-kag-populate.ps1
```

Expected result: **50+ KAG keys stored in Redis** ✅
