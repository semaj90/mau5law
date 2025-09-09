<script lang="ts">
  import { onMount } from 'svelte';
  import { Card } from '$lib/components/ui/enhanced-bits';
  import CardContent from '$lib/components/ui/CardContent.svelte';
  import CardHeader from '$lib/components/ui/CardHeader.svelte';
  import CardTitle from '$lib/components/ui/CardTitle.svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';

  // Svelte 5 runes for state management
  let isLoading = $state(false);
  let testResults = $state<string[]>([]);
  let cases = $state<any[]>([]);
  let selectedCase = $state<any>(null);
  let testCase = $state({
    caseNumber: 'TEST-001',
    title: 'Sample Test Case',
    description: 'This is a test case for CRUD operations',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    status: 'draft' as 'draft' | 'open' | 'in_progress' | 'review' | 'closed',
    category: 'testing',
    metadata: { testData: true }
  });

  // Test results derived state
  let testSummary = $derived(() => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.startsWith('✅')).length;
    const failed = testResults.filter(r => r.startsWith('❌')).length;
    return { total, passed, failed, successRate: total > 0 ? (passed / total * 100).toFixed(1) : '0' };
  });

  function addResult(message: string) {
    testResults = [...testResults, `[${new Date().toLocaleTimeString()}] ${message}`];
  }

  async function testGETOperations() {
    isLoading = true;
    addResult('🔍 Testing GET operations...');

    try {
      // Test 1: Get all cases
      const listResponse = await fetch('/api/test-cases?limit=5');
      const listData = await listResponse.json();

      if (listResponse.ok && listData.success) {
        addResult(`✅ GET /api/test-cases - Success (${listData.data?.length || 0} cases)`);
        cases = listData.data || [];
      } else {
        addResult(`❌ GET /api/test-cases - Failed: ${listData.error}`);
      }

      // Test 2: Get specific case (if any exist)
      if (cases.length > 0) {
        const testCaseId = cases[0].id;
        const singleResponse = await fetch(`/api/test-cases?id=${testCaseId}`);
        const singleData = await singleResponse.json();

        if (singleResponse.ok && singleData.success) {
          addResult(`✅ GET /api/test-cases?id=${testCaseId} - Success`);
          selectedCase = singleData.data;
        } else {
          addResult(`❌ GET /api/test-cases?id=${testCaseId} - Failed: ${singleData.error}`);
        }
      } else {
        addResult('ℹ️ No existing cases to test single case retrieval');
      }

    } catch (error) {
      addResult(`❌ GET operations - Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    isLoading = false;
  }

  async function testPOSTOperation() {
    isLoading = true;
    addResult('📝 Testing POST operation...');

    try {
      const response = await fetch('/api/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testCase,
          caseNumber: `TEST-${Date.now()}` // Unique case number
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addResult(`✅ POST /api/test-cases - Success (ID: ${data.data?.id})`);
        // Refresh the cases list
        await testGETOperations();
        return data.data.id;
      } else {
        addResult(`❌ POST /api/test-cases - Failed: ${data.error}`);
        if (data.details) {
          addResult(`   Details: ${JSON.stringify(data.details)}`);
        }
      }
    } catch (error) {
      addResult(`❌ POST operation - Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    isLoading = false;
    return null;
  }

  async function testPUTOperation(caseId?: string) {
    if (!caseId && cases.length === 0) {
      addResult('❌ PUT operation - No cases available to update');
      return;
    }

    isLoading = true;
    const targetId = caseId || cases[0].id;
    addResult(`📝 Testing PUT operation on case ${targetId}...`);

    try {
      const updateData = {
        title: 'Updated Test Case Title',
        description: 'Updated description for testing',
        status: 'in_progress',
        priority: 'high',
        metadata: { updated: true, timestamp: Date.now() }
      };

      const response = await fetch(`/api/test-cases?id=${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addResult(`✅ PUT /api/test-cases?id=${targetId} - Success`);
        // Refresh the cases list
        await testGETOperations();
      } else {
        addResult(`❌ PUT /api/test-cases?id=${targetId} - Failed: ${data.error}`);
      }
    } catch (error) {
      addResult(`❌ PUT operation - Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    isLoading = false;
  }

  async function testDELETEOperation(caseId?: string) {
    if (!caseId && cases.length === 0) {
      addResult('❌ DELETE operation - No cases available to delete');
      return;
    }

    isLoading = true;
    const targetId = caseId || cases[cases.length - 1].id; // Delete the last case
    addResult(`🗑️ Testing DELETE operation on case ${targetId}...`);

    try {
      const response = await fetch(`/api/test-cases?id=${targetId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addResult(`✅ DELETE /api/test-cases?id=${targetId} - Success`);
        // Refresh the cases list
        await testGETOperations();
      } else {
        addResult(`❌ DELETE /api/test-cases?id=${targetId} - Failed: ${data.error}`);
      }
    } catch (error) {
      addResult(`❌ DELETE operation - Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    isLoading = false;
  }

  async function runFullCRUDTest() {
    testResults = [];
    addResult('🚀 Starting full CRUD test suite...');

    // Test 1: GET operations
    await testGETOperations();

    // Test 2: POST operation
    const newCaseId = await testPOSTOperation();

    // Test 3: PUT operation (use newly created case)
    if (newCaseId) {
      await testPUTOperation(newCaseId);
    }

    // Test 4: DELETE operation (clean up)
    if (newCaseId) {
      await testDELETEOperation(newCaseId);
    }

    addResult('✅ Full CRUD test suite completed');
  }

  function clearResults() {
    testResults = [];
    selectedCase = null;
  }

  // Load initial data on mount
  onMount(() => {
    testGETOperations();
  });
</script>

<div class="container mx-auto p-6 space-y-6">
  <div class="text-center">
    <h1 class="text-3xl font-bold mb-2">SvelteKit CRUD Operations Test</h1>
    <p class="text-gray-600">Testing all CRUD operations against /api/test-cases endpoint</p>
  </div>

  <!-- Test Controls -->
  <Card>
    <CardHeader>
      <CardTitle>Test Controls</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex flex-wrap gap-3">
  <Button class="bits-btn bits-btn" onclick={runFullCRUDTest} disabled={isLoading} variant="default">
          {isLoading ? '⏳ Testing...' : '🚀 Run Full CRUD Test'}
        </Button>
  <Button class="bits-btn bits-btn" onclick={testGETOperations} disabled={isLoading} variant="secondary">
          🔍 Test GET
        </Button>
  <Button class="bits-btn bits-btn" onclick={testPOSTOperation} disabled={isLoading} variant="secondary">
          📝 Test POST
        </Button>
  <Button class="bits-btn bits-btn" onclick={() => testPUTOperation()} disabled={isLoading} variant="secondary">
          ✏️ Test PUT
        </Button>
  <Button class="bits-btn bits-btn" onclick={() => testDELETEOperation()} disabled={isLoading} variant="secondary">
          🗑️ Test DELETE
        </Button>
  <Button class="bits-btn bits-btn" onclick={clearResults} variant="ghost">
          🧹 Clear Results
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Test Results Summary -->
  <Card>
    <CardHeader>
      <CardTitle>Test Results Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-3 rounded">
          <div class="text-2xl font-bold text-blue-600">{testSummary.total}</div>
          <div class="text-sm text-blue-600">Total Tests</div>
        </div>
        <div class="bg-green-50 p-3 rounded">
          <div class="text-2xl font-bold text-green-600">{testSummary.passed}</div>
          <div class="text-sm text-green-600">Passed</div>
        </div>
        <div class="bg-red-50 p-3 rounded">
          <div class="text-2xl font-bold text-red-600">{testSummary.failed}</div>
          <div class="text-sm text-red-600">Failed</div>
        </div>
        <div class="bg-purple-50 p-3 rounded">
          <div class="text-2xl font-bold text-purple-600">{testSummary.successRate}%</div>
          <div class="text-sm text-purple-600">Success Rate</div>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Current Cases -->
  <Card>
    <CardHeader>
      <CardTitle>Current Cases ({cases.length})</CardTitle>
    </CardHeader>
    <CardContent>
      {#if cases.length === 0}
        <p class="text-gray-500">No cases found. Create some test cases to see them here.</p>
      {:else}
        <div class="space-y-2">
          {#each cases as caseItem}
            <div class="border rounded p-3 hover:bg-gray-50">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold">{caseItem.title}</h4>
                  <p class="text-sm text-gray-600">Case #: {caseItem.caseNumber}</p>
                  <p class="text-sm text-gray-600">Status: {caseItem.status} | Priority: {caseItem.priority}</p>
                </div>
                <div class="text-xs text-gray-500">
                  ID: {caseItem.id}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Test Results Log -->
  <Card>
    <CardHeader>
      <CardTitle>Test Results Log</CardTitle>
    </CardHeader>
    <CardContent>
      {#if testResults.length === 0}
        <p class="text-gray-500">No test results yet. Run some tests to see results here.</p>
      {:else}
        <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {#each testResults as result}
            <div class="mb-1">{result}</div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Selected Case Details -->
  {#if selectedCase}
    <Card>
      <CardHeader>
        <CardTitle>Selected Case Details</CardTitle>
      </CardHeader>
      <CardContent>
        <pre class="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(selectedCase, null, 2)}</pre>
      </CardContent>
    </Card>
  {/if}
</div>