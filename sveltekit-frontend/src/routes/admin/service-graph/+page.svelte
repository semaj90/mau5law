<script lang="ts">
import type { onMount  } from 'svelte';

  interface Service {
    id: string
    label: string
    type: string
    port: number
    description: string
    capabilities: string[],
    protocol: string | string[];
    dependsOn: string[],
    health?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number
    uptime?: number}

  interface ServiceGraph {
    nodes: Service[],
    edges: Array<{ source: string, target: string }>}

  let graph: ServiceGraph | null = null
  let selectedService: Service | null = null
  let filterType: string = 'all';
  let searchQuery: string = '';
  let showDependencies: boolean = true
  let showHealth: boolean = true
  let autoRefresh: boolean = false
  const serviceTypeColors: Record<string, string> = {
    frontend: 'bg-red-500',
    core: 'bg-teal-500',
    gpu: 'bg-blue-500',
    cache: 'bg-yellow-500',
    orchestration: 'bg-purple-500',
    ai: 'bg-cyan-500',
    vector: 'bg-green-500',
    infrastructure: 'bg-indigo-500',
    data: 'bg-purple-300',
    observability: 'bg-blue-300',
    security: 'bg-pink-500',
    database: 'bg-blue-600',
    storage: 'bg-yellow-600',
    queue: 'bg-orange-600'
  };

  const healthColors: Record<string, string> = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    unhealthy: 'text-red-500',
    unknown: 'text-gray-500'
  };

  onMount(() => {
		(async () => {

    await loadGraph();
    if (autoRefresh) {
      setInterval(loadGraph, 5000)}
  		})();
	});
  async function loadGraph(): Promise<any> {
    try {
      const response = await fetch('/api/admin/service-graph');
      const data = await response.json();
      graph = data} catch (error) {
      console.error('Failed to load service graph:', error)}
  }
  function getFilteredServices() {
    if (!graph) return [];
    return graph.nodes.filter(service => {
      const typeMatch = filterType === 'all' || service.type === filterType
      const searchMatch =
        !searchQuery ||
        service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch})}
  function getDependentServices(serviceId: string): Service[] {
    if (!graph) return [];
    const dependentIds = graph.edges
      .filter(e => e.target === serviceId)
      .map(e => e.source);
    return graph.nodes.filter(n => dependentIds.includes(n.id))}
  function selectService(service: Service) {
    selectedService = service}
  async function checkServiceHealth(serviceId: string): Promise<any> {
    try {
      const response = await fetch(`/api/admin/service-health?service=${serviceId}`);
      const health = await response.json();
      if (graph) {
        const service = graph.nodes.find(s => s.id === serviceId);
        if (service) {
          service.health = health.status
          service.responseTime = health.responseTime
          service.uptime = health.uptime
          graph = graph; // Trigger reactivity
        }
      }
    } catch (error) {
      console.error(`Failed to check health for ${serviceId}:`, error)}
  }
  function exportAsJSON() {
    if (!graph) return
    const json = JSON.stringify(graph, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url
    a.download = `service-graph-${new Date().toISOString().split('T')[0]}.json`;
    a.click()}
  function exportAsCSV() {
    if (!graph) return
    const csv = [
      ['Service', 'Type', 'Port', 'Dependencies', 'Health', 'Response Time (ms)'].join(','),
      ...graph.nodes.map(n => [
        n.id,
        n.type n.port || 'N/A',
        n.dependsOn.join(';'),
        n.health || 'unknown',
        n.responseTime || 'N/A'
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url
    a.download = `service-graph-${new Date().toISOString().split('T')[0]}.csv`;
    a.click()}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  :global(body) {
    background-color: #111827;
  }
</style>
