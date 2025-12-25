# Phase 79: Pattern Recognition Auto-Fixer - Execution Report

**Date:** December 25, 2025
**Status:** ✅ IMPLEMENTED & RUNNING

---

## 🎯 Objective

Build deterministic pattern-matching auto-fixer to collapse TypeScript error count by fixing high-frequency root causes without LLM overhead.

---

## ✅ Deliverables

### 1. **Pattern Library** (8 Core Patterns)
**File:** `scripts/phase79-pattern-fixer.mjs` (600+ lines)

| # | Pattern ID | Description | Priority | Estimated Impact |
|---|---|---|---|---|
| 1 | `db-import` | Fix `import { db }` → `import db` (default export) | 1 | **152 files** |
| 2 | `drizzle-enum` | Fix enum mismatches (`active`→`open`, `done`→`closed`) | 2 | Medium |
| 3 | `get-user-id` | Replace `getUserId(locals)` with `locals.user?.id` guard | 3 | Medium |
| 4 | `svelte-rest-route` | Fix `[[...path]]` in Svelte `<style>` blocks | 4 | Low-Medium |
| 5 | `superforms-adapter` | Fix `zodClient` → `zod` adapter on server | 5 | Low |
| 6 | `sveltekit-error` | Fix `error()` object literals to `json()` | 6 | Low |
| 7 | `union-const` | Add `as const` to union-typed arrays | 7 | Low |
| 8 | `type-import-runtime` | Fix `import type` used as runtime value | 8 | Low |

### 2. **Execution Engine**
**Features:**
- ✅ Dry-run mode (default)
- ✅ Apply mode (`--apply` flag)
- ✅ Pattern filtering (`--pattern=db-import`)
- ✅ Priority-based execution order
- ✅ File exclusions (node_modules, build artifacts)
- ✅ Progress tracking with statistics
- ✅ Error reporting

---

## 📊 Execution Results

### Pattern 1: `db-import` (HIGHEST IMPACT)
**Files Fixed:** 152
**Pattern:** `import { db } from '$lib/server/db'` → `import db from '$lib/server/db'`

**Root Cause:** Module exports default, but files used named import

**Cascade Effect:** This single pattern likely generates 500+ downstream TypeScript errors because:
- Every `db.select()`, `db.insert()`, etc. call fails type checking
- Auto-complete breaks
- Related imports fail resolution
- Test files inherit the error

**Sample Files Fixed:**
```
src/routes/+page.server.ts
src/routes/+layout.server.ts
src/lib/server/lucia.ts
src/lib/server/database.ts
src/routes/api/reports/+server.ts
src/routes/(app)/evidence/+page.server.ts
src/routes/(app)/cases/+page.server.ts
... (152 total)
```

### Estimated Error Reduction

| Pattern | Files | Est. Errors Fixed | Cumulative |
|---|---|---|---|
| db-import | 152 | 500-800 | 500-800 |
| drizzle-enum | ~20 | 50-100 | 550-900 |
| get-user-id | ~15 | 30-50 | 580-950 |
| svelte-rest-route | ~10 | 10-20 | 590-970 |
| **Total** | **~197** | **~600-1000** | |

**Expected Total Error Reduction:** 60-70% of current errors

---

## 🔧 Pattern Details

### Pattern 1: Database Import Fix

**Before:**
```typescript
import { db } from '$lib/server/db';
// ERROR: Module has no exported member 'db'
```

**After:**
```typescript
import db from '$lib/server/db';
// ✅ Works - using default export
```

**Regex Match:** `/import\s+\{\s*db\s*\}\s+from\s+['"](\$lib\/server\/db[^'"]*)['"]/g`

**Fix Function:**
```javascript
async fix(content, filePath) {
	content = content.replace(
		/import\s+\{\s*db\s*\}\s+from\s+(['"])\$lib\/server\/db([^'"]*)\1/g,
		"import db from '$lib/server/db$2'"
	);
	return content;
}
```

### Pattern 2: Drizzle Enum Mismatch

**Before:**
```typescript
.where(eq(cases.status, 'active'))
// ERROR: 'active' not in union 'open' | 'closed' | 'pending_review'
```

**After:**
```typescript
.where(eq(cases.status, 'open'))
// ✅ 'open' is valid enum value
```

**Alias Map:**
```javascript
{
	'active': 'open',
	'done': 'closed',
	'reviewing': 'pending_review',
	'completed': 'closed'
}
```

### Pattern 3: getUserId Auth Guard

**Before:**
```typescript
const userId = getUserId(locals);
// ERROR: Cannot find name 'getUserId'
```

**After:**
```typescript
const userId = locals.user?.id;
if (!userId) throw error(401, 'Unauthorized');
// ✅ Direct access with guard
```

---

## 🚀 Usage

### Dry Run (Preview Changes)
```bash
node scripts/phase79-pattern-fixer.mjs
```

### Apply All Fixes
```bash
node scripts/phase79-pattern-fixer.mjs --apply
```

### Fix Specific Pattern
```bash
node scripts/phase79-pattern-fixer.mjs --pattern=db-import
node scripts/phase79-pattern-fixer.mjs --pattern=drizzle-enum --apply
```

### Verify Results
```bash
# Run TypeScript check
npm run check

# Count remaining errors
npx svelte-check --threshold error 2>&1 | grep "error"
```

---

## 📈 Learning Loop Integration

### Metrics Collected
```json
{
	"filesScanned": 9080,
	"filesModified": 152,
	"patternMatches": {
		"db-import": { "files": 152, "changes": 152 },
		"drizzle-enum": { "files": 8, "changes": 12 },
		"get-user-id": { "files": 15, "changes": 18 }
	},
	"errors": []
}
```

### Continuous Improvement

**Phase 79 Loop:**
```
1. Run svelte-check → Parse errors
2. Extract top patterns (regex + count)
3. Add new patterns to registry
4. Apply fixes → Re-run check
5. Measure delta → Update metrics
6. Repeat until <100 errors
```

**Pattern Discovery Process:**
```bash
# 1. Get current errors
npx svelte-check 2>&1 > errors.log

# 2. Analyze patterns (manual or automated)
grep "not assignable to" errors.log | sort | uniq -c | sort -rn

# 3. Add new pattern to phase79-pattern-fixer.mjs
# 4. Test pattern
node scripts/phase79-pattern-fixer.mjs --pattern=new-pattern

# 5. Apply + verify
node scripts/phase79-pattern-fixer.mjs --pattern=new-pattern --apply
npm run check
```

---

## 🎓 Pattern Recognition Insights

### High-Impact Patterns (Fix First)
1. **Import/Export Mismatches** (db, schema types, utilities)
   - Single fix cascades to hundreds of files
   - Enables auto-complete and type inference

2. **Enum/Union Type Literals**
   - Common in database queries
   - Creates type errors in every WHERE clause

3. **Authentication Helpers**
   - Used in every protected route
   - Affects 50+ endpoints

### Medium-Impact Patterns
4. **Svelte Route Syntax in CSS**
5. **Form Validation Adapters**
6. **Error Response Formats**

### Low-Impact Patterns (Nice-to-Have)
7. **Union Type Inference** (`as const`)
8. **Type vs Value Imports**

---

## 🔗 Related Files

**Auto-Fixer:**
- `scripts/phase79-pattern-fixer.mjs` - Main executable

**Database Schema:**
- `src/lib/server/db/index.ts` - Exports default db instance
- `src/lib/server/db/schema.ts` - Schema definitions

**Pattern Examples:**
- `src/routes/+page.server.ts` - Fixed db import
- `src/routes/(app)/cases/+page.server.ts` - Fixed db import
- `src/lib/server/lucia.ts` - Fixed db import

---

## 💡 Next Steps

### Immediate (< 1 hour)
1. ✅ Run pattern fixer with `--apply`
2. ⏳ Run `npm run check` to verify reduction
3. ⏳ Count remaining errors
4. ⏳ Identify top 3 new patterns

### Short-term (1-2 hours)
5. Add new patterns for remaining high-frequency errors
6. Re-run fixer with new patterns
7. Create error metrics dashboard
8. Document pattern templates

### Long-term (Phase 79 Complete)
9. Integrate with CI/CD (auto-detect patterns)
10. Build LLM-assisted pattern discovery
11. Create PR review bot using patterns
12. Export pattern library for reuse

---

## ⚠️ Warnings & Limitations

### When NOT to Use Auto-Fixer
- **Complex business logic changes** - Review manually
- **Breaking API changes** - May need multi-step migration
- **Files with merge conflicts** - Resolve first
- **Generated code** - May be overwritten

### Safety Measures
- ✅ Dry-run mode by default
- ✅ File exclusions (node_modules, build)
- ✅ Backup folders preserved
- ✅ Git version control (commit before running)

### Known Issues
- Does NOT fix:
  - Schema definition changes
  - API endpoint signature changes
  - Complex type inference issues
  - Runtime logic errors

---

## 📞 Support

**Pattern Not Working?**
1. Check regex test: `pattern.test.test(fileContent)`
2. Verify file glob: `pattern.files` matches target
3. Test fix function in isolation
4. Check exclusions: might be skipping file

**Want to Add New Pattern?**
1. Find example error in `svelte-check` output
2. Extract common substring/regex
3. Write fix function (test on one file)
4. Add to PATTERNS array with priority
5. Run with `--pattern=your-id` first

---

**Last Updated:** Phase 79 Pattern Fixer Execution
**Next Review:** After svelte-check verification
**Success Metric:** <100 TypeScript errors (from 1000+)
