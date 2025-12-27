# Phase 84: Hot10 First-Error Sprint Strategy

## 🎯 Objective
Reduce 1,169 errors in 10 files using **first-error surgical fixing** approach validated in Phase 83.

## 📋 Hot10 Target Files (by error count)
```
414  src/lib/server/services/CaseScoringServiceGrpc.ts
265  src/lib/server/ai/rag-pipeline-enhanced.ts
236  src/lib/services/qlora-rl-langextract-integration.ts
155  src/lib/memory/nes-memory-architecture.ts
 68  src/lib/webgpu/som-webgpu-cache.ts
  9  src/lib/cache/loki-redis-integration.ts
  9  src/lib/server/db/schema-postgres.ts
  9  src/lib/server/errors.ts
  5  src/lib/server/services/OllamaService.ts
  2  src/lib/server/db/schema-evidence-crud.ts
───────────────────────────────────────────
1169 total errors
```

## 🔧 Known Corruption Patterns (from Phase 81-83)

### Pattern A: Class Member Comma Splice ✅ FIXED
```typescript
// BEFORE:
private a: T, b: U;  // TS1144, TS1442

// AFTER:
private a: T;
private b: U;
```

### Pattern B: Record/Map Generic Colon
```typescript
// BEFORE:
Record<string: unknown>  // TS1005 ',' expected

// AFTER:
Record<string, unknown>
```

### Pattern C: Function Call Argument Colon
```typescript
// BEFORE:
cache.set(key: value)  // TS1005 ',' expected

// AFTER:
cache.set(key, value)
```

### Pattern D: Missing Return Type Colon
```typescript
// BEFORE:
function foo(x: T) string | undefined  // TS1005 ';' expected

// AFTER:
function foo(x: T): string | undefined
```

### Pattern E: Statement Joiners (from Phase 82)
```typescript
// BEFORE:
}; function foo()  // TS1128 Declaration or statement expected

// AFTER:
}

function foo()
```

## 📊 Pre/Post/Delta Harness (3-number output)

```powershell
# PRE
node scripts/phase81-tsc-summarize.mjs 2>&1 | Out-Null
$pre = Get-Content reports\tsc-summary.json | ConvertFrom-Json

# APPLY (your fixer script here)
node scripts/phase84-hot10-fixer.mjs

# POST
node scripts/phase81-tsc-summarize.mjs 2>&1 | Out-Null
$post = Get-Content reports\tsc-summary.json | ConvertFrom-Json

# OUTPUT
$preCount  = [int]$pre.tsErrorCount
$postCount = [int]$post.tsErrorCount
$delta     = $postCount - $preCount
"$preCount`n$postCount`n$delta"
```

## 🚀 Execution Order (biggest cascade first)

1. **CaseScoringServiceGrpc.ts** (414 errors)
   - Extract first error context
   - Apply surgical fix
   - Measure: `PRE → POST → DELTA`
   - If `DELTA < 0`, commit and continue
   - If `DELTA >= 0`, rollback and inspect

2. **rag-pipeline-enhanced.ts** (265 errors)
   - Same workflow

3. **qlora-rl-langextract-integration.ts** (236 errors)
   - Same workflow

4. Continue through Hot10 list...

## 📈 Success Criteria

- **Target**: -500 to -800 errors from Hot10 (1,169 → ~400)
- **Efficiency**: Maintain >100 errors per file fixed (Phase 83 = 122:1)
- **Safety**: No file shows `DELTA > 0` (regressions)

## 🛑 Rollback Protocol

If any file shows `DELTA >= 0`:
```powershell
git checkout HEAD -- <file>
# Skip to next file in Hot10 list
```

## 📝 Next Patterns to Mine (if Hot10 stalls)

From remaining TS1005 distribution:
- `';' expected` (5,677 instances) - likely missing statement terminators
- `':' expected` (3,686 instances) - likely missing type annotations
- `'>' expected` - generic/JSX corruption

## ✅ Phase 84 Complete When:

- All Hot10 files processed OR
- Total errors < 34,000 OR
- ROI drops below 50:1 (indicating pattern exhaustion)
