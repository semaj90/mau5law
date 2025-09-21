<!-- Practical SPA Example - Complete Global Store Integration -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { aiAssistant } from '$lib/stores/ai-assistant-unified';
  import { embeddingsService } from '$lib/services/embeddings-service';
  import { showSuccess, showError } from '$lib/stores/alerts';

  // UI Components
  import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '$lib/components/ui/enhanced-bits';
  import EvidenceCRUDModal from '$lib/components/modals/EvidenceCRUDModal.svelte';
  import DraggableEvidenceNode from '$lib/components/evidence/DraggableEvidenceNode.svelte';
  import GPUAIAssistant from '$lib/components/ai/GPUAIAssistant.svelte';
  import {
    Plus, Brain, Zap, Database, Network, MessageSquare,
    Upload, Search, Settings, BarChart3, FileText
  } from 'lucide-svelte';

  // Svelte 5 state - SPA reactive patterns
  let currentCaseId = $state('spa-demo-case');
  let modalOpen = $state(false);
  let modalMode = $state<'create' | 'edit' | 'view'>('create');
  let editingNodeId = $state<string | undefined>();
  let selectedNodeIds = $state<string[]>([]);
  let chatMessage = $state('');
  let canvasContainer = $state<HTMLDivElement>();
  let isProcessing = $state(false);

  // Global store reactive bindings
  let currentCase = $derived(aiAssistant.currentCase);
  let currentMessages = $derived(aiAssistant.currentMessages);
  let isLoading = $derived(aiAssistant.isLoading);
  let error = $derived(aiAssistant.error);
  let hasActiveCases = $derived(aiAssistant.hasActiveCases);

  // Evidence nodes from global store
  let evidenceNodes = $state<any[]>([]);
  let aiSuggestions = $state<any[]>([]);

  // Performance metrics
  let metrics = $state({
    totalNodes: 0,
    connectionsFound: 0,
    aiInteractions: 0,
    averageResponseTime: 0
  });

  // Initialize SPA
  onMount(async () => {
    await initializeSPA();
    loadDemoData();
    startReactiveUpdates();
  });

  async function initializeSPA() {
    // Initialize global AI assistant
    aiAssistant.initializeCase(currentCaseId, 'SPA Integration Demo');
    aiAssistant.setCurrentCase(currentCaseId);

    // Initialize embeddings service
    await embeddingsService.initialize();

    showSuccess('SPA initialized - No page reloads needed!');
  }

  function loadDemoData() {
    // Add demo evidence nodes to global store
    const demoNodes = [
      {
        id: 'node-1',
        title: 'Contract Agreement',
        type: 'document',
        content: 'Software licensing agreement between parties for enterprise solutions.',
        x: 100,
        y: 100,
        metadata: { confidence: 0.95, fileSize: 1024 * 45 }
      },
      {
        id: 'node-2',
        title: 'Email Thread',
        type: 'document',
        content: 'Email correspondence discussing project requirements and implementation.',
        x: 350,
        y: 150,
        metadata: { confidence: 0.87, fileSize: 1024 * 23 }
      },
      {
        id: 'node-3',
        title: 'Meeting Notes',
        type: 'document',
        content: 'Notes from legal consultation meeting regarding contract terms.',
        x: 200,
        y: 300,
        metadata: { confidence: 0.92, fileSize: 1024 * 31 }
      }
    ];

    evidenceNodes = demoNodes;
    updateMetrics();
  }

  function startReactiveUpdates() {
    // Real-time metrics updates
    setInterval(() => {
      updateMetrics();
    }, 2000);
  }

  function updateMetrics() {
    metrics = {
      totalNodes: evidenceNodes.length,
      connectionsFound: evidenceNodes.filter(item => item.length),
      aiInteractions: currentMessages.length,
      averageResponseTime: aiAssistant.metrics.averageResponseTime
    };
  }

  // === SPA CRUD Operations ===

  function handleAddEvidence() {
    modalMode = 'create';
    editingNodeId = undefined;
    modalOpen = true;
    // No page reload - pure SPA modal
  }

  function handleEditEvidence(nodeId: string) {
    modalMode = 'edit';
    editingNodeId = nodeId;
    modalOpen = true;
    // SPA modal with existing data
  }

  function handleViewEvidence(nodeId: string) {
    modalMode = 'view';
    editingNodeId = nodeId;
    modalOpen = true;
    // Read-only SPA modal
  }

  async function handleSubmit(event: CustomEvent) {
    const { evidence } = event.detail;

    try {
      if (modalMode === 'create') {
        // Add new evidence node to global store
        const newNode = {
          ...evidence,
          id: crypto.randomUUID(),
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 300,
          timestamp: Date.now()
        };

        evidenceNodes = [...evidenceNodes, newNode];

        // Add to AI context via global store
        await aiAssistant.addMessage(currentCaseId, {
          role: 'system',
          content: `New evidence added: ${newNode.title}`,
          evidenceIds: [newNode.id]
        });

        showSuccess(`Evidence "${newNode.title}" added to case`);
      } else if (modalMode === 'edit') {
        // Update existing evidence node
        evidenceNodes = evidenceNodes.map(node =>
          node.id === editingNodeId ? { ...node, ...evidence } : node
        );

        showSuccess(`Evidence updated successfully`);
      }

      modalOpen = false;
      updateMetrics();
    } catch (error) {
      showError('Failed to save evidence');
      console.error('Save error:', error);
    }
  }

  function handleNodeSelect(nodeId: string) {
    if (selectedNodeIds.includes(nodeId)) {
      selectedNodeIds = selectedNodeIds.filter(id => id !== nodeId);
    } else {
      selectedNodeIds = [...selectedNodeIds, nodeId];
    }
  }

  // === AI Integration ===

  async function handleChatSubmit() {
    if (!chatMessage.trim() || isLoading) return;

    const message = chatMessage;
    chatMessage = '';
    isProcessing = true;

    try {
      // Send to global AI store with selected evidence context
      await aiAssistant.sendMessage(currentCaseId, message, selectedNodeIds, {
        useAcceleration: true,
        includeHistory: true,
        legalContext: 'evidence-analysis'
      });

      // AI suggestions automatically updated via global store
      await generateAISuggestions();

      updateMetrics();
    } catch (error) {
      showError('AI chat failed');
      console.error('Chat error:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function analyzeSelectedEvidence() {
    if (selectedNodeIds.length === 0) {
      showError('Please select evidence to analyze');
      return;
    }

    isProcessing = true;

    try {
      const selectedNodes = evidenceNodes.filter(n => selectedNodeIds.includes(n.id));
      const analysisText = selectedNodes.map.join('\n\n');

      // Generate embeddings via Web Worker
      const embeddingResult = await embeddingsService.generateEmbedding(analysisText);

      // Send analysis request to global AI store
      await aiAssistant.sendMessage.join(', ')}`,
        selectedNodeIds,
        {
          useAcceleration: true,
          legalContext: 'pattern-analysis'
        }
      );

      // Update nodes with analysis metadata
      evidenceNodes = evidenceNodes.map(node =>
        selectedNodeIds.includes(node.id)
          ? { ...node, analyzed: true, embedding: embeddingResult.embedding }
          : node
      );

      showSuccess(`Analyzed ${selectedNodes.length} evidence items`);
    } catch (error) {
      showError('Evidence analysis failed');
      console.error('Analysis error:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function generateAISuggestions() {
    try {
      // Request suggestions from AI based on current evidence
      const suggestionMessage = `Based on the current evidence collection, suggest next steps, potential connections, and investigation priorities.`;

      await aiAssistant.sendMessage(currentCaseId, suggestionMessage, [], {
        useAcceleration: true,
        legalContext: 'investigation-planning'
      });

      // Extract suggestions from latest AI response
      const latestMessage = currentMessages[currentMessages.length - 1];
      if (latestMessage?.role === 'assistant') {
        aiSuggestions = extractSuggestionsFromText(latestMessage.content);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  }

  function extractSuggestionsFromText(text: string): any[] {
    // Simple suggestion extraction (could be enhanced with NLP)
    const suggestions = [];
    const lines = text.split.filter(line =>
      line.includes('suggest') ||
      line.includes('recommend') ||
      line.includes('consider') ||
      line.match(/^\d+\./) // Numbered lists
    );

    return lines.slice.map((line, index) => ({
      id: `suggestion-${index}`,
      text: line.trim(),
      type: 'investigation',
      priority: index < 2 ? 'high' : 'medium'
    }));
  }

  function handleSuggestionClick(suggestion: any) {
    chatMessage = `Tell me more about: ${suggestion.text}`;
  }

  // === Drag & Drop Integration ===

  function handleNodeDrag(nodeId: string, x: number, y: number) {
    // Update node position in global store - reactive UI updates
    evidenceNodes = evidenceNodes.map(node =>
      node.id === nodeId ? { ...node, x, y } : node
    );
  }

  function handleNodeConnection(fromId: string, toId: string) {
    // Create connection between evidence nodes
    evidenceNodes = evidenceNodes.map(node => {
      if (node.id === fromId) {
        const connections = node.connections || [];
        return { ...node, connections: [...connections, toId] };
      }
      return node;
    });

    showSuccess('Evidence connection created');
  }

  // === Performance Monitoring ===

  function handlePerformanceTest() {
    isProcessing = true;

    setTimeout(async () => {
      try {
        // Test Web Worker performance
        const testTexts = evidenceNodes.map(n => n.content);
        const startTime = performance.now();

        await embeddingsService.generateBatchEmbeddings(testTexts);

        const processingTime = performance.now() - startTime;

        showSuccess(`Performance test: ${testTexts.length} embeddings in ${processingTime.toFixed(0)}ms`);
      } catch (error) {
        showError('Performance test failed');
      } finally {
        isProcessing = false;
      }
    }, 100);
  }
</script>

<!-- SPA Layout - No Page Reloads -->
<div class="min-h-screen bg-background">
  <!-- Header -->
  <div class="border-b bg-card">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Network class="w-6 h-6 text-primary" />
            SPA Integration Demo
          </h1>
          <p class="text-muted-foreground">
            Production-ready global store + reactive AI + no page reloads
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Status Indicators -->
          <div class="flex items-center gap-4 text-sm">
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full {hasActiveCases ? 'bg-green-500' : 'bg-red-500'}"></div>
              <span>Cases: {hasActiveCases ? 'Active' : 'None'}</span>
            </div>

            <div class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full {isLoading ? 'bg-yellow-500' : 'bg-green-500'}"></div>
              <span>AI: {isLoading ? 'Processing' : 'Ready'}</span>
            </div>
          </div>

          <Button size="sm" onclick={handlePerformanceTest} disabled={isProcessing}>
            <BarChart3 class="w-4 h-4 mr-1" />
            Test Performance
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Metrics Dashboard -->
  <div class="border-b bg-muted/30">
    <div class="container mx-auto px-4 py-3">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-lg font-bold text-primary">{metrics.totalNodes}</div>
          <div class="text-xs text-muted-foreground">Evidence Nodes</div>
        </div>
        <div>
          <div class="text-lg font-bold text-primary">{metrics.aiInteractions}</div>
          <div class="text-xs text-muted-foreground">AI Messages</div>
        </div>
        <div>
          <div class="text-lg font-bold text-primary">{selectedNodeIds.length}</div>
          <div class="text-xs text-muted-foreground">Selected</div>
        </div>
        <div>
          <div class="text-lg font-bold text-primary">{Math.round(metrics.averageResponseTime)}ms</div>
          <div class="text-xs text-muted-foreground">Avg Response</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main SPA Content -->
  <div class="container mx-auto px-4 py-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Evidence Canvas (2/3 width) -->
      <div class="lg:col-span-2">
        <Card class="h-[600px]">
          <CardHeader class="border-b">
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2">
                <Database class="w-5 h-5" />
                Evidence Board
              </CardTitle>

              <div class="flex items-center gap-2">
                <Button size="sm" onclick={handleAddEvidence}>
                  <Plus class="w-4 h-4 mr-1" />
                  Add Evidence
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onclick={analyzeSelectedEvidence}
                  disabled={selectedNodeIds.length === 0 || isProcessing}
                >
                  <Brain class="w-4 h-4 mr-1" />
                  Analyze ({selectedNodeIds.length})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-0 h-[calc(100%-80px)] relative overflow-hidden">
            <div
              bind:this={canvasContainer}
              class="relative w-full h-full bg-slate-50 dark:bg-slate-900 overflow-auto"
              role="region"
              aria-label="Evidence canvas"
            >
              <!-- Grid background -->
              <div class="absolute inset-0 bg-grid-pattern opacity-20"></div>

              <!-- Evidence nodes with global store integration -->
              {#each evidenceNodes as node (node.id)}
                <DraggableEvidenceNode
                  bind:evidence={node}
                  {canvasContainer}
                  selected={selectedNodeIds.includes(node.id)}
                  highlighted={false}
                  onSelect={handleNodeSelect}
                  onAnalyze={(id) => handleViewEvidence(id)}
                  onConnect={handleNodeConnection}
                />
              {/each}

              <!-- Empty state -->
              {#if evidenceNodes.length === 0}
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-center text-muted-foreground">
                    <Upload class="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 class="text-lg font-medium mb-2">No evidence loaded</h3>
                    <p class="text-sm mb-4">Add evidence to start building your case</p>
                    <Button onclick={handleAddEvidence}>
                      <Plus class="w-4 h-4 mr-2" />
                      Add First Evidence
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- AI Assistant Panel (1/3 width) -->
      <div class="lg:col-span-1 space-y-6">

        <!-- Chat Interface -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2">
              <MessageSquare class="w-5 h-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Chat Messages -->
            <div class="h-40 overflow-y-auto space-y-2 border rounded p-2 bg-muted/20">
              {#each currentMessages.slice(-5) as message (message.id)}
                <div class="text-sm">
                  <div class="font-medium text-xs text-muted-foreground mb-1">
                    {message.role.toUpperCase()}
                    {#if message.metadata?.processingTime}
                      • {Math.round(message.metadata.processingTime)}ms
                    {/if}
                  </div>
                  <div class="text-foreground">
                    {message.content.substring(0, 200)}
                    {#if message.content.length > 200}...{/if}
                  </div>
                </div>
              {/each}

              {#if currentMessages.length === 0}
                <div class="text-center text-muted-foreground text-sm">
                  Start a conversation with the AI assistant
                </div>
              {/if}
            </div>

            <!-- Chat Input -->
            <div class="flex gap-2">
              <Input
                bind:value={chatMessage}
                placeholder="Ask about evidence..."
                onkeydown={(e) => { if (e.key === 'Enter') handleChatSubmit(); }}
                disabled={isLoading}
                class="flex-1"
              />

              <Button
                onclick={handleChatSubmit}
                disabled={!chatMessage.trim() || isLoading}
                size="sm"
              >
                {#if isLoading}
                  <div class="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full"></div>
                {:else}
                  <Brain class="w-4 h-4" />
                {/if}
              </Button>
            </div>

            {#if error}
              <div class="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                {error}
              </div>
            {/if}
          </CardContent>
        </Card>

        <!-- AI Suggestions -->
        {#if aiSuggestions.length > 0}
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2">
                <Zap class="w-5 h-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>

            <CardContent class="space-y-2">
              {#each aiSuggestions as suggestion (suggestion.id)}
                <button
                  class="w-full p-2 text-left text-sm border rounded hover:bg-muted/50 transition-colors"
                  onclick={() => handleSuggestionClick(suggestion)}
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{suggestion.type}</span>
                    <span class="text-xs px-1 py-0.5 rounded text-primary bg-primary/20">
                      {suggestion.priority}
                    </span>
                  </div>
                  <div class="text-muted-foreground mt-1">
                    {suggestion.text}
                  </div>
                </button>
              {/each}
            </CardContent>
          </Card>
        {/if}

        <!-- Quick Actions -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2">
              <Settings class="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>

          <CardContent class="space-y-2">
            <Button
              variant="outline"
              class="w-full justify-start"
              onclick={() => chatMessage = 'Summarize the key evidence patterns'}
            >
              <Search class="w-4 h-4 mr-2" />
              Find Patterns
            </Button>

            <Button
              variant="outline"
              class="w-full justify-start"
              onclick={() => chatMessage = 'What are the potential legal risks?'}
            >
              <FileText class="w-4 h-4 mr-2" />
              Risk Analysis
            </Button>

            <Button
              variant="outline"
              class="w-full justify-start"
              onclick={() => chatMessage = 'Generate investigation timeline'}
            >
              <BarChart3 class="w-4 h-4 mr-2" />
              Timeline
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>

<!-- SPA Modal - No Page Reload -->
<EvidenceCRUDModal
  bind:isOpen={modalOpen}
  mode={modalMode}
  evidenceId={editingNodeId}
  onClose={() => { modalOpen = false; }}
  onSave={handleSubmit}
  onDelete={(id) => {
    evidenceNodes = evidenceNodes.filter(n => n.id !== id);
    modalOpen = false;
    updateMetrics();
    showSuccess('Evidence deleted');
  }}
/>

<style>
  .bg-grid-pattern {
    background-image:
      linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  :global(.dark) .bg-grid-pattern {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  }
</style>