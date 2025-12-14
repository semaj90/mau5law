# SVELTE 5 MIGRATION & CORE ROUTES SPEC

**YoRHa Legal AI Frontend - Phase 74+ Migration Guide**

## 0. EXECUTIVE SUMMARY

This spec defines the complete migration from legacy SvelteKit to **Svelte 5 + Bits-UI v2 + Uno.css**. All 700+ API endpoints have been audited and are compatible.

**Status**: ✅ **Bits-UI v2 migration complete** | ✅ **OCR Pipeline operational** | 🚧 **UI Implementation pending**

---

## 1. CANONICAL CORE ROUTES (PHASE 06)

These routes must compile cleanly before UI polish:

### 1.1 Application Routes
```
src/routes/
├─ (app)/
│  ├─ cases/
│  │  └─ [id]/
│  │     ├─ +layout.svelte
│  │     ├─ +page.svelte
│  │     └─ +page.server.ts
│  ├─ evidence/
│  │  ├─ +page.svelte
│  │  └─ +page.server.ts
│  ├─ terminal/
│  │  └─ +page.svelte
│  └─ yorha-detective/
│     └─ +page.svelte   ← boot screen / main shell
```

### 1.2 API Routes (700+ endpoints audited)
```
src/routes/api/
├─ ai/
│  └─ yorha/
│     ├─ context-chat/
│     │  └─ +server.ts
│     ├─ enhanced-rag/
│     │  └─ +server.ts
│     └─ docling/
│        └─ +server.ts
├─ legal/
│  ├─ ingest/
│  ├─ research/
│  └─ workflow/
├─ rag/
│  └─ query/
├─ v1/
│  ├─ evidence/
│  ├─ storage/
│  ├─ vector/
│  └─ telemetry/
└─ routes/
   └─ +page.server.ts   ← route introspection / command center
```

---

## 2. SVELTE 5 MIGRATION RULES (NON-NEGOTIABLE)

### 2.1 FORBIDDEN Legacy Patterns
❌ `export let foo` → ✅ `let { foo } = $props()`
❌ `$: reactive labels` → ✅ `$derived()` / `$effect()`
❌ `on:event={}` → ✅ `onclick={() => ...}`
❌ `import type { fade } from 'svelte/transition'` → ✅ `import { fade } from 'svelte/transition'`
❌ implicit stores → ✅ explicit `$state()`

### 2.2 REQUIRED Svelte 5 Patterns

#### Props
```typescript
<script lang="ts">
  let { caseId, user } = $props<{
    caseId: string;
    user: User;
  }>();
</script>
```

#### State
```typescript
let isBooting = $state(true);
let errors = $state<string[]>([]);
```

#### Derived
```typescript
let errorCount = $derived(errors.length);
```

#### Effects (side-effects only)
```typescript
$effect(() => {
  console.log('Boot state:', isBooting);
});
```

---

## 3. BITS-UI V2 INTEGRATION (COMPLETE ✅)

### 3.1 Import Patterns
```typescript
// ✅ CORRECT - Bits-UI v2
import { Button, Card, Dialog } from 'bits-ui';

// ❌ WRONG - Bits-UI v1
import { Button } from 'bits-ui/components/ui/button';
```

### 3.2 Uno.css Integration
```css
/* src/app.css */
@import 'uno.css';
@theme {
  --color-primary: #0066cc;
  --color-secondary: #666;
}
```

### 3.3 Component Usage
```svelte
<script lang="ts">
  import { Button, Card, CardContent, CardHeader, CardTitle } from 'bits-ui';
</script>

<Button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</Button>

<Card class="w-96">
  <CardHeader>
    <CardTitle>Evidence Analysis</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content here...</p>
  </CardContent>
</Card>
```

---

## 4. KNOWN ERROR CLASSES & FIXES

### 4.1 Import Type → Runtime Error
**Symptom**: `'fade' cannot be used as a value because it was imported using 'import type'`

**Fix**:
```typescript
// ❌ Wrong
import type { fade } from 'svelte/transition';

// ✅ Correct
import { fade } from 'svelte/transition';
```

### 4.2 Duplicate Function Implementation
**Symptom**: `Duplicate function implementation`

**Root Causes**:
- Copied helper functions
- Re-declared handlers (POST, GET)

**Fix**: Move helpers to `src/lib/server/yorha/`

### 4.3 TS2393: Duplicate Function
**Fix Pattern**:
```typescript
// Move to src/lib/server/yorha/rag-helpers.ts
export function processRagQuery(query: string) { ... }

// Then import
import { processRagQuery } from '$lib/server/yorha/rag-helpers';
```

---

## 5. BOOT / SPLASH SCREENS (YORHA-DETECTIVE)

**Canonical Pattern**:
```svelte
<script lang="ts">
  import { fade } from 'svelte/transition';

  let isBooting = $state(true);

  $effect(() => {
    const t = setTimeout(() => (isBooting = false), 1200);
    return () => clearTimeout(t);
  });
</script>

{#if isBooting}
  <div class="boot-screen" transition:fade={{ duration: 500 }}>
    <div class="boot-logo">YoRHa</div>
  </div>
{/if}
```

---

## 6. EXECUTION ORDER (CRITICAL)

### Phase Order
1. **Tests FIRST** → `npm run test`
2. **CRUD operations** → API routes
3. **RAG pipeline** → AI endpoints
4. **Frontend components** → UI polish

### Why This Order?
- Tests surface import errors instantly
- UI churn hides real failures
- Phase 72 depends on stable routes

---

## 7. PHASE 6 SUCCESS CRITERIA

✅ `npm run phase6:core` completes
✅ `svelte-check` errors < 500 (not 71k)
✅ Core routes render: `/terminal`, `/cases/[id]`, `/yorha-detective`

---

## 8. UI IMPLEMENTATION ROADMAP

### 8.1 Command Center (`src/routes/(app)/command-center/+page.svelte`)
```svelte
<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from 'bits-ui';
  import { onMount } from 'svelte';

  let metrics = $state({ totalCases: 0, activeCases: 0, evidenceProcessed: 0 });
  let systemStatus = $state('operational');
</script>

<div class="command-center">
  <!-- Sidebar Navigation -->
  <nav class="sidebar">
    <Button>Dashboard</Button>
    <Button>Cases</Button>
    <Button>Evidence</Button>
    <Button>AI Chat</Button>
    <Button>Persons</Button>
    <Button>Analysis</Button>
    <Button>System</Button>
  </nav>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <Card>
        <CardHeader><CardTitle>Total Cases</CardTitle></CardHeader>
        <CardContent><div class="text-2xl font-bold">{metrics.totalCases}</div></CardContent>
      </Card>
      <!-- ... more metrics -->
    </div>

    <!-- Active Cases List -->
    <Card>
      <CardHeader><CardTitle>Active Cases</CardTitle></CardHeader>
      <CardContent>
        <!-- Case list implementation -->
      </CardContent>
    </Card>
  </main>
</div>
```

### 8.2 AI Chat Interface (`src/routes/(app)/terminal/+page.svelte`)
```svelte
<script lang="ts">
  import { Button, Textarea } from 'bits-ui';

  let messages = $state<Array<{role: string, content: string}>>([]);
  let currentMessage = $state('');
  let isTyping = $state(false);
</script>

<div class="ai-chat">
  <!-- Shared Sidebar -->
  <nav class="sidebar"><!-- same as command center --></nav>

  <!-- Chat Interface -->
  <div class="chat-container">
    <div class="chat-log">
      {#each messages as message}
        <div class="message {message.role}">
          {message.content}
        </div>
      {/each}
    </div>

    <div class="chat-input">
      <Textarea bind:value={currentMessage} placeholder="Ask about your case..." />
      <Button onclick={sendMessage} disabled={isTyping}>
        {isTyping ? 'Thinking...' : 'Send'}
      </Button>
    </div>
  </div>
</div>
```

### 8.3 Evidence Board (`src/routes/(app)/evidence/+page.svelte`)
```svelte
<script lang="ts">
  import { Button, Dialog } from 'bits-ui';

  let evidenceItems = $state<EvidenceItem[]>([]);
  let selectedItem = $state<EvidenceItem | null>(null);
  let connections = $state<Connection[]>([]);
</script>

<div class="evidence-board">
  <!-- Case Selector -->
  <div class="case-selector">
    <select bind:value={selectedCase}>
      <!-- case options -->
    </select>
  </div>

  <!-- Canvas -->
  <div class="canvas" bind:this={canvasElement}>
    {#each evidenceItems as item}
      <div class="evidence-node" style="left: {item.x}px; top: {item.y}px;">
        <Card>
          <CardContent>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </CardContent>
        </Card>
      </div>
    {/each}
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <Button onclick={addEvidence}>Add Evidence</Button>
    <Button onclick={connectItems}>Connect</Button>
  </div>
</div>
```

---

## 9. IMPLEMENTATION CHECKLIST

### ✅ Completed
- [x] Bits-UI v2 migration script
- [x] Import path corrections
- [x] OCR pipeline operational
- [x] Core routes defined
- [x] Migration patterns documented

### 🚧 In Progress
- [ ] Command Center page implementation
- [ ] AI Chat Interface
- [ ] Evidence Board canvas
- [ ] Navigation system
- [ ] Person of Interest management
- [ ] Global Search interface
- [ ] Analysis dashboard
- [ ] System configuration

### 📋 Next Steps
1. Implement Command Center with metrics
2. Build AI Chat with contextual responses
3. Create Evidence Board with drag-and-drop
4. Add navigation between all sections
5. Integrate with existing API endpoints

---

## 10. DEPLOYMENT READINESS

**Current Status**: Core infrastructure complete, UI implementation pending.

**Go-Live Requirements**:
- All core routes rendering
- Navigation functional
- API integration complete
- Performance optimized
- Error handling robust

**Migration Complete**: When all routes in §1 render successfully with < 100 TypeScript errors.

#### System Management
- `/command-center`
- `/system-dashboard`
- `/system-status`
- `/terminal`
- `/yorha/dashboard`

#### YoRHa Core
- `/yorha`
- `/yorha/analysis`
- `/yorha/evidence`
- `/yorha/evidence-board`
- `/yorha/search`
- `/yorha/terminal`

### Archive/Test Routes (Low Priority - Phase 3)
**Estimated: 200+ routes in archive/dev/demo/test directories**

#### Archive Routes
- `/archive/demos/*` (35+ demo routes)
- `/archive/dev-playground/*` (8 dev routes)
- `/archive/experiments/*` (2 experiment routes)
- `/archive/tests/*` (80+ test routes)

#### Development Routes
- `/dev/*` (20+ dev tools)
- `/demo/*` (10+ demo routes)
- `/test*` (15+ test routes)

## Migration Rules & Patterns

### Rule A: Import-Type Misuse (High Impact)
**Pattern**: `import type { fade } from 'svelte/transition'`
**Fix**: `import { fade } from 'svelte/transition'`
**Impact**: Transitions are runtime imports, not type-only
**Scope**: All transition imports across codebase

### Rule B: Runes Consistency (High Impact)
**Pattern**: Legacy reactive statements without runes
**Fix**: Convert to `$state`, `$derived`, `$effect` runes
**Impact**: Eliminates reactive statement warnings
**Scope**: All components with reactive declarations

### Rule C: Event Handler Syntax (Medium Impact)
**Pattern**: `on:click={handler}` (legacy)
**Fix**: `onclick={handler}` (modern)
**Impact**: Aligns with Svelte 5 event handling
**Scope**: All event handlers in Svelte components

### Rule D: Component Props (Medium Impact)
**Pattern**: Legacy prop declarations
**Fix**: Use `let { prop = default }` syntax
**Impact**: Modern prop handling
**Scope**: All component prop declarations

## Migration Phases

### Phase 1: Core Route Migration (Week 1-2)
**Objective**: Migrate high-priority core routes to Svelte 5
**Scope**: 45 core routes
**Deliverables**:
- Apply Rules A, B, C, D to all core routes
- Fix immediate compilation errors
- Establish migration patterns
- Reduce svelte-check errors by 60%

### Phase 2: Systematic Pattern Fixes (Week 3)
**Objective**: Apply automated fixes across entire codebase
**Scope**: All routes
**Deliverables**:
- Create codemod scripts for Rules A-D
- Batch apply fixes to archive routes
- Comprehensive error reduction
- Target: <5k svelte-check errors

### Phase 3: Archive Cleanup (Week 4)
**Objective**: Clean up remaining archive/test routes
**Scope**: 200+ archive routes
**Deliverables**:
- Apply Rules A-D to all archive routes
- Remove obsolete test routes
- Final error elimination
- Target: <1k svelte-check errors

## Implementation Strategy

### Automated Fixes
1. **Import-Type Fixer**: Script to convert transition imports
2. **Event Handler Migrator**: Batch replace `on:` with modern syntax
3. **Runes Converter**: Semi-automated conversion to runes
4. **Prop Modernizer**: Update component prop patterns

### Manual Reviews Required
1. **Complex Reactive Logic**: Custom migration for intricate reactive statements
2. **Custom Transitions**: Verify transition behavior after import fixes
3. **Component APIs**: Review prop interfaces for breaking changes
4. **Store Migrations**: Update to Svelte 5 store patterns if needed

## Success Metrics

### Error Reduction Targets
- **Phase 1 End**: <30k svelte-check errors (60% reduction)
- **Phase 2 End**: <5k svelte-check errors (90% reduction)
- **Phase 3 End**: <1k svelte-check errors (99% reduction)

### Route Coverage
- **Phase 1**: 100% core routes migrated
- **Phase 2**: 100% active routes migrated
- **Phase 3**: 100% codebase migrated

### Quality Gates
- All core routes compile successfully
- No runtime regressions in core functionality
- Maintain existing component APIs
- Preserve styling and animations

## Risk Mitigation

### Rollback Strategy
- Git branches for each migration phase
- Automated testing before/after each phase
- Quick rollback scripts for critical routes

### Testing Strategy
- Playwright tests for core route functionality
- Visual regression testing for UI components
- API integration tests for backend compatibility
- Performance benchmarks for runtime impact

## Dependencies & Prerequisites

### Tooling Requirements
- Node.js 18+
- Svelte 5.0+
- TypeScript 5.0+
- ESLint with Svelte plugin
- Prettier for code formatting

### Knowledge Requirements
- Svelte 5 runes API
- Migration patterns and gotchas
- Component composition patterns
- Reactive programming concepts

## Next Steps

1. **Immediate**: Create automated fixer scripts for Rules A-D
2. **Week 1**: Begin Phase 1 core route migration
3. **Ongoing**: Monitor error reduction progress
4. **Week 2**: Complete Phase 1, begin Phase 2 planning
5. **Week 3-4**: Execute Phase 2 and 3

## Appendix: Route Priority Matrix

| Priority | Route Pattern | Count | Rationale |
|----------|---------------|-------|-----------|
| Critical | `/`, `/auth/*`, `/yorha/*` | 15 | Core user experience |
| High | `/cases/*`, `/detective/*`, `/evidence*` | 20 | Primary business logic |
| Medium | `/search*`, `/legal-*`, `/system-*` | 10 | Supporting features |
| Low | `/archive/*`, `/dev/*`, `/demo/*`, `/test*` | 200+ | Development artifacts |

This migration plan provides a structured approach to upgrading the YoRHa Legal AI Platform to Svelte 5 while minimizing risk and maintaining functionality.</content>
<parameter name="filePath">SVELTE5_MIGRATION_SPEC.md