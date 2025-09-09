<!-- EmbeddingGemma Chat Demo Page -->
<script lang="ts">
  import EmbeddingGemmaChat from "$lib/components/ui/enhanced-bits/EmbeddingGemmaChat.svelte";
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { notifications } from "$lib/stores/notification";
  import { Code, FileText, BookOpen, Gavel } from "lucide-svelte";

  // Sample legal documents for demo
  const sampleLegalDocuments = [
    "This Non-Disclosure Agreement (NDA) is entered into on [Date] between [Company Name], a [State] corporation (the 'Disclosing Party'), and [Recipient Name], an individual/entity (the 'Receiving Party'). The purpose of this agreement is to protect confidential information that may be disclosed during business discussions. The Receiving Party agrees not to disclose, use, or reproduce any confidential information without written consent from the Disclosing Party. This agreement shall remain in effect for a period of three (3) years from the date of signing.",
    
    "Employment Agreement between TechCorp Inc. and John Smith, effective January 1, 2024. Position: Senior Software Engineer. Salary: $120,000 annually. Benefits include health insurance, dental coverage, 401(k) matching up to 4%, and 20 days paid time off. Employee agrees to maintain confidentiality of proprietary information and assigns all work-related intellectual property to the company. This agreement may be terminated by either party with 30 days written notice.",
    
    "Software License Agreement for ABC Software v2.0. This agreement grants the user a non-exclusive, non-transferable license to use the software on a single computer. The software is provided 'as-is' without warranty. User may not reverse engineer, decompile, or distribute copies. License fee is $299 for perpetual use with one year of support and updates. Additional support available at $99/year.",
    
    "Real Estate Purchase Agreement for property located at 123 Oak Street, Anytown, ST 12345. Purchase price: $450,000. Buyer: Jane Doe. Seller: ABC Properties LLC. Closing date: March 15, 2024. Property sold 'as-is' with standard title insurance. Buyer has 10 days for inspection. Earnest money deposit: $10,000. Financing contingency expires February 20, 2024.",
    
    "Partnership Agreement between Alpha Ventures and Beta Innovations for joint development of renewable energy projects. Each party contributes $500,000 initial capital. Profits and losses shared 60/40 (Alpha/Beta). Management decisions require majority vote. Partnership term: 5 years with automatic renewal. Either party may withdraw with 180 days notice. Dispute resolution through binding arbitration."
  ];

  const sampleCaseDocuments = [
    "Smith v. Jones - Contract Dispute Case No. 2024-CV-1234. Plaintiff alleges defendant breached software development contract by failing to deliver working application by agreed deadline of December 1, 2023. Damages sought: $250,000 for lost revenue and additional development costs. Defendant claims force majeure due to unforeseen technical complications and requests contract modification.",
    
    "ABC Corp v. XYZ Ltd - Intellectual Property Infringement. Patent lawsuit filed regarding mobile app user interface design. Plaintiff holds Patent No. 10,123,456 for 'Method and System for Touch-Based Navigation.' Alleges defendant's app infringes claims 1, 3, and 7. Seeking injunctive relief and $2.5M damages. Defendant filed invalidity counterclaims.",
    
    "Environmental Compliance Matter - EPA vs. GreenTech Manufacturing. Alleged violations of Clean Water Act discharge limits at facility in Ohio. Penalties proposed: $1.2M civil penalty plus required environmental remediation estimated at $800K. Company disputes measurements and seeks independent testing. Settlement negotiations ongoing.",
    
    "Employment Discrimination Case - Sarah Johnson v. MegaCorp Inc. Title VII and ADA claims alleging failure to accommodate disability and subsequent wrongful termination. Plaintiff seeks reinstatement, back pay ($85,000), and compensatory damages. Company claims legitimate business reasons for termination unrelated to disability.",
    
    "Securities Fraud Investigation - SEC v. Innovative Investments LLC. Charges include misrepresentation of investment risks, failure to disclose conflicts of interest, and improper use of client funds. Alleged damages to investors: $12M. Defendants deny wrongdoing and claim full disclosure was provided through regulatory filings."
  ];

  let currentDocuments = $state<string[]>([]);
  let documentType = $state<'contracts' | 'cases' | 'custom'>('contracts');
  let caseId = $state<string>('demo-case-12345');

  function loadSampleDocuments(type: 'contracts' | 'cases') {
    documentType = type;
    if (type === 'contracts') {
      currentDocuments = [...sampleLegalDocuments];
      caseId = 'demo-contracts';
    } else {
      currentDocuments = [...sampleCaseDocuments];
      caseId = 'demo-litigation';
    }
    
    notifications.add({
      type: "success",
      title: "Documents Loaded",
      message: `Loaded ${currentDocuments.length} sample ${type} for analysis`,
    });
  }

  function clearDocuments() {
    currentDocuments = [];
    documentType = 'custom';
    caseId = '';
    
    notifications.add({
      type: "info",
      title: "Documents Cleared",
      message: "All documents removed from context",
    });
  }
</script>

<svelte:head>
  <title>EmbeddingGemma Chat Demo - Legal AI Platform</title>
  <meta name="description" content="Demonstration of EmbeddingGemma-powered AI chat with advanced RAG capabilities for legal document analysis." />
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
  <!-- Header Section -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🧠 EmbeddingGemma AI Chat Assistant
    </h1>
    <p class="text-lg text-gray-600 mb-4">
      Advanced semantic AI powered by Google's EmbeddingGemma model with comprehensive legal document analysis capabilities.
    </p>
    
    <!-- Architecture Overview -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
      <h2 class="text-lg font-semibold mb-2 flex items-center">
        <Code class="w-5 h-5 mr-2" />
        Infrastructure Integration
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="bg-white rounded p-3">
          <h3 class="font-medium text-blue-700">🔥 EmbeddingGemma Model</h3>
          <p class="text-gray-600 mt-1">768D → 384D quantized embeddings with semantic understanding</p>
        </div>
        <div class="bg-white rounded p-3">
          <h3 class="font-medium text-purple-700">⚡ GPU Acceleration</h3>
          <p class="text-gray-600 mt-1">RTX 3060 Ti optimized with Redis + Postgres caching</p>
        </div>
        <div class="bg-white rounded p-3">
          <h3 class="font-medium text-green-700">🔍 Enhanced RAG</h3>
          <p class="text-gray-600 mt-1">Semantic search with cosine similarity and context ranking</p>
        </div>
      </div>
    </div>

    <!-- Sample Data Controls -->
    <div class="flex flex-wrap gap-4 mb-6">
      <Button class="bits-btn bits-btn"
        variant="outline"
        onclick={() => loadSampleDocuments('contracts')}
      >
        {#snippet children()}
          <FileText class="w-4 h-4 mr-2" />
          Load Contract Samples ({sampleLegalDocuments.length})
        {/snippet}
      </Button>

      <Button class="bits-btn bits-btn"
        variant="outline"
        onclick={() => loadSampleDocuments('cases')}
      >
        {#snippet children()}
          <Gavel class="w-4 h-4 mr-2" />
          Load Litigation Cases ({sampleCaseDocuments.length})
        {/snippet}
      </Button>

      <Button class="bits-btn bits-btn"
        variant="outline"
        onclick={clearDocuments}
        disabled={currentDocuments.length === 0}
      >
        {#snippet children()}
          Clear Documents
        {/snippet}
      </Button>

      <div class="ml-auto bg-gray-100 px-3 py-2 rounded-md text-sm">
        <strong>Current:</strong> {currentDocuments.length} documents
        {#if documentType !== 'custom'}
          <span class="text-gray-500">({documentType})</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Chat Interface -->
  <div class="bg-white rounded-lg shadow-lg border">
    <EmbeddingGemmaChat
      height="600px"
      {caseId}
      documents={currentDocuments}
      showDocumentAnalysis={true}
    />
  </div>

  <!-- Usage Examples -->
  <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-blue-50 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-3 flex items-center text-blue-800">
        <BookOpen class="w-5 h-5 mr-2" />
        Sample Queries
      </h3>
      <div class="space-y-2 text-sm">
        <div class="bg-white rounded p-2">
          <strong>Contract Analysis:</strong><br />
          "Identify all confidentiality clauses and their duration across these contracts"
        </div>
        <div class="bg-white rounded p-2">
          <strong>Risk Assessment:</strong><br />
          "What potential legal risks do you identify in these agreements?"
        </div>
        <div class="bg-white rounded p-2">
          <strong>Compliance Check:</strong><br />
          "Are there any missing standard clauses that should be included?"
        </div>
        <div class="bg-white rounded p-2">
          <strong>Comparison:</strong><br />
          "Compare the termination clauses across all loaded documents"
        </div>
      </div>
    </div>

    <div class="bg-green-50 rounded-lg p-6">
      <h3 class="text-lg font-semibold mb-3 flex items-center text-green-800">
        <Activity class="w-5 h-5 mr-2" />
        Features Demonstrated
      </h3>
      <div class="space-y-2 text-sm">
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          EmbeddingGemma model integration with 768D→384D quantization
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          GPU-accelerated embedding cache with Redis + Postgres
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          RabbitMQ worker integration for async processing
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Semantic similarity search with cosine distance
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Real-time health monitoring and service diagnostics
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Fallback mechanisms for robust operation
        </div>
      </div>
    </div>
  </div>

  <!-- Technical Notes -->
  <div class="mt-6 bg-gray-50 rounded-lg p-4">
    <h3 class="text-sm font-semibold mb-2 text-gray-700">Technical Implementation Notes:</h3>
    <ul class="text-xs text-gray-600 space-y-1">
      <li>• Uses Svelte 5 with $state(), $effect(), and snippet patterns</li>
      <li>• Integrates with existing EmbeddingAdapter, EmbeddingCacheMiddleware, and RAG API</li>
      <li>• Supports both enhanced service and fallback API modes for reliability</li>
      <li>• Includes comprehensive error handling and user feedback mechanisms</li>
      <li>• Demonstrates legal document context with practice area and jurisdiction tagging</li>
      <li>• Real-time service health monitoring with infrastructure status indicators</li>
    </ul>
  </div>
</div>