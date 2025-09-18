<!-- RAG System Demo Page -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import AskAI from "$lib/components/ai/AskAI.svelte";
  import EvidenceBoardLayout from '$lib/components/layout/EvidenceBoardLayout.svelte';
  import EvidenceCard from '$lib/components/ui/EvidenceCard.svelte';
  import {
    AlertTriangle,
    Brain,
    CheckCircle,
    Database,
    Search,
    Zap,
  } from "lucide-svelte";
  import { onMount } from "svelte";

  interface SystemStatus {
    database: boolean;
    qdrant: boolean;
    embeddings: boolean;
    vectorSearch: boolean;
  }
  let systemStatus: SystemStatus = $state({
    database: false,
    qdrant: false,
    embeddings: false,
    vectorSearch: false,
  });

  let isLoadingStatus = $state(true);
  let testQuery = $state("");
  interface TestResults {
    error?: string;
    data?: unknown;
    results?: Array;
    executionTime?: number;
    source?: string;
  }
  let testResults: TestResults | null = $state(null);
  let isTestingSearch = $state(false);

  // Demo queries
  const demoQueries = [
    "What are the most common types of evidence in fraud cases?",
    "Explain the legal requirements for search warrants",
    "How should digital evidence be preserved?",
    "What are the key elements of a criminal investigation?",
    "Summarize the chain of custody procedures",
  ];

  onMount(async () => {
    await checkSystemStatus();
  });

  async function checkSystemStatus() {
    isLoadingStatus = true;

    try {
      // Check database connection
      const dbResponse = await fetch("/api/search/cases?limit=1");
      systemStatus.database = dbResponse.ok;

      // Check Qdrant
      const qdrantResponse = await fetch("/api/qdrant");
      systemStatus.qdrant = qdrantResponse.ok;

      // Check embeddings
      const embeddingResponse = await fetch("/api/embeddings");
      systemStatus.embeddings = embeddingResponse.ok;

      // Check vector search
      const vectorResponse = await fetch("/api/search/vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          options: { limit: 1 },
        }),
      });
      systemStatus.vectorSearch = vectorResponse.ok;
    } catch (error) {
      console.error("Status check failed:", error);
    } finally {
      isLoadingStatus = false;
  }}
  async function testVectorSearch() {
    if (!testQuery.trim()) return;

    isTestingSearch = true;
    testResults = null;

    try {
      const response = await fetch("/api/search/vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: testQuery,
          options: {
            limit: 5,
            threshold: 0.5,
            searchType: "hybrid",
          },
        }),
      });

      if ((response as { ok?: unknown; json?: unknown }).ok) {
        const data = await (response as { ok?: unknown; json?: unknown }).json();
        testResults = (data as { data?: unknown }).data;
      } else {
        const error = await (response as { ok?: unknown; json?: unknown }).json();
        testResults = { error: error.error };
  }
    } catch (error) {
      testResults = { error: "Network error" };
    } finally {
      isTestingSearch = false;
  }}
  function handleAIResponse(event: CustomEvent) {
    console.log("AI Response:", event.detail);
  }
  function handleReferenceClick(event: CustomEvent) {
    console.log("Reference clicked:", event.detail);
  }
  function getStatusIcon(status: boolean) {
    return status ? CheckCircle : AlertTriangle;
  }
  function getStatusColor(status: boolean) {
    return status ? "text-green-600" : "text-red-600";
  }
</script>

<svelte:head>
  <title>RAG System Demo - AI Legal Assistant</title>
</svelte:head>

<EvidenceBoardLayout
  title="RAG SYSTEM DEMO"
  caseInfo="AI LEGAL ASSISTANT"
  demoMode={true}
  {rightPanel}
>
  {#snippet rightPanel()}
    <!-- System Status Panel -->
    <div class="nes-container is-rounded evidence-panel mb-4">
      <h3 class="nes-text is-primary mb-3">🔧 System Status</h3>
      <div class="space-y-2">
        <EvidenceCard
          title="Database"
          description={systemStatus.database ? "Connected" : "Offline"}
          status={systemStatus.database ? "active" : "pending"}
          type="database"
          connections={1}
        />
        <EvidenceCard
          title="Qdrant Vector DB"
          description={systemStatus.qdrant ? "Ready" : "Unavailable"}
          status={systemStatus.qdrant ? "active" : "pending"}
          type="vector"
          connections={1}
        />
        <EvidenceCard
          title="Embeddings"
          description={systemStatus.embeddings ? "Active" : "Disabled"}
          status={systemStatus.embeddings ? "active" : "pending"}
          type="ai"
          connections={1}
        />
        <EvidenceCard
          title="Vector Search"
          description={systemStatus.vectorSearch ? "Operational" : "Error"}
          status={systemStatus.vectorSearch ? "active" : "pending"}
          type="search"
          connections={3}
        />
      </div>

      <button
        class="nes-btn is-primary w-full mt-3 text-xs"
        onclick={() => checkSystemStatus()}
        disabled={isLoadingStatus}
      >
        {isLoadingStatus ? "Checking..." : "🔄 Refresh Status"}
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-warning mb-3">⚡ Quick Actions</h3>
      <div class="space-y-2">
        <button
          class="nes-btn is-success w-full text-xs"
          onclick={() => window.open("/api/embeddings", "_blank")}
        >
          📊 Embeddings API
        </button>
        <button
          class="nes-btn is-success w-full text-xs"
          onclick={() => window.open("/api/qdrant", "_blank")}
        >
          🔍 Qdrant Status
        </button>
        <button
          class="nes-btn is-success w-full text-xs"
          onclick={() => window.open("/cases", "_blank")}
        >
          📁 Case Database
        </button>
      </div>
    </div>
  {/snippet}

  <!-- Main Demo Content -->
  <main class="space-y-6">
    <!-- AI Assistant Section -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-success mb-4">🤖 AI Legal Assistant</h3>
      <p class="text-gray-600 mb-4">
        Ask questions about legal procedures, cases, and evidence. The AI uses vector search to find relevant information.
      </p>

      <div class="mb-4">
        <AskAI
          caseId=""
          evidenceIds={[]}
          placeholder="Ask about legal procedures, cases, or evidence..."
          showReferences={true}
          enableVoiceInput={true}
          maxHeight="500px"
          response={handleAIResponse}
          referenceclicked={handleReferenceClick}
        />
      </div>
    </div>

    <!-- Sample Questions Grid -->
    <div class="nes-container is-rounded evidence-panel">
      <h4 class="nes-text is-warning mb-4">📝 Try These Sample Questions:</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each demoQueries as query}
          <button
            class="nes-btn is-normal text-xs p-2 text-left"
            onclick={() => (testQuery = query)}
          >
            "{query}"
          </button>
        {/each}
      </div>
    </div>

    <!-- Vector Search Test -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-primary mb-4">🔍 Vector Search Test</h3>
      <p class="text-gray-600 mb-4">
        Test the vector similarity search directly to see raw results.
      </p>

      <div class="flex gap-2 mb-4">
        <input
          bind:value={testQuery}
          placeholder="Enter search query..."
          class="nes-input flex-1"
        />
        <button
          onclick={() => testVectorSearch()}
          disabled={!testQuery.trim() || isTestingSearch}
          class="nes-btn is-primary"
        >
          {isTestingSearch ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {#if testResults}
        <div class="nes-container is-rounded bg-white p-4">
          {#if testResults.error}
            <div class="nes-text is-error">
              <strong>Error:</strong>
              {testResults.error}
            </div>
          {:else}
            <div class="mb-3">
              <span class="nes-text is-success">
                Found {testResults.results?.length || 0} results in {testResults.executionTime || 0}ms
                (Source: {testResults.source || "unknown"})
              </span>
            </div>

            {#if testResults.results && testResults.results.length > 0}
              <div class="space-y-3">
                {#each testResults.results as result}
                  <EvidenceCard
                    title={(result as { title?: unknown; content?: unknown; type?: unknown; score?: unknown; source?: unknown }).title}
                    description={(result as { title?: unknown; content?: unknown; type?: unknown; score?: unknown; source?: unknown }).content.substring(0, 200) + "..."}
                    status="active"
                    type={(result as { title?: unknown; content?: unknown; type?: unknown; score?: unknown; source?: unknown }).type}
                    connections={Math.round.score * 100)}
                  >
                    {#snippet children()}
                      <div class="flex justify-between text-xs">
                        <span>Match: {Math.round.score * 100)}%</span>
                        <span>Source: {(result as { title?: unknown; content?: unknown; type?: unknown; score?: unknown; source?: unknown }).source}</span>
                      </div>
                    {/snippet}
                  </EvidenceCard>
                {/each}
              </div>
            {:else}
              <p class="nes-text">No results found.</p>
            {/if}
        </div>
      {/if}
    </div>

    <!-- System Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <EvidenceCard
        title="🗄️ Vector Database"
        description="PostgreSQL + pgvector / Qdrant"
        status="active"
        type="database"
        connections={2}
      />
      <EvidenceCard
        title="🧠 Embedding Model"
        description="OpenAI text-embedding-ada-002"
        status="active"
        type="ai"
        connections={1}
      />
      <EvidenceCard
        title="🤖 Large Language Model"
        description="GPT-3.5-turbo / Ollama (Local)"
        status="active"
        type="llm"
        connections={3}
      />
      <EvidenceCard
        title="🔍 Search Types"
        description="Similarity, Hybrid, Semantic"
        status="active"
        type="search"
        connections={3}
      />
    </div>

    <!-- Setup Instructions -->
    <div class="nes-container is-rounded evidence-panel">
      <h3 class="nes-text is-warning mb-4">⚙️ Setup Instructions</h3>
      <div class="space-y-3">
        <div class="nes-container is-rounded bg-gray-50 p-3">
          <p><strong>1. Start the services:</strong> <code class="nes-text is-primary">npm run db:start</code></p>
        </div>
        <div class="nes-container is-rounded bg-gray-50 p-3">
          <p><strong>2. Initialize vector search:</strong> <code class="nes-text is-primary">npm run vector:init</code></p>
        </div>
        <div class="nes-container is-rounded bg-gray-50 p-3">
          <p><strong>3. Sync existing data:</strong> <code class="nes-text is-primary">npm run vector:sync</code></p>
        </div>
        <div class="nes-container is-rounded bg-gray-50 p-3">
          <p><strong>4. Configure environment:</strong> Set OpenAI API key in <code class="nes-text is-primary">.env</code></p>
        </div>
      </div>
    </div>
  </main>
</EvidenceBoardLayout>

