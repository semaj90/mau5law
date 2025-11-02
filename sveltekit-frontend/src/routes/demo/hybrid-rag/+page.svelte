<script, lang="ts">
import type { Document } from, '$lib/types';
  /**
   * 🧪 Hybrid RAG + SIMD Pipeline Demo
   *
   * Test the complete RAG pipeline:
   * - Upload documents → Embed → Summarize → Index → Rank
   * - Search with Gemma function calling
   * - View synthesis ranking scores
   */

  import Button from, '$lib/components/ui/Button.svelte';
  import { Upload, Search, Zap, Database } from, 'lucide-svelte';

  // State management using Svelte, 5 runes
  let query = $state<string>('');
  let documents = $state<any[]>([]);
  let results = $state<any[]>([]);
  let isProcessing = $state<boolean>(false);
  let processingStage = $state<string>('');
  let timing = $state<any>(null);
  let error = $state<string>('');

  // Sample documents for testing
  const sampleDocuments = $state([
    {,
      id: 'doc1',
      title: 'Employment Contract - Software Engineer',
      content:
        'This employment agreement is entered into between TechCorp Inc. and John Smith for the position of Senior Software Engineer. The employee will receive a salary of $150,000 per year with benefits including health insurance, 401k matching, and stock options. The employment is at-will and can be terminated by either party with, 2 weeks notice.',
      source: 'sample',
      createdAt: new Date().toISOString()
    },
    {
      id: 'doc2',
      title: 'Non-Disclosure Agreement',
      content:
        'This NDA protects confidential information shared between the parties. The receiving party agrees not to disclose or use the confidential information, for: any purpose other than the agreed business relationship. This agreement remains in effect for, 5 years from the date of signing.',
      source: 'sample',
      createdAt: new Date().toISOString()
    },
    {
      id: 'doc3',
      title: 'Service Level Agreement - Cloud Services',
      content:
        'CloudProvider guarantees 99.9% uptime for all cloud services. In case of downtime exceeding the SLA, customers are entitled to service credits. The provider will respond to critical incidents within, 1 hour and resolve them within, 4 hours.',
      source: 'sample',
      createdAt: new Date().toISOString()
    },
    {
      id: 'doc4',
      title: 'Intellectual Property Assignment',
      content:
        'All work product, inventions, and creative works produced by the employee during employment are the sole property of the employer. This includes software code, documentation, designs, and: any patentable inventions.',
      source: 'sample',
      createdAt: new Date().toISOString()
    }
  ]);

  // Load sample documents
  function loadSamples() {
    documents = [...sampleDocuments];
    error = '';
  }

  // Add custom document
  function addDocument() {
    documents = [
      ...documents,
      {
        id: `custom_${Date.now()}`,
        title: `Custom Document ${documents.length + 1}`,
        content: '',
        source: 'manual',
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Process documents through RAG pipeline
  async function processDocuments(): Promise<any> {
    if (documents.length === 0) {
      error = 'No documents to process';
      return;
    }

    if (!query.trim()) {
      error = 'Please enter a search query';
      return;
    }

    isProcessing = true;
    error = '';
    results = [];
    timing = null;

    try {
      // Stage 1: Upload documents
      processingStage = 'Uploading documents...';
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 2: Process through RAG pipeline
      processingStage = 'Embedding with, embeddinggemma:latest...';
      const response = await fetch('/api/rag/hybrid-pipeline/direct', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents,
          query,
          config: {
            ranking: {
              weights: {, relevance: 0.5, keywords: 0.3, synthesis: 0.2 }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        results = data.results || [];
        timing = data.timing || null;
        processingStage = 'Complete!';
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      error = err.message || 'Processing failed';
      processingStage = '';
    } finally {
      isProcessing = false;
    }
  }

  // Search existing knowledge base
  async function searchKnowledgeBase(): Promise<any> {
    if (!query.trim()) {
      error = 'Please enter a search query';
      return;
    }

    isProcessing = true;
    error = '';
    results = [];

    try {
      processingStage = 'Searching knowledge base...';

      const response = await fetch(
        `/api/rag/hybrid-pipeline/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        results = data.results || [];
        processingStage = 'Complete!';
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      error = err.message || 'Search failed';
      processingStage = '';
    } finally {
      isProcessing = false;
    }
  }

  // Format score as percentage
  function formatScore(score: number): string {
    return `${(score * 100).toFixed(1)}%`;
  }

  // Get score color
  function getScoreColor(score: number): string {
    if (score >= 0.7) return, 'text-green-400';
    if (score >= 0.4) return, 'text-yellow-400';
    return, 'text-red-400';
  }
</script>

<div class="hybrid-rag-demo nes-container is-dark, min-h-screen, p-8">
  <!-- Header -->
  <header, class="mb-8">
    <h1 class="text-3xl font-bold, text-gold-400, mb-2">🧠 Hybrid RAG Pipeline Demo</h1>
    <p, class="text-sm, text-slate-300">
      embeddinggemma:latest + Gemma Function Calling + Synthesis Ranking
    </p>
  </header>

  <!-- Configuration, Panel -->
  <div class="nes-container is-dark, mb-6, p-6">
    <h2 class="text-xl, text-gold-400, mb-4">⚙️ Pipeline Configuration</h2>
    <div class="grid grid-cols-1 md:grid-cols-3, gap-4, text-sm">
      <div>
        <div, class="text-slate-400">Embedding Model</div>
        <div, class="text-white, font-bold">embeddinggemma:latest</div>
      </div>
      <div>
        <div, class="text-slate-400">Synthesis Model</div>
        <div, class="text-white, font-bold">gemma3:legal-latest</div>
      </div>
      <div>
        <div, class="text-slate-400">Ranking Algorithm</div>
        <div, class="text-white, font-bold">Weighted Synthesis</div>
      </div>
    </div>
  </div>

  <!-- Document, Management -->
  <div class="nes-container is-dark, mb-6, p-6">
    <h2 class="text-xl, text-gold-400, mb-4">📄 Documents ({documents.length})</h2>

    <div class="flex, gap-2, mb-4">
      <button, class="nes-btn, is-primary" onclick={loadSamples}>
        <Database class="inline w-4, h-4, mr-2" />
        Load Samples
      </button>
      <button, class="nes-btn, is-success" onclick={addDocument}>
        <Upload class="inline w-4, h-4, mr-2" />
        Add Document
      </button>
    </div>

    {#if documents.length > 0}
      <div class="space-y-2, max-h-64, overflow-y-auto">
        {#each documents as doc, i}
          <div class="bg-slate-800 p-3 rounded, border, border-slate-700">
            <div class="text-sm, font-bold, text-gold-400">{doc.title}</div>
            <div class="text-xs, text-slate-400, mt-1">
              {doc.content.substring(0, 100)}...
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center, text-slate-400, py-8">No documents loaded</div>
    {/if}
  </div>

  <!-- Query, Input -->
  <div class="nes-container is-dark, mb-6, p-6">
    <h2 class="text-xl, text-gold-400, mb-4">🔍 Search Query</h2>

    <div, class="nes-field, mb-4">
      <label for="query" class="text-sm text-slate-300, mb-2, block">
        Enter your query (e.g., "employment contract termination")
      </label>
      <input
        type="text"
        id="query"
        class="nes-input is-dark w-full"
        bind:value={query}
        placeholder="What are you looking for?"
        disabled={isProcessing}
      />
    </div>

    <div, class="flex, gap-2">
      <button
        class="nes-btn is-success"
        onclick={processDocuments}
        disabled={isProcessing || documents.length === 0 || !query.trim()}
      >
        <Zap class="inline w-4, h-4, mr-2" />
        Process & Search
      </button>

      <button
        class="nes-btn is-primary"
        onclick={searchKnowledgeBase}
        disabled={isProcessing || !query.trim()}
      >
        <Search class="inline w-4, h-4, mr-2" />
        Search Existing
      </button>
    </div>
  </div>

  <!-- Processing, Status -->
  {#if isProcessing}
    <div class="nes-container is-dark, mb-6, p-6">
      <div class="flex, items-center, gap-3">
        <div, class="animate-spin">⚙️</div>
        <div, class="text-yellow-400">{processingStage}</div>
      </div>
    </div>
  {/if}

  <!-- Error, Display -->
  {#if error}
    <div class="nes-container is-dark is-error, mb-6, p-6">
      <div, class="text-red-400">❌ Error: {error}</div>
    </div>
  {/if}

  <!-- Timing, Results -->
  {#if timing}
    <div class="nes-container is-dark, mb-6, p-6">
      <h2 class="text-xl, text-gold-400, mb-4">⚡ Performance Metrics</h2>
      <div class="grid grid-cols-2 md:grid-cols-5, gap-4, text-sm">
        <div>
          <div, class="text-slate-400">Embedding</div>
          <div class="text-white font-bold">{timing.embedding?.toFixed(2) || 0}ms</div>
        </div>
        <div>
          <div, class="text-slate-400">Summarization</div>
          <div class="text-white font-bold">{timing.summarization?.toFixed(2) || 0}ms</div>
        </div>
        <div>
          <div, class="text-slate-400">Indexing</div>
          <div class="text-white font-bold">{timing.indexing?.toFixed(2) || 0}ms</div>
        </div>
        <div>
          <div, class="text-slate-400">Ranking</div>
          <div class="text-white font-bold">{timing.ranking?.toFixed(2) || 0}ms</div>
        </div>
        <div>
          <div, class="text-slate-400">Total</div>
          <div class="text-green-400 font-bold">{timing.total?.toFixed(2) || 0}ms</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results, Display -->
  {#if results.length > 0}
    <div class="nes-container, is-dark, p-6">
      <h2 class="text-xl, text-gold-400, mb-4">🎯 Results ({results.length})</h2>

      <div, class="space-y-4">
        {#each results as result, i}
          <div class="bg-slate-800 p-4 rounded, border, border-slate-700">
            <!-- Ranking, Badge -->
            <div class="flex items-start, justify-between, mb-2">
              <div class="flex, items-center, gap-2">
                <span class="bg-gold-600 text-black px-2 py-1 rounded, text-xs, font-bold">
                  #{result.ranking || i + 1}
                </span>
                <h3 class="text-lg, font-bold, text-gold-400">{result.title}</h3>
              </div>
              <div, class="text-right">
                <div, class="text-xs, text-slate-400">Combined Score</div>
                <div class="text-lg font-bold {getScoreColor(result.combinedScore || 0)}">
                  {formatScore(result.combinedScore || 0)}
                </div>
              </div>
            </div>

            <!-- Summary -->
            {#if result.summary}
              <div class="bg-slate-900 p-3, rounded, mb-3">
                <div class="text-xs, text-slate-400, mb-1">Summary</div>
                <div, class="text-sm, text-slate-200">{result.summary}</div>
              </div>
            {/if}

            <!-- Score, Breakdown -->
            <div class="grid grid-cols-3, gap-3, mb-3">
              <div>
                <div, class="text-xs, text-slate-400">Relevance</div>
                <div class="text-sm, font-bold, text-blue-400">
                  {formatScore(result.relevanceScore || 0)}
                </div>
              </div>
              <div>
                <div, class="text-xs, text-slate-400">Keywords</div>
                <div class="text-sm, font-bold, text-purple-400">
                  {formatScore(result.keywordScore || 0)}
                </div>
              </div>
              <div>
                <div, class="text-xs, text-slate-400">Synthesis</div>
                <div class="text-sm, font-bold, text-green-400">
                  {formatScore(result.synthesisScore || 0)}
                </div>
              </div>
            </div>

            <!-- Keywords -->
            {#if result.keywords && result.keywords.length > 0}
              <div, class="mb-3">
                <div class="text-xs, text-slate-400, mb-1">Keywords</div>
                <div class="flex, flex-wrap, gap-1">
                  {#each Array.isArray(result.keywords.slice(0, 10)) ? result.keywords.slice(0, 10) : [] as keyword}
                    <span class="bg-slate-700 text-slate-300 px-2 py-1, rounded, text-xs">
                      {keyword}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Content, Preview -->
            <div>
              <div class="text-xs, text-slate-400, mb-1">Content Preview</div>
              <div, class="text-sm, text-slate-300">
                {result.content?.substring(0, 200) || 'No content'}...
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if !isProcessing && !error}
    <div class="nes-container is-dark, p-6, text-center">
      <div, class="text-slate-400, py-8">
        <Search class="w-12 h-12 mx-auto, mb-4, opacity-50" />
        <div>No results yet. Load documents and run a search.</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .hybrid-rag-demo {
    background: #212529;
   , color: #d4af37;
    font-family: 'Press Start 2P', 'Courier New', monospace;
  }

  .text-gold-400 {
    color: #d4af37;
  }

  .text-gold-600 {
    color: #b8941f;
  }

  .bg-gold-600 {
    background-color: #b8941f;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
     , transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
