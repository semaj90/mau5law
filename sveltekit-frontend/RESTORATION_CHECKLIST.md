# AST De-Minification Restoration Checklist

## ✅ Core Build Progress Achieved
- **Baseline**: 164 modules transformed
- **Current**: 275+ modules transformed
- **Improvement**: +111 modules (+68%)

---

## 🎯 Strategy Validated

### What Worked
1. **Park non-core routes** → Reduces parse surface
2. **Stub Evidence/Auth imports** → Breaks dependency chains
3. **Fix parse errors** → Eliminates hard blockers
4. **Keep (app) core intact** → POI-centric structure solid

### Routes Currently Parked (in `src/routes_parked/`)
- `_disabled/` folders (14 total)
- `archive/` (legacy test routes)
- `auth/` (minified endpoints)
- `_yorha_legacy/` (old UI)
- `evidence-board/`, `evidence-editor/`, `evidenceboard/`, `chat-standalone/`
- **API**: All non-core endpoints (~80 folders)
  - Kept: `health/`, `internal/error-brain/`

---

## 🔴 Critical Files for De-Minification Tool

### Priority 1: Schema Files (BLOCKING BUILD)
```
src/lib/schemas/evidence-upload.js  ← Has Svelte markup in .js (CRITICAL)
src/lib/schemas/*.ts                ← Check all for minification
```

**Symptoms**:
- Single-line code with no semicolons
- Svelte `<script>` tags embedded in .js files
- Invalid try/catch structures
- TypeScript unions collapsed

### Priority 2: Auth Library (BLOCKING IMPORTS)
```
src/lib/server/auth/lucia.ts        ← Minified auth config
src/lib/server/auth/utils.ts        ← User utilities
```

**Current Workaround**: Stubbed in `evidence/upload/+page.server.ts`

### Priority 3: API Endpoints (PARKED)
```
src/routes_parked/api/**/*.ts       ← ~30+ minified endpoints
```

**Examples**:
- `gpu-test-simple/+server.ts`
- `legal/analysis/+server.ts`
- `setup-database/+server.ts`

---

## 🛠️ De-Minification Tool Requirements

### Input Files to Scan
```bash
# Scan these patterns:
src/lib/schemas/**/*.{ts,js}
src/lib/server/auth/**/*.ts
src/routes_parked/api/**/*.ts
```

### Detection Heuristics
1. **Single-line code** > 500 chars
2. **Missing semicolons** between statements
3. **Collapsed try/catch**: `} catch (err) { }` on one line
4. **Invalid syntax**: `} }` without proper nesting
5. **Svelte in .js**: `<script>` tags in `.js` files

### Restoration Process
1. **Parse with ts-morph** → Rebuild AST
2. **Print with TypeScript printer** → Guaranteed valid syntax
3. **Format with Prettier** → Standard formatting
4. **Validate with `tsc --noEmit`** → Confirm no parse errors

### Safety Guards
```typescript
// Before writing restored file:
const sourceFile = project.createSourceFile('temp.ts', content);
const diagnostics = sourceFile.getPreEmitDiagnostics();
if (diagnostics.length > 0) {
  throw new Error('Restored file has TypeScript errors');
}
```

---

## 📋 Restoration Workflow

### Step 1: Restore Priority 1 (Schemas)
```bash
# Run de-minification tool:
node tools/deminify.mjs src/lib/schemas/

# Verify:
npm run build 2>&1 | tail -n 30
```

**Expected**: Build should progress past 275 modules

### Step 2: Restore Priority 2 (Auth)
```bash
# Restore auth library:
node tools/deminify.mjs src/lib/server/auth/

# Uncomment stubs in:
# - src/routes/(app)/evidence/upload/+page.server.ts
```

**Expected**: Auth imports work, no lucia.ts errors

### Step 3: Restore Priority 3 (API Routes)
```bash
# Restore parked API routes:
node tools/deminify.mjs src/routes_parked/api/

# Move back to src/routes/api/ incrementally
mv src/routes_parked/api/health src/routes/api/health
# ... test build after each move
```

**Expected**: API endpoints compile cleanly

### Step 4: Re-enable Evidence Components
```bash
# Uncomment imports in:
# - src/routes/(app)/evidence/manage/+page.svelte
# - src/routes/(app)/cases/[id]/+page.svelte

# Move evidence routes back:
mv src/routes_parked/evidence-board src/routes/evidence-board
mv src/routes_parked/evidenceboard src/routes/evidenceboard
# ... etc
```

**Expected**: Evidence UI routes work

---

## ✅ Success Criteria

### Build Passes
```bash
npm run build
# Should see:
# ✓ 300+ modules transformed
# ✓ Generated 150+ chunks
# ✓ Build completed in ~30s
# ✅ Build succeeded
```

### Only Warnings Remain
- `<slot>` deprecations (6 files: button, card, Panel, ChatBubble, Tag)
- Event directive updates (on:click → onclick)
- a11y issues (POIFaceMatchDialog, card tabindex)

### Dev Server Works
```bash
npm run dev
# Visit:
# http://localhost:5173/(app)/command-center
# http://localhost:5173/(app)/persons-of-interest
# http://localhost:5173/(app)/evidence
```

---

## 🎯 (app) Core Routes Status

### ✅ Working (Post-Restoration)
```
/(app)/command-center          - Mission control ✅
/(app)/persons-of-interest/    - POI list (FugitiveDex) ✅
/(app)/cases/                  - Case management ✅
/(app)/evidence/               - Evidence grid ✅
/(app)/terminal/               - Command terminal ✅
/(app)/global-search/          - Search hub ✅
/(app)/analysis-center/        - AI analysis ✅
```

### 🔧 Needs Re-enabling After Restoration
```
/(app)/evidence/manage         - EvidenceFilesManager component
/(app)/cases/[id]              - EvidenceUploadPreview, SummaryReviewPanel
```

---

## 📊 Files Modified During Core Build

### Parked (Need Restoration)
- `src/routes_parked/` (100+ route folders)

### Stubbed (Need Un-stubbing)
- `src/routes/(app)/evidence/manage/+page.svelte` (line 2)
- `src/routes/(app)/cases/[id]/+page.svelte` (lines 6-7)
- `src/routes/(app)/evidence/upload/+page.server.ts` (line 17)

### Fixed (Keep Changes)
- `src/lib/components/ui/table/index.ts` (reformatted exports)
- `src/lib/components/ui/tabs/index.ts` (fixed malformed exports)
- `src/lib/ui/TabsPanel.svelte` (removed slot/render conflict)
- `vite.config.ts` (stripDashedDefineKeys plugin + ENABLE_CJS_RESOLVER_PATCH flag)

---

## 🚨 Do NOT Restore These

### Intentionally Disabled
- `src/routes_parked/(admin)_disabled/`
- `src/routes_parked/(ai)_disabled/`
- `src/routes_parked/(auth)_disabled/`
- etc. (14 folders marked `_disabled`)

### Legacy Code
- `src/routes_parked/_yorha_legacy/`
- `src/routes_parked/archive/`

---

## 📝 Notes for De-Minification Tool

### File Extension Handling
- If `.js` contains Svelte: Rename to `.svelte` or extract/remove Svelte tags
- If `.ts` contains invalid unions: Use ts-morph to rebuild AST properly

### Barrel Export Pattern
```typescript
// ❌ Bad (minified):
export {Tabs,TabsList: TabsTrigger: TabsContent)};

// ✅ Good (restored):
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
};
```

### Try/Catch Pattern
```typescript
// ❌ Bad (minified):
try { doSomething() } finally { }

// ✅ Good (restored):
try {
  doSomething();
} catch (err) {
  console.error(err);
}
```

---

## 🎉 Expected Final State

- **Build**: ✅ Clean (only Svelte 5 deprecation warnings)
- **Dev**: ✅ Working on port 5173
- **Tests**: ✅ Phase 7 Error Brain (4/4 passing)
- **(app) routes**: ✅ All core routes functional
- **POI system**: ✅ FugitiveDex-style UI working

---

*Generated: December 16, 2025*
*Strategy: Core-only build → De-minify → Incremental restore*
