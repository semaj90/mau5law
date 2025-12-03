# Route Inspector Detective Board: Integration Guide

**Goal:** Wire the enhanced modal into `/all-routes` so you can click routes and see Phase 72 + Phase 82 status
**Time:** 15 minutes
**Result:** Fully functional command center for route diagnostics + upgrades

---

## Step 1: Update `/all-routes/+page.svelte`

Replace your existing `/all-routes/+page.svelte` with this:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import RouteInspectorDetectiveBoard from '$lib/components/RouteInspectorDetectiveBoard.svelte';

	type RouteHealth = 'green' | 'yellow' | 'red';

	type RouteDetail = {
		path: string;
		kind: 'page' | 'layout' | 'endpoint';
		file: string;
		summary: string;
		category?: string;
		version?: string;
		requiredPackages?: string[];
		relatedRoutes?: string[];
		health?: RouteHealth;
		errorCount?: number;
		lastErrorCode?: string | null;
		lastErrorMessage?: string | null;
	};

	let routes = $state<RouteDetail[]>([]);
	let selectedRoute = $state<RouteDetail | null>(null);
	let modalOpen = $state(false);
	let loading = $state(true);

	onMount(async () => {
		await loadRoutes();
	});

	async function loadRoutes() {
		loading = true;
		try {
			// Fetch all routes from your route discovery API
			const routesRes = await fetch('/api/all-routes');
			const routesData = await routesRes.json();

			// Fetch Phase 72 error data
			const errorsRes = await fetch('/api/phase72/errors');
			const errorsData = await errorsRes.json();

			// Combine route data with error data
			const routeMap = new Map<string, RouteDetail>();

			// Initialize routes from discovery
			for (const route of routesData.routes || []) {
				routeMap.set(route.path, {
					path: route.path,
					kind: route.kind || 'page',
					file: route.files?.page || route.files?.layout || route.files?.endpoint || 'unknown',
					summary: `${route.kind || 'Page'} route: ${route.path}`,
					category: inferCategory(route.path),
					version: 'v1',
					health: 'green',
					errorCount: 0,
					requiredPackages: inferPackages(route.path),
					relatedRoutes: inferRelatedRoutes(route.path)
				});
			}

			// Add error data
			for (const error of errorsData.errors || []) {
				const routePath = inferRouteFromError(error);

				if (!routeMap.has(routePath)) {
					routeMap.set(routePath, {
						path: routePath,
						kind: 'page',
						file: error.file_path,
						summary: `Route with errors: ${routePath}`,
						category: inferCategory(routePath),
						health: 'red',
						errorCount: 1,
						lastErrorCode: error.code,
						lastErrorMessage: error.message
					});
				} else {
					const route = routeMap.get(routePath)!;
					route.errorCount = (route.errorCount || 0) + 1;
					route.lastErrorCode = error.code;
					route.lastErrorMessage = error.message;

					// Update health based on error count
					if (route.errorCount >= 5) route.health = 'red';
					else if (route.errorCount >= 2) route.health = 'yellow';
					else route.health = 'green';
				}
			}

			routes = Array.from(routeMap.values()).sort((a, b) => a.path.localeCompare(b.path));
		} catch (err) {
			console.error('Failed to load routes:', err);
		} finally {
			loading = false;
		}
	}

	function openRoute(route: RouteDetail) {
		selectedRoute = route;
		modalOpen = true;
	}

	function inferCategory(path: string): string {
		if (path.includes('command')) return 'Commanif (path.includes('analysis')) return 'Analysis';
		if (path.includes('evidence')) return 'Evidence';
		if (path.includes('cases')) return 'Cases';
		if (path.includes('api')) return 'API';
		return 'General';
	}

	function inferPackages(path: string): string[] {
		const packages = ['@sveltejs/kit'];
		if (path.includes('analysis')) packages.push('ollama-js');
		if (path.includes('api')) packages.push('postgres');
		return packages;
	}

	function inferRelatedRoutes(path: string): string[] {
		const related: string[] = [];
		if (path.includes('command')) related.push('/analysis-center', '/evidence-board');
		if (path.includes('analysis')) related.push('/command-center', '/cases');
		if (path.includes('evidence')) related.push('/command-center', '/analysis-center');
		return related;
	}

	function inferRouteFromError(error: any): string {
		if (error.file_path?.includes('src/routes')) {
			return (
				error.file_path
					.replace(/.*src\/routes/, '')
					.replace(/\+page\.(svelte|ts|js)$/, '')
					.replace(/\+layout\.(svelte|ts|js)$/, '')
					.replace(/\+server\.(ts|js)$/, '') || '/'
			);
		}
		return '/';
	}
</script>

<main class="all-routes">
	<header class="all-routes-header">
		<div>
			<h1>/all-routes — Phase 72 + 82 Command Center</h1>
			<p>Route health dashboard with error brain + upgrade brain integration</p>
		</div>
		<button onclick={loadRoutes} class="refresh-btn">
			🔄 Refresh
		</button>
	</header>

	{#if loading}
		<div class="loading">Loading routes...</div>
	{:else}
		<div class="routes-grid">
			{#each routes as route (route.path)}
				<button
					class="route-card"
					class:status-green={route.health === 'green'}
					class:status-yellow={route.health === 'yellow'}
					class:status-red={route.health === 'red'}
					onclick={() => openRoute(route)}
				>
					<div class="route-header">
						<span class="route-path">{route.path}</span>
						<span class={`health-badge health-${route.health}`}>
							{route.health?.toUpperCase()}
						</span>
					</div>

					<div class="route-meta">
						<span class="category">{route.category}</span>
						{#if route.errorCount}
							<span class="error-count">
								{route.errorCount} error{route.errorCount === 1 ? '' : 's'}
							</span>
						{/if}
					</div>

					{#if route.lastErrorCode}
						<div class="last-error">
							<code>{route.lastErrorCode}</code>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</main>

<!-- Detective Board Modal -->
<RouteInspectorDetectiveBoard bind:open={modalOpen} route={selectedRoute} />

<style>
	.all-routes {
		background: var(--yorha-bg, #f5f1e8);
		color: var(--yorha-ink, #111);
		font-family: var(--yorha-font, 'Courier New', monospace);
		padding: 2rem;
		min-height: 100vh;
	}

	.all-routes-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 3px solid var(--yorha-crimson, #c41e3a);
	}

	.all-routes-header h1 {
		margin: 0;
		color: var(--yorha-crimson, #c41e3a);
		font-size: 2rem;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.all-routes-header p {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-size: 0.875rem;
	}

	.refresh-btn {
		padding: 0.75rem 1.5rem;
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
		border: 2px solid var(--yorha-ink, #111);
		border-radius: 0;
		cursor: pointer;
		font-family: var(--yorha-font, 'Courier New', monospace);
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		transition: all 0.2s ease;
	}

	.refresh-btn:hover {
		background: var(--yorha-crimson, #c41e3a);
		border-color: var(--yorha-crimson, #c41e3a);
	}

	.loading {
		text-align: center;
		padding: 2rem;
		background: var(--yorha-paper, #faf8f3);
		border: 2px solid var(--yorha-ink, #111);
		border-radius: 0;
		font-size: 1.1rem;
	}

	.routes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.route-card {
		padding: 1.25rem;
		background: var(--yorha-paper, #faf8f3);
		border: 2px solid var(--yorha-ink, #111);
		border-radius: 0;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
		font-family: var(--yorha-font, 'Courier New', monospace);
	}

	.route-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-color: var(--yorha-crimson, #c41e3a);
	}

	.route-card.status-green {
		border-left: 4px solid #1e8f3c;
	}

	.route-card.status-yellow {
		border-left: 4px solid #f6b73c;
	}

	.route-card.status-red {
		border-left: 4px solid var(--yorha-crimson, #c41e3a);
	}

	.route-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.route-path {
		font-weight: bold;
		font-size: 1.1rem;
		color: var(--yorha-ink, #111);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.health-badge {
		padding: 0.3rem 0.75rem;
		border-radius: 0;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: bold;
	}

	.health-green {
		background: #1e8f3c;
		color: white;
	}

	.health-yellow {
		background: #f6b73c;
		color: #111;
	}

	.health-red {
		background: var(--yorha-crimson, #c41e3a);
		color: white;
	}

	.route-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.category {
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: 0.75rem;
	}

	.error-count {
		color: var(--yorha-crimson, #c41e3a);
		font-weight: bold;
	}

	.last-error {
		margin-top: 0.5rem;
	}

	.last-error code {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
		padding: 0.3rem 0.6rem;
		border-radius: 0;
		font-size: 0.75rem;
		font-family: 'Courier New', monospace;
	}

	@media (max-width: 768px) {
		.all-routes-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.all-routes-header h1 {
			font-size: 1.5rem;
		}

		.routes-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
```

---

## Step 2: Verify the Components Exist

Make sure these files are in place:

```bash
# Check modal component
ls -la sveltekit-frontend/src/lib/components/RouteInspectorDetectiveBoard.svelte

# Check endpoints
ls -la sveltekit-frontend/src/routes/api/phase82/upgrade-route/+server.ts
ls -la sveltekit-frontend/src/routes/api/phase72/errors/+server.ts

# Check codemod script
ls -la sveltekit-frontend/scripts/phase82-svelte-runes-codemod.mjs
```

---

## Step 3: Test It

### Start the dev server
```bash
cd sveltekit-frontend
npm run dev:quic
```

### Visit /all-routes
```
http://127.0.0.1:5173/all-routes
```

### Click a route card
- Modal should open
- Shows route dossier (left) + diagnostics (right)
- Phase 72 status (error count, last error)
- Phase 82 status (upgrade progress)

### Click "Run Svelte 5 Codemod"
- Button shows "⏳ Running..."
- Watch dev terminal for codemod logs
- When done, shows "✅ Upgrade complete"

---

## Step 4: Wire MCP Tools (Optional)

If you want agents to use this, expose these tools in your MCP server:

```python
# Pseudo-code for your MCP server

@tool
def list_routes():
    """Get all routes in the app"""
    res = requests.get('http://127.0.0.1:5173/api/all-routes')
    return res.json()

@tool
def route_errors(route: str):
    """Get Phase 72 errors for a route"""
    res = requests.get(f'http://127.0.0.1:5173/api/phase72/errors?route={route}')
    return res.json()

@tool
def svelte5_upgrade(route: str):
    """Run Phase 82 codemod for a route"""
    res = requests.post(
        'http://127.0.0.1:5173/api/phase82/upgrade-route',
        json={'route': route}
    )
    return res.json()
```

---

## Troubleshooting

### Modal doesn't open
- Check browser console for errors
- Verify `RouteInspectorDetectiveBoard` is imported correctly
- Check that `modalOpen` and `selectedRoute` are reactive

### "Run Svelte 5 Codemod" button does nothing
- Check that `/api/phase82/upgrade-route` endpoint exists
- Check dev terminal for error logs
- Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`

### Codemod runs but no files change
- Check that ripgrep finds legacy patterns: `rg "export let" src/routes`
- Verify Ollama model is loaded: `ollama list | grep gemma3`
- Check `/api/phase82/svelte-upgrade` endpoint logs

---

## What's Next

1. **Add caching** — Hash-based skip to avoid re-running on same files
2. **Add diff viewer** — Show what changed in each file
3. **Add rollback** — Restore from `.bak` files if upgrade breaks things
4. **Add MCP tools** — Let agents autonomously upgrade routes
5. **Add Phase 83** — Embed upgraded code for semantic search

---

**Status:** Ready to integrate
**Time:** 15 minutes
**Result:** Fully functional command center for route diagnostics + Svelte 5 upgrades
