<script lang="ts">
  import { onMount } from 'svelte';
  import { ButtonBits, InputBits, CardBits, TabsBits } from '$lib/components/ui/bits-ui';
  import BitsUIIntegrationTester from '$lib/testing/bits-ui-integration-test';
  import { CheckCircle, AlertCircle, Clock, Search } from 'lucide-svelte';

  let testResults = $state([]);
  let testRunning = $state(false);
  let activeTab = $state('demo');
  let searchQuery = $state('');
  let testReport = $state('');

  onMount(async () => {
    // Run integration tests automatically
    await runTests();
  });

  async function runTests() {
    testRunning = true;
    try {
      const tester = new BitsUIIntegrationTester();
      testResults = await tester.runAllTests();
      testReport = tester.generateReport();
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      testRunning = false;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pass': return CheckCircle;
      case 'fail': return AlertCircle;
      case 'warning': return Clock;
      default: return CheckCircle;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pass': return 'text-green-400';
      case 'fail': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }
</script>

<svelte:head>
  <title>Bits-UI Integration Test</title>
</svelte:head>

<div class="min-h-screen bg-nier-bg-primary text-nier-text-primary p-6">
  <div class="max-w-6xl mx-auto">

    <!-- Header -->
    <CardBits variant="elevated" padding="lg" class="mb-6 bg-nier-bg-secondary border border-nier-border-primary">
      <h1 class="text-3xl font-bold text-nier-accent-warm mb-4 flex items-center gap-3">
        <CheckCircle class="w-8 h-8" />
        Bits-UI Integration Test Suite
      </h1>
      <p class="text-nier-text-secondary">
        Comprehensive testing of bits-ui components integration with legal AI platform theme and functionality.
      </p>

      <div class="mt-4 flex gap-3">
        <ButtonBits onclick={runTests} disabled={testRunning} variant="primary" loading={testRunning}>
          {#if testRunning}
            Running Tests...
          {:else}
            <CheckCircle class="w-4 h-4 mr-2" />
            Run Tests
          {/if}
        </ButtonBits>

        <ButtonBits onclick={() => window.location.href = '/test-rag'} variant="outline">
          <Search class="w-4 h-4 mr-2" />
          View RAG Testing
        </ButtonBits>
      </div>
    </CardBits>

    <!-- Test Interface with TabsBits -->
    <TabsBits.Root bind:value={activeTab} class="bits-test-tabs">
      <TabsBits.List class="mb-6">
        <TabsBits.Trigger value="demo" class="flex items-center gap-2">
          <CheckCircle class="w-4 h-4" />
          Component Demo
        </TabsBits.Trigger>
        <TabsBits.Trigger value="results" class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          Test Results
        </TabsBits.Trigger>
        <TabsBits.Trigger value="report" class="flex items-center gap-2">
          <Clock class="w-4 h-4" />
          Full Report
        </TabsBits.Trigger>
      </TabsBits.List>

      <!-- Component Demo Tab -->
      <TabsBits.Content value="demo">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Input Components Test -->
          <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
            <h3 class="text-xl font-semibold mb-4 text-nier-accent-warm">Input Components</h3>

            <div class="space-y-4">
              <InputBits
                bind:value={searchQuery}
                placeholder="Test input with search icon..."
                label="Search Test"
                variant="outlined"
                inputSize="lg"
                class="legal-ai-search-input"
              >
                {#snippet leftIcon()}
                  <Search class="w-4 h-4" />
                {/snippet}
              </InputBits>

              <div class="flex gap-3">
                <ButtonBits variant="primary" size="md">
                  Primary Button
                </ButtonBits>
                <ButtonBits variant="secondary" size="md">
                  Secondary Button
                </ButtonBits>
                <ButtonBits variant="outline" size="md">
                  Outline Button
                </ButtonBits>
              </div>
            </div>
          </CardBits>

          <!-- Card Variants Test -->
          <CardBits variant="outlined" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
            <h3 class="text-xl font-semibold mb-4 text-nier-accent-warm">Card Variants</h3>

            <div class="space-y-3">
              <CardBits variant="default" padding="md" class="bg-nier-bg-tertiary">
                <p class="text-sm">Default Card</p>
              </CardBits>

              <CardBits variant="elevated" padding="md" class="bg-nier-bg-tertiary">
                <p class="text-sm">Elevated Card</p>
              </CardBits>

              <CardBits variant="outlined" padding="md" class="bg-nier-bg-tertiary border border-nier-accent-warm">
                <p class="text-sm">Outlined Card</p>
              </CardBits>
            </div>
          </CardBits>

          <!-- Theme Integration Test -->
          <CardBits variant="filled" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary lg:col-span-2">
            <h3 class="text-xl font-semibold mb-4 text-nier-accent-warm">Theme Integration Test</h3>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-2 rounded" style="background: var(--legal-ai-primary)"></div>
                <p class="text-xs">Primary</p>
              </div>
              <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-2 rounded" style="background: var(--nier-accent-warm)"></div>
                <p class="text-xs">Accent</p>
              </div>
              <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-2 rounded border border-nier-border-primary" style="background: var(--nier-bg-secondary)"></div>
                <p class="text-xs">Secondary BG</p>
              </div>
              <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-2 rounded border border-nier-border-primary" style="background: var(--nier-bg-tertiary)"></div>
                <p class="text-xs">Tertiary BG</p>
              </div>
            </div>
          </CardBits>
        </div>
      </TabsBits.Content>

      <!-- Test Results Tab -->
      <TabsBits.Content value="results">
        <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
          <h3 class="text-xl font-semibold mb-4 text-nier-accent-warm">Integration Test Results</h3>

          {#if testRunning}
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-nier-accent-warm"></div>
              <span class="ml-3">Running tests...</span>
            </div>
          {:else if testResults.length > 0}
            <div class="space-y-3">
              {#each testResults as result}
                {@const StatusIcon = getStatusIcon(result.status)}
                <CardBits variant="outlined" padding="sm" class="test-result-item">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <StatusIcon class="w-5 h-5 {getStatusColor(result.status)}" />
                      <div>
                        <div class="font-medium text-sm">{result.component}</div>
                        <div class="text-xs text-nier-text-muted">{result.message}</div>
                      </div>
                    </div>
                    <div class="text-xs text-nier-text-muted">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </CardBits>
              {/each}
            </div>

            <!-- Summary -->
            <div class="mt-6 grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-400">
                  {testResults.filter(item => item.length)}
                </div>
                <div class="text-sm text-nier-text-muted">Passed</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-yellow-400">
                  {testResults.filter(item => item.length)}
                </div>
                <div class="text-sm text-nier-text-muted">Warnings</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-red-400">
                  {testResults.filter(item => item.length)}
                </div>
                <div class="text-sm text-nier-text-muted">Failed</div>
              </div>
            </div>
          {:else}
            <div class="text-center py-8 text-nier-text-muted">
              <AlertCircle class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No test results yet. Click "Run Tests" to start.</p>
            </div>
          {/if}
        </CardBits>
      </TabsBits.Content>

      <!-- Full Report Tab -->
      <TabsBits.Content value="report">
        <CardBits variant="elevated" padding="lg" class="bg-nier-bg-secondary border border-nier-border-primary">
          <h3 class="text-xl font-semibold mb-4 text-nier-accent-warm">Full Test Report</h3>

          {#if testReport}
            <pre class="bg-nier-bg-primary border border-nier-border-muted rounded p-4 text-sm overflow-x-auto font-mono">
              {testReport}
            </pre>
          {:else}
            <div class="text-center py-8 text-nier-text-muted">
              <Clock class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Test report will appear here after running tests.</p>
            </div>
          {/if}
        </CardBits>
      </TabsBits.Content>
    </TabsBits.Root>
  </div>
</div>

<style>
  /* Enhanced bits-ui styling for test page */
  :global(.bits-test-tabs [data-bits-tabs-trigger]) {
    transition: all 0.2s ease;
  }

  :global(.bits-test-tabs [data-bits-tabs-trigger]:hover) {
    transform: translateY(-1px);
  }

  :global(.test-result-item) {
    transition: all 0.2s ease;
  }

  :global(.test-result-item:hover) {
    transform: translateX(4px);
    border-color: var(--nier-accent-warm);
  }
</style>