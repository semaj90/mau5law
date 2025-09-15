<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import EvidenceBoardLayout from '$lib/components/layout/EvidenceBoardLayout.svelte';
  import EvidenceCard from '$lib/components/ui/EvidenceCard.svelte';

  // Svelte 5 runes
  let systemStatus = $state<Record<string, any>('')>({});
  let authStatus = $state<any>(null);
  let testResults = $state<Record<string, any>('')>({});
  let isRunning = $state(false);

  const tests = [
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
      name: 'Ollama API',
      endpoint: 'http://localhost:11434/api/tags',
      description: 'AI model availability'
    },
    {
      name: 'SSE Chat API',
      endpoint: '/api/ai/chat-sse',
      method: 'POST',
      body: { message: 'Test SSE streaming', model: 'gemma3-legal:latest' },
      description: 'Server-Sent Events streaming test'
    }
  ];

  async function runTest(test: unknown) {
    try {
      const options: RequestInit = {
        method: test.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(test.endpoint, options);
      let data;

      try {
        data = await (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).json();
      } catch {
        data = await (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).text();
      }

      testResults[test.name] = {
        success: (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).ok,
        status: (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).status,
        data: data,
        endpoint: test.endpoint,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      testResults[test.name] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: test.endpoint,
        timestamp: new Date().toISOString()
      };
    }

    // Trigger reactivity
    testResults = { ...testResults };
  }

  async function runAllTests() {
    isRunning = true;
    testResults = {};

    for (const test of tests) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    isRunning = false;
  }

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/debug');
      authStatus = await (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).json();
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  }

  async function createDevSession() {
    try {
      const response = await fetch('/api/dev-auth?seed=true');
      const result = await (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).json();

      if ((result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).success) {
        await checkAuthStatus();
      }

      return result;
    } catch (error) {
      console.error('Dev session creation failed:', error);
    }
  }

  async function clearSession() {
    try {
      const response = await fetch('/api/dev-auth', { method: 'POST' });
      const result = await (response as { json?: unknown; text?: unknown; ok?: unknown; status?: unknown }).json();

      if ((result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).success) {
        await checkAuthStatus();
      }

      return result;
    } catch (error) {
      console.error('Session clear failed:', error);
    }
  }

  onMount(() => {
    checkAuthStatus();
    runAllTests();
  });
</script>

<EvidenceBoardLayout
  title="SYSTEM STATUS MONITOR"
  caseInfo="DEVELOPMENT ENVIRONMENT HEALTH CHECK"
  demoMode={true}
  {rightPanel}
>
  {#snippet rightPanel()}
    <!-- Authentication Status Panel -->
    <div class="nes-container is-rounded evidence-panel mb-4">
      <h3 class="nes-text is-primary mb-3">🔐 Authentication Status</h3>
      {#if authStatus}
        <div class="space-y-2">
          <EvidenceCard
            title="Auth Status"
            description={authStatus.hasUser ? "Authenticated" : "Not Authenticated"}
            status={authStatus.hasUser ? "active" : "pending"}
            type="auth"
            connections={1}
          />
          {#if authStatus.user}
            <div class="text-xs text-gray-600 p-2 nes-container is-rounded bg-blue-50">
              User ID: {authStatus.user.id.substring(0, 8)}...
            </div>
          {/if}
        </div>
      {:else}
        <p class="nes-text text-xs">Loading authentication status...</p>
      {/if}
    </div>

    <!-- Quick Actions Panel -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-warning mb-3">🚀 Quick Actions</h3>
      <div class="space-y-2">
        <button
          class="nes-btn is-primary w-full text-xs"
          onclick={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Running...' : '🔄 Run All Tests'}
        </button>
        <button
          class="nes-btn is-success w-full text-xs"
          onclick={createDevSession}
        >
          🔑 Create Dev Session
        </button>
        <button
          class="nes-btn is-normal w-full text-xs"
          onclick={checkAuthStatus}
        >
          👤 Check Auth Status
        </button>
        <button
          class="nes-btn is-error w-full text-xs"
          onclick={clearSession}
        >
          🚪 Clear Session
        </button>
      </div>
    </div>
  {/snippet}

  <!-- Main System Tests Content -->
  <main class="space-y-6">
    <!-- System Tests Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {#each tests as test}
        {@const result = testResults[test.name]}
        <EvidenceCard
          title={test.name}
          description={test.description}
          status={result?.success ? "active" : result ? "pending" : "pending"}
          type="system"
          connections={result?.status || 0}
        >
          {#snippet children()}
            <div class="nes-container is-rounded bg-gray-50 p-3">
              <div class="text-xs mb-2">
                <strong class="nes-text is-primary">{test.method || 'GET'}</strong> {test.endpoint}
              </div>

              {#if result}
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="nes-text">Status:</span>
                    <span class="nes-text {(result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).success ? 'is-success' : 'is-error'}">
                      {result?.success ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>

                  {#if (result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).error}
                    <div class="nes-container is-rounded bg-red-50 p-2">
                      <p class="text-xs text-red-700">Error: {(result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).error}</p>
                    </div>
                  {/if}

                  {#if (result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).data && (result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).success && typeof (result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).data === 'object'}
                    <div class="nes-container is-rounded bg-green-50 p-2">
                      <p class="text-xs text-green-700">✅ Response received</p>
                    </div>
                  {/if}

                  <p class="text-xs text-gray-500">
                    {new Date((result as { success?: unknown; error?: unknown; data?: unknown; timestamp?: unknown }).timestamp).toLocaleString()}
                  </p>
                </div>
              {:else}
                <p class="nes-text text-xs">⏳ Waiting for test...</p>
              {/if}
            </div>
          {/snippet}
        </EvidenceCard>
      {/each}
    </div>

    <!-- Available Endpoints Grid -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-success mb-4">🌐 Available Endpoints & Demos</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <EvidenceCard
          title="🎨 Frontend Demos"
          description="Interactive web interface demos"
          status="active"
          type="frontend"
          connections={4}
        >
          {#snippet children()}
            <div class="space-y-1 text-xs">
              <a href="/dev-demo" class="nes-text is-primary block">• Development Demo</a>
              <a href="/ai-assistant" class="nes-text is-primary block">• AI Assistant (SSE)</a>
              <a href="/test-ai-assistant" class="nes-text is-primary block">• Integration Tests</a>
              <a href="/system-status" class="nes-text is-primary block">• System Status</a>
            </div>
          {/snippet}
        </EvidenceCard>

        <EvidenceCard
          title="🔗 API Endpoints"
          description="REST API service endpoints"
          status="active"
          type="api"
          connections={4}
        >
          {#snippet children()}
            <div class="space-y-1 text-xs">
              <code class="nes-text is-success block">/api/auth/debug</code>
              <code class="nes-text is-success block">/api/dev-auth</code>
              <code class="nes-text is-success block">/api/cases</code>
              <code class="nes-text is-success block">/api/ai/chat-sse</code>
            </div>
          {/snippet}
        </EvidenceCard>

        <EvidenceCard
          title="⚡ Go Services"
          description="Microservice backend ports"
          status="active"
          type="service"
          connections={4}
        >
          {#snippet children()}
            <div class="space-y-1 text-xs">
              <code class="nes-text is-warning block">:8094 Enhanced RAG</code>
              <code class="nes-text is-warning block">:8093 Upload Service</code>
              <code class="nes-text is-warning block">:11434 Ollama API</code>
              <code class="nes-text is-warning block">:5432 PostgreSQL</code>
            </div>
          {/snippet}
        </EvidenceCard>
      </div>

      <!-- Current Status Summary -->
      <div class="nes-container is-rounded bg-yellow-50 p-4">
        <h4 class="nes-text is-warning mb-3">🎯 Current Status Summary</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-xs">
            <span class="nes-text font-bold">Development Server:</span>
            <p class="text-yellow-700">http://localhost:5176</p>
          </div>
          <div class="text-xs">
            <span class="nes-text font-bold">Authentication:</span>
            <p class="text-yellow-700">DEV_BYPASS_AUTH enabled</p>
          </div>
          <div class="text-xs">
            <span class="nes-text font-bold">Database:</span>
            <p class="text-yellow-700">35 tables ready</p>
          </div>
          <div class="text-xs">
            <span class="nes-text font-bold">AI Models:</span>
            <p class="text-yellow-700">gemma3-legal + nomic-embed</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</EvidenceBoardLayout>
