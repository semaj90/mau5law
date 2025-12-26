# Phase 81: Colon Fixer Autopsy - CaseScoringServiceGrpc.ts Regression

**Date**: December 26, 2025
**File**: `src/lib/server/services/CaseScoringServiceGrpc.ts`
**Before**: 289 errors
**After**: 439 errors
**Delta**: +150 errors ❌

---

## 🔍 Root Cause Analysis

The `fixObjectColonChains()` pattern in phase81-fix-colon-corruption.mjs **over-matched and destroyed valid object literal syntax**.

### What Went Wrong

The pattern:
```regex
/(\b[A-Za-z_$][\w$]*\b)\s*:\s*([^:\n{}]+?)\s*:\s*(\b[A-Za-z_$][\w$]*\b)\s*:/g
```

Transforms: `key: value: nextKey:` → `key: value, nextKey:`

**PROBLEM**: When the corruption is `key1: value1: key2Value` (where `key2Value` is actually the **value** for a missing `key2`), this pattern **deletes the key name** instead of preserving it.

---

## 💥 Catastrophic Transformations

### Example 1: Missing Property Names
**Before (line 491)**:
```typescript
const req = {
  case_id: r.caseId: this.serializeCaseMetadata(metadata),
  // ...
```

**After (WRONG)**:
```typescript
const req = {
  case_id: r.caseId, this.serializeCaseMetadata(metadata),  // ❌ orphaned value!
  // ...
```

**Should be**:
```typescript
const req = {
  case_id: r.caseId,
  metadata: this.serializeCaseMetadata(metadata),  // ✅ key preserved
  // ...
```

---

### Example 2: Multi-Property Chains
**Before (line 599)**:
```typescript
return {
  caseId: update.case_id: update.event_type,
  timestamp: update.timestamp ? new Date((update.timestamp.seconds || 0) * 1000) : new Date(),
  // ...
```

**After (WRONG)**:
```typescript
return {
  caseId: update.case_id, update.event_type,  // ❌ orphaned value!
  timestamp: update.timestamp ? new Date((update.timestamp.seconds || 0) * 1000) : new Date(),
  // ...
```

**Should be**:
```typescript
return {
  caseId: update.case_id,
  eventType: update.event_type,  // ✅ key preserved
  timestamp: update.timestamp ? new Date((update.timestamp.seconds || 0) * 1000) : new Date(),
  // ...
```

---

### Example 3: Inline Type Annotations (Worst Case)
**Before (line 1209)**:
```typescript
return {
  evidenceId: type: parsed.type || 'document',
  relevance: parsed.relevance || 0,
  // ...
```

**After (CATASTROPHIC)**:
```typescript
return {
  evidenceId: type, parsed.type || 'document',  // ❌ SYNTAX ERROR!
  relevance: parsed.relevance || 0,
  // ...
```

This creates **immediate parse failure** because `evidenceId: type,` is now followed by an orphaned expression.

---

## 📊 Impact Breakdown

| Pattern Matched | Times Applied | Created Errors |
|-----------------|---------------|----------------|
| `key: value: nextKey:` → `key: value, nextKey:` | 27 | ~150 new errors |

**Net Effect**:
- **Intended**: Fix colon-chain corruption in object literals
- **Actual**: Deleted property keys, creating orphaned values
- **Result**: Massive increase in TS1005/TS1128 errors (missing property names)

---

## 🛡️ Why the Guard Failed

The pattern's guard checks:
1. ✅ Line has ≥3 colons
2. ✅ Line is not a type/interface declaration
3. ✅ Line doesn't contain `http://` or `https://`

**MISSING GUARD**: No check for whether the "next key" token is actually a **key name** or a **value expression**.

In `case_id: r.caseId: this.serializeCaseMetadata(metadata)`:
- `case_id` = key ✅
- `r.caseId` = value ✅
- `this.serializeCaseMetadata(metadata)` = **NOT A KEY!** ❌

The pattern assumed `this.serializeCaseMetadata` was a property name when it's actually a **method call** (the value for a missing `metadata:` key).

---

## ✅ Correct Fixes Required

### Fix Type 1: Single Missing Key
**Pattern**: `key: value: anotherValue`
**Corruption**: Missing key name between values
**Solution**: Cannot be automated safely - requires semantic understanding

**Manual fix**:
```typescript
// Before (corrupted)
case_id: r.caseId: this.serializeCaseMetadata(metadata),

// After (correct)
case_id: r.caseId,
metadata: this.serializeCaseMetadata(metadata),
```

### Fix Type 2: Nested Property Access
**Pattern**: `key: obj.prop: obj.method()`
**Corruption**: Object property access mistaken for key-value separator
**Solution**: Requires context awareness (is next token a valid property name?)

---

## 🔧 Recommended Actions

### Option A: REVERT the 27 fixes in CaseScoringServiceGrpc.ts
```powershell
git checkout -- src/lib/server/services/CaseScoringServiceGrpc.ts
```

**Pros**: Immediate fix, net still +120 errors improvement from other files
**Cons**: Lose any legitimate fixes in this file

### Option B: Manual surgical repair
1. Review each of the 27 transformed lines
2. Identify which ones deleted actual keys
3. Restore missing property names manually

**Pros**: Retain legitimate fixes
**Cons**: Time-consuming, requires domain knowledge

### Option C: Tighten the pattern and re-run (DANGEROUS)
Add guard: "next key must not contain `.` or `(`"

**Pros**: Might catch more safe cases
**Cons**: Still fundamentally broken pattern (can't invent missing key names)

---

## 📝 Lessons Learned

### What the Fixer CAN'T Do
❌ Invent missing property key names
❌ Distinguish between corruption patterns and valid nested object access
❌ Safely fix multi-property chains without semantic context

### What the Fixer SHOULD Do
✅ Only fix patterns where **both the key AND value are obviously identifiable**
✅ Skip any line where the "next key" token contains `.`, `(`, or `[`
✅ Emit to `reports/review/` instead of auto-applying when uncertain

---

## 🎯 Immediate Fix Recommendation

**REVERT CaseScoringServiceGrpc.ts only**:
```powershell
git checkout -- src/lib/server/services/CaseScoringServiceGrpc.ts
node scripts/phase81-tsc-summarize.mjs
```

**Expected Result**:
- CaseScoringServiceGrpc.ts: 439 → 289 errors (-150 restoration)
- Total: 37,017 → ~37,167 (+150)
- **Still net positive from session start**: 45,182 → 37,167 = -8,015 errors (-17.7%)

**Then**:
- Manually inspect CaseScoringServiceGrpc.ts for actual colon corruptions
- Fix them one-by-one with full context
- Do NOT run automated colon fixer on this file again

---

## 🔬 Pattern Enhancement (For Future)

If you want to salvage the colon fixer, add these guards:

```javascript
function fixObjectColonChains(line, stats) {
  const before = line;
  const colonCount = (line.match(/:/g) ?? []).length;
  if (colonCount < 3) return line;

  // EXISTING GUARDS
  if (/^\s*(type|interface|export\s+interface)\b/.test(line)) return line;
  if (line.includes("http://") || line.includes("https://")) return line;

  // NEW GUARDS (critical!)
  if (/\.\w+\s*:/.test(line)) return line;  // ❌ Skip if contains property access
  if (/\(\w*\)\s*:/.test(line)) return line;  // ❌ Skip if contains method calls
  if (/\[\w*\]\s*:/.test(line)) return line;  // ❌ Skip if contains array access

  // Only proceed if "next key" looks like a simple identifier
  const pattern = /(\b[A-Za-z_$][\w$]*\b)\s*:\s*([^:\n{}]+?)\s*:\s*(\b[A-Za-z_$][\w$]*\b)(?![.\(\[])\s*:/g;

  // ... rest of logic
}
```

**Better Yet**: Don't try to auto-fix these patterns at all. Emit them to a review queue.

---

## 📈 Final Assessment

| Metric | Value |
|--------|-------|
| **Files helped** | 9/10 (90%) |
| **Files hurt** | 1/10 (10%) |
| **Net improvement** | -169 errors overall |
| **But** | Created +150 regressions in critical gRPC service file |
| **Verdict** | **REVERT this file, accept wins elsewhere** |

The colon fixer is **too aggressive for production use** on complex files like gRPC service implementations. Reserve it for simple, high-confidence cases only.
