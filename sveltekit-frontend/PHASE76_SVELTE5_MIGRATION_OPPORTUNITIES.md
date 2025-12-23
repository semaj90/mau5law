# Phase 76: Svelte 5 Runes Migration Opportunities

**Generated**: December 23, 2025
**Status**: Ready for Implementation
**Priority**: High (Modernization & Performance)

---

## Executive Summary

Found **100+ files** with Svelte 4 patterns that can be migrated to Svelte 5 runes for:
- Better reactivity performance
- Improved type safety
- Cleaner component architecture
- Enhanced state management

---

## 🎯 Migration Categories

### Category 1: Store Migration (Highest Impact)
**Pattern**: `writable()`/`derived()` → `$state()`/`$derived()`
**Files**: 30+ store files in `src/lib/stores/`
**Impact**: Performance improvement, reduced boilerplate

#### Files Identified:
1. **`src/lib/stores/user.ts`** (80 lines)
   - `writable<UserSession>()` → Class with `$state`
   - `derived()` for `isAuthenticated`, `userDisplayName`
   - **Benefit**: Type-safe reactive user session

2. **`src/lib/stores/ai-store.ts`** (178 lines)
   - Complex message streaming state
   - Perfect candidate for `$state` class pattern
   - **Benefit**: Better streaming reactivity

3. **`src/lib/stores/app-store.ts`**
   - Global UI state
   - **Already migrated** to AppState singleton in Phase 76 barrel ✅

4. **`src/lib/stores/canvas.ts`**
5. **`src/lib/stores/enhanced-rag-store.ts`**
6. **`src/lib/stores/evidenceCommandCenter.store.ts`**
7. **`src/lib/stores/evidence-unified.ts`**
8. **`src/lib/stores/chat-context.ts`**
9. **`src/lib/stores/clustering.ts`**
10. **`src/lib/stores/errorStore.ts`**

### Category 2: Component Props Migration
**Pattern**: `export let` → `$props()`
**Files**: 50+ components in `src/lib/components/`
**Impact**: Type safety, cleaner prop handling

#### Priority Components:

**Already Using `$props()` (Good Examples):**
- ✅ `SearchInterface.svelte` - Uses `$bindable()` props (Modern!)
- ✅ `EvidenceViewer.svelte` - Partial migration

**Needs Migration:**
- `src/lib/components/AIAssistant.svelte`
- `src/lib/components/AIChatAssistant.svelte`
- `src/lib/components/ChatPanel.svelte`
- `src/lib/components/ChatMessages.svelte`
- `src/lib/components/DocumentUploadForm.svelte`
- `src/lib/components/admin/*.svelte` (5 files)
- `src/lib/components/ai/*.svelte` (15 files)
- `src/lib/components/cases/*.svelte` (8 files)

### Category 3: Lifecycle Hooks Migration
**Pattern**: `onMount`/`onDestroy` → `$effect()`
**Files**: 20+ route files
**Impact**: Unified side-effect handling

#### Files Identified:
1. **`src/routes/+layout.svelte`** (CRITICAL)
   - `onMount()` for store initialization
   - `onDestroy()` for cleanup
   - **Status**: Already using barrel stores, ready for `$effect`

2. **`src/routes/+page.svelte`**
3. **`src/routes/indexing/+page.svelte`**
4. **`src/routes/acp/+page.svelte`**
5. **`src/routes/(app)/all-routes/+page.svelte`**
6. **`src/routes/(app)/system-configuration/+page.svelte`**
7. **`src/routes/(app)/cases/create/+page.svelte`**

### Category 4: Event Dispatcher Migration
**Pattern**: `createEventDispatcher()` → Callback props
**Files**: 10+ components
**Impact**: Type-safe events, less boilerplate

#### Files Using Old Pattern:
- `src/lib/components/SearchInterface.svelte` (line 2)
  - `dispatch('search')` → `onsearch?.(event)` callback
  - `dispatch('clear')` → `onclear?.()` callback
  - `dispatch('filterChange')` → `onfilterchange?.(filters)` callback

---

## 🚀 Migration Plan

### Phase 1: Store Classes (Week 1)
**Goal**: Convert 10 critical stores to Svelte 5 class pattern

#### Template Pattern:
```typescript
// Before (Svelte 4)
import { writable, derived } from 'svelte/store';

export const userStore = writable<UserSession | null>(null);
export const isAuthenticated = derived(userStore, ($user) => $user !== null);

// After (Svelte 5)
class UserStore {
  session = $state<UserSession | null>(null);

  isAuthenticated = $derived(this.session !== null);

  displayName = $derived(() => {
    if (!this.session) return null;
    const { firstName, lastName, email } = this.session.user;
    return firstName && lastName
      ? `${firstName} ${lastName}`
      : email;
  });

  async load() {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      this.session = await res.json();
    }
  }
}

export const userStore = new UserStore();
```

#### Priority Order:
1. ✅ **`preferences.svelte.ts`** - Already done in Phase 76
2. ✅ **`tokenUsage.svelte.ts`** - Already done in Phase 76
3. ✅ **`localDocs.svelte.ts`** - Already done in Phase 76
4. **`user.ts`** → `user.svelte.ts` (Next)
5. **`ai-store.ts`** → `ai-store.svelte.ts`
6. **`canvas.ts`** → `canvas.svelte.ts`
7. **`chat-context.ts`** → `chat-context.svelte.ts`
8. **`errorStore.ts`** → `errorStore.svelte.ts`
9. **`enhanced-rag-store.ts`** → `rag-store.svelte.ts`
10. **`evidenceCommandCenter.store.ts`** → `evidence-command.svelte.ts`

### Phase 2: Route Lifecycle (Week 2)
**Goal**: Convert all route `onMount`/`onDestroy` to `$effect()`

#### Template Pattern:
```svelte
<!-- Before (Svelte 4) -->
<script>
  import { onMount, onDestroy } from 'svelte';

  onMount(() => {
    console.log('Mounted');
    const interval = setInterval(() => {...}, 1000);

    return () => clearInterval(interval); // ❌ Wrong, this doesn't work
  });

  onDestroy(() => {
    // Cleanup logic
  });
</script>

<!-- After (Svelte 5) -->
<script>
  $effect(() => {
    console.log('Mounted');
    const interval = setInterval(() => {...}, 1000);

    return () => {
      // Cleanup runs automatically
      clearInterval(interval);
    };
  });
</script>
```

#### Priority Files:
1. **`src/routes/+layout.svelte`** (Critical - affects all routes)
2. **`src/routes/+page.svelte`**
3. **`src/routes/(app)/cases/create/+page.svelte`**
4. **`src/routes/(app)/system-configuration/+page.svelte`**

### Phase 3: Component Props (Week 3)
**Goal**: Convert 20 components to `$props()`

#### Template Pattern:
```svelte
<!-- Before (Svelte 4) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let caseId: string;
  export let isLoading: boolean = false;
  export let onSave: ((data: any) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  function handleSubmit() {
    dispatch('submit', { caseId });
    onSave?.({ caseId });
  }
</script>

<!-- After (Svelte 5) -->
<script lang="ts">
  let {
    caseId,
    isLoading = false,
    onsubmit,
    onsave
  }: {
    caseId: string;
    isLoading?: boolean;
    onsubmit?: (event: CustomEvent<{ caseId: string }>) => void;
    onsave?: (data: { caseId: string }) => void;
  } = $props();

  function handleSubmit() {
    const detail = { caseId };
    onsubmit?.(new CustomEvent('submit', { detail }));
    onsave?.(detail);
  }
</script>
```

#### Priority Components:
1. **`ChatPanel.svelte`**
2. **`ChatMessages.svelte`**
3. **`AIAssistant.svelte`**
4. **`DocumentUploadForm.svelte`**
5. **All `admin/*.svelte` components** (5 files)

### Phase 4: Event Dispatchers (Week 4)
**Goal**: Remove all `createEventDispatcher()` usage

#### Template Pattern:
```svelte
<!-- Before -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    search: { query: string; filters: any };
    clear: void;
  }>();

  function handleSearch() {
    dispatch('search', { query, filters });
  }
</script>

<!-- After -->
<script>
  let {
    onsearch,
    onclear
  }: {
    onsearch?: (event: CustomEvent<{ query: string; filters: any }>) => void;
    onclear?: () => void;
  } = $props();

  function handleSearch() {
    onsearch?.(new CustomEvent('search', {
      detail: { query, filters }
    }));
  }
</script>
```

---

## 📊 Migration Metrics

| Category | Files Found | Migrated | Remaining | Priority |
|----------|------------|----------|-----------|----------|
| **Store Classes** | 30 | 3 ✅ | 27 | 🔴 High |
| **Component Props** | 50+ | 2 ✅ | 48+ | 🟡 Medium |
| **Lifecycle Hooks** | 20+ | 0 | 20+ | 🔴 High |
| **Event Dispatchers** | 10+ | 0 | 10+ | 🟢 Low |

**Total Progress**: **5 / 110+ files (4.5%)**

---

## 🎯 Quick Wins (Do First)

### 1. User Store Migration
**File**: `src/lib/stores/user.ts` → `user.svelte.ts`
**Time**: 30 minutes
**Impact**: High (used across all authenticated routes)

### 2. Layout Lifecycle
**File**: `src/routes/+layout.svelte`
**Time**: 20 minutes
**Impact**: Critical (affects all routes)

### 3. AI Store Migration
**File**: `src/lib/stores/ai-store.ts` → `ai-store.svelte.ts`
**Time**: 45 minutes
**Impact**: High (chat streaming performance)

---

## 🔧 Automation Tools

### Tool 1: Store Class Generator
**Path**: `scripts/phase76-migrate-store.mjs`
**Usage**: `node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts`
**Output**: Creates `user.svelte.ts` with Svelte 5 class pattern

### Tool 2: Component Props Migrator
**Path**: `scripts/phase76-migrate-props.mjs`
**Usage**: `node scripts/phase76-migrate-props.mjs src/lib/components/ChatPanel.svelte`
**Output**: Converts `export let` to `$props()`

### Tool 3: Lifecycle Converter
**Path**: `scripts/phase76-migrate-lifecycle.mjs`
**Usage**: `node scripts/phase76-migrate-lifecycle.mjs src/routes/+page.svelte`
**Output**: Converts `onMount`/`onDestroy` to `$effect()`

---

## ✅ Success Criteria

### Store Migration
- [ ] All 30 stores use Svelte 5 class pattern
- [ ] Zero `writable()` or `derived()` imports in new code
- [ ] Type-safe reactivity (no `any` types)
- [ ] Auto-completion works in VS Code

### Component Migration
- [ ] All 50+ components use `$props()`
- [ ] No `export let` declarations
- [ ] Event callbacks instead of `createEventDispatcher()`
- [ ] Full TypeScript type coverage

### Lifecycle Migration
- [ ] All 20+ routes use `$effect()`
- [ ] No `onMount`/`onDestroy` imports
- [ ] Proper cleanup via return functions
- [ ] SSR-safe (no window access without guards)

---

## 📚 References

### Official Svelte 5 Docs
- [Runes Overview](https://svelte-5-preview.vercel.app/docs/runes)
- [$state](https://svelte-5-preview.vercel.app/docs/runes#$state)
- [$derived](https://svelte-5-preview.vercel.app/docs/runes#$derived)
- [$effect](https://svelte-5-preview.vercel.app/docs/runes#$effect)
- [$props](https://svelte-5-preview.vercel.app/docs/runes#$props)

### Local Documentation
- `SVELTE5_RUNES_MIGRATION.md` - Complete migration guide
- `SVELTE5_RUNES_QUICK_REFERENCE.md` - Pattern templates
- `PHASE3_MANUAL_FIXES_READY.md` - Task breakdown

### Existing Examples (Good Patterns)
- ✅ `src/lib/stores/preferences.svelte.ts` - UserPreferences class
- ✅ `src/lib/stores/tokenUsage.svelte.ts` - TokenTracker class
- ✅ `src/lib/stores/localDocs.svelte.ts` - LocalLegalStore class
- ✅ `src/lib/stores/phase76-barrel.ts` - Barrel export pattern
- ✅ `src/lib/components/SearchInterface.svelte` - $bindable props

---

## 🚨 Common Pitfalls

### Pitfall 1: Forgetting SSR Guards
```typescript
// ❌ BAD - Crashes during SSR
class MyStore {
  data = $state(localStorage.getItem('key'));
}

// ✅ GOOD - SSR-safe
class MyStore {
  data = $state<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      this.data = localStorage.getItem('key');
    }
  }
}
```

### Pitfall 2: Reactivity Inside $effect
```typescript
// ❌ BAD - Infinite loop
$effect(() => {
  count = count + 1; // Triggers effect again
});

// ✅ GOOD - Use $derived for computed values
let doubled = $derived(count * 2);
```

### Pitfall 3: Cleanup Not Returning
```typescript
// ❌ BAD - Memory leak
$effect(() => {
  const interval = setInterval(() => {...}, 1000);
  // No cleanup!
});

// ✅ GOOD - Return cleanup function
$effect(() => {
  const interval = setInterval(() => {...}, 1000);
  return () => clearInterval(interval);
});
```

---

## 🎉 Expected Benefits

### Performance
- **30-50% faster** reactivity updates (no subscription overhead)
- **Smaller bundle** (no store runtime)
- **Better tree-shaking** (direct property access)

### Developer Experience
- **Better type inference** (TypeScript auto-completion)
- **Less boilerplate** (no `.subscribe()` cleanup)
- **Cleaner code** (reactive by default)

### Maintainability
- **Easier refactoring** (IDE understands $state)
- **Better debugging** (Chrome DevTools integration)
- **Modern patterns** (aligned with Svelte 5 ecosystem)

---

## 📅 Timeline

| Week | Focus Area | Files | Hours |
|------|-----------|-------|-------|
| **Week 1** | Store Classes | 10 | 8h |
| **Week 2** | Route Lifecycle | 7 | 4h |
| **Week 3** | Component Props | 20 | 10h |
| **Week 4** | Event Dispatchers | 10 | 5h |

**Total**: 4 weeks, 27 hours, 47 files

---

## 🔗 Next Steps

1. **Run Store Audit**: `node scripts/phase76-audit-stores.mjs`
2. **Generate Migration Report**: `node scripts/phase76-migration-report.mjs`
3. **Start with User Store**: `node scripts/phase76-migrate-store.mjs src/lib/stores/user.ts`
4. **Test Migration**: `npm run phase76:test`
5. **Commit Changes**: `git commit -m "Phase 76: Migrate user store to Svelte 5"`

---

**🎯 Goal**: 100% Svelte 5 Runes by end of January 2025

**📊 Current Status**: 4.5% complete (5/110 files)

**🚀 Next Milestone**: 20% complete (10 core stores migrated)
