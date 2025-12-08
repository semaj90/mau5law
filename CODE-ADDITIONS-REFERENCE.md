# Code Additions - Request AI Patch Button

## Location
File: `src/routes/(app)/all-routes/+page.svelte`

---

## Addition #1: State Variables (Lines 61-65)

```typescript
// AI Patch Request State
let requestingPatch = false;
let lastPatchError: string | null = null;
let lastPatchId: string | null = null;
```

**Purpose:**
- `requestingPatch` - Tracks if API request is in progress (disables button while loading)
- `lastPatchError` - Stores error message if API request fails
- `lastPatchId` - Stores patch ID if API request succeeds

---

## Addition #2: requestAiPatch Function (Lines 67-100)

```typescript
async function requestAiPatch(route: CommandCenterRoute | null) {
	if (!route) return;
	requestingPatch = true;
	lastPatchError = null;

	try {
		const res = await fetch('/api/phase78/route-patch', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				route: {
					id: route.href,
					path: route.href,
					file: route.href,
					kind: route.kind,
					group: route.tab,
					label: route.label
				}
			})
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(text || `Request failed with status ${res.status}`);
		}

		const json = await res.json();
		lastPatchId = json.id ?? null;
		console.log('Phase78 patch suggestion generated:', json);
	} catch (err) {
		console.error('Request AI patch failed:', err);
		lastPatchError =
			err instanceof Error ? err.message : 'Unknown error requesting patch';
	} finally {
		requestingPatch = false;
	}
}
```

**Purpose:**
1. Validates that a route is selected
2. Sets loading state (disables button)
3. Clears previous error message
4. Makes POST request to `/api/phase78/route-patch` with route metadata
5. Extracts patch ID from successful response
6. Handles errors with user-friendly messages
7. Resets loading state when done

---

## Addition #3: Button + Feedback UI (Lines 655-679)

```svelte
<button
	type="button"
	class="btn-primary"
	onclick={() => requestAiPatch(selectedRoute)}
	disabled={requestingPatch || !selectedRoute}
>
	{#if requestingPatch}
		Requesting Patch…
	{:else}
		Request AI Patch (Phase 78)
	{/if}
</button>
{#if lastPatchError}
	<div class="patch-error">
		{lastPatchError}
	</div>
{:else if lastPatchId}
	<div class="patch-success">
		Patch {lastPatchId.slice(0, 8)} created.
	</div>
{/if}
```

**Purpose:**
- Primary button styled with `.btn-primary` class
- Calls `requestAiPatch(selectedRoute)` on click
- Disabled when loading or no route selected
- Shows "Requesting Patch…" while API call is in progress
- Shows red error message if request fails
- Shows green success message with 8-char patch ID if successful

**Placement:**
```
error-brain-actions div
├── Button: "Request AI Patch (Phase 78)" ← NEW
├── Div: Patch error/success message ← NEW
├── Button: "Apply Selected Suggestion" (existing)
└── Button: "Reset Brain" (existing)
```

---

## Addition #4: CSS Styling (Lines 1498-1545)

```css
.btn-ghost:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.patch-error {
	margin-top: 0.35rem;
	padding: 0.3rem 0.5rem;
	font-size: 0.7rem;
	color: #fecaca;
	background: rgba(220, 38, 38, 0.1);
	border: 1px solid rgba(220, 38, 38, 0.3);
	border-radius: 3px;
	word-break: break-word;
}

.patch-success {
	margin-top: 0.35rem;
	padding: 0.3rem 0.5rem;
	font-size: 0.7rem;
	color: #bbf7d0;
	background: rgba(34, 197, 94, 0.1);
	border: 1px solid rgba(34, 197, 94, 0.3);
	border-radius: 3px;
}

.btn-primary {
	padding: 0.35rem 0.75rem;
	border: 1px solid #10b981;
	background: rgba(16, 185, 129, 0.15);
	color: #a7f3d0;
	border-radius: 4px;
	cursor: pointer;
	font-size: 0.75rem;
	font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
	background: rgba(16, 185, 129, 0.25);
	border-color: #6ee7b7;
}

.btn-primary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-secondary {
	padding: 0.35rem 0.75rem;
	border: 1px solid #6366f1;
	background: transparent;
	color: #a5b4fc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 0.75rem;
}

.btn-secondary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
```

**Styles:**

| Class | Purpose | Color |
|-------|---------|-------|
| `.patch-error` | Error message box | Red (#fecaca) |
| `.patch-success` | Success message box | Green (#bbf7d0) |
| `.btn-primary` | Primary button (Request AI Patch) | Green (#a7f3d0) |
| `.btn-primary:hover` | Hover effect for primary button | Brighter green |
| `.btn-primary:disabled` | Disabled button state | Semi-transparent |
| `.btn-secondary` | Secondary button (Reset Brain) | Indigo (#a5b4fc) |

---

## Total Changes Summary

| Metric | Value |
|--------|-------|
| Total Lines Added | 65 |
| State Variables | 3 |
| Functions Added | 1 |
| HTML Elements | 2 |
| CSS Rules | 7 |
| API Calls | 1 (POST to /api/phase78/route-patch) |
| Breaking Changes | 0 |

---

## Integration Context

### Before (without Request AI Patch)
```
Error Brain Actions:
├── Apply Selected Suggestion
└── Reset Brain
```

### After (with Request AI Patch)
```
Error Brain Actions:
├── Request AI Patch (Phase 78) ← NEW
│   ├── Shows "Requesting Patch…" while loading
│   └── Shows success/error feedback below button
├── Apply Selected Suggestion
└── Reset Brain
```

---

## API Integration

**Endpoint Called:**
```
POST /api/phase78/route-patch
```

**Request Body:**
```json
{
  "route": {
    "id": "/route/path",
    "path": "/route/path",
    "file": "/route/path",
    "kind": "page",
    "group": "app",
    "label": "Route Label"
  }
}
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix TypeScript error",
  "patch": "// Patch content",
  "explanation": "Explanation of fix",
  "confidence": 0.95,
  "hints": ["Tip 1", "Tip 2"]
}
```

---

## Svelte 5 Compliance

✅ **New Event Handler Syntax:**
- Uses `onclick` (not `on:click`)
- Follows Svelte 5 strict mode

✅ **Reactive Patterns:**
- State variables reactive by default
- No $: syntax needed (Svelte 5 implicit reactivity)
- Proper async/await pattern

✅ **Conditional Rendering:**
- {#if} blocks work correctly
- State changes trigger re-renders

---

## Copy-Paste Ready Code Blocks

### Just the State Variables
```typescript
let requestingPatch = false;
let lastPatchError: string | null = null;
let lastPatchId: string | null = null;
```

### Just the Function
```typescript
async function requestAiPatch(route: CommandCenterRoute | null) {
	if (!route) return;
	requestingPatch = true;
	lastPatchError = null;

	try {
		const res = await fetch('/api/phase78/route-patch', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				route: {
					id: route.href,
					path: route.href,
					file: route.href,
					kind: route.kind,
					group: route.tab,
					label: route.label
				}
			})
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(text || `Request failed with status ${res.status}`);
		}

		const json = await res.json();
		lastPatchId = json.id ?? null;
		console.log('Phase78 patch suggestion generated:', json);
	} catch (err) {
		console.error('Request AI patch failed:', err);
		lastPatchError =
			err instanceof Error ? err.message : 'Unknown error requesting patch';
	} finally {
		requestingPatch = false;
	}
}
```

### Just the Button HTML
```svelte
<button
	type="button"
	class="btn-primary"
	onclick={() => requestAiPatch(selectedRoute)}
	disabled={requestingPatch || !selectedRoute}
>
	{#if requestingPatch}
		Requesting Patch…
	{:else}
		Request AI Patch (Phase 78)
	{/if}
</button>
{#if lastPatchError}
	<div class="patch-error">
		{lastPatchError}
	</div>
{:else if lastPatchId}
	<div class="patch-success">
		Patch {lastPatchId.slice(0, 8)} created.
	</div>
{/if}
```

---

## Verification Steps

1. **Check State Variables Exist**
   ```bash
   grep -n "requestingPatch\|lastPatchError\|lastPatchId" src/routes/\(app\)/all-routes/+page.svelte
   ```
   Expected: 3 let declarations + multiple references in function/template

2. **Check Function Exists**
   ```bash
   grep -n "async function requestAiPatch" src/routes/\(app\)/all-routes/+page.svelte
   ```
   Expected: 1 match

3. **Check Button HTML**
   ```bash
   grep -n "Request AI Patch" src/routes/\(app\)/all-routes/+page.svelte
   ```
   Expected: 1 match in button text

4. **Check CSS Rules**
   ```bash
   grep -n "\.patch-error\|\.patch-success\|\.btn-primary" src/routes/\(app\)/all-routes/+page.svelte
   ```
   Expected: Multiple matches in CSS section

