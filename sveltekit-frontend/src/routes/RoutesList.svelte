<script lang="ts">
  // Auto-discover routes using Vite's import.meta.glob
  // @ts-ignore - Vite-specific API
  const pageModules = import.meta.glob('/src/routes/**/+page.(svelte|ts)', { eager: true }) as Record<string, any>;

  const routesMap = Object.keys(pageModules).map((filePath) => {
    let routePath = filePath.replace(/^\/src\/routes/, '').replace(/\/\+page\.(svelte|ts)$/, '');
    if (routePath === '') routePath = '/';
    const pathForLink = routePath.replace(/\[([^\]]+)\]/g, ':$1');

    const mod = pageModules[filePath];
    const label =
      mod?.routeMeta?.title ||
      mod?.metadata?.title ||
      mod?.title ||
      (() => {
        if (pathForLink === '/') return 'Home';
        const segs = pathForLink.split('/').filter(Boolean);
        const last = segs[segs.length - 1].replace(/[:\[\]]/g, '').replace(/-/g, ' ');
        return last
          .split(' ')
          .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
          .join(' ');
      })();

    return { path: pathForLink, label };
  }).reduce<Record<string, { path: string; label: string }>>((acc, r) => {
    acc[r.path] = acc[r.path] || r;
    return acc;
  }, {});

  const autoRoutes = Object.values(routesMap).sort((a, b) => a.path.localeCompare(b.path));

  interface Route { path: string; label: string }
  interface Props {
    routes?: Route[];
  }

  // Convert to Svelte 5 runes pattern
  let { routes = autoRoutes.length ? autoRoutes : [
    { path: "/", label: "Home" },
    { path: "/ai", label: "AI" },
    { path: "/ai-assistant", label: "AI Assistant" },
    { path: "/text-editor", label: "Text Editor" },
    // Static fallback routes
  ] }: Props = $props();
</script>

<div class="routes-list">
  <h2>All Routes</h2>
  <ul>
    {#each routes as route}
      <li><a href={route.path} data-sveltekit-prefetch>{route.label}</a></li>
    {/each}
  </ul>
</div>


<style>
  /* @unocss-include */
  .routes-list {
    margin: 2rem auto;
    max-width: 600px;
    background: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    padding: 2rem;
  }
  .routes-list h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  .routes-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
    columns: 2;
  }
  .routes-list li {
    margin-bottom: 0.5rem;
  }
  .routes-list a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s;
  }
  .routes-list a:hover {
    color: #dc2626;
  }
</style>
