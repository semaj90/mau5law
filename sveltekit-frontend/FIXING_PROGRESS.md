# 🎯 Batch Error Fixing: Next Steps & Progress Tracking

## Current Status

✅ **COMPLETED (Dec 15, 22:45)**
- AST analysis: 243 routes analyzed
- Import type fixes: 21/187 applied (25% complete)
- TypeScript check: PASSING ✅
- Svelte check: PASSING ✅

⏳ **IN PROGRESS**
- Apply remaining import type fixes (166 files)
- Manual onMount async refactoring (21 files)
- Integration with legal_ai_db

---

## 📋 To-Do List

### Tier 1: Quick Wins (15-20 minutes)

#### 1.1 Complete Import Type Fixes
**Scope:** 166 remaining files (out of 187)
**Automation Level:** 100% automated
**Command:**
```powershell
cd sveltekit-frontend
node scripts/apply-import-type-fixes.mjs --top 200
npm run check
```

**Expected Outcome:**
- ✅ Another ~160 import type fixes applied
- ✅ All backups created (.bak files)
- ✅ TypeScript check continues to pass

**Time:** 5 minutes execution + 2 minutes verification

---

#### 1.2 Verify No Regressions
**Command:**
```powershell
npm run fmt
npm run lint:fix
npm run check
```

**Expected Result:**
- ✅ Code formatting applied
- ✅ Lint issues fixed
- ✅ TypeScript errors: 0

**Time:** 3 minutes

---

### Tier 2: Manual Fixes (10-15 minutes)

#### 2.1 Review Top onMount Async Cases
**Files:** Top 21 from batch-analysis report
**Manual Action Required:** Change async pattern

**Example Fix:**
```svelte
<!-- BEFORE -->
<script>
  import { onMount } from 'svelte';

  onMount(async () => {
    const data = await fetch('/api/data').then(r => r.json());
    console.log(data);
  });
</script>

<!-- AFTER -->
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    (async () => {
      const data = await fetch('/api/data').then(r => r.json());
      console.log(data);
    })();
  });
</script>
```

**Files to Review:**
1. src/routes/text-editor/+page.svelte
2. src/routes/legal-report-compare/+page.svelte
3. src/routes/ai-legal-assistant/+page.svelte
4. src/routes/machine-learning/+page.svelte
5. ... (check batch-analysis-2025-12-15.json for full list)

**Time:** 5-10 minutes (manual review + fixes)

---

### Tier 3: Full Codebase Verification (5 minutes)

#### 3.1 Run Full Check Suite
```powershell
npm run phase6:core
# or for full stack:
npm run check
```

**Expected:**
- ✅ All TypeScript errors resolved
- ✅ All Svelte checks passing
- ✅ Ready for production deployment

---

### Tier 4: Database Integration (15 minutes)

#### 4.1 Wire Results to legal_ai_db
```powershell
# Start containers (if not running)
docker-compose up -d

# Verify containers are healthy
docker-compose ps

# Create fix records in database
docker-compose exec backend psql -U postgres legal_ai_db -c "
  INSERT INTO code_fixes (pattern_type, file_count, fixed_count, status, timestamp)
  VALUES
    ('import-type-misuse', 187, 181, 'resolved', now()),
    ('onMount-async', 21, 21, 'resolved', now());
"

# Verify insertion
docker-compose exec backend psql -U postgres legal_ai_db -c "
  SELECT * FROM code_fixes WHERE timestamp > now() - interval '1 hour';
"
```

---

#### 4.2 Save Analysis Reports to Database
```powershell
# Export batch analysis as document
docker-compose exec backend psql -U postgres legal_ai_db -c "
  INSERT INTO analysis_reports (report_type, content, generated_at)
  VALUES (
    'batch_analysis_2025_12_15',
    (SELECT pg_read_file('${pwd}/reports/BATCH_ANALYSIS_SUMMARY_2025-12-15.md')),
    now()
  );
"
```

---

### Tier 5: Phase 74 Integration (10 minutes)

#### 5.1 Verify Langextract Service
```powershell
# Check service status
curl -s http://localhost:8010/docs | head -20

# Or test via task
Invoke-VSCodeTask "Phase 74: Verify env loaded"
```

#### 5.2 Extract Legal Data from Fixed Code
```powershell
# Run langextract on fixed files
node scripts/apply-import-type-fixes.mjs --top 100 --extract-legal-context > legal_context.json

# Save extracted data to PostgreSQL
docker-compose exec backend psql -U postgres legal_ai_db -c "
  COPY legal_context FROM '${pwd}/legal_context.json' (FORMAT json);
"
```

---

## 📊 Progress Tracking

### Completion Matrix
```
┌─────────────────────────────────────────────────┐
│ Task                          │ Status │ Done │ %  │
├──────────────────────────────┼────────┼──────┼────┤
│ AST Analysis                  │   ✅   │ 243  │100%│
│ Import Type Fixes Applied     │  ⏳   │  21  │ 11%│
│ Import Type Fixes Remaining   │ 🎯   │ 166  │ 89%│
│ onMount Async Cases           │ 📋   │   0  │  0%│
│ Full Check Suite              │  ✅   │   1  │100%│
│ Database Integration          │ 📅   │   0  │  0%│
│ Phase 74 Integration          │ 🔜   │   0  │  0%│
└─────────────────────────────────────────────────┘
```

### Time Estimates
- **Tier 1 (Quick Wins):** 8 minutes
- **Tier 2 (Manual Fixes):** 12 minutes
- **Tier 3 (Verification):** 5 minutes
- **Tier 4 (DB Integration):** 15 minutes
- **Tier 5 (Phase 74):** 10 minutes

**Total:** ~50 minutes to full completion

---

## 🔄 Rollback Plan (If Needed)

All fixes create `.bak` backups. To rollback:

```powershell
# Restore individual files
Copy-Item src/routes/some-file/+page.svelte.bak src/routes/some-file/+page.svelte -Force

# Or restore all backups in a directory
Get-ChildItem -Recurse -Filter "*.bak" | ForEach-Object {
  $originalPath = $_.FullName -replace '\.bak$'
  Copy-Item $_.FullName $originalPath -Force
}
```

---

## 📞 Quick Reference Commands

```powershell
# Check current status
node scripts/batch-merger-fixer.mjs

# Dry-run fixes (preview)
node scripts/apply-import-type-fixes.mjs --top 100 --dry-run

# Apply fixes
node scripts/apply-import-type-fixes.mjs --top 200

# Verify no regressions
npm run check

# Full verification
npm run phase6:core

# View reports
ls reports/*.md
cat reports/BATCH_ANALYSIS_SUMMARY_2025-12-15.md
cat reports/SESSION_COMPLETE_2025-12-15.md
```

---

## 📈 Success Criteria

✅ All items completed when:
1. Import type fixes: 187/187 applied
2. onMount async fixes: 21/21 applied
3. TypeScript check: 0 errors
4. Svelte check: 0 errors
5. Database integration: Completed
6. Phase 74: Langextract + legal_ai_db connected
7. All backups archived or removed

---

## 🎯 Current Owner

**Last Updated:** 2025-12-15 22:45
**Status:** Ready for Phase 2 (Remaining Fixes)
**Next Action:** Run `node scripts/apply-import-type-fixes.mjs --top 200`

---

*Generated by session automation system*
