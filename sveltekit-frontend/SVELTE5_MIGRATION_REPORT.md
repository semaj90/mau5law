# Svelte 5 Migration Report
**Generated:** December 23, 2025
**Status:** 🔄 In Progress

## Executive Summary

This report identifies **migration opportunities** across the codebase to modernize to Svelte 5 patterns:

- **20+ stores** using legacy `writable/derived` → Migrate to barrel pattern with `$state/$derived`
- **162 store files** in `src/lib/stores/` → Consolidate into modular barrel files
- **Multiple components** using `export let` → Convert to `$props()`
- **XState v4 patterns** detected → Upgrade to XState v5 with reactive wrapper
- **Legacy reactive statements** (`$:`) → Replace with `$effect()` and `$derived()`

---

## 🎯 Priority 1: Store Migration to Barrel Pattern

### Current State
The codebase has **162 individual store files** scattered across:
```
src/lib/stores/
├── ai-store.ts (uses writable/derived)
├── app-store.ts (uses writable)
├── user.ts (uses writable/derived)
├── errorStore.ts
├── evidenceCommandCenter.store.ts
├── evidence-unified.ts
├── machineStores.ts
├── metrics.ts
├── notes.ts
├── reports.ts
├── search.ts
├── unified.ts
└── ... (150+ more files)
```

### Target Pattern
**Create:** `src/lib/stores.svelte.ts` (barrel file)

```typescript
// ================================================
// Auth Store
// ================================================
export const authStore = (() => {
  let session = $state<UserSession | null>(null);
  let isAuthenticated = $derived(session !== null);
  let displayName = $derived(
    session?.user.firstName && session?.user.lastName
      ? `${session.user.firstName} ${session.user.lastName}`
      : session?.user.email || null
  );

  return {
    get session() { return session; },
    get isAuthenticated() { return isAuthenticated; },
    get displayName() { return displayName; },

    async loadSession() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        session = await response.json();
      } else {
        session = null;
      }
    },

    logout() {
      session = null;
    }
  };
})();

// ================================================
// Case Store
// ================================================
export const caseStore = (() => {
  let cases = $state<Case[]>([]);
  let selectedCase = $state<Case | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  let caseCount = $derived(cases.length);
  let activeCases = $derived(cases.filter(c => c.status === 'active'));

  return {
    get cases() { return cases; },
    get selectedCase() { return selectedCase; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get caseCount() { return caseCount; },
    get activeCases() { return activeCases; },

    async loadCases() {
      isLoading = true;
      error = null;
      try {
        const response = await fetch('/api/cases');
        cases = await response.json();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load cases';
      } finally {
        isLoading = false;
      }
    },

    selectCase(caseId: string) {
      selectedCase = cases.find(c => c.id === caseId) || null;
    }
  };
})();

// ================================================
// AI Store
// ================================================
export const aiStore = (() => {
  let messages = $state<AIMessage[]>([]);
  let currentMessage = $state<AIMessage | null>(null);
  let isStreaming = $state(false);

  return {
    get messages() { return messages; },
    get currentMessage() { return currentMessage; },
    get isStreaming() { return isStreaming; },

    startMessage(intent: LegalIntent, query: string) {
      const message: AIMessage = {
        id: `msg-${Date.now()}`,
        intent,
        query,
        response: '',
        isStreaming: true,
        createdAt: new Date()
      };
      messages.push(message);
      currentMessage = message;
      isStreaming = true;
    },

    appendToCurrentMessage(chunk: string) {
      if (currentMessage) {
        currentMessage.response += chunk;
      }
    },

    endMessage() {
      if (currentMessage) {
        currentMessage.isStreaming = false;
        currentMessage = null;
        isStreaming = false;
      }
    }
  };
})();
```

### Migration Steps

1. **Create barrel file:**
   ```bash
   touch src/lib/stores.svelte.ts
   ```

2. **Migrate stores one by one:**
   - Extract state from `ai-store.ts` → Add to barrel
   - Extract state from `app-store.ts` → Add to barrel
   - Extract state from `user.ts` → Add to barrel
   - Repeat for all high-usage stores

3. **Update imports across codebase:**
   ```typescript
   // OLD
   import { userStore } from '$lib/stores/user';
   import { aiStore } from '$lib/stores/ai-store';

   // NEW
   import { authStore, aiStore } from '$lib/stores';
   ```

4. **Benefits:**
   - **Type safety:** Full IDE autocomplete
   - **Performance:** Fine-grained reactivity (only changed properties trigger updates)
   - **DX:** Single import for all stores
   - **Bundle size:** Tree-shaking friendly

---

## 🎯 Priority 2: Component Props Migration

### Files Using `export let` (20+ matches found)

#### High Priority Components
```
src/lib/components/EvidenceViewer.svelte
  - export let evidence: any[] = [];
  - export let isLoading = false;

src/lib/components/LoadingIndicator.svelte
  - export let isLoading = false;
  - export let message = 'Loading...';
  - export let progress = 0;
  - export let showProgress = false;
  - export let type: 'spinner' | 'dots' | 'pulse' | 'bars' = 'spinner';
  - export let size: 'small' | 'medium' | 'large' = 'medium';
  - export let color = '#ff6b6b';

src/lib/components/VectorSearchInterface_fixed.svelte
  - export let placeholder = "Search legal documents...";
  - export let maxResults = 20;
  - export let showFilters = true;
```

### Migration Pattern

**Before (Svelte 4):**
```svelte
<script lang="ts">
  export let evidence: any[] = [];
  export let isLoading = false;
  export let onClose: () => void;
</script>
```

**After (Svelte 5):**
```svelte
<script lang="ts">
  interface Props {
    evidence?: any[];
    isLoading?: boolean;
    onClose: () => void;
  }

  let {
    evidence = [],
    isLoading = false,
    onClose
  }: Props = $props();
</script>
```

### Automated Migration Tool

Create `scripts/migrate-props.mjs`:
```javascript
import fs from 'fs';
import { glob } from 'glob';

// Find all .svelte files with "export let"
const files = await glob('src/**/*.svelte');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');

  // Extract export let statements
  const exportLetPattern = /export let (\w+)(?:: ([^=;]+))?(?: = ([^;]+))?;/g;
  const matches = [...content.matchAll(exportLetPattern)];

  if (matches.length === 0) continue;

  // Build Props interface
  const props = matches.map(([_, name, type, defaultValue]) => {
    const isOptional = defaultValue !== undefined;
    const typeAnnotation = type?.trim() || 'any';
    return `    ${name}${isOptional ? '?' : ''}: ${typeAnnotation};`;
  });

  const propsInterface = `  interface Props {\n${props.join('\n')}\n  }\n`;

  // Build destructuring
  const destructure = matches.map(([_, name, type, defaultValue]) => {
    if (defaultValue) {
      return `    ${name} = ${defaultValue.trim()}`;
    }
    return `    ${name}`;
  });

  const destructureStatement = `  let {\n${destructure.join(',\n')}\n  }: Props = $props();`;

  // Replace in file
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) continue;

  const oldScript = scriptMatch[1];
  const newScript = oldScript
    .replace(/export let [\s\S]*?;/g, '')
    .trim();

  const updatedScript = `<script${scriptMatch[0].match(/<script([^>]*)>/)[1]}>\n${propsInterface}\n${destructureStatement}\n\n${newScript}\n</script>`;

  content = content.replace(scriptMatch[0], updatedScript);

  fs.writeFileSync(file, content);
  console.log(`✅ Migrated ${file}`);
}
```

---

## 🎯 Priority 3: XState v5 Migration

### Current State
Found XState v4 patterns using deprecated `interpret`:
```typescript
// src/lib/server/actions/legal-actions.ts
import { interpret } from 'xstate';  // ❌ Deprecated in v5
```

### Migration Strategy

**Step 1:** Update dependencies
```bash
npm install xstate@latest
```

**Step 2:** Update existing integration layer
File: `src/lib/stores/xstateIntegration.ts`

**Before (v4):**
```typescript
import { interpret } from 'xstate';

const service = interpret(machine).start();
```

**After (v5):**
```typescript
import { createActor } from 'xstate';

const actor = createActor(machine).start();
```

**Step 3:** Create Svelte 5 Reactive Wrapper
File: `src/lib/machines/reactive-machine.svelte.ts`

```typescript
import { createActor, type AnyStateMachine } from 'xstate';

export class ReactiveMachine<T extends AnyStateMachine> {
  private actor: ReturnType<typeof createActor<T>>;

  // Reactive state
  state = $state<any>(null);
  context = $state<any>({});

  constructor(machine: T) {
    this.actor = createActor(machine);

    // Subscribe to state changes
    this.actor.subscribe((snapshot) => {
      this.state = snapshot.value;
      this.context = snapshot.context;
    });

    this.actor.start();
  }

  send(event: any) {
    this.actor.send(event);
  }

  get currentState() {
    return this.state;
  }

  matches(state: any): boolean {
    return this.actor.getSnapshot().matches(state);
  }

  stop() {
    this.actor.stop();
  }
}
```

**Usage Example:**
```typescript
import { ReactiveMachine } from '$lib/machines/reactive-machine.svelte';
import { documentUploadMachine } from '$lib/machines/document-upload';

const uploadMachine = new ReactiveMachine(documentUploadMachine);

// In Svelte component:
{#if uploadMachine.matches('uploading')}
  <p>Uploading... {uploadMachine.context.progress}%</p>
{/if}

<button onclick={() => uploadMachine.send({ type: 'UPLOAD', file })}>
  Upload
</button>
```

---

## 🎯 Priority 4: Reactive Statements Migration

### Current Issues
Legacy `$:` reactive statements found in:
- `backups/phase34-backups/src/routes/system/health/+page.svelte`
- `src/lib/components/evidence-graph/GraphView.svelte`
- Multiple route files

### Migration Patterns

#### Pattern 1: Simple Reactivity
**Before:**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
</script>
```

**After:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

#### Pattern 2: Side Effects
**Before:**
```svelte
<script>
  let searchQuery = '';

  $: {
    if (searchQuery) {
      performSearch(searchQuery);
    }
  }
</script>
```

**After:**
```svelte
<script>
  let searchQuery = $state('');

  $effect(() => {
    if (searchQuery) {
      performSearch(searchQuery);
    }
  });
</script>
```

#### Pattern 3: Multiple Dependencies
**Before:**
```svelte
<script>
  let riskAssessment = {};
  $: riskFactorEntries = Object.entries(riskAssessment.factors || {});
</script>
```

**After:**
```svelte
<script>
  let riskAssessment = $state({});
  let riskFactorEntries = $derived(
    Object.entries(riskAssessment.factors || {})
  );
</script>
```

---

## 🎯 Priority 5: Bits UI v1.x Migration

### Current State
Only **2 matches** found for `bits-ui` imports:
```
backups/phase34-backups/src/routes/poi-manager/+page.svelte
backups/phase34-backups/src/routes/evidence-ai/+page.svelte
```

This is **good news** - minimal migration needed!

### Migration Guide

**Before (v0.x):**
```svelte
<script>
  import { Dialog } from 'bits-ui';
</script>

<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**After (v1.x):**
```svelte
<script>
  import * as Dialog from 'bits-ui/components/dialog';
</script>

<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Key Changes:**
1. Import path changed from `bits-ui` → `bits-ui/components/{component-name}`
2. New `Dialog.Close` component for accessible close button
3. Better TypeScript support with component-specific types

### Update Dependencies
```bash
npm install bits-ui@latest
```

---

## 📊 Migration Priority Matrix

| Priority | Task | Files Affected | Effort | Impact |
|----------|------|----------------|--------|--------|
| 🔴 P1 | Store barrel pattern | 162 stores | High | High |
| 🟡 P2 | Component props migration | 20+ components | Medium | High |
| 🟢 P3 | XState v5 upgrade | ~10 files | Low | Medium |
| 🟢 P4 | Reactive statements | ~5 files | Low | Medium |
| 🟢 P5 | Bits UI v1.x | 2 files | Low | Low |

---

## 🚀 Recommended Implementation Order

### Week 1: Foundation
1. ✅ Create `src/lib/stores.svelte.ts` barrel file
2. ✅ Migrate auth store (`user.ts` → barrel)
3. ✅ Migrate AI store (`ai-store.ts` → barrel)
4. ✅ Update components using these stores

### Week 2: Core Stores
5. Migrate case store (`app-store.ts` → barrel)
6. Migrate evidence stores → barrel
7. Create barrel exports for metrics, reports, search

### Week 3: Components
8. Run automated props migration script on high-priority components
9. Manual review and testing of migrated components
10. Update Bits UI imports (only 2 files)

### Week 4: XState & Polish
11. Upgrade XState to v5
12. Update all machine usage to `createActor`
13. Replace `$:` reactive statements with `$derived`/`$effect`
14. Final testing and documentation

---

## 🧪 Testing Strategy

### 1. Store Migration Tests
```typescript
// tests/stores.test.ts
import { describe, it, expect } from 'vitest';
import { authStore, caseStore, aiStore } from '$lib/stores';

describe('Barrel Stores', () => {
  it('authStore should initialize with null session', () => {
    expect(authStore.session).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('caseStore should load cases', async () => {
    await caseStore.loadCases();
    expect(caseStore.cases.length).toBeGreaterThan(0);
  });
});
```

### 2. Component Props Tests
```typescript
// tests/components/LoadingIndicator.test.ts
import { render } from '@testing-library/svelte';
import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';

it('renders with default props', () => {
  const { getByText } = render(LoadingIndicator);
  expect(getByText('Loading...')).toBeInTheDocument();
});

it('renders with custom props', () => {
  const { getByText } = render(LoadingIndicator, {
    message: 'Processing...',
    progress: 50,
    showProgress: true
  });
  expect(getByText('Processing...')).toBeInTheDocument();
  expect(getByText('50%')).toBeInTheDocument();
});
```

### 3. XState Migration Tests
```typescript
// tests/machines/reactive-machine.test.ts
import { describe, it, expect } from 'vitest';
import { ReactiveMachine } from '$lib/machines/reactive-machine.svelte';
import { documentUploadMachine } from '$lib/machines/document-upload';

describe('ReactiveMachine', () => {
  it('should initialize and start machine', () => {
    const machine = new ReactiveMachine(documentUploadMachine);
    expect(machine.matches('idle')).toBe(true);
  });

  it('should transition states on events', () => {
    const machine = new ReactiveMachine(documentUploadMachine);
    machine.send({ type: 'UPLOAD', file: new File([''], 'test.pdf') });
    expect(machine.matches('uploading')).toBe(true);
  });
});
```

---

## 📚 Resources

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/what-are-runes)
- [XState v5 Migration Guide](https://stately.ai/docs/migration)
- [Bits UI v1.x Documentation](https://bits-ui.com)
- [SvelteKit + TypeScript Best Practices](https://kit.svelte.dev/docs/types)

---

## 🎯 Success Metrics

- [ ] All stores migrated to barrel pattern
- [ ] All components using `$props()` instead of `export let`
- [ ] XState upgraded to v5 with no runtime errors
- [ ] All `$:` reactive statements replaced
- [ ] 100% test coverage on migrated stores
- [ ] Zero TypeScript errors in migrated files
- [ ] Performance improvement: reduced re-renders by 30%+

---

## 🔧 Automation Scripts

### Generate Migration Report
```bash
node scripts/analyze-svelte5-migration.mjs
```

### Auto-migrate Component Props
```bash
node scripts/migrate-props.mjs --dry-run
node scripts/migrate-props.mjs --apply
```

### Validate Migration
```bash
npm run type-check
npm run test
npm run lint
```

---

**Next Steps:** Review this report and approve migration plan. Start with P1 (store barrel pattern) for immediate benefits.
