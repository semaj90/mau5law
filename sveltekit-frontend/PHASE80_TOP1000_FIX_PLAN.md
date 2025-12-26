# Phase 80: Top 1,000 Errors - Comprehensive Fix Plan

**Generated**: 2025-12-26
**Total Errors**: 27,161
**Affected Files**: 778
**Strategy**: Chunked batches of 10-50 files, no mass batch fixing

---

## 📊 Current Status

✅ **Fixed**:
- `src/lib/server/auth.ts` (67 errors → 0) - Mojibake cleanup complete
- `vite.config.ts` (partial) - Server config fixed

⚠️ **In Progress**:
- `vite.config.ts` - 5 more proxy entries need mojibake fixes

❌ **Errors Increased**: 28,524 → 27,161 (decrease of 1,363 errors)

---

## 🎯 Priority Tiers (P0 = Highest Impact/Risk Ratio)

### **Tier 1: Cache Files (P0, High Volume)**
**Impact**: 5,416 errors across 6 files
**Risk**: Medium (safe refactoring)
**Strategy**: Delete or stub if unused, else fix imports

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/cache/loki-redis-integration-fixed.ts` | 762 | 1177 | **DELETE** (duplicate of loki-redis-integration.ts) |
| `src/lib/cache/loki-redis-integration.ts` | 745 | 1144 | Fix or stub if unused |
| `src/lib/cache/headless-ui-cache.ts` | 563 | 876 | Fix imports, check usage |
| `src/lib/cache/gpu-leftover-cache.ts` | 558 | 873.5 | Likely unused, stub |
| `src/lib/cache/chr-rom-pattern-cache.ts` | 523 | 811 | Likely unused, stub |
| `src/lib/cache/multi-layer-cache.ts` | 291 | 460.5 | Core cache, FIX |
| `src/lib/cache/semantic-cache.ts` | 201 | 335.5 | Core cache, FIX |

---

### **Tier 2: Auth & Security (P0, High Risk)**
**Impact**: 598 errors across 6 files
**Risk**: High (auth logic)
**Strategy**: Manual fixes with testing

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/auth/roles.ts` | 93 | 849.67 | Type fixes, manual review |
| `src/lib/api/services/auth-service.ts` | 84 | 767 | Depends on auth.ts (✅ fixed) |
| `src/lib/server/auth.ts` | 67 | 612.33 | ✅ **COMPLETE** |
| `src/lib/middleware/authSeparation.ts` | 63 | 578 | Fix middleware types |
| `src/lib/auth/auth-store.ts` | 51 | 470 | Svelte 5 runes migration |
| `src/lib/machines/auth-machine.ts` | 41 | 390 | XState v5 migration |
| `src/lib/server/auth-guard.ts` | 36 | 336.67 | Guard type fixes |

---

### **Tier 3: Database & Schema (P0, High Risk)**
**Impact**: 454 errors across 6 files
**Risk**: High (data integrity)
**Strategy**: Drizzle schema fixes, careful testing

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/database/migrations/migration-system.ts` | 314 | 418.33 | Fix migration types |
| `src/lib/db/schema-example-legal.ts` | 66 | 610 | Fix Drizzle enums |
| `src/lib/server/db-insert-helpers.ts` | 42 | 394 | Fix helper functions |
| `src/lib/db/chat-schema.ts` | 32 | 309 | Fix schema types |

---

### **Tier 4: Stores & State (P0, Medium Risk)**
**Impact**: 492 errors across 5 files
**Risk**: Medium (UI state)
**Strategy**: Svelte 5 runes migration

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/stores/app-store.ts` | 86 | 788 | Migrate to $state/$derived |
| `src/lib/stores/dashboard/GrpcStatusAdapter.ts` | 64 | 592.5 | Fix adapter types |
| `src/lib/stores.svelte.ts` | 58 | 541 | Runes migration |
| `src/lib/routing/route-registry.svelte.ts` | 272 | 432 | Fix route store |
| `src/lib/machines/graph-cache-machine.ts` | 182 | 397 | XState v5 migration |

---

### **Tier 5: Components (P0, Low-Medium Risk)**
**Impact**: 1,234 errors across 20 files
**Risk**: Low-Medium (UI rendering)
**Strategy**: Svelte 5 component migration

#### **3D/WebGPU Components** (483 errors)
| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/components/three/yorha-ui/webgpu/HeadlessLegalProcessorFactory.ts` | 100 | 789 | Fix WebGPU types |
| `src/lib/components/POIPhotoModal.svelte` | 101 | 781.5 | Svelte 5 migration |
| `src/lib/components/ui/gaming/core/GamingEvolutionManager.ts` | 94 | 741.5 | Fix gaming types |
| `src/lib/components/three/yorha-ui/NESYoRHaHybrid3D_FIXED.ts` | 85 | 659 | Review "FIXED" stub |
| `src/lib/components/three/yorha-ui/components/YoRHaButtonAA3D.ts` | 83 | 661.5 | Fix button types |

#### **UI Components** (751 errors)
| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/components/ui/layout/index.ts` | 84 | 686.5 | Fix barrel exports |
| `src/lib/components/NESGraphRenderer.svelte` | 75 | 579 | Svelte 5 migration |
| `src/lib/components/three/yorha-ui/NESYoRHaHybrid3D.ts` | 74 | 576.5 | Fix 3D types |
| `src/lib/components/RouteInspectorWorking.svelte` | 71 | 551.5 | Svelte 5 migration |
| `src/lib/components/ui/context-menu/index.ts` | 69 | 566.5 | Fix barrel exports |

---

### **Tier 6: Utils & Helpers (P0, Low Risk)**
**Impact**: 324 errors across 5 files
**Risk**: Low (utility functions)
**Strategy**: Type fixes, safe refactoring

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/utils/simd-json-cache.ts` | 92 | 402.33 | Fix SIMD types |
| `src/lib/utils/type-guards.ts` | 85 | 609 | Fix guard types |
| `src/lib/utils/buffer-conversion.ts` | 84 | 543 | Fix buffer types |
| `src/lib/utils/webgpu-buffer-uploader.ts` | 63 | 404.5 | Fix WebGPU types |

---

### **Tier 7: Other High-Impact Files**
**Impact**: 2,763 errors across 15 files

| File | Errors | Impact | Strategy |
|------|--------|--------|----------|
| `src/lib/3d/memory-palace-engine.ts` | 484 | 752.5 | Fix 3D engine types |
| `src/lib/memory/nes-memory-architecture.ts` | 390 | 614 | Fix memory types |
| `src/lib/server/lokiHybridStore.ts` | 388 | 611 | Fix Loki integration |
| `src/lib/services/cognitive-cache-integration.ts` | 367 | 582 | Fix cache service |
| `src/lib/ast/ast-processor.ts` | 328 | 528.5 | Fix AST types |
| `src/lib/test-utils/mocks.ts` | 328 | 518.5 | Fix test mocks |
| `src/lib/machines/aiAssistantMachine.ts` | 273 | 441 | XState v5 migration |
| `src/lib/routing/dynamic-route-generator.ts` | 270 | 441.5 | Fix route types |
| `src/lib/middleware/binary-encoding.ts` | 256 | 468 | Fix encoding types |
| `src/lib/routing/unified-api-router.ts` | 250 | 404 | Fix router types |
| `src/lib/server/storage/minio-service.ts` | 244 | 390 | Fix MinIO types |
| `src/lib/server/ai/agentic-stream.ts` | 202 | 332 | Fix AI stream types |
| `src/lib/api/services/cache-service.ts` | 193 | 316 | Fix cache service |

---

## 🔄 Fix Batches (Chunked Strategy)

### **Batch 1: Quick Wins - Cache Cleanup (10 files)**
**Estimated Time**: 30 minutes
**Expected Error Reduction**: ~5,000 errors

1. ✅ Delete `src/lib/cache/loki-redis-integration-fixed.ts` (762 errors)
2. Stub `src/lib/cache/loki-redis-integration.ts` if unused (745 errors)
3. Stub `src/lib/cache/headless-ui-cache.ts` if unused (563 errors)
4. Stub `src/lib/cache/gpu-leftover-cache.ts` (558 errors)
5. Stub `src/lib/cache/chr-rom-pattern-cache.ts` (523 errors)
6. Fix `src/lib/cache/multi-layer-cache.ts` imports (291 errors)
7. Fix `src/lib/cache/semantic-cache.ts` imports (201 errors)
8. Complete `vite.config.ts` proxy fixes (5 remaining)
9. Check `src/lib/server/lokiHybridStore.ts` usage (388 errors)
10. Check `src/lib/services/cognitive-cache-integration.ts` usage (367 errors)

**Commands**:
```bash
# Check if files are imported anywhere
npx madge --circular --extensions ts,js,svelte src/lib/cache/loki-redis-integration-fixed.ts

# If not imported, delete
rm src/lib/cache/loki-redis-integration-fixed.ts

# Run error check
npx svelte-check --output machine
```

---

### **Batch 2: Auth & Security (7 files)**
**Estimated Time**: 2 hours
**Expected Error Reduction**: ~500 errors

1. Fix `src/lib/auth/roles.ts` (93 errors) - Type fixes
2. Fix `src/lib/api/services/auth-service.ts` (84 errors) - Depends on auth.ts ✅
3. Fix `src/lib/middleware/authSeparation.ts` (63 errors) - Middleware types
4. Fix `src/lib/auth/auth-store.ts` (51 errors) - Svelte 5 runes
5. Fix `src/lib/machines/auth-machine.ts` (41 errors) - XState v5
6. Fix `src/lib/server/auth-guard.ts` (36 errors) - Guard types
7. **TEST**: Run auth integration tests

**Commands**:
```bash
# Fix one by one
npx svelte-check --workspace src/lib/auth/roles.ts
npx svelte-check --workspace src/lib/api/services/auth-service.ts
# ... etc

# Run tests
npm run test:auth
```

---

### **Batch 3: Database & Schema (4 files)**
**Estimated Time**: 1.5 hours
**Expected Error Reduction**: ~450 errors

1. Fix `src/lib/db/schema-example-legal.ts` (66 errors) - Drizzle enums
2. Fix `src/lib/server/db-insert-helpers.ts` (42 errors) - Helper functions
3. Fix `src/lib/db/chat-schema.ts` (32 errors) - Schema types
4. Fix `src/lib/database/migrations/migration-system.ts` (314 errors) - Migration types

**Commands**:
```bash
# Generate Drizzle types
npm run db:generate

# Check schema files
npx svelte-check --workspace src/lib/db/
```

---

### **Batch 4: Stores & State (5 files)**
**Estimated Time**: 2 hours
**Expected Error Reduction**: ~500 errors

1. Fix `src/lib/stores/app-store.ts` (86 errors) - Svelte 5 runes
2. Fix `src/lib/stores/dashboard/GrpcStatusAdapter.ts` (64 errors) - Adapter types
3. Fix `src/lib/stores.svelte.ts` (58 errors) - Runes migration
4. Fix `src/lib/routing/route-registry.svelte.ts` (272 errors) - Route store
5. Fix `src/lib/machines/graph-cache-machine.ts` (182 errors) - XState v5

**Commands**:
```bash
# Migrate stores one by one
# Use docs/xstate-v5-patterns.md for XState migrations
npx svelte-check --workspace src/lib/stores/
```

---

### **Batch 5: Utils & Helpers (5 files)**
**Estimated Time**: 1 hour
**Expected Error Reduction**: ~320 errors

1. Fix `src/lib/utils/type-guards.ts` (85 errors)
2. Fix `src/lib/utils/buffer-conversion.ts` (84 errors)
3. Fix `src/lib/utils/webgpu-buffer-uploader.ts` (63 errors)
4. Fix `src/lib/utils/simd-json-cache.ts` (92 errors)

---

### **Batch 6: 3D/WebGPU Components (10 files)**
**Estimated Time**: 3 hours
**Expected Error Reduction**: ~800 errors

1. Fix `src/lib/components/three/yorha-ui/webgpu/HeadlessLegalProcessorFactory.ts` (100 errors)
2. Fix `src/lib/components/ui/gaming/core/GamingEvolutionManager.ts` (94 errors)
3. Fix `src/lib/components/three/yorha-ui/NESYoRHaHybrid3D_FIXED.ts` (85 errors)
4. Fix `src/lib/components/three/yorha-ui/components/YoRHaButtonAA3D.ts` (83 errors)
5. Fix `src/lib/components/three/yorha-ui/NESYoRHaHybrid3D.ts` (74 errors)
6. Fix `src/lib/components/three/yorha-ui/webgpu/YoRHaMipmapShaders.ts` (65 errors)
7. Fix `src/lib/components/three/yorha-ui/api/YoRHaAPIClient.ts` (59 errors)
8. Fix `src/lib/components/three/yorha-ui/components/YoRHaButton3D.ts` (54 errors)
9. Fix `src/lib/components/three/yorha-ui/components/YoRHaInput3D.ts` (43 errors)
10. Fix `src/lib/components/three/yorha-ui/YoRHaLayout3D.ts` (40 errors)

---

### **Batch 7: UI Components (15 files)**
**Estimated Time**: 4 hours
**Expected Error Reduction**: ~1,000 errors

1. Fix `src/lib/components/ui/layout/index.ts` (84 errors) - Barrel exports
2. Fix `src/lib/components/NESGraphRenderer.svelte` (75 errors) - Svelte 5
3. Fix `src/lib/components/RouteInspectorWorking.svelte` (71 errors) - Svelte 5
4. Fix `src/lib/components/ui/context-menu/index.ts` (69 errors) - Barrel exports
5. ... (continue with remaining UI components)

---

### **Batch 8: Svelte Components (20 files)**
**Estimated Time**: 5 hours
**Expected Error Reduction**: ~1,200 errors

Focus on `.svelte` files with Svelte 5 migration:
- POIPhotoModal.svelte (101 errors)
- NESGraphRenderer.svelte (75 errors)
- RouteInspectorWorking.svelte (71 errors)
- ... (continue with all .svelte files)

---

### **Batch 9: Machines & State Management (10 files)**
**Estimated Time**: 3 hours
**Expected Error Reduction**: ~800 errors

All XState machines needing v5 migration:
- `src/lib/machines/aiAssistantMachine.ts` (273 errors)
- `src/lib/machines/graph-cache-machine.ts` (182 errors)
- `src/lib/machines/auth-machine.ts` (41 errors)
- ... (find all machines with `grep -r "createMachine" src/lib/machines`)

**Use**: `docs/xstate-v5-patterns.md` for reference

---

### **Batch 10: Routing & API (10 files)**
**Estimated Time**: 3 hours
**Expected Error Reduction**: ~900 errors

1. Fix `src/lib/routing/dynamic-route-generator.ts` (270 errors)
2. Fix `src/lib/routing/route-registry.svelte.ts` (272 errors)
3. Fix `src/lib/routing/unified-api-router.ts` (250 errors)
4. Fix `src/lib/api/services/cache-service.ts` (193 errors)
5. Fix `src/lib/api/services/auth-service.ts` (84 errors)

---

## 📝 Common Fix Patterns

### **Mojibake Corruption**
```typescript
// ❌ Before
{ user: data.user: session: data.session: isLoading: false }
email: string: null

// ✅ After
{ user: data.user, session: data.session, isLoading: false }
email: string | null
```

### **Svelte 5 Runes**
```typescript
// ❌ Before
import { writable } from 'svelte/store';
export const count = writable(0);

// ✅ After
let count = $state(0);
```

### **XState v5**
```typescript
// ❌ Before
import { createMachine, interpret } from 'xstate';
const service = interpret(machine);

// ✅ After
import { createMachine, createActor } from 'xstate';
const actor = createActor(machine);
```

### **Drizzle Enums**
```typescript
// ❌ Before
status: pgEnum('status', ['active', 'done'])

// ✅ After
status: pgEnum('status', ['open', 'closed'])
```

---

## 🚀 Execution Commands

### **Run Error Analysis**
```bash
# Capture current errors
node scripts/error-ingest.mjs --run "batch-1-start"

# Generate leaderboard
node scripts/error-leaderboard.mjs --run=batch-1-start --top=1000

# Compare before/after
node scripts/error-compare.mjs --before batch-1-start --after batch-1-complete
```

### **Fix Individual Files**
```bash
# Check specific file
npx svelte-check --workspace src/lib/auth/roles.ts

# Check directory
npx svelte-check --workspace src/lib/auth/

# Full check
npm run check
```

### **Pattern Fixer (Use with Caution)**
```bash
# Safe patterns only
node scripts/phase79-pattern-fixer.mjs --apply --risk=safe --verify

# Medium risk (review changes)
node scripts/phase79-pattern-fixer.mjs --apply --risk=medium --dry-run
node scripts/phase79-pattern-fixer.mjs --apply --risk=medium --verify

# High risk (manual review required)
node scripts/phase79-pattern-fixer.mjs --apply --risk=high --dry-run
```

---

## 📊 Progress Tracking

### **Metrics to Track**
- Total errors (target: <10,000)
- Error reduction per batch
- Files fixed vs remaining
- Build status (passing/failing)
- Test coverage

### **Success Criteria**
- ✅ All P0 files fixed (<100 errors total)
- ✅ Auth system fully functional
- ✅ Database operations working
- ✅ Build passes without errors
- ✅ Tests passing (>80% coverage)

---

## 🎯 Next Immediate Actions

1. **Complete vite.config.ts** - Fix remaining 5 proxy entries
2. **Batch 1: Cache Cleanup** - Delete/stub unused cache files (5,000 error reduction)
3. **Batch 2: Auth & Security** - Critical auth fixes (500 error reduction)
4. **Batch 3: Database** - Schema and migration fixes (450 error reduction)
5. **Continue batches 4-10** until <10,000 errors

---

**Total Expected Error Reduction from Batches 1-10**: ~15,000 errors (target: 27,161 → 12,000)
