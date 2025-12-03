# Route Inspector Modal: Usage Guide

**Component:** `RouteInspectorModal.svelte`
**Status:** Ready to use
**Features:** Svelte 5 runes, YoRHa theme, Phase 72 integration

---

## What It Does

Enhanced modal for inspecting routes with:
- Clear hierarchy (kind chip → title → summary)
- Phase 72 health status (green/yellow/red)
- File location + metadata
- Dependencies + related routes
- Last error from Phase 72
- Action buttons: Visit, View AST, Run Health Check

---

## Basic Usage

### 1. Import the component
```svelte
<script lang="ts">
  import RouteInspectorModal from '$lib/components/RouteInspectorModal.svelte';
</script>
```

### 2. Define route data
```svelte
<script lang="ts">
  type RouteDetail = {
    path: string;
    kind: 'page' | 'layout' | 'endpoint';
    file: string;
    summary: string;
    category?: string;
    version?: string;
    requiredPackages?: string[];
    relatedRoutes?: string[];
    health?: 'green' | 'yellow' | 'red';
    errorCount?: number;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
  };

  let selectedRoute = $state<RouteDetail | null>(null);
  let modalOpen = $state(false);
</script>
```

### 3. Use the modal
```svelte
<RouteInspectorModal
  bind:open={modalOpen}
  route={selectedRoute}
/>
```

### 4. Trigger it
```svelte
<button onclick={() => {
  selectedRoute = {
    path: '/analysis-center',
    kind: 'page',
    file: 'src/routes/analysis-center/+page.svelte',
    summary: 'Legal case analysis interface with pattern recognition',
    category: 'Detective',
    version: 'v2.1',
    health: 'green',
    errorCount: 0,
    requiredPackages: ['@sveltejs/kit', 'ollama-js'],
    relatedRoutes: ['/evidence-board', '/command-center']
  };
  modalOpen = true;
}}>
  Open Route Inspector
</button>
```

---

## Integration with /all-routes

### Fetch route data from Phase 72
```svelte
<script lang="ts">
  import RouteInspectorModal from '$lib/components/RouteInspectorModal.svelte';

  let routes = $state<RouteDetail[]>([]);
  let selectedRoute = $state<RouteDetail | null>(null);
  let modalOpen = $state(false);

  onMount(async () => {
    try {
      const res = await fetch('/api/phase72/errors');
      if (res.ok) {
        const data = await res.json();

        // Transform phase72_error rows into RouteDetail
        const routeMap = new Map<string, RouteDetail>();

        for (const error of data.errors || []) {
          const route = error.route || '/';
          if (!routeMap.has(route)) {
            routeMap.set(route, {
              path: route,
              kind: 'page',
              file: error.file_path,
              summary: `Route: ${route}`,
              health: 'green',
              errorCount: 0
            });
          }

          const r = routeMap.get(route)!;
          r.errorCount = (r.errorCount || 0) + 1;
          r.lastErrorCode = error.code;
          r.lastErrorMessage = error.message;

          // Determine health
          if (r.errorCount >= 5) r.health = 'red';
          else if (r.errorCount >= 2) r.health = 'yellow';
        }

        routes = Array.from(routeMap.values());
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  });

  function openRoute(route: RouteDetail) {
    selectedRoute = route;
    modalOpen = true;
  }
</script>

<!-- Route cards -->
{#each routes as route (route.path)}
  <button onclick={() => openRoute(route)} class="route-card">
    <span class="route-path">{route.path}</span>
    <span class={`health-badge health-${route.health}`}>
      {route.health}
    </span>
  </button>
{/each}

<!-- Modal -->
<RouteInspectorModal
  bind:open={modalOpen}
  route={selectedRoute}
/>
```

---

## Customization

### Change theme colors
The modal uses CSS variables from `src/app.css`:

```css
:root {
  --yorha-bg: #d4c9a9;
  --yorha-bg-dark: #2a2016;
  --yorha-paper: #f8f0d9;
  --yorha-ink: #0f0f0f;
  --yorha-crimson: #a51c30;
  --yorha-font: 'JetBrains Mono', monospace;
}
```

Override in your component's `<style>` block:

```svelte
<style>
  :global(.route-modal) {
    --yorha-crimson: #ff6b35; /* custom accent */
  }
</style>
```

### Add custom actions
Extend the footer with more buttons:

```svelte
<!-- In the modal footer -->
<button class="yorha-btn secondary" onclick={customAction}>
  🔧 Custom Action
</button>
```

---

## API Integration

### Health Check Endpoint
The modal calls `/api/phase72/check-route` when "Run Health Check" is clicked:

```typescript
// POST /api/phase72/check-route
{
  "route": "/analysis-center"
}
```

Implement this endpoint to:
- Run Playwright checks
- Validate route accessibility
- Update Phase 72 status
- Return results

### Example implementation
```typescript
export const POST: RequestHandler = async ({ request }) => {
  const { route } = await request.json();

  // Run health check (Playwright, etc.)
  const result = await runHealthCheck(route);

  // Update Phase 72
  await captureResult(route, result);

  return json({ success: true, result });
};
```

---

## Styling

### YoRHa Theme Integration
The modal automatically uses your global YoRHa theme:

- **Background:** `var(--yorha-paper)` (light beige)
- **Accent:** `var(--yorha-crimson)` (Harvard crimson)
- **Text:** `var(--yorha-ink)` (dark ink)
- **Font:** `var(--yorha-font)` (JetBrains Mono)

### Health Status Colors
- **Green:** `#1e8f3c` (healthy)
- **Yellow:** `#f6b73c` (warnings)
- **Red:** `var(--yorha-crimson)` (broken)

---

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Controls modal visibility |
| `route` | `RouteDetail` | Yes | Route data to display |

---

## Events

The modal emits no events directly, but you can listen for state changes:

```svelte
<RouteInspectorModal
  bind:open={modalOpen}
  route={selectedRoute}
/>

<!-- modalOpen will update when user closes modal -->
```

---

## Example: Full /all-routes Integration

```svelte
<script lang="ts">
  import RouteInspectorModal from '$lib/components/RouteInspectorModal.svelte';
  import { onMount } from 'svelte';

  type RouteDetail = {
    path: string;
    kind: 'page' | 'layout' | 'endpoint';
    file: string;
    summary: string;
    health?: 'green' | 'yellow' | 'red';
    errorCount?: number;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
  };

  let routes = $state<RouteDetail[]>([]);
  let selectedRoute = $state<RouteDetail | null>(null);
  let modalOpen = $state(false);

  onMount(async () => {
    const res = await fetch('/api/phase72/errors');
    if (res.ok) {
      const data = await res.json();
      const routeMap = new Map<string, RouteDetail>();

      for (const error of data.errors || []) {
        const route = error.route || '/';
        if (!routeMap.has(route)) {
          routeMap.set(route, {
            path: route,
            kind: 'page',
            file: error.file_path,
            summary: `Route: ${route}`,
            health: 'green',
            errorCount: 0
          });
        }

        const r = routeMap.get(route)!;
        r.errorCount = (r.errorCount || 0) + 1;
        r.lastErrorCode = error.code;
        r.lastErrorMessage = error.message;

        if (r.errorCount >= 5) r.health = 'red';
        else if (r.errorCount >= 2) r.health = 'yellow';
      }

      routes = Array.from(routeMap.values());
    }
  });

  function openRoute(route: RouteDetail) {
    selectedRoute = route;
    modalOpen = true;
  }
</script>

<main class="all-routes">
  <h1>/all-routes — Phase 72 Health</h1>

  <div class="routes-grid">
    {#each routes as route (route.path)}
      <button
        class="route-card"
        class:status-green={route.health === 'green'}
        class:status-yellow={route.health === 'yellow'}
        class:status-red={route.health === 'red'}
        onclick={() => openRoute(route)}
      >
        <div class="route-path">{route.path}</div>
        <div class="route-meta">
          <span class={`health-badge health-${route.health}`}>
            {route.health}
          </span>
          {#if route.errorCount}
            <span class="error-count">{route.errorCount}</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</main>

<RouteInspectorModal
  bind:open={modalOpen}
  route={selectedRoute}
/>

<style>
  .all-routes {
    background: var(--yorha-bg);
    padding: 2rem;
    min-height: 100vh;
  }

  h1 {
    color: var(--yorha-crimson);
    margin-bottom: 2rem;
  }

  .routes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .route-card {
    padding: 1rem;
    background: var(--yorha-paper);
    border: 2px solid var(--yorha-ink);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .route-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .route-path {
    font-weight: bold;
    display: block;
    margin-bottom: 0.5rem;
  }

  .route-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .health-badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    text-transform: uppercase;
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
    background: var(--yorha-crimson);
    color: white;
  }

  .error-count {
    font-size: 12px;
    color: var(--yorha-muted);
  }
</style>
```

---

## Status

✅ Component ready to use
✅ Svelte 5 runes
✅ YoRHa theme integrated
✅ Phase 72 health display
✅ Action buttons wired

---

**Next:** Wire this to your /all-routes page and Phase 72 API
