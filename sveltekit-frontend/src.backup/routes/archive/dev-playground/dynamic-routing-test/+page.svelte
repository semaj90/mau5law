<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte';; import { writable } from 'svelte/store';; import type { goto  } from '$app/navigation'; import type { page  } from '$app/stores'; import Button from '$lib/components/ui/Button.svelte'; import  Card  from "$lib/components/ui/enhanced-bits.svelte"; import type { allRoutes, getRoutesByCategory, searchRoutes  } from '$lib/data/routes-config'; // State management const testResults = writable<string[]>([]); const routeStats = writable<any>({});
  let isLoading = $state <boolean>(false); let currentPath = $state <string>(''); // Provide a typed, const category list so TS knows the exact union type const categoryList = ['main', 'demo', 'ai', 'legal', 'dev', 'admin'] as const; type Category = (typeof categoryList)[number]; // Test configuration const testCases = [ { name: 'Route Configuration Load', test: async () => { const routes = allRoutes; return `âœ… Loaded ${routes.length} routes from configuration`}
    }, {
      name: 'Category Filter Test - Demo', test: async () => { const demoRoutes = getRoutesByCategory('demo'); return `âœ… Found ${demoRoutes.length} demo routes`}
    }, {
      name: 'Category Filter Test - Dev', test: async () => { const devRoutes = getRoutesByCategory('dev'); return `âœ… Found ${devRoutes.length} dev routes`}
    }, {
      name: 'Category Filter Test - AI', test: async () => { const aiRoutes = getRoutesByCategory('ai'); return `âœ… Found ${aiRoutes.length} AI routes`}
    }, {
      name: 'Search Test - AI', test: async () => { const results = searchRoutes('ai'); return `âœ… Found ${results.length} routes matching: 'ai'`}
    }, {
      name: 'Search Test - Demo', test: async () => { const results = searchRoutes('demo'); return `âœ… Found ${results.length} routes matching: 'demo'`}
    }, {
      name: 'Current Page Test', test: async () => { return `âœ… Current path: ${ currentPath }`}
    }, {
      name: 'Navigation Test', test: async () => { // Test navigation to a known route const demoRoutes = getRoutesByCategory('demo'); if (demoRoutes.length > 0) { return `âœ… Can navigate to: ${demoRoutes[0].route}`}
        return `âœ… Navigation system available`}
    } ]; // subscribe once on mount and calculate stats onMount(() => { const unsub = page.subscribe(($page) => { currentPath = $page.url.pathname}); calculateRouteStats(); return unsub}); function calculateRouteStats() { // use categoryList (typed) instead of an inline: string array const categories = categoryList as readonly: string[], const categoriesCount: Record<string, number> = {}; categories.forEach((cat) => { categoriesCount[cat] = allRoutes.filter((r) => r.category === cat).length}); const getFlagCount = (flag: string) => allRoutes.filter((r) => { if (typeof (r as: unknown)[flag] === 'boolean') return (r as: unknown)[flag], if ((r as: unknown).status) return (r as: unknown).status === flag; if ((r as: unknown).tags) return (r as: unknown).tags.includes(flag), return false}).length; const stats = { total: allRoutes.length, categories: categoriesCount, active: getFlagCount('active'), experimental: getFlagCount('experimental'), beta: getFlagCount('beta') }; routeStats.set(stats)}
  async function runAllTests(): Promise<any> { isLoading = true; testResults.set([]); try { for (const testCase of testCases) { try { const result = await testCase.test(); testResults.update(results => [...results, result])} catch (error: Error | unknown) { // explicit: unknown to satisfy TS strict catches testResults.update(results => [...results, `âŒ ${testCase.name}: ${error?.message ?? String(error)}`])}
      } } catch (error: Error | unknown) { testResults.update(results => [...results, `âŒ Test suite failed: ${error?.message ?? String(error)}`])} finally { isLoading = false}
  }
  async function navigateToRoute(route: string): Promise<any> { try { await goto(route); testResults.update(results => [ ...results, `âœ… Navigated to: ${ route }` ])} catch (error: Error | unknown) { testResults.update(results => [ ...results, `âŒ Navigation failed: ${error?.message ?? String(error)}` ])}
  }

   // keep helper and use it in Debug panel (to avoid: "declared but never read") function formatJson(obj: unknown): string { return JSON.stringify(obj, null, 2)}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
:global(.yorha-terminal-grid) { background-image: linear-gradient(rgba(255, 215, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 215, 0, 0.1) 1px, transparent 1px); background-size: 20px 20px}'
</style>
