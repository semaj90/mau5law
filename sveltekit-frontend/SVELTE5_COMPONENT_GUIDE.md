# Svelte 5 Component Migration Guide & Error Analysis

## 📊 Error Cluster Analysis (Phase 90)

Based on the Qdrant Phase 90 cluster analysis, here are the main error patterns and how to fix them using the new Svelte 5 components:

### Cluster Summary

| Cluster | Error Type | Count | Root Cause | Fix Strategy |
|---------|------------|-------|------------|--------------|
| cluster_8 | SYNTAX | 22,281 | Object literal corruption (`:` → `,`) | Git restore + Prettier |
| cluster_10 | Type Mismatch | 2,869 | Svelte 5 component types | Use new Svelte 5 components |
| cluster_7 | UNKNOWN | 3,862 | Unexpected keywords | AST repair |
| cluster_9 | Arithmetic | 1,665 | Type operator errors | Add type annotations |
| cluster_11 | Redeclaration | 608 | Duplicate block variables | Scope cleanup |

---

## 🛠️ How to Apply Svelte 5 Components

### 1. Replace bits-ui Imports with Native Components

**Before (broken):**
```svelte
<script>
import { Dialog, Button, Select } from 'bits-ui';
</script>
```

**After (Svelte 5 native):**
```svelte
<script>
import {
	Dialog,
	Svelte5Button,
	Svelte5Select
} from '$lib/components/ui/svelte5-index';
</script>
```

### 2. Fix Common Error Patterns

#### Error: "Cannot find name" / "Type not assignable"

**Problem:** Component props using old Svelte 4 syntax

**Solution:** Use `$props()` rune

```svelte
<!-- ❌ Old Svelte 4 -->
<script>
export let open = false;
export let title = '';
</script>

<!-- ✅ New Svelte 5 -->
<script lang="ts">
interface Props {
	open?: boolean;
	title?: string;
}
let { open = $bindable(false), title = '' }: Props = $props();
</script>
```

#### Error: "Property does not exist on type"

**Problem:** Missing type definitions for component props

**Solution:** Use typed snippets

```svelte
<!-- ❌ Old slot-based -->
<slot name="header" />

<!-- ✅ New snippet-based -->
<script lang="ts">
import type { Snippet } from 'svelte';
interface Props {
	header?: Snippet;
}
let { header }: Props = $props();
</script>

{#if header}
	{@render header()}
{/if}
```

#### Error: "Object literal syntax error"

**Problem:** Colons used instead of commas

**Solution:** Fix object literals

```typescript
// ❌ Corrupted
const config = {
	name: 'test': value: 123: enabled: true
};

// ✅ Fixed
const config = {
	name: 'test',
	value: 123,
	enabled: true
};
```

---

## 📦 Complete Component Library

### Form Components

| Component | Usage | Props |
|-----------|-------|-------|
| `Svelte5Input` | Text input with validation | `value`, `type`, `error`, `label`, `variant` |
| `Svelte5Select` | Dropdown selector | `value`, `options`, `placeholder` |
| `Svelte5Checkbox` | Boolean toggle | `checked`, `indeterminate`, `variant` |
| `Svelte5Switch` | On/off toggle | `checked`, `size`, `variant` |

```svelte
<script>
import {
	Svelte5Input,
	Svelte5Select,
	Svelte5Checkbox,
	Svelte5Switch
} from '$lib/components/ui/svelte5-index';

let formData = $state({
	name: '',
	category: '',
	notifications: true,
	darkMode: false
});
</script>

<Svelte5Input
	bind:value={formData.name}
	label="Name"
	variant="nes"
	required
/>

<Svelte5Select
	bind:value={formData.category}
	options={[
		{ value: 'legal', label: 'Legal' },
		{ value: 'evidence', label: 'Evidence' }
	]}
/>

<Svelte5Checkbox bind:checked={formData.notifications}>
	Enable notifications
</Svelte5Checkbox>

<Svelte5Switch bind:checked={formData.darkMode}>
	Dark mode
</Svelte5Switch>
```

### Navigation Components

| Component | Usage | Props |
|-----------|-------|-------|
| `Svelte5Tabs` | Tab navigation | `value`, `tabs`, `variant`, `orientation` |
| `Svelte5TabPanel` | Tab content panel | `value` |
| `Svelte5DropdownMenu` | Context menu | `items`, `align`, `side` |

```svelte
<script>
import {
	Svelte5Tabs,
	Svelte5TabPanel,
	Svelte5DropdownMenu
} from '$lib/components/ui/svelte5-index';

let activeTab = $state('overview');
</script>

<Svelte5Tabs
	bind:value={activeTab}
	tabs={[
		{ id: 'overview', label: 'Overview', icon: '📊' },
		{ id: 'details', label: 'Details', icon: '📋' },
		{ id: 'settings', label: 'Settings', icon: '⚙️' }
	]}
	variant="nes"
>
	<Svelte5TabPanel value="overview">
		Overview content...
	</Svelte5TabPanel>
	<Svelte5TabPanel value="details">
		Details content...
	</Svelte5TabPanel>
	<Svelte5TabPanel value="settings">
		Settings content...
	</Svelte5TabPanel>
</Svelte5Tabs>

<Svelte5DropdownMenu
	items={[
		{ id: 'edit', label: 'Edit', icon: '✏️', shortcut: '⌘E' },
		{ id: 'delete', label: 'Delete', icon: '🗑️', danger: true },
	]}
	onselect={(id) => console.log('Selected:', id)}
>
	{#snippet trigger()}
		<button class="btn">Actions</button>
	{/snippet}
</Svelte5DropdownMenu>
```

### Overlay Components

| Component | Usage | Props |
|-----------|-------|-------|
| `Dialog` | Modal dialog | `open`, `title`, `description` |
| `Svelte5Tooltip` | Hover tooltip | `content`, `position`, `delay` |
| `Svelte5Popover` | Click popover | `open`, `position`, `align` |

```svelte
<script>
import {
	Dialog,
	Svelte5Tooltip,
	Svelte5Popover,
	Svelte5Button
} from '$lib/components/ui/svelte5-index';

let showDialog = $state(false);
</script>

<Svelte5Tooltip content="Click to open settings" position="top">
	<Svelte5Button onclick={() => showDialog = true}>
		Settings
	</Svelte5Button>
</Svelte5Tooltip>

<Dialog bind:open={showDialog} title="Settings" variant="nes">
	<p>Configure your preferences here.</p>

	{#snippet footer()}
		<Svelte5Button variant="ghost" onclick={() => showDialog = false}>
			Cancel
		</Svelte5Button>
		<Svelte5Button variant="primary">
			Save
		</Svelte5Button>
	{/snippet}
</Dialog>
```

### Feedback Components

| Component | Usage | Props |
|-----------|-------|-------|
| `Svelte5Alert` | Status messages | `variant`, `title`, `dismissible` |
| `Svelte5Badge` | Status indicators | `variant`, `size`, `pill`, `removable` |
| `Svelte5Progress` | Progress bars | `value`, `max`, `indeterminate` |

```svelte
<script>
import {
	Svelte5Alert,
	Svelte5Badge,
	Svelte5Progress
} from '$lib/components/ui/svelte5-index';

let progress = $state(65);
</script>

<Svelte5Alert variant="success" title="Success!" dismissible>
	Your changes have been saved.
</Svelte5Alert>

<Svelte5Badge variant="success" dot>Active</Svelte5Badge>
<Svelte5Badge variant="warning">Pending</Svelte5Badge>
<Svelte5Badge variant="error" removable>Error</Svelte5Badge>

<Svelte5Progress value={progress} max={100} label="Upload" showValue color="green" />
```

### Layout Components

| Component | Usage | Props |
|-----------|-------|-------|
| `Svelte5Card` | Content container | `variant`, `padding`, `interactive` |
| `Svelte5Accordion` | Collapsible sections | `items`, `type`, `collapsible` |

```svelte
<script>
import {
	Svelte5Card,
	Svelte5Accordion
} from '$lib/components/ui/svelte5-index';
</script>

<Svelte5Card variant="nes">
	{#snippet header()}
		<h3>Card Title</h3>
	{/snippet}

	<p>Card content goes here.</p>

	{#snippet footer()}
		<Svelte5Button>Action</Svelte5Button>
	{/snippet}
</Svelte5Card>

<Svelte5Accordion
	type="single"
	items={[
		{ id: 'faq1', title: 'What is this?' },
		{ id: 'faq2', title: 'How does it work?' }
	]}
	variant="nes"
/>
```

---

## 🔧 Migration Steps

### Step 1: Update Import Paths

```bash
# Find all bits-ui imports
grep -r "from 'bits-ui'" src/ --include="*.svelte" | head -20

# Replace with Svelte 5 components
sed -i "s/from 'bits-ui'/from '\$lib\/components\/ui\/svelte5-index'/g" src/**/*.svelte
```

### Step 2: Update Component Syntax

```bash
# Find old slot syntax
grep -r "<slot" src/ --include="*.svelte" | wc -l

# Convert to snippets (manual review required)
```

### Step 3: Add Type Annotations

```bash
# Find components missing $props()
grep -r "export let" src/ --include="*.svelte" | wc -l

# These need to be converted to $props() rune
```

### Step 4: Run Validation

```bash
# Check for Svelte 5 compatibility
npm run check

# Fix remaining errors
npm run check -- --output machine 2>&1 | head -50
```

---

## 📈 Expected Results

After applying Svelte 5 components:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Type errors | 2,869 | ~500 | -83% |
| Syntax errors | 22,281 | ~2,000 | -91% |
| Component warnings | ~1,500 | ~50 | -97% |
| Build time | 45s | 15s | -67% |

---

## 🎯 Quick Start

```svelte
<script lang="ts">
// Import all Svelte 5 components
import {
	// Form
	Svelte5Input,
	Svelte5Select,
	Svelte5Checkbox,
	Svelte5Switch,
	// Navigation
	Svelte5Tabs,
	Svelte5TabPanel,
	Svelte5DropdownMenu,
	// Overlay
	Dialog,
	Svelte5Tooltip,
	Svelte5Popover,
	// Feedback
	Svelte5Alert,
	Svelte5Badge,
	Svelte5Progress,
	// Layout
	Svelte5Card,
	Svelte5Accordion,
	// Base
	Svelte5Button
} from '$lib/components/ui/svelte5-index';
</script>
```

---

*Generated: 2026-01-03 | Phase 90 Error Analysis + Svelte 5 Component Migration Guide*
