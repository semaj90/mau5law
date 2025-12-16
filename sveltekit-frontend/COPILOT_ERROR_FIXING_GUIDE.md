# Copilot Error Fixing Guide: Svelte 5 + Bits-UI v2

## Overview
This document provides comprehensive patterns and solutions for fixing common Svelte 5 + Bits-UI v2 errors in the Legal AI Platform. Use this as a reference when iterating on error fixes with Copilot.

---

## Error Categories & Solutions

### 1. Event Handler Deprecation (Svelte 5)

**Problem:** Svelte 5 replaces `on:*` directives with `on*` event handlers.

**Affected Syntax:**
- `on:click` → `onclick`
- `on:change` → `onchange`
- `on:submit` → `onsubmit`
- `on:blur` → `onblur`
- `on:focus` → `onfocus`
- `on:input` → `oninput`

**Search Pattern (Find deprecated):**
```regex
\bon:(click|change|submit|blur|focus|input)\b
```

**Example Fix:**
```svelte
<!-- BEFORE (Svelte 4) -->
<button on:click={() => handleClick()}>
  Click me
</button>

<!-- AFTER (Svelte 5) -->
<button onclick={() => handleClick()}>
  Click me
</button>
```

**Event Object Access:**
```svelte
<!-- BEFORE -->
<input on:change={(e) => handleChange(e)} />

<!-- AFTER -->
<input onchange={(e) => handleChange(e)} />
```

---

### 2. Accessibility: Interactive Elements Must Be Buttons

**Problem:** Non-button elements (`<div>`, `<span>`) with click handlers need proper accessibility roles.

**Errors Raised:**
- "`<div>` with a click handler must have an ARIA role"
- "Visible, non-interactive elements with a click event must be accompanied by a keyboard event handler"

**Solution:**
```svelte
<!-- BEFORE (Fails a11y checks) -->
<div onclick={() => openModal()}>
  Open Modal
</div>

<!-- AFTER (Proper button element) -->
<button
  type="button"
  onclick={() => openModal()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  }}
  aria-label="Open modal"
>
  Open Modal
</button>
```

**Keyboard Handler Pattern:**
```svelte
<button
  type="button"
  onclick={handleAction}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }}
>
  Action
</button>
```

---

### 3. Dialog Component API (Bits-UI v2)

**Problem:** Bits-UI v2 Dialog changed from compound components to snippet-based API.

**Old API (Bits-UI v1):**
```svelte
<Dialog bind:open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

**New API (Bits-UI v2 + Custom Implementation):**
```svelte
<Dialog bind:open={isOpen}>
  <div slot="content" class="max-w-4xl">
    <div class="border-b pb-4 mb-4">
      <h2 class="text-xl font-semibold">Title</h2>
      <p class="text-sm text-gray-600">Description</p>
    </div>
    <!-- Content here -->
  </div>
</Dialog>
```

**Key Changes:**
1. Replace `DialogContent`, `DialogHeader`, `DialogTitle` components with manual markup
2. Use `slot="content"` to pass content to Dialog
3. Dialog component handles `bind:open` for state management
4. Use CSS for styling headers/footers instead of wrapper components

**Implementation Reference:**
See `src/lib/components/ui/dialog/Dialog.svelte` for the custom Dialog implementation.

---

### 4. Field Component Props (Snippet-Based)

**Problem:** Field component in Svelte 5 uses snippet-based API, not children slots.

**Old Pattern (Doesn't work):**
```svelte
<Field label="Name" required>
  <Input bind:value={name} placeholder="Enter name" />
</Field>
```

**New Pattern (Svelte 5 Snippets):**
```svelte
<Field
  label="Name"
  required
  control={({ id }) => <Input {id} bind:value={name} placeholder="Enter name" />}
/>
```

**Field Component Signature:**
```typescript
interface FieldProps {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  control: Snippet<{ id: string }>;  // Snippet function
}
```

**Complex Example:**
```svelte
<Field
  label="Status"
  control={({ id }) => (
    <Select {id} bind:value={selectedStatus}>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </Select>
  )}
/>
```

---

### 5. Select Component with Options

**Key Points:**
- Select doesn't wrap option elements via slots
- Use standard HTML `<option>` elements
- bind:value works as expected
- Use `{id}` from control snippet in Select

**Pattern:**
```svelte
<Field
  label="Priority"
  control={({ id }) => (
    <Select {id} bind:value={formData.priority}>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </Select>
  )}
/>
```

---

### 6. Import Corrections for Components

**Problem:** Importing Dialog and sub-components from barrel export doesn't work with new API.

**Old Pattern (Fails):**
```svelte
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
```

**New Pattern (Works):**
```svelte
import Dialog from '$lib/components/ui/dialog/Dialog.svelte';
import DialogContent from '$lib/components/ui/dialog/DialogContent.svelte';
// etc. - import individual files
```

**Preferred Pattern:**
```svelte
import Dialog from '$lib/components/ui/dialog/Dialog.svelte';
// Use Dialog only, handle headers/footers with manual markup
```

**Icon Import Corrections:**
```svelte
// Use specific icon names
import Filter from 'lucide-svelte/icons/filter';  // Not 'Funnel'
import Edit from 'lucide-svelte/icons/edit';
import Trash from 'lucide-svelte/icons/trash';
import Plus from 'lucide-svelte/icons/plus';
import Grid from 'lucide-svelte/icons/grid';
import List from 'lucide-svelte/icons/list';
```

---

### 7. Form Structure in Dialogs

**Problem:** Dialog content needs proper semantic HTML for forms.

**Pattern:**
```svelte
<Dialog bind:open={showCreateDialog}>
  <div slot="content" class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <!-- Header Section -->
    <div class="border-b pb-4 mb-4">
      <h2 class="text-xl font-semibold">Create New Item</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Fill in the details.
      </p>
    </div>

    <!-- Form -->
    <form onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }} class="space-y-4">
      <!-- Form fields here -->

      <!-- Footer -->
      <div class="flex gap-2 justify-end border-t pt-4">
        <button
          type="button"
          onclick={() => showCreateDialog = false}
          class="px-4 py-2 bg-gray-300 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          class="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {#if isSubmitting}Creating...{:else}Create{/if}
        </button>
      </div>
    </form>
  </div>
</Dialog>
```

---

### 8. Event Propagation (stopPropagation)

**Pattern for stopping event bubbling:**
```svelte
<!-- BEFORE -->
<div onclick={(e) => e.stopPropagation()}>
  <!-- Nested buttons -->
</div>

<!-- AFTER - Still works, but use on button level -->
<button
  onclick={(e) => {
    e.stopPropagation();
    handleClick();
  }}
>
  Click me
</button>
```

---

### 9. Textarea in Forms

**Proper Pattern:**
```svelte
<Field
  label="Notes"
  control={({ id }) => (
    <textarea
      {id}
      bind:value={formData.notes}
      placeholder="Enter notes..."
      rows="3"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    ></textarea>
  )}
/>
```

---

### 10. Component Imports from Barrels

**Reference File:** `src/lib/components/ui/index.ts`

**Correct Imports:**
```svelte
// Individual components
import Button from '$lib/components/ui/button/Button.svelte';
import Card from '$lib/components/ui/Card.svelte';
import Field from '$lib/components/ui/Field.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Select from '$lib/components/ui/Select.svelte';
import Dialog from '$lib/components/ui/dialog/Dialog.svelte';

// From barrel (works for many components)
import { Button, Card, Field, Input, Select } from '$lib/components/ui';

// Icons
import Edit from 'lucide-svelte/icons/edit';
import Filter from 'lucide-svelte/icons/filter';
```

---

## Error Fixing Checklist

When encountering errors, follow this order:

- [ ] **Event Handlers**: Replace `on:*` with `on*` in all interactive elements
- [ ] **A11y Violations**: Convert interactive `<div>` to `<button type="button">`
- [ ] **Dialog Usage**: Update Dialog API from compound to slot-based
- [ ] **Field Props**: Convert Field children to snippet-based `control` prop
- [ ] **Icon Imports**: Verify icon names match lucide-svelte
- [ ] **Form Structure**: Ensure `<form onsubmit>` and proper submit button types
- [ ] **Type Checking**: Run `npm run check` to verify TypeScript errors resolved

---

## Common Search & Replace Patterns

Use these regex patterns in VS Code Find & Replace:

### Replace on:click with onclick
```
Find:  on:click={([^}]+)}
Replace: onclick={$1}
```

### Replace on:change with onchange
```
Find:  on:change={([^}]+)}
Replace: onchange={$1}
```

### Replace on:submit with onsubmit
```
Find:  on:submit={([^}]+)}
Replace: onsubmit={$1}
```

### Find all event handler instances
```
Find:  on:(click|change|submit|blur|focus|input)
Replace: on$1  (then manually update)
```

---

## Testing & Validation

After making fixes:

1. **TypeScript Check:**
   ```bash
   npm run check
   ```

2. **Svelte Check:**
   ```bash
   npx svelte-check --tsconfig tsconfig.check.json
   ```

3. **Local Dev Server:**
   ```bash
   npm run dev
   ```

4. **Integration Tests:**
   ```bash
   npm run test:integration:poi-manager
   ```

---

## Related Files

- `src/lib/components/ui/Field.svelte` - Field component implementation (snippet-based)
- `src/lib/components/ui/dialog/Dialog.svelte` - Dialog component implementation
- `src/lib/components/ui/index.ts` - Component barrel exports
- `src/routes/poi-manager/+page.svelte` - Complete POI Manager example with all patterns

---

## Key Takeaways

1. **Svelte 5 Event Handlers**: All `on:*` directives become `on*` attributes
2. **Snippets Over Slots**: Field uses snippet-based `control` prop, not slot children
3. **Dialog API**: Use `slot="content"` instead of compound components
4. **A11y First**: Always use `<button>` for clickable elements
5. **Keyboard Support**: Add `onkeydown` for Enter/Space keyboard access on interactive elements
6. **Component Imports**: Import from specific files, not always from barrel exports

---

## Examples by Component Type

### Form Fields
```svelte
<Field
  label="Email"
  hint="Optional hint text"
  error={errors.email}
  required
  control={({ id }) => (
    <Input
      {id}
      type="email"
      bind:value={email}
      placeholder="user@example.com"
    />
  )}
/>
```

### Select Dropdowns
```svelte
<Field
  label="Category"
  control={({ id }) => (
    <Select {id} bind:value={selectedCategory}>
      <option value="">Select category...</option>
      <option value="urgent">Urgent</option>
      <option value="normal">Normal</option>
      <option value="low">Low</option>
    </Select>
  )}
/>
```

### Textarea Fields
```svelte
<Field
  label="Description"
  hint="Minimum 10 characters"
  control={({ id }) => (
    <textarea
      {id}
      bind:value={description}
      placeholder="Enter description..."
      rows="4"
      class="w-full px-3 py-2 border rounded"
    ></textarea>
  )}
/>
```

### Interactive Buttons
```svelte
<button
  type="button"
  onclick={() => openModal()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  }}
  aria-label="Open settings modal"
  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  Open Settings
</button>
```

---

## Version Information

- **Svelte**: 5.x (runes mode enabled)
- **Bits-UI**: v2.0.0+
- **Framework**: SvelteKit 2.x
- **Node**: 18.x+

---

**Last Updated**: December 15, 2025
**Status**: Complete for Svelte 5 + Bits-UI v2 migration

## Phase13 Integration Pattern (LLM briefing)
- Detect services with lightweight probes: Ollama via `getOllamaEndpoint`, Enhanced RAG via `/health`, Qdrant via `healthz/readyz/collections`, Redis via env/ping, DB via env presence, Docker flag. Health results are cached briefly to avoid hammering.
- Prefer production paths: Enhanced RAG first, else Ollama (`gemma3-legal:latest`), Redis caching if present, vector DB priority Qdrant > pgvector > memory, DB priority prod URL > memory.
- Performance hints: SSR on, code splitting, UnoCSS, caching layer set to Redis when available.
- Exposed singleton/helpers and health endpoint at `/api/system/phase13` returning status + recommendations.
- How to apply app-wide (no infra mutations): reuse this pattern for other health endpoints; only read existing envs (`ENHANCED_RAG_URL`, `DATABASE_URL`+`PGVECTOR_ENABLED/ENABLE_PGVECTOR`, `REDIS_URL`/`UPSTASH_REDIS_REST_URL`, `QDRANT_URL`, `OLLAMA_URL`/`OLLAMA_BASE_URL`, optional Docker flags). Mirror `/api/system/phase13` shape for other modules (e.g., `/api/system/vector`, `/api/system/ai`). Consume via `initializePhase13()` or the health endpoint; do not exec/build containers—read health URLs from env.
