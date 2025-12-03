```typescript
/**
 * Example Integration: Add to /all-routes +page.svelte
 *
 * This shows how to wire Phase 72 Error Brain into your NES command center
 */

// 1. Add to <script lang="ts">
import Phase72ErrorBrain from '$lib/components/Phase72ErrorBrain.svelte';

let showPhase72 = false;
let selectedRoutePath: string | null = null;

function openPhase72ForRoute(routePath: string) {
	selectedRoutePath = routePath;
	showPhase72 = true;
}

function openPhase72Global() {
	selectedRoutePath = null;
	showPhase72 = true;
}

// 2. Add to each route card in your routes grid
// Example for existing route card:
```

```svelte
<!-- Example: Add "Known Issues" button to each route card -->
<div class="route-card nes-container">
	<h3>{route.path}</h3>
	<p>{route.description}</p>

	<!-- Existing buttons -->
	<button class="nes-btn is-primary" on:click={() => navigateTo(route.path)}>
		Open
	</button>

	<!-- NEW: Phase 72 Button -->
	<button
		class="nes-btn is-warning"
		on:click={() => openPhase72ForRoute(route.path)}
		title="View known TypeScript/build errors for this route"
	>
		🧠 Known Issues
	</button>
</div>
```

```svelte
<!-- 3. Add global "Error Brain" button to command center header -->
<div class="command-center-header">
	<h1 class="nes-text is-primary">📡 NES Command Center</h1>

	<div class="global-actions">
		<!-- Existing buttons... -->

		<!-- NEW: Global Phase 72 Button -->
		<button
			class="nes-btn is-error"
			on:click={openPhase72Global}
		>
			🧠 Error Brain (All Routes)
		</button>
	</div>
</div>
```

```svelte
<!-- 4. Add Phase 72 Modal at bottom of template -->
{#if showPhase72}
	<Phase72ErrorBrain
		routePath={selectedRoutePath}
		onClose={() => showPhase72 = false}
	/>
{/if}
```

```typescript
/**
 * Bonus: Real-time error polling
 * Add this to automatically refresh errors every 30 seconds
 */

import { onMount } from 'svelte';

let errorCounts = new Map<string, number>();

async function pollErrorCounts() {
	try {
		const response = await fetch('/api/phase72/errors?limit=1000');
		const data = await response.json();

		if (data.success) {
			// Group errors by route path
			const counts = new Map<string, number>();
			data.errors.forEach((error: any) => {
				const routeMatch = error.file_path.match(/src\/routes\/(.*?)\/\+page/);
				if (routeMatch) {
					const route = '/' + routeMatch[1].replace(/\\/g, '/');
					counts.set(route, (counts.get(route) || 0) + error.occurrence_count);
				}
			});
			errorCounts = counts;
		}
	} catch (err) {
		console.error('Failed to poll error counts:', err);
	}
}

onMount(() => {
	pollErrorCounts();
	const interval = setInterval(pollErrorCounts, 30000); // Poll every 30s
	return () => clearInterval(interval);
});
```

```svelte
<!-- 5. Show error count badge on route cards -->
<div class="route-card nes-container">
	<div class="route-header">
		<h3>{route.path}</h3>
		{#if errorCounts.has(route.path)}
			<span class="error-badge nes-badge is-error">
				{errorCounts.get(route.path)} errors
			</span>
		{/if}
	</div>
	<!-- Rest of card... -->
</div>
```

```css
/* 6. Add NES-styled error badge */
.error-badge {
	font-size: 0.7rem;
	padding: 4px 8px;
	background: #e74856;
	color: #fff;
	border-radius: 4px;
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.6; }
}
```
