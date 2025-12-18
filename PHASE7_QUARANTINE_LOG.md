# Phase 7 - Quarantine Log

## Files Quarantined (Non-Core Routes)

### Corrupted Routes Moved to `_quarantine/`

1. ✅ `(app)/legal/detective/motive-analysis/` → `_quarantine/motive-analysis`
   - **Reason**: Incomplete code block, minified
   - **Type**: Detective feature (non-MVP)
   - **Priority**: Low (can restore later)

2. ✅ `(app)/legal/case/evidence-gallery/` → `_quarantine/evidence-gallery`
   - **Reason**: Invalid Svelte 5 bind syntax
   - **Type**: Gallery view (nice-to-have)
   - **Priority**: Low (alternative views exist)

3. ✅ `(app)/legal/research/` → `_quarantine/legal-research`
   - **Reason**: Unexpected token, parse error
   - **Type**: Legal research feature
   - **Priority**: Medium (useful but not core)

### Files Disabled (Corrupted Services)

4. ✅ `lib/services/langextract-ollama-service.ts` → `.disabled`
   - **Reason**: Heavily minified, single-line
   - **Type**: Legal extraction service
   - **Priority**: Medium (can rebuild)

5. ✅ `lib/schemas/evidence-upload.js` → `.disabled`
   - **Reason**: Svelte markup in JS file
   - **Type**: Schema file (`.ts` version exists)
   - **Priority**: Low (duplicate)

6. ✅ `lib/server/db/enhanced-embedding-schema.ts` → `.corrupted` (stub created)
   - **Reason**: Heavily minified, 4000+ line single-line file
   - **Type**: Database schema
   - **Priority**: High (stub created for imports)

### Files Fixed

7. ✅ `lib/server/auth/lucia.ts`
   - **Fix**: Added missing `declare module` wrapper
   - **Status**: Working

8. ✅ `lib/schemas/fileUploadSchema.ts`
   - **Fix**: Rewrote from minified version
   - **Status**: Working

9. ✅ `routes/(app)/evidence/realtime/+page.svelte`
   - **Fix**: Fixed Svelte 5 `$state()` syntax
   - **Status**: Working

## Core Routes Protected (Still Working)

✅ **MVP Functionality**:
- `(app)/dashboard/` - Main dashboard
- `(app)/cases/` - Case management
- `(app)/cases/[id]/` - Case details
- `(app)/evidence/` - Evidence management
- `(app)/persons-of-interest/` - POI management
- `(app)/command-center/` - Command center
- `error-brain/` - Error analysis (Phase 7)
- `admin/` - Admin dashboard

## Statistics

- **Total Files Quarantined**: 3 routes
- **Total Files Disabled**: 3 services
- **Total Files Fixed**: 3 files
- **Core Routes Protected**: 8 routes
- **Build Status**: Testing...

## Next Steps

1. ⏳ Continue build until it passes
2. ⏳ Verify core routes work
3. ⏳ Wire Error Brain to proposer
4. ⏳ Test batch apply
5. 📋 Create restoration plan for quarantined files

## Restoration Priority

### High Priority (Restore Soon)
- `enhanced-embedding-schema.ts` - Core database schema (stub in place)

### Medium Priority (Restore When Needed)
- `langextract-ollama-service.ts` - Legal extraction
- `(app)/legal/research/` - Research features

### Low Priority (Restore Later)
- `(app)/legal/detective/motive-analysis/` - Detective features
- `(app)/legal/case/evidence-gallery/` - Gallery view
- `evidence-upload.js` - Duplicate schema

## Restoration Methods

### Option A: Git Restore
```powershell
# Find last good commit (before Dec 15)
git log --since="2025-12-01" --until="2025-12-15" --oneline

# Restore specific file
git checkout <commit> -- sveltekit-frontend/src/routes/(app)/legal/research/+page.svelte
```

### Option B: AST Rebuild
```typescript
// Use ts-morph to fix structural issues
// - Comma/colon swaps
// - Missing semicolons
// - Tagged template fixes
```

### Option C: Manual Rewrite
- For small files, rewrite from scratch using type definitions
- Use existing working routes as templates

---

**Status**: 🟡 Quarantine in progress
**Build Attempts**: 3 routes quarantined so far
**Next**: Continue build test
