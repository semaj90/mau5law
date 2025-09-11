<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  import { onMount, setContext } from 'svelte';

  import AiAssistant from '$lib/components/ai/AiAssistant.svelte';
  import EvidenceManager from '$lib/components/evidence/EvidenceManager.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  
  let caseId = $state('');
  let contextItems = $state([]);
  let evidenceText = $state('');
  let activeTab = $state('assistant');
  // Mock user context
  
  const mockUser = {
    id: 'user-123',
    name: 'Legal Assistant User',
    email: 'assistant@legal.ai'
  };
  setContext('user', () => mockUser);

  onMount(async () => {
    // Load recent evidence files as context
    try {
      const response = await fetch('/api/evidence-files?limit=10');
      const data = await response.json();
      if (data.success) {
        contextItems = data.items.map(item => ({
          id: item.id.toString(),
          title: item.title,
          content: `${item.evidence_type} - ${item.mime_type}`,
          uploadedAt: item.uploaded_at
        });
      }
    } catch (error) {
      console.error('Failed to load evidence context:', error);
    }
  });

  function onEvidenceUploaded(event) {
    const newEvidence = event.detail;
    contextItems = [
      {
        id: newEvidence.record.id.toString(),
        title: newEvidence.record.title || 'Uploaded Evidence',
        content: `${newEvidence.upload.metadata.mimeType} - ${newEvidence.upload.metadata.fileSize} bytes`,
        uploadedAt: new Date().toISOString()
      },
      ...contextItems.slice(0, 9) // Keep only 10 most recent
    ];
    // Switch to assistant tab after upload
    activeTab = 'assistant';
  }

  function onSemanticSearchResults(event) {
    const results = event.detail.results;
    if (results && results.length > 0) {
      // Update context with search results
      contextItems = results.map(result => ({
        id: result.id.toString(),
        title: result.title,
        content: `${result.evidenceType} - Similarity: ${(result.similarity * 100).toFixed(1)}%`,
        similarity: result.similarity
      });
      // Switch to assistant tab to use the search context
      activeTab = 'assistant';
    }
  }
</script>

<svelte:head>
  <title>AI Legal Assistant - Evidence Analysis & Chat</title>
  <meta name="description" content="Intelligent legal assistant with evidence analysis and semantic search capabilities" />
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
  <div class="mb-6">
    <h1 class="text-4xl font-bold text-gray-900 mb-2">AI Legal Assistant</h1>
    <p class="text-gray-600">Intelligent evidence analysis and legal research assistant with real-time chat capabilities</p>
  </div>

  <Tabs value={activeTab} onValueChange={(value) => activeTab = value}>
    <TabsList class="grid w-full grid-cols-2">
      <TabsTrigger value="assistant">🤖 AI Chat Assistant</TabsTrigger>
      <TabsTrigger value="evidence">📁 Evidence Manager</TabsTrigger>
    </TabsList>

    <TabsContent value="assistant" class="mt-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Chat Interface -->
        <div class="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>💬 Legal AI Assistant</CardTitle>
              <p class="text-sm text-gray-600">
                Ask questions about your evidence, get legal insights, and perform semantic searches
              </p>
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

        <!-- Context & Information Panel -->
        <div class="space-y-6">
          <!-- Case Configuration -->
          <Card>
            <CardHeader>
              <CardTitle>📋 Case Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" for="case-id">Case ID:</label><input id="case-id" 
                    bind:value={caseId}
                    class="w-full p-2 border rounded-md"
                    placeholder="Enter case identifier"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-2" for="additional-context">Additional Context:</label><textarea id="additional-context" 
                    bind:value={evidenceText}
                    class="w-full p-2 border rounded-md h-24 text-sm"
                    placeholder="Add any additional context for the AI assistant..."
                  ></textarea>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Context Items -->
          <Card>
            <CardHeader>
              <CardTitle>🔍 Current Context</CardTitle>
              <p class="text-xs text-gray-500">
                {contextItems.length} evidence files available
              </p>
            </CardHeader>
            <CardContent>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                {#each contextItems.slice(0, 10) as item}
                  <div class="p-2 bg-gray-50 rounded text-xs border-l-4 border-blue-200">
                    <div class="font-medium text-gray-900 truncate">
                      {item.title}
                    </div>
                    <div class="text-gray-600 mt-1">
                      {item.content}
                    </div>
                    {#if item.similarity}
                      <div class="text-blue-600 mt-1">
                        Similarity: {(item.similarity * 100).toFixed(1)}%
                      </div>
                    {/if}
                  </div>
                {:else}
                  <p class="text-gray-500 text-sm italic">
                    No evidence files loaded yet. Upload files in the Evidence Manager tab.
                  </p>
                {/each}
              </div>
            </CardContent>
          </Card>

          <!-- Quick Actions -->
          <Card>
            <CardHeader>
              <CardTitle>⚡ Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <button 
                  onclick={() => activeTab = 'evidence'}
                  class="w-full p-2 text-left bg-blue-50 hover:bg-blue-100 rounded-md text-sm border border-blue-200 transition-colors"
                >
                  📁 Manage Evidence Files
                </button>
                
                <button 
                  onclick={async () => {
                    try {
                      const response = await fetch('/api/evidence-embeddings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'backfill' })
                      });
                      const result = await response.json();
                      if (result.success) {
                        alert(`Embedding backfill completed: ${result.result.success} files processed`);
                      }
                    } catch (error) {
                      alert('Error processing embeddings: ' + error.message);
                    }
                  }}
                  class="w-full p-2 text-left bg-green-50 hover:bg-green-100 rounded-md text-sm border border-green-200 transition-colors"
                >
                  🔄 Process Evidence Embeddings
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="evidence" class="mt-6">
      <EvidenceManager 
        on:evidenceUploaded={onEvidenceUploaded}
        on:searchResults={onSemanticSearchResults}
      />
    </TabsContent>
  </Tabs>
</div>

<style>
  .container {
    min-height: 100vh;
  }
</style>
