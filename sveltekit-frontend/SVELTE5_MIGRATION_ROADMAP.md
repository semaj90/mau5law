# Svelte 5 Migration Roadmap - Complete Guide

**Generated**: December 23, 2025
**Owner**: Phase 76 Team
**Timeline**: 4 weeks (Jan 2025)
**Goal**: 100% Svelte 5 Runes by Feb 1, 2025

---

## 📚 Documentation Index

### Core Documents
1. **[PHASE76_SVELTE5_MIGRATION_OPPORTUNITIES.md](./PHASE76_SVELTE5_MIGRATION_OPPORTUNITIES.md)**
   ↳ **Main migration guide** with 100+ files identified

2. **[PHASE76_BARREL_STORES_COMPLETE.md](./PHASE76_BARREL_STORES_COMPLETE.md)**
   ↳ Barrel store pattern implementation (completed examples)

3. **[SVELTE5_RUNES_MIGRATION.md](../SVELTE5_RUNES_MIGRATION.md)**
   ↳ Technical reference for rune patterns

4. **[SVELTE5_RUNES_QUICK_REFERENCE.md](../SVELTE5_RUNES_QUICK_REFERENCE.md)**
   ↳ Code templates and transformation rules

### Generated Reports
5. **`reports/phase76-store-audit.md`** (auto-generated)
   ↳ Live store audit with priority queue

6. **`reports/phase76-store-audit.json`** (auto-generated)
   ↳ Machine-readable audit data

---

## 🛠️ Automation Tools

### 1. Store Audit Tool
**Path**: `scripts/phase76-audit-stores.mjs`
**Purpose**: Scan all stores, calculate priority scores, generate reports

**Usage**:
```bash
node scripts/phase76-audit-stores.mjs
```

**Output**:
- Console summary (color-coded)
- `reports/phase76-store-audit.md` (human-readable)
- `reports/phase76-store-audit.json` (machine-readable)

**Features**:
- Detects Svelte 4 vs Svelte 5 stores
- Counts `writable`, `derived`, `readable` usage
- Calculates complexity score
- Generates priority queue (high = migrate first)

---

### 2. Store Migration Tool
**Path**: `scripts/phase76-migrate-store.mjs`
**Purpose**: Auto-convert Svelte 4 stores to Svelte 5 class pattern

**Usage**:
```bash
node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts
```

**What It Does**:
1. Analyzes original store (writable/derived patterns)
2. Generates Svelte 5 class with `$state`/`$derived`
3. Creates backup (`.svelte4.backup`)
4. Writes new file (`user.svelte.ts`)
5. Generates migration report

**Output Files**:
- `user.ts.svelte4.backup` - Original backup
- `user.svelte.ts` - Migrated Svelte 5 store
- `user.migration-report.md` - Detailed migration notes

**Safety Features**:
- ✅ Never overwrites original
- ✅ Creates timestamped backup
- ✅ Generates rollback instructions
- ✅ Type-safe conversions

---

## 📊 Current Status

### Overall Progress
```
[███░░░░░░░░░░░░░░░░] 4.5% (5/110 files)
```

### Category Breakdown
| Category | Total | Migrated | Remaining | % Done |
|----------|-------|----------|-----------|--------|
| **Store Classes** | 30 | 3 | 27 | 10% |
| **Component Props** | 50+ | 2 | 48+ | 4% |
| **Lifecycle Hooks** | 20+ | 0 | 20+ | 0% |
| **Event Dispatchers** | 10+ | 0 | 10+ | 0% |

### Already Migrated (Good Examples) ✅
1. `src/lib/stores/preferences.svelte.ts` - UserPreferences class
2. `src/lib/stores/tokenUsage.svelte.ts` - TokenTracker class
3. `src/lib/stores/localDocs.svelte.ts` - LocalLegalStore class
4. `src/lib/stores/phase76-barrel.ts` - Barrel export pattern
5. `src/lib/components/SearchInterface.svelte` - Uses `$bindable` props

---

## 🎯 4-Week Migration Plan

### Week 1: Core Stores (Jan 1-7, 2025)
**Goal**: Migrate 10 critical stores

**Priority Queue**:
1. ✅ `preferences.svelte.ts` (DONE)
2. ✅ `tokenUsage.svelte.ts` (DONE)
3. ✅ `localDocs.svelte.ts` (DONE)
4. **`user.ts` → `user.svelte.ts`** (30 min, NEXT)
5. **`ai-store.ts` → `ai-store.svelte.ts`** (45 min)
6. `canvas.ts` → `canvas.svelte.ts`
7. `chat-context.ts` → `chat-context.svelte.ts`
8. `errorStore.ts` → `errorStore.svelte.ts`
9. `enhanced-rag-store.ts` → `rag-store.svelte.ts`
10. `evidenceCommandCenter.store.ts` → `evidence-command.svelte.ts`

**Daily Checklist**:
- [ ] Run audit: `node scripts/phase76-audit-stores.mjs`
- [ ] Pick top priority store
- [ ] Migrate: `node scripts/phase76-migrate-store.mjs <path>`
- [ ] Review migration report
- [ ] Update imports in components
- [ ] Test: `npm run phase76:test`
- [ ] Commit changes

---

### Week 2: Route Lifecycle (Jan 8-14, 2025)
**Goal**: Convert all route `onMount`/`onDestroy` to `$effect()`

**Priority Files**:
1. **`src/routes/+layout.svelte`** (CRITICAL - affects all routes)
2. `src/routes/+page.svelte`
3. `src/routes/(app)/cases/create/+page.svelte`
4. `src/routes/(app)/system-configuration/+page.svelte`
5. `src/routes/indexing/+page.svelte`
6. `src/routes/acp/+page.svelte`
7. `src/routes/(app)/all-routes/+page.svelte`

**Template Pattern**:
```svelte
<!-- BEFORE -->
<script>
  import { onMount, onDestroy } from 'svelte';

  onMount(() => {
    // init logic
  });

  onDestroy(() => {
    // cleanup
  });
</script>

<!-- AFTER -->
<script>
  $effect(() => {
    // init logic runs on mount

    return () => {
      // cleanup runs on destroy
    };
  });
</script>
```

---

### Week 3: Component Props (Jan 15-21, 2025)
**Goal**: Convert 20 components to `$props()`

**Priority Components**:
1. `ChatPanel.svelte`
2. `ChatMessages.svelte`
3. `AIAssistant.svelte`
4. `DocumentUploadForm.svelte`
5. All `admin/*.svelte` (5 components)
6. All `cases/*.svelte` (8 components)
7. High-traffic UI components

**Template Pattern**:
```svelte
<!-- BEFORE -->
<script lang="ts">
  export let caseId: string;
  export let isLoading: boolean = false;
</script>

<!-- AFTER -->
<script lang="ts">
  let {
    caseId,
    isLoading = false
  }: {
    caseId: string;
    isLoading?: boolean;
  } = $props();
</script>
```

---

### Week 4: Event Dispatchers (Jan 22-28, 2025)
**Goal**: Remove all `createEventDispatcher()` usage

**Target Components**:
- `SearchInterface.svelte` (line 2)
- All components using `dispatch('event')`

**Template Pattern**:
```svelte
<!-- BEFORE -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click', { data });
  }
</script>

<!-- AFTER -->
<script>
  let {
    onclick
  }: {
    onclick?: (event: CustomEvent<{ data: any }>) => void;
  } = $props();

  function handleClick() {
    onclick?.(new CustomEvent('click', { detail: { data } }));
  }
</script>
```

---

## 🚀 Quick Start Guide

### Step 1: Run Store Audit
```bash
cd sveltekit-frontend
node scripts/phase76-audit-stores.mjs
```

**Expected Output**:
```
🔍 Phase 76: Store Audit

📁 Scanning: src/lib/stores
   Found 30 store files

🔬 Analyzing stores...
   ✅ Svelte 5 - preferences.svelte.ts
   ✅ Svelte 5 - tokenUsage.svelte.ts
   ✅ Svelte 5 - localDocs.svelte.ts
   🔴 Needs Migration - user.ts
   🔴 Needs Migration - ai-store.ts
   ...

📊 Summary:
   Total files:        30
   Store files:        30
   ✅ Svelte 5:        3
   🔴 Needs migration: 27
   Progress:           10.0%

🎯 Top 5 Migration Priorities:
   1. user.ts (priority: 850)
      1 writable, 2 derived, 1 functions
   2. ai-store.ts (priority: 720)
      1 writable, 0 derived, 5 functions
   ...

💾 JSON report: reports/phase76-store-audit.json
📄 Markdown report: reports/phase76-store-audit.md

🚀 Next Steps:
   1. Review: reports/phase76-store-audit.md
   2. Migrate top priority:
      node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts
   3. Test: npm run phase76:test
```

---

### Step 2: Migrate Top Priority Store
```bash
node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts
```

**Expected Output**:
```
🔄 Phase 76: Svelte 5 Store Migration

📖 Reading: src/lib/stores/user.ts
🔍 Analyzing Svelte 4 patterns...

📊 Found:
   - 1 writable store(s)
   - 2 derived store(s)
   - 1 function(s)
   - 2 interface(s)

✨ Generating Svelte 5 class-based store...
💾 Creating backup: src/lib/stores/user.ts.svelte4.backup
📝 Writing migrated file: src/lib/stores/user.svelte.ts

✅ Migration complete!

📋 Summary:
   Original: src/lib/stores/user.ts
   Backup:   src/lib/stores/user.ts.svelte4.backup
   Migrated: src/lib/stores/user.svelte.ts
   Report:   src/lib/stores/user.migration-report.md

🔧 Next steps:
   1. Review migrated file: src/lib/stores/user.svelte.ts
   2. Update imports in components (replace old store path)
   3. Test functionality: npm run phase76:test
   4. Delete backup if satisfied: rm user.ts.svelte4.backup
```

---

### Step 3: Review Migration Report
```bash
cat src/lib/stores/user.migration-report.md
```

**Contents**:
- Before/After comparison
- Breaking changes
- Import path updates
- Component usage examples
- Testing checklist
- Rollback instructions

---

### Step 4: Update Component Imports
**Find Components Using Old Store**:
```bash
rg "from '\$lib/stores/user'" src/
```

**Update Imports**:
```typescript
// Before
import { userStore } from '$lib/stores/user';

// After
import { userStore } from '$lib/stores/user.svelte';
```

---

### Step 5: Test Migration
```bash
# Type check
npm run check

# Unit tests (if any)
npm run test

# Integration tests
npm run phase76:test

# Manual browser test
npm run dev
# Open http://localhost:5176
```

---

## ✅ Success Criteria

### Store Migration Complete When:
- [ ] Zero `writable()` or `derived()` imports in new code
- [ ] All stores use `.svelte.ts` extension
- [ ] Type-safe reactivity (no `any` types)
- [ ] Auto-completion works in VS Code
- [ ] All tests pass
- [ ] No console errors in browser
- [ ] Reactivity verified (state changes update UI)

### Component Migration Complete When:
- [ ] No `export let` declarations
- [ ] All props use `$props()` destructuring
- [ ] Event callbacks instead of `createEventDispatcher()`
- [ ] Full TypeScript type coverage
- [ ] No `onMount`/`onDestroy` imports
- [ ] All lifecycle logic uses `$effect()`

---

## 🔍 Common Issues & Solutions

### Issue 1: "Cannot find module 'user.svelte'"
**Solution**: Update import extension:
```typescript
// ❌ Wrong
import { userStore } from '$lib/stores/user';

// ✅ Correct
import { userStore } from '$lib/stores/user.svelte';
```

---

### Issue 2: "$state is not defined"
**Solution**: Store files must have `.svelte.ts` extension for runes to work.

---

### Issue 3: "Property 'subscribe' does not exist"
**Solution**: Svelte 5 stores don't have `.subscribe()`. Access properties directly:
```typescript
// ❌ Svelte 4 pattern
userStore.subscribe(value => console.log(value));

// ✅ Svelte 5 pattern
$effect(() => {
  console.log(userStore.session); // Auto-reactive
});
```

---

### Issue 4: SSR crashes with "localStorage is not defined"
**Solution**: Add SSR guard:
```typescript
class MyStore {
  data = $state<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      this.data = localStorage.getItem('key');
    }
  }
}
```

---

## 📈 Progress Tracking

### Daily Progress Log (Template)
```markdown
## [Date] - Day X of 28

**Stores Migrated**: X/30
**Components Migrated**: X/50
**Routes Migrated**: X/20

**Today's Focus**:
- [ ] Migrate [store-name]
- [ ] Update imports in [component-list]
- [ ] Test migration

**Blockers**: None / [describe issue]

**Notes**: [Any observations, learnings, or issues encountered]
```

---

## 🎉 Expected Benefits (Post-Migration)

### Performance
- ✅ **30-50% faster** reactivity updates
- ✅ **Smaller bundle** size (no store runtime overhead)
- ✅ **Better tree-shaking** (direct property access)

### Developer Experience
- ✅ **Better type inference** (VS Code auto-completion)
- ✅ **Less boilerplate** (no manual `.subscribe()` cleanup)
- ✅ **Cleaner code** (reactive by default)

### Maintainability
- ✅ **Easier refactoring** (IDE understands `$state`)
- ✅ **Better debugging** (Chrome DevTools integration)
- ✅ **Modern patterns** (aligned with Svelte 5 ecosystem)

---

## 🔗 External Resources

### Official Svelte 5 Documentation
- [Runes Overview](https://svelte-5-preview.vercel.app/docs/runes)
- [$state Documentation](https://svelte-5-preview.vercel.app/docs/runes#$state)
- [$derived Documentation](https://svelte-5-preview.vercel.app/docs/runes#$derived)
- [$effect Documentation](https://svelte-5-preview.vercel.app/docs/runes#$effect)
- [$props Documentation](https://svelte-5-preview.vercel.app/docs/runes#$props)
- [Migration Guide](https://svelte-5-preview.vercel.app/docs/migration)

### Community Examples
- [Svelte 5 Playground](https://svelte.dev/playground/hello-world?version=5)
- [Svelte Society - Runes Recipes](https://sveltesociety.dev/recipes/svelte5)
- [GitHub: Svelte 5 Examples](https://github.com/sveltejs/svelte/tree/master/sites/svelte-5-preview/examples)

---

## 📞 Support & Questions

### Internal Resources
- **Phase 76 Team Lead**: [Your Name]
- **Documentation**: This folder (`sveltekit-frontend/`)
- **Slack Channel**: #phase76-svelte5-migration
- **Stand-up**: Daily 10am

### Getting Help
1. Check [`PHASE76_SVELTE5_MIGRATION_OPPORTUNITIES.md`](./PHASE76_SVELTE5_MIGRATION_OPPORTUNITIES.md)
2. Review existing migrated stores for patterns
3. Run audit tool for specific file analysis
4. Ask in Slack channel
5. Escalate to team lead if blocked

---

**🎯 Mission**: 100% Svelte 5 by February 1, 2025

**📊 Current Progress**: 4.5% (5/110 files)

**🚀 Next Action**: Run `node scripts/phase76-audit-stores.mjs`
