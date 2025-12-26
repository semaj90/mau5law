# Claude AI Context: Phase 72 SvelteKit Error Analysis

## ⚠️ Phase 79 Pattern Fixer - Critical Safety Protocol

### Background: Dec 25, 2025 Regression Incident
- **Trigger**: Applied 4,546 pattern-based changes without dry-run preview
- **Impact**: Error count exploded from 14,511 → 81,562 (+67,051 errors)
- **Culprit**: Untested "auth-machine-garbage" patterns corrupted state machine files
- **Recovery**: Full rollback via `.phase79.bak` backup files (system worked perfectly)
- **Outcome**: Restored to 50,827 error baseline

### Mandatory Safety Protocol

#### Step 0: ALWAYS Dry-Run First (Non-Negotiable)
```bash
# BEFORE applying ANY pattern:
node scripts/phase79-pattern-fixer.mjs --dry-run

# Review output → Assess impact → Then proceed:
node scripts/phase79-pattern-fixer.mjs --risk=safe --apply
```

**Why This Matters**: The incident happened because we skipped dry-run. Never skip it again.

#### Step 1: Single Pattern Application
```bash
# ❌ WRONG: Apply all patterns at once
node scripts/phase79-pattern-fixer.mjs --apply

# ✅ CORRECT: Apply one pattern, verify, repeat
node scripts/phase79-pattern-fixer.mjs --pattern="safe-import-fix" --apply
npx svelte-check --output machine  # Check error count
node scripts/phase79-pattern-fixer.mjs --pattern="type-annotation" --apply
npx svelte-check --output machine  # Check again
```

#### Step 2: Immediate Verification Gate
```powershell
# After EVERY pattern application:
$result = npx svelte-check --output machine 2>&1 | Select-String "COMPLETED"
Write-Host $result

# Parse error count - if INCREASED, rollback:
if ($result -match '(\d+)\s+ERRORS') {
    $errorCount = [int]$matches[1]
    if ($errorCount -gt 50827) {  # Baseline
        Write-Host "🚨 REGRESSION DETECTED - Rolling back..." -ForegroundColor Red
        Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
            Copy-Item $_.FullName ($_.FullName -replace '\.phase79\.bak$', '') -Force
        }
    }
}
```

#### Step 3: Pattern Risk Assessment
Every pattern in `scripts/patterns.json` must have a risk level:

```typescript
type PatternRisk =
  | "safe"      // Whitespace, comments, simple imports (auto-apply OK)
  | "medium"    // Type changes, refactors (dry-run + manual review)
  | "high"      // AST transforms, state machines (manual only)
  | "disabled"; // Known to cause corruption (NEVER apply)
```

**Currently Disabled Patterns**:
```json
[
  {
    "id": "env-type-declarations",
    "risk": "disabled",
    "reason": "Injects garbage $env/static/private imports → 259k errors",
    "incident": "2025-12-24"
  },
  {
    "id": "auth-machine-garbage-7",
    "risk": "disabled",
    "reason": "Corrupts XState machines → 67k errors",
    "incident": "2025-12-25",
    "affected_files": 2412
  },
  {
    "id": "auth-machine-garbage-6",
    "risk": "disabled",
    "reason": "Corrupts XState machines → part of 67k error spike",
    "incident": "2025-12-25",
    "affected_files": 1132
  }
]
```

#### Step 4: Emergency Rollback Procedure
```powershell
# One-liner rollback (keep this handy):
Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
    $orig = $_.FullName -replace '\.phase79\.bak$', ''
    Copy-Item $_.FullName $orig -Force
    Write-Host "Restored: $orig"
}

# Verify restoration:
npx svelte-check --output machine 2>&1 | Select-String "COMPLETED"

# Clean backups ONLY after verification:
Get-ChildItem -Recurse -Filter "*.phase79.bak" | Remove-Item -Force
```

#### Step 5: Pattern Testing Workflow (Before Production)
1. **Unit Test**: Apply pattern to 1-2 sample files manually
2. **Preview**: Run `--dry-run` to see all matches
3. **Pilot**: Apply to 10 files with `--limit=10`
4. **Verify**: Check error count didn't increase
5. **Gradual Rollout**: Apply to 100 files, verify, then full codebase
6. **Continuous Monitoring**: Watch error count during entire process

### Lessons Learned (Post-Mortem)

**What Went Wrong**:
1. ❌ Skipped dry-run preview
2. ❌ Applied all patterns simultaneously (hard to identify culprit)
3. ❌ Didn't verify error count immediately after
4. ❌ Patterns were untested on sample files first

**What Went Right**:
1. ✅ Backup system worked perfectly (`.phase79.bak` files)
2. ✅ Quick detection of regression (error count monitoring)
3. ✅ Fast rollback capability (PowerShell one-liner)
4. ✅ Audit trail in `fix-log-*.jsonl` for analysis

**Prevention Going Forward**:
- 🛡️ Dry-run is now MANDATORY (no exceptions)
- 🛡️ Incremental application with verification gates
- 🛡️ Pattern risk classification system
- 🛡️ Test-first development for new patterns
- 🛡️ Keep backups until 100% verified

### Quick Reference
```bash
# Safe workflow:
node scripts/phase79-pattern-fixer.mjs --dry-run          # Preview
node scripts/phase79-pattern-fixer.mjs --risk=safe --apply # Apply safe only
npx svelte-check --output machine                          # Verify

# Emergency rollback:
Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
    Copy-Item $_.FullName ($_.FullName -replace '\.phase79\.bak$', '') -Force
}
```

**Golden Rule**: When in doubt, dry-run. Always.

---

## Project Architecture

### Technology Stack
- **Frontend**: SvelteKit 2 (Svelte 5 runes)
- **Backend**: Node.js microservices + Go legal AI engine
- **Database**: PostgreSQL 17 + pgvector (embeddings)
- **Cache**: Redis 7.2 (port 4005) - KAG storage
- **Vector Search**: Qdrant (future: auto-tagging)
- **LLM**: Ollama (gemma:latest for embeddings)

### SvelteKit Route Structure
```
src/routes/
├── +layout.svelte                    # Root layout
├── evidenceboard/
│   └── +page.svelte                  # Production route (uses submitWithProgress)
├── api/
│   └── metadata/
│       └── save/
│           └── +server.ts            # POST endpoint for file metadata
└── routes_parked/                    # Archived/experimental routes
    └── archive/
        └── demos/
            └── upload-demo/
                └── +page.svelte      # Prototype (uses submitWithProgress)
```

---

## 📂 File: submitWithProgress.ts - Deep Dive

### Current State (CLEAN ✅)
```typescript
// src/lib/api/submitWithProgress.ts
import type { uploadWithXhr } from './xhr';

export type SubmitResult = {
	status: number;        // ✅ Correct semicolon
	responseText?: string; // ✅ Proper optional property syntax
};

export async function submitWithProgress(
	url: string,
	data: FormData | Record<string, unknown>,
	onProgress?: (loaded: number, total: number) => void,
	signal?: AbortSignal
): Promise<SubmitResult> {
	if (data instanceof FormData) {
		return uploadWithXhr(url, data, onProgress, signal) as Promise<SubmitResult>;
	}

	// JSON path - no upload progress available, but respect signal
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
		signal
	});

	const text = await res.text();
	return { status: res.status, responseText: text };
}
```

### Historical Corruption Analysis

**Backup Locations** (all showing same corruption pattern):
1. `.phase72-backups/2025-12-18T00-24-10/src/lib/api/submitWithProgress.ts`
2. `.phase72-backups/2025-12-18T00-32-14/src/lib/api/submitWithProgress.ts`
3. `.phase72-backups/2025-12-18T00-32-30/src/lib/api/submitWithProgress.ts`

**Corrupted Syntax**:
```typescript
// Line 3-4 in backups (INCORRECT):
export type SubmitResult = {
  status: number: responseText? , string  // ❌ Multiple errors:
  //             ^               ^  ^
  //             |               |  |
  //             Double colon    |  Missing 'string' type keyword
  //                             Missing property separator
};
```

**Root Cause**: Mojibake UTF-8 encoding corruption
**Fixed By**: `scripts/mojibake-cleanup.mjs` (175,537 patterns fixed across 1,229 files)

### TypeScript Error Pattern
```
src/lib/api/submitWithProgress.ts(3,20): error TS1005: ';' expected.
src/lib/api/submitWithProgress.ts(3,33): error TS1128: Declaration or statement expected.
```

**Error Signature (Phase 72 KAG)**:
- **Normalized**: `error ts(X,Y) *.ts ; expected`
- **Tool**: `tsc`
- **File Extension**: `ts`
- **Context**: Type definition with property separator
- **Hash**: `86fb84dcb19c898f923a6567d229e8f9ebb5409d4ed4847d3b053d41d01b08d9` (example)

---

## 🧬 Phase 72 Error Clustering Strategy

### Category 1: Syntax Errors (High Priority)
**Pattern**: Missing or incorrect punctuation in type definitions
**Files Affected**: 15+ API utility files, global type declarations
**Examples**:
- `status: number: responseText?` → Missing `;`
- `declare module, '$env/dynamic/private'` → Extra `,`
- `data :  FormData | Record<string` → Extra spaces, misplaced colon

**Fix Strategy**:
1. Normalize whitespace
2. Replace `:` with `;` in type property separators
3. Remove extra commas in `declare module` statements
4. Verify with TypeScript compiler

**KAG Storage**:
```javascript
{
  sig: "86fb84dcb...",           // SHA-256 of normalized error
  patch: "s/: /; /g",             // Simplified representation
  confidence: 1.0,                // 100% verified
  successCount: 1,                // Applied successfully 1 time
  verified: true,                 // Passed verification gate
  tier: 1                         // Safe, deterministic fix
}
```

### Category 2: Import Resolution (Medium Priority)
**Pattern**: Missing type imports, barrel export conflicts
**Files Affected**: Components, services, stores
**Examples**:
- Missing `import type { uploadWithXhr } from './xhr';`
- Circular dependency in barrel exports (`$lib/components/index.ts`)
- SvelteKit path alias resolution issues

**Fix Strategy**:
1. Detect missing imports via TypeScript diagnostics
2. Analyze barrel exports for circular dependencies
3. Add explicit type imports
4. Update `tsconfig.json` paths if needed

### Category 3: Svelte 5 Migration (Low Priority)
**Pattern**: Deprecated Svelte 4 syntax, event handlers
**Files Affected**: 200+ Svelte components
**Examples**:
- `on:click` → `onclick` (Svelte 5 event handler syntax)
- `let x` → `let x = $state()` (Svelte 5 runes)
- `$:` reactive statements → `$effect()` or `$derived()`

**Fix Strategy**:
1. Use Svelte compiler diagnostics
2. Apply rune migrations incrementally
3. Test runtime behavior (not just compilation)
4. Store in Phase 72 KAG for replay

---

## 🔍 Redis KAG Implementation Details

### Key Pattern Design
```redis
# Signature storage (sorted by confidence)
phase72:kag:sig:<sha256>
→ JSON array: [
    { patchId, patch, confidence, successCount, ... },
    ...
  ]

# Reverse lookup
phase72:kag:patch:<patchId>
→ JSON: { sig, message, file, code, tool, fileExt }

# Statistics (atomic counters)
phase72:kag:stats
→ HASH:
    totalFixesStored: <int>
    totalSignatures: <int>
    hits: <int>
    misses: <int>
```

### Storage Operation (Atomic)
```javascript
async function storeFix(errorSig, fix) {
  const fixKey = `phase72:kag:sig:${errorSig.sig}`;
  const statsKey = `phase72:kag:stats`;
  const pipeline = redis.pipeline();

  // Store fix data
  pipeline.set(fixKey, JSON.stringify(fixes), 'EX', ttlSeconds);

  // Index by patch ID
  pipeline.set(`phase72:kag:patch:${fix.patchId}`, JSON.stringify(errorSig), 'EX', ttlSeconds);

  // Atomic stats update
  if (isNewFix) {
    pipeline.hincrby(statsKey, 'totalFixesStored', 1);
    pipeline.hincrby(statsKey, 'totalSignatures', 1);
  }

  // Execute atomically
  await pipeline.exec();

  // Verify storage
  return { fixKey, exists: await redis.exists(fixKey) === 1 };
}
```

### Query Operation (with Cache Stats)
```javascript
async function queryBestFix(errorSig) {
  const key = `phase72:kag:sig:${errorSig.sig}`;
  const fixesJson = await redis.get(key);

  if (!fixesJson) {
    await redis.hincrby(`phase72:kag:stats`, 'misses', 1);
    return null; // Cache miss
  }

  await redis.hincrby(`phase72:kag:stats`, 'hits', 1);
  const fixes = JSON.parse(fixesJson);
  return fixes[0]; // Highest confidence fix (sorted)
}
```

---

## 📊 Error Signature Computation

### Normalization Rules
```javascript
function computeSignature(error) {
  let normalized = error.message
    .replace(/\((\d+),(\d+)\)/g, '(X,Y)')           // Line/col → (X,Y)
    .replace(/[A-Z]:\\[^:]+\.(ts|js|svelte)/gi, '*.$1') // Windows paths → *.ext
    .replace(/\/[^/]+\.(ts|js|svelte)/g, '*.$1')    // Unix paths → *.ext
    .replace(/\b\d+\b/g, 'N')                       // Numbers → N
    .toLowerCase()
    .trim();

  const fileExt = path.extname(error.file).substring(1); // 'ts', 'js', 'svelte'
  const tool = error.tool || 'unknown';                  // 'tsc', 'svelte-check'

  // Context: 50 chars before/after error position
  const context = error.code.substring(
    Math.max(0, error.position - 50),
    Math.min(error.code.length, error.position + 50)
  );

  const sigInput = `${tool}:${fileExt}:${normalized}:${context}`;
  return crypto.createHash('sha256').update(sigInput).digest('hex');
}
```

### Why This Works
1. **Line/Col Normalization**: Errors at different positions have same signature if message is identical
2. **Path Normalization**: Errors across different files (same extension) group together
3. **Number Normalization**: `array[0]` and `array[1]` errors share signature
4. **Context Inclusion**: Distinguishes similar errors in different code contexts
5. **Deterministic Hashing**: Same error always produces same signature

---

## 🎯 Usage in Production Routes

### Evidence Board Page
**File**: `src/routes/evidenceboard/+page.svelte`

**Usage Pattern**:
```svelte
<script lang="ts">
  import { submitWithProgress } from '$lib/api/submitWithProgress';
  import unsyncedUploads from '$lib/services/unsynced-uploads';
  import { isAuthenticated, currentUser } from '@/stores/auth.svelte';

  async function handleUploadSuccess(detail) {
    const payload = {
      caseId: '7d897d59-9832-45c1-87e6-9c5a04745119',
      originalFilename: detail.originalFilename,
      storedFilename: detail.storedFilename,
      mimeType: detail.mimeType ?? null,
      fileSize: detail.size ?? null,
      storagePath: detail.filePath ?? null,
      metadata: {}
    };

    if ($isAuthenticated) {
      // Authenticated: Send to server
      await submitWithProgress('/api/metadata/save', payload);
    } else {
      // Unauthenticated: Store locally for later sync
      unsyncedUploads.saveLocalUpload({ ...payload, userId: $currentUser?.id ?? null });
    }
  }
</script>
```

**API Endpoint**: `/api/metadata/save`
**Method**: POST
**Content-Type**: `application/json`
**Response**: `{ status: number, responseText?: string }`

### Upload Demo (Parked)
**File**: `src/routes_parked/archive/demos/upload-demo/+page.svelte`

**Purpose**: Prototype implementation for testing upload functionality
**Status**: Not active (in `routes_parked/`)
**Usage**: Similar pattern to Evidence Board but simplified

---

## 🧪 Testing & Verification

### Manual Verification
```bash
# 1. Compile TypeScript (should pass)
npx tsc --noEmit -p tsconfig.check.json

# 2. Check Svelte components
npx svelte-check --tsconfig tsconfig.check.json

# 3. Verify Redis connectivity
node -e "const Redis = require('ioredis'); const r = new Redis({host:'127.0.0.1',port:4005}); r.ping().then(()=>{console.log('✅ Redis OK');r.quit()});"

# 4. Check KAG stats
node scripts/kag-rag-dashboard.mjs
```

### Automated Verification (Factory-Fixer)
```bash
node scripts/factory-fixer-v2.mjs \
  --apply \
  --tier 1 \
  --limit 100 \
  --verify "cmd /c exit 0"
```

**Verification Gates**:
1. **Pre-check**: Count errors before applying fixes
2. **Apply**: Make file modifications
3. **Post-check**: Count errors after fixes
4. **Verify**: Run custom verification command
5. **Store**: Save to Redis KAG only if verification passes

---

## 🚨 Known Issues & Workarounds

### Issue 1: Error Detection Reports 0 (ACTIVE BUG)
**File**: `scripts/regenerate-errors-jsonl.mjs`
**Symptom**: Script reports "🎉 No errors found!" but `tsc` shows hundreds of errors
**Root Cause**: Parser doesn't detect `tsc` stderr format correctly
**Workaround**: Run `npx tsc --noEmit` directly and parse output manually
**Fix Status**: Pending (needs parser update)

### Issue 2: Dashboard Showed 0 Fixes (RESOLVED)
**File**: `scripts/kag-fix-store.mjs`
**Symptom**: Dashboard reported 0 fixes despite factory-fixer logs showing successful storage
**Root Cause**: Key pattern mismatch - `storeFix()` wrote to `phase72:kag:sig:*`, but `getStats()` read from old JSON blob
**Fix Applied**: Atomic counters with `HINCRBY` on `phase72:kag:stats` hash
**Status**: ✅ RESOLVED (2025-12-18)

### Issue 3: Redis Connection Drops (INTERMITTENT)
**Symptom**: `ECONNREFUSED 127.0.0.1:4005`
**Root Cause**: Redis server not running or port conflict
**Fix**: Manually start Redis: `.\redis-latest\redis-server.exe --port 4005`
**Future**: Add health check task to VS Code tasks.json

---

## 📚 Related Scripts & Tools

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `factory-fixer-v2.mjs` | Apply verified fixes from KAG | `errors.jsonl` | Modified files + manifest |
| `kag-fix-store.mjs` | Redis storage layer | Fix objects | Stored in Redis |
| `kag-rag-dashboard.mjs` | Display KAG statistics | Redis data | Terminal UI |
| `regenerate-errors-jsonl.mjs` | Parse tsc output → JSONL | tsc stderr | `errors.jsonl` |
| `mojibake-cleanup.mjs` | Fix UTF-8 encoding issues | Source files | Cleaned files |

---

**Prepared For**: Claude AI (Anthropic)
**Context Type**: Error analysis, architectural patterns, fix verification
**Last Updated**: 2025-12-18
**Phase**: 72 (KAG Population & Automated Error Reduction)
