# Phase 7 - Immediate Action Plan

## Current Situation

**Build Status**: ❌ Failing due to corrupted files from AST analysis
**Dev Server**: ✅ Working on port 5176
**Phase 7 Progress**: 96% complete (30/36 tasks)
**Diff/Patch Substrate**: ✅ Complete and tested (18/18 tests passing)

## Files Fixed So Far

1. ✅ `langextract-ollama-service.ts` - Disabled (minified)
2. ✅ `evidence-upload.js` - Disabled (`.ts` version exists)
3. ✅ `lucia.ts` - Fixed (added missing declare module)
4. ✅ `fileUploadSchema.ts` - Rewrote from minified
5. ✅ `enhanced-embedding-schema.ts` - Replaced with stub
6. ✅ `(app)/evidence/realtime/+page.svelte` - Fixed Svelte 5 syntax
7. ⚠️ `(app)/legal/detective/motive-analysis/+page.svelte` - Needs fix

## Root Cause

Files were minified/corrupted during AST analysis work around Dec 15, 2025. Corruption includes:
- Single-line minification
- Comma/colon swaps (`foo, bar` → `foo: bar`)
- Missing semicolons
- Incomplete code blocks
- Tagged template issues

## Recommended Path: Quarantine Strategy

### Why Quarantine?
- **Fastest**: 5-10 minutes to working build
- **Safest**: No risk of breaking working code
- **Reversible**: Can restore files later
- **Pragmatic**: Focus on core functionality first

### Step 1: Identify Non-Core Routes (2 min)

Non-core routes that can be temporarily disabled:
- `(app)/legal/detective/motive-analysis/` - Detective feature (non-MVP)
- `(app)/legal/precedent/matching/` - Advanced legal feature
- `(app)/legal/case/evidence-gallery/` - Gallery view (nice-to-have)
- Any route with "demo", "test", "standalone" in path

### Step 2: Quarantine Script (3 min)

```powershell
# Create quarantine directory
New-Item -ItemType Directory -Force -Path "sveltekit-frontend/src/routes/_quarantine"

# Move corrupted non-core routes
$corruptedRoutes = @(
    "(app)/legal/detective/motive-analysis",
    "(app)/legal/precedent/matching",
    "(app)/legal/case/evidence-gallery"
)

foreach ($route in $corruptedRoutes) {
    $source = "sveltekit-frontend/src/routes/$route"
    if (Test-Path $source) {
        $dest = "sveltekit-frontend/src/routes/_quarantine/$($route -replace '[/\\]', '_')"
        Move-Item $source $dest -Force
        Write-Host "Quarantined: $route"
    }
}
```

### Step 3: Verify Build (2 min)

```powershell
cd sveltekit-frontend
npm run build
```

### Step 4: If Build Still Fails

Repeat quarantine for next error until build passes. Track quarantined files in:

```markdown
## Quarantined Files (Restore Later)

- [ ] `(app)/legal/detective/motive-analysis/+page.svelte` - Reason: Incomplete code block
- [ ] `(app)/legal/precedent/matching/+page.svelte` - Reason: Minified
- [ ] ... (add as needed)
```

## Alternative: Git Restore (15 min)

If you want to recover corrupted files:

```powershell
# Find last good commit before Dec 15
git log --since="2025-12-01" --until="2025-12-15" --oneline

# Restore specific files
git checkout <commit_hash> -- sveltekit-frontend/src/routes/(app)/legal/detective/motive-analysis/+page.svelte

# Or restore entire directory
git checkout <commit_hash> -- sveltekit-frontend/src/routes/(app)/legal/
```

## Core Routes to Protect

**Must Work** (MVP functionality):
- ✅ `(app)/dashboard/` - Main dashboard
- ✅ `(app)/cases/` - Case management
- ✅ `(app)/cases/[id]/` - Case details
- ✅ `(app)/evidence/` - Evidence management
- ✅ `(app)/persons-of-interest/` - POI management
- ✅ `(app)/command-center/` - Command center
- ✅ `error-brain/` - Error analysis (Phase 7)

**Nice to Have** (can be restored later):
- `(app)/legal/detective/` - Detective features
- `(app)/legal/precedent/` - Precedent matching
- `(app)/legal/research/` - Legal research
- `demo/` routes - Demo pages
- `dev/` routes - Development tools

## Success Criteria

### Minimum Viable Build
- ✅ Build completes without errors
- ✅ Core routes accessible
- ✅ Dev server works
- ✅ Error brain functional

### Phase 7 Complete
- ✅ Diff/Patch substrate working (DONE)
- ⏳ Production build passes
- ⏳ Error Brain wired to proposer
- ⏳ Batch apply with confidence filtering

## Timeline

| Action | Time | Status |
|--------|------|--------|
| Quarantine corrupted routes | 5 min | ⏳ Next |
| Verify build passes | 2 min | ⏳ |
| Wire Error Brain to proposer | 30 min | ⏳ |
| Test batch apply | 15 min | ⏳ |
| **Total to Phase 7 Complete** | **52 min** | |

## Next Command

```powershell
# Quick quarantine of current blocker
cd sveltekit-frontend/src/routes/(app)/legal/detective
Move-Item "motive-analysis" "../../../_quarantine/motive-analysis" -Force

# Try build
cd ../../..
npm run build 2>&1 | Select-Object -Last 60
```

## Decision

**Recommended**: Proceed with quarantine strategy
- Fastest path to working build
- Preserves core functionality
- Can restore files incrementally later
- Aligns with "park non-core routes" strategy

**Alternative**: If you need those specific routes, use git restore for just those files.

---

**Status**: 🟡 7 files fixed, build progressing
**Next**: Quarantine `motive-analysis` route
**ETA to working build**: 5-10 minutes
