<!--
  pgvector Integration Testing Dashboard
  Best Practices Implementation for Vector Similarity Search
-->

<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';

  // Test results state
  let connectionStatus = 'untested';
  let connectionDetails: any = null;
  let dbStats: any = null;
  let searchResults: any[] = [];
  let testQuery = 'contract liability and indemnification terms';
  let isLoading = false;
  let lastError = '';

  // Performance metrics
  let performanceMetrics = {
    connectionTest: '',
    vectorSearch: '',
    documentInsert: '',
    indexCreation: ''
  };

  /**
   * Test PostgreSQL + pgvector connection
   */
  async function testConnection() {
    isLoading = true;
    lastError = '';

    try {
      const response = await fetch('/api/pgvector/test?action=connection');
      const result = await response.json();

      connectionStatus = result.success ? 'connected' : 'failed';
      connectionDetails = result.details;
      performanceMetrics.connectionTest = result.responseTime;

      if (!result.success) {
        lastError = result.details.error || 'Connection test failed';
      }
    } catch (error) {
      connectionStatus = 'failed';
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Get database statistics and performance metrics
   */
  async function getDatabaseStats() {
    isLoading = true;
    lastError = '';

    try {
      const response = await fetch('/api/pgvector/test?action=stats');
      const result = await response.json();

      if (result.success) {
        dbStats = result.stats;
      } else {
        lastError = result.error || 'Failed to get database statistics';
      }
    } catch (error) {
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Seed database with sample legal documents
   */
  async function seedDatabase(count: number = 20) {
    isLoading = true;
    lastError = '';

    try {
      const response = await fetch(`/api/pgvector/test?action=seed&count=${count}`);
      const result = await response.json();

      if (!result.success) {
        lastError = result.error || 'Failed to seed database';
      }

      // Refresh stats after seeding
      await getDatabaseStats();
    } catch (error) {
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Create IVFFLAT index for performance optimization
   */
  async function createIndex(lists: number = 100, metric: string = 'cosine') {
    isLoading = true;
    lastError = '';

    try {
      const response = await fetch(`/api/pgvector/test?action=index&lists=${lists}&metric=${metric}`);
      const result = await response.json();

      if (result.success) {
        performanceMetrics.indexCreation = result.responseTime;
      } else {
        lastError = result.error || 'Failed to create index';
      }
    } catch (error) {
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Perform vector similarity search
   */
  async function performVectorSearch() {
    if (!testQuery.trim()) return;

    isLoading = true;
    lastError = '';
    searchResults = [];

    try {
      const response = await fetch('/api/pgvector/test?action=query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          limit: 10,
          documentType: undefined // Search all types
        })
      });

      const result = await response.json();

      if (result.success) {
        searchResults = result.results || [];
        performanceMetrics.vectorSearch = result.responseTime;
      } else {
        lastError = result.error || 'Vector search failed';
      }
    } catch (error) {
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Test document insertion with embedding
   */
  async function testDocumentInsert() {
    isLoading = true;
    lastError = '';

    const sampleDoc = {
      documentId: `test-doc-${Date.now()}`,
      content: `
        SAMPLE CONTRACT

        This agreement demonstrates pgvector integration with legal document storage.
        It contains liability clauses, indemnification terms, and standard contract provisions.

        The parties agree to the following terms and conditions...
      `,
      embedding: generateMockEmbedding(), // 1536-dimension mock embedding
      metadata: {
        title: 'pgvector Test Document',
        type: 'contract',
        tags: ['test', 'sample', 'liability']
      }
    };

    try {
      const response = await fetch('/api/pgvector/test?action=insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleDoc)
      });

      const result = await response.json();

      if (result.success) {
        performanceMetrics.documentInsert = result.responseTime;
        // Refresh stats and search to see new document
        await getDatabaseStats();
        if (testQuery.includes('test') || testQuery.includes('sample')) {
          await performVectorSearch();
        }
      } else {
        lastError = result.error || 'Document insertion failed';
      }
    } catch (error) {
      lastError = error.message;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Generate mock 1536-dimension embedding
   */
  function generateMockEmbedding(): number[] {
    const embedding = [];
    for (let i = 0; i < 1536; i++) {
      embedding.push(Math.sin(i * 0.1) * Math.cos(i * 0.05);
    }
    return embedding;
  }

  /**
   * Format distance for display
   */
  function formatDistance(distance: number): string {
    return distance.toFixed(4);
  }

  /**
   * Get status badge color
   */
  function getStatusColor(status: string): string {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Initialize dashboard on mount
  onMount(() => {
    testConnection();
  });
</script>

<div class="container mx-auto p-6 space-y-6">
  <div class="text-center space-y-2">
    <h1 class="text-3xl font-bold">🧠 pgvector Integration Dashboard</h1>
    <p class="text-muted-foreground">
      Comprehensive testing suite for PostgreSQL + pgvector vector similarity search
    </p>
  </div>

  <!-- Error Display -->
  {#if lastError}
    <Alert class="border-red-200 bg-red-50">
      <AlertDescription class="text-red-800">
        <strong>Error:</strong> {lastError}
      </AlertDescription>
    </Alert>
  {/if}

  <Tabs value="overview" class="w-full">
    <TabsList class="grid w-full grid-cols-4">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="search">Vector Search</TabsTrigger>
      <TabsTrigger value="operations">Operations</TabsTrigger>
      <TabsTrigger value="performance">Performance</TabsTrigger>
    </TabsList>

    <!-- Overview Tab -->
    <TabsContent value="overview" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Connection Status -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              PostgreSQL Connection
              <Badge class={getStatusColor(connectionStatus)}>
                {connectionStatus}
              </Badge>
            </CardTitle>
            <CardDescription>
              Database connectivity and pgvector extension status
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button onclick={testConnection} disabled={isLoading} class="w-full bits-btn bits-btn">
              {isLoading ? 'Testing...' : 'Test Connection'}
            </Button>

            {#if connectionDetails}
              <div class="text-sm space-y-1">
                <div><strong>Database:</strong> {connectionDetails.connection?.current_time?.substring(0, 19) || 'Connected'}</div>
                {#if connectionDetails.pgvectorExtension?.extversion}
                  <div><strong>pgvector Version:</strong> {connectionDetails.pgvectorExtension.extversion}</div>
                {:else}
                  <div class="text-red-600"><strong>pgvector:</strong> Not installed</div>
                {/if}
                <div><strong>Pool Status:</strong> {connectionDetails.connectionPool?.totalCount || 0} total, {connectionDetails.connectionPool?.idleCount || 0} idle</div>
              </div>
            {/if}
          </CardContent>
        </Card>

        <!-- Database Statistics -->
        <Card>
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>
              Vector embeddings and document metrics
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button onclick={getDatabaseStats} disabled={isLoading} class="w-full bits-btn bits-btn">
              {isLoading ? 'Loading...' : 'Get Statistics'}
            </Button>

            {#if dbStats}
              <div class="text-sm space-y-1">
                <div><strong>Total Embeddings:</strong> {dbStats.vectors?.total_embeddings || 0}</div>
                <div><strong>Avg Dimension:</strong> {dbStats.vectors?.avg_dimension || 'N/A'}</div>
                <div><strong>Documents:</strong> {dbStats.documents?.length || 0} types</div>
                <div><strong>Indexes:</strong> {dbStats.indexes?.length || 0}</div>
                {#if dbStats.sizes}
                  <div><strong>DB Size:</strong> {dbStats.sizes.database_size}</div>
                {/if}
              </div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- Quick Actions -->
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Database setup and optimization tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button class="bits-btn" onclick={() => seedDatabase(10)} disabled={isLoading}>
              Seed 10 Documents
            </Button>
            <Button class="bits-btn" onclick={() => seedDatabase(50)} disabled={isLoading}>
              Seed 50 Documents
            </Button>
            <Button class="bits-btn" onclick={() => createIndex(100, 'cosine')} disabled={isLoading}>
              Create IVFFLAT Index
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <!-- Vector Search Tab -->
    <TabsContent value="search" class="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vector Similarity Search</CardTitle>
          <CardDescription>
            Test natural language queries with vector embeddings
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-3">
            <div class="flex-1">
              <Label for="query">Search Query</Label>
              <Input
                id="query"
                bind:value={testQuery}
                placeholder="Enter your search query..."
                class="mt-1"
              />
            </div>
            <div class="flex items-end">
              <Button class="bits-btn" onclick={performVectorSearch} disabled={isLoading || !testQuery.trim()}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          <!-- Search Results -->
          {#if searchResults.length > 0}
            <div class="space-y-3">
              <h3 class="font-medium">Search Results ({searchResults.length})</h3>
              {#each searchResults as result, i}
                <Card class="border-l-4 border-l-blue-500">
                  <CardContent class="pt-4">
                    <div class="flex justify-between items-start gap-4">
                      <div class="flex-1 space-y-2">
                        <div class="flex items-center gap-2">
                          <h4 class="font-medium">{result.title || result.document_id}</h4>
                          <Badge>{result.document_type}</Badge>
                          <span class="text-sm text-muted-foreground">
                            Distance: {formatDistance(result.distance)}
                          </span>
                        </div>
                        {#if result.content}
                          <p class="text-sm text-muted-foreground line-clamp-2">
                            {result.content.substring(0, 200)}...
                          </p>
                        {/if}
                        <div class="text-xs text-muted-foreground">
                          Created: {new Date(result.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              {/each}
            </div>
          {:else if searchResults.length === 0 && performanceMetrics.vectorSearch}
            <Alert>
              <AlertDescription>
                No results found for query "{testQuery}". Try seeding the database with sample documents first.
              </AlertDescription>
            </Alert>
          {/if}
        </CardContent>
      </Card>
    </TabsContent>

    <!-- Operations Tab -->
    <TabsContent value="operations" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Document Insertion -->
        <Card>
          <CardHeader>
            <CardTitle>Document Operations</CardTitle>
            <CardDescription>
              Test document insertion with vector embeddings
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button onclick={testDocumentInsert} disabled={isLoading} class="w-full bits-btn bits-btn">
              {isLoading ? 'Inserting...' : 'Test Document Insert'}
            </Button>
            <p class="text-sm text-muted-foreground">
              Inserts a sample legal document with 1536-dimension mock embedding
            </p>
          </CardContent>
        </Card>

        <!-- Index Management -->
        <Card>
          <CardHeader>
            <CardTitle>Index Management</CardTitle>
            <CardDescription>
              Create and manage vector indexes for performance
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <Button class="bits-btn" onclick={() => createIndex(50, 'cosine')} disabled={isLoading} size="sm">
                Cosine (50 lists)
              </Button>
              <Button class="bits-btn" onclick={() => createIndex(100, 'cosine')} disabled={isLoading} size="sm">
                Cosine (100 lists)
              </Button>
              <Button class="bits-btn" onclick={() => createIndex(100, 'euclidean')} disabled={isLoading} size="sm">
                Euclidean
              </Button>
              <Button class="bits-btn" onclick={() => createIndex(100, 'inner_product')} disabled={isLoading} size="sm">
                Inner Product
              </Button>
            </div>
            <p class="text-sm text-muted-foreground">
              IVFFLAT indexes improve query performance for large datasets
            </p>
          </CardContent>
        </Card>
      </div>
    </TabsContent>

    <!-- Performance Tab -->
    <TabsContent value="performance" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Connection Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {performanceMetrics.connectionTest || '-'}
            </div>
            <p class="text-sm text-muted-foreground">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Vector Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {performanceMetrics.vectorSearch || '-'}
            </div>
            <p class="text-sm text-muted-foreground">Query execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Document Insert</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {performanceMetrics.documentInsert || '-'}
            </div>
            <p class="text-sm text-muted-foreground">Single document</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Index Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {performanceMetrics.indexCreation || '-'}
            </div>
            <p class="text-sm text-muted-foreground">IVFFLAT index</p>
          </CardContent>
        </Card>
      </div>

      <!-- Performance Guidelines -->
      <Card>
        <CardHeader>
          <CardTitle>Performance Guidelines</CardTitle>
          <CardDescription>
            Best practices for optimal pgvector performance
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 class="font-medium text-green-700">✅ Best Practices</h4>
              <ul class="mt-2 space-y-1 text-muted-foreground">
                <li>• Use IVFFLAT indexes for >1000 vectors</li>
                <li>• Choose lists = sqrt(total_vectors)</li>
                <li>• Prefer cosine distance for normalized vectors</li>
                <li>• Batch insert for bulk operations</li>
                <li>• Run ANALYZE after bulk operations</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-blue-700">📊 Expected Performance</h4>
              <ul class="mt-2 space-y-1 text-muted-foreground">
                <li>• Connection test: < 100ms</li>
                <li>• Vector search (10 results): < 200ms</li>
                <li>• Document insert: < 50ms</li>
                <li>• Index creation: < 30s</li>
                <li>• Batch insert (100 docs): < 2s</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

