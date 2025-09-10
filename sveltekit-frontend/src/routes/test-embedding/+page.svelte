<script lang="ts">
  import AiAssistant from '$lib/components/ai/AiAssistant.svelte';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;

  let evidenceText = $state(`This is a test contract regarding intellectual property rights and licensing agreements.
The contract includes provisions for patent licensing, trademark usage, and trade secret protection.
Key terms include exclusive licensing rights, royalty payments of 5% of net sales, and territorial restrictions.
The agreement is valid for 5 years with automatic renewal options.`);

  let caseId = $state('test-case-123');
  let contextItems = $state([
    { id: '1', title: 'Contract A', content: 'IP licensing agreement' },
    { id: '2', title: 'Patent Document', content: 'Patent application details' }
  ]);

  const mockUser = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com'
  };

  // Mock user context
  import { setContext } from 'svelte';
  setContext('user', () => mockUser);

  // API testing functions
  let apiTestResult = $state(null);

  async function testEmbeddingAPI() {
    try {
      apiTestResult = { status: 'loading...', timestamp: new Date().toISOString() };

      const response = await fetch('/api/ai/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: evidenceText,
          model: 'mock',
          dimensions: 256
        })
      });

      const result = await response.json();

      apiTestResult = {
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      apiTestResult = {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async function testEmbeddingService() {
    try {
      apiTestResult = { status: 'testing service...', timestamp: new Date().toISOString() };

      // Import embedding service dynamically
      const { embeddingService } = await import('$lib/services/embedding-service');

      const result = await embeddingService.embed(evidenceText, {
        model: 'mock',
        dimensions: 256,
        cache: true
      });

      apiTestResult = {
        status: 'success',
        source: 'embedding-service',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      apiTestResult = {
        status: 'error',
        source: 'embedding-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">Embedding Workflow Test</h1>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Input Configuration -->
    <Card>
      <CardHeader>
        <CardTitle>Test Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Case ID:</label>
            <input
              bind:value={caseId}
              class="w-full p-2 border rounded"
              placeholder="Enter case ID"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Evidence Text:</label>
            <textarea
              bind:value={evidenceText}
              class="w-full p-2 border rounded h-32"
              placeholder="Enter evidence text for embedding generation"
            ></textarea>
          </div>

          <div>
            <p class="text-sm text-gray-600">
              Current text length: {evidenceText.length} characters
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- AI Assistant Component -->
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant with Embedding Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <AiAssistant
          {caseId}
          {contextItems}
          {evidenceText}
        />
      </CardContent>
    </Card>
  </div>

  <!-- API Test Section -->
  <Card class="mt-6">
    <CardHeader>
      <CardTitle>Direct API Testing</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <Button
          onclick={testEmbeddingAPI}
          class="mr-2 bits-btn bits-btn"
        >
          Test Embedding API
        </Button>

        <Button class="bits-btn"
          onclick={testEmbeddingService}
          variant="outline"
        >
          Test Embedding Service
        </Button>

        {#if apiTestResult}
          <div class="mt-4 p-4 bg-gray-50 rounded">
            <h3 class="font-semibold mb-2">API Test Result:</h3>
            <pre class="text-sm overflow-auto">{JSON.stringify(apiTestResult, null, 2)}</pre>
          </div>
        {/if}
      </div>
    </CardContent>
  </Card>
</div>

<style>
  .container {
    max-width: 1200px;
  }
</style>
