<script lang="ts">
  import type { User } from '$lib/types';
  import EvidenceBoardLayout from '$lib/components/layout/EvidenceBoardLayout.svelte';
  import EvidenceCard from '$lib/components/ui/EvidenceCard.svelte';

  // Svelte 5 runes
  let systemStatus = $state<Record<string, any>>({});
  let authStatus = $state<any>(null);

  type TestResult = {
    success?: boolean;
    error?: string;
    data?: unknown;
    status?: number;
    timestamp?: string | number | Date | undefined;
    endpoint?: string;
  };

  // typed testResults to avoid: unknown/indexing issues
  let testResults = $state<Record<string, TestResult>>({});
  let isRunning = $state<boolean>(false);

  // helper to safely format: unknown timestamps (prevents TS Date overload issues)
  function formatTimestamp(ts: unknown): string {
    try {
      if (!ts) return '';
      // Accept ISO: string, number, or Date
      const d = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts as string | number) : ts instanceof Date ? ts : new Date(String(ts));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  }

  type TestConfig = {
    name: string;
    endpoint: string;
    method?: 'GET' | 'POST';
    body?: unknown;
    description: string;
  };

  const tests: TestConfig[] = [
    {
      name: 'Authentication Debug',
      endpoint: '/api/auth/debug',
      description: 'Check authentication status and development flags'
    },
    {
      name: 'Development Auth Creation',
      endpoint: '/api/dev-auth?seed=true',
      description: 'Create development session with sample data'
    },
    {
      name: 'Enhanced RAG Health',
      endpoint: 'http://localhost:8094/health',
      description: 'Go microservice health check'
    },
    {
      name: 'Upload Service Health',
      endpoint: 'http://localhost:8093/health',
      description: 'File upload service health'
    },
    {
      name: 'Ollama Health',
      endpoint: 'http://localhost:11434/api/version',
      description: 'Ollama local LLM service health'
    },
    {
      name: 'Qdrant Health',
      endpoint: 'http://localhost:6333/health',
      description: 'Qdrant vector database health'
    },
    {
      name: 'Redis Health',
      endpoint: 'http://localhost:6379/ping',
      description: 'Redis cache health'
    },
    {
      name: 'PostgreSQL Health',
      endpoint: '/api/db/health',
      description: 'PostgreSQL database health'
    },
    {
      name: 'MinIO Health',
      endpoint: 'http://localhost:9000/minio/health/live',
      description: 'MinIO object storage health'
    },
    {
      name: 'RabbitMQ Health',
      endpoint: 'http://localhost:15672/api/overview',
      description: 'RabbitMQ message queue health (management UI)'
    }
  ];

  async function runTest(test: TestConfig) {
    testResults = { ...testResults, [test.name]: { status: 0, timestamp: new Date(), success: false, error: 'Running...' } };
    try {
      const response = await fetch(test.endpoint, {
        method: test.method || 'GET',
        body: test.body ? JSON.stringify(test.body) : undefined,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      testResults = { ...testResults, [test.name]: { ...testResults[test.name], status: response.status, success: response.ok, data, error: response.ok ? undefined : data.detail || JSON.stringify(data) } };
    } catch (error: any) {
      testResults = { ...testResults, [test.name]: { ...testResults[test.name], success: false, error: error.message } };
    }
  }

  async function runAllTests() {
    isRunning = true;
    for (const test of tests) {
      await runTest(test);
    }
    isRunning = false;
  }

  // Initial run on mount
  // onMount(() => {
  //   runAllTests();
  // });

  // Placeholder for system status fetching
  async function fetchSystemStatus() {
    // This would typically fetch from a backend API
    systemStatus = {
      cpuUsage: '25%',
      memoryUsage: '40%',
      diskUsage: '60%',
      networkTraffic: '10Mbps'
    };
  }

  // fetchSystemStatus();
</script>

<EvidenceBoardLayout>
  <div class="system-status-dashboard p-6 space-y-6">
    <h1 class="text-3xl font-bold text-white flex items-center">
      <span class="mr-3">📊</span> System Status & Health Checks
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <EvidenceCard title="CPU Usage" value={systemStatus.cpuUsage || 'N/A'} />
      <EvidenceCard title="Memory Usage" value={systemStatus.memoryUsage || 'N/A'} />
      <EvidenceCard title="Disk Usage" value={systemStatus.diskUsage || 'N/A'} />
      <EvidenceCard title="Network Traffic" value={systemStatus.networkTraffic || 'N/A'} />
    </div>

    <div class="health-checks-panel bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
      <h2 class="text-2xl font-semibold text-white mb-4">Service Health Checks</h2>
      <button onclick={runAllTests} disabled={isRunning} class="btn btn-primary mb-4">
        {isRunning ? 'Running Tests...' : 'Run All Health Checks'}
      </button>

      <div class="space-y-3">
        {#each tests as test (test.name)}
          <div class="flex items-center justify-between p-3 bg-gray-700 rounded-md">
            <div class="flex items-center">
              <span
                class="w-3 h-3 rounded-full mr-3"
                class:bg-green-500={testResults[test.name]?.success}
                class:bg-red-500={testResults[test.name]?.success === false}
                class:bg-yellow-500={!testResults[test.name]?.status && testResults[test.name]?.error === 'Running...'}
                class:bg-gray-500={!testResults[test.name]?.status && testResults[test.name]?.error !== 'Running...'}
              ></span>
              <div>
                <p class="font-medium text-white">{test.name}</p>
                <p class="text-sm text-gray-400">{test.description}</p>
              </div>
            </div>
            <div class="text-right">
              {#if testResults[test.name]?.error}
                <p class="text-red-400 text-sm">Error: {testResults[test.name]?.error}</p>
              {:else if testResults[test.name]?.status}
                <p class="text-green-400 text-sm">Status: {testResults[test.name]?.status}</p>
              {:else}
                <p class="text-gray-400 text-sm">Not run</p>
              {/if}
              <p class="text-xs text-gray-500">
                {formatTimestamp(testResults[test.name]?.timestamp)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</EvidenceBoardLayout>

<style lang="postcss">
  /* Add any specific styles for this page here */
</style>


