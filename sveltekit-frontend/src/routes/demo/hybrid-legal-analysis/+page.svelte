<!-- Enhanced Hybrid Legal Analysis 3D Demo Page -->
<script lang="ts">
  import HybridLegalAnalysis3D from "$lib/components/ui/enhanced-bits/HybridLegalAnalysis3D.svelte";
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { notifications } from "$lib/stores/notification";
  import { Code, FileText, BookOpen, Gavel, Zap, Brain, Activity } from "lucide-svelte";

  // Sample legal documents for testing
  const sampleLegalData = [
    {
      id: "contract-001",
      title: "Software Development Agreement - TechCorp",
      content: "This Software Development Agreement is entered into between TechCorp Inc. and DevPartner LLC for the creation of a comprehensive legal document management system. The project scope includes AI-powered document analysis, vector search capabilities, and compliance monitoring. Total project value: $2.5M over 18 months with milestone-based payments.",
      type: "contract" as const,
      priority: "high" as const,
      tags: ["software", "development", "AI", "compliance"]
    },
    {
      id: "evidence-002", 
      title: "Email Communication - Project Delays",
      content: "From: project.manager@techcorp.com. Subject: Critical Project Delays. Dear team, we're experiencing significant delays in the AI module development due to unexpected complexity in the vector embedding system. The PostgreSQL pgvector integration is taking longer than anticipated. We may need to extend the deadline by 3-4 weeks.",
      type: "evidence" as const,
      priority: "critical" as const,
      tags: ["delays", "AI", "technical", "timeline"]
    },
    {
      id: "case-003",
      title: "Intellectual Property Dispute - VectorAI vs TechCorp",
      content: "Patent infringement case filed regarding AI vector search technology. VectorAI claims TechCorp's implementation violates Patent US10,123,456 for 'Method and System for Semantic Document Analysis.' TechCorp argues prior art and independent development. Case involves $15M in damages and potential injunctive relief.",
      type: "case" as const,
      priority: "critical" as const,
      tags: ["patent", "infringement", "AI", "vectors"]
    },
    {
      id: "regulation-004",
      title: "GDPR Compliance Assessment",
      content: "Data protection impact assessment for the legal AI system. The system processes personal data from legal documents including client information, case details, and sensitive legal communications. Requires explicit consent mechanisms, data anonymization, and right to erasure implementation.",
      type: "regulation" as const,
      priority: "high" as const,
      tags: ["GDPR", "privacy", "compliance", "data"]
    }
  ];

  let componentInstance: HybridLegalAnalysis3D;
  let isLoading = $state(false);

  function loadSampleData() {
    isLoading = true;
    
    try {
      // Simulate loading sample data into the component
      if (componentInstance) {
        componentInstance.loadDocuments(sampleLegalData);
        
        notifications.add({
          type: "success",
          title: "Sample Data Loaded",
          message: `Loaded ${sampleLegalData.length} legal documents for 3D analysis`,
        });
      }
    } catch (error) {
      notifications.add({
        type: "error",
        title: "Loading Failed",
        message: `Failed to load sample data: ${error.message}`,
      });
    } finally {
      isLoading = false;
    }
  }

  function testEmbeddingGeneration() {
    isLoading = true;
    
    try {
      if (componentInstance) {
        componentInstance.generateEmbeddings();
        
        notifications.add({
          type: "info",
          title: "Embedding Generation Started",
          message: "Processing documents with EmbeddingGemma model",
        });
      }
    } catch (error) {
      notifications.add({
        type: "error",
        title: "Embedding Generation Failed",
        message: `Failed to generate embeddings: ${error.message}`,
      });
    } finally {
      isLoading = false;
    }
  }

  function run3DVisualization() {
    isLoading = true;
    
    try {
      if (componentInstance) {
        componentInstance.start3DVisualization();
        
        notifications.add({
          type: "success",
          title: "3D Visualization Started",
          message: "NES YoRHa 3D visualization is now active",
        });
      }
    } catch (error) {
      notifications.add({
        type: "error", 
        title: "3D Visualization Failed",
        message: `Failed to start visualization: ${error.message}`,
      });
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Hybrid Legal Analysis 3D Demo - Advanced AI Platform</title>
  <meta name="description" content="Demonstration of advanced legal document analysis with 3D visualization, vector embeddings, and NES YoRHa UI integration." />
</svelte:head>

<div class="container mx-auto p-6 max-w-7xl">
  <!-- Header Section -->
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-gray-900 mb-3 flex items-center">
      🧠⚡ Hybrid Legal Analysis 3D
    </h1>
    <p class="text-xl text-gray-600 mb-6">
      Advanced legal document analysis with 3D semantic visualization, powered by EmbeddingGemma and NES YoRHa UI
    </p>

    <!-- System Architecture Overview -->
    <div class="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6 mb-8">
      <h2 class="text-2xl font-semibold mb-4 flex items-center">
        <Code class="w-6 h-6 mr-3" />
        Advanced Architecture Integration
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <h3 class="font-semibold text-blue-800 mb-2 flex items-center">
            <Brain class="w-5 h-5 mr-2" />
            AI & Embeddings
          </h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• EmbeddingGemma 768D→384D quantization</li>
            <li>• PostgreSQL pgvector integration</li>
            <li>• Qdrant vector database fallback</li>
            <li>• Semantic similarity search</li>
            <li>• GPU-accelerated processing</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-4 shadow-sm">
          <h3 class="font-semibold text-purple-800 mb-2 flex items-center">
            <Zap class="w-5 h-5 mr-2" />
            3D Visualization
          </h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Three.js 3D semantic space</li>
            <li>• NES.css retro styling</li>
            <li>• YoRHa UI theme integration</li>
            <li>• Real-time document clustering</li>
            <li>• Interactive relationship mapping</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-4 shadow-sm">
          <h3 class="font-semibold text-green-800 mb-2 flex items-center">
            <FileText class="w-5 h-5 mr-2" />
            Legal AI Features
          </h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Contract analysis & risk assessment</li>
            <li>• Evidence classification</li>
            <li>• Case law relationship mapping</li>
            <li>• Compliance monitoring</li>
            <li>• Automated legal recommendations</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Control Panel -->
    <div class="flex flex-wrap gap-4 mb-8">
      <Button class="bits-btn"
        variant="outline"
        onclick={loadSampleData}
        disabled={isLoading}
      >
        {#snippet children()}
          <FileText class="w-4 h-4 mr-2" />
          Load Sample Legal Data
        {/snippet}
      </Button>

      <Button class="bits-btn"
        variant="outline"
        onclick={testEmbeddingGeneration}
        disabled={isLoading}
      >
        {#snippet children()}
          <Brain class="w-4 h-4 mr-2" />
          Generate Embeddings
        {/snippet}
      </Button>

      <Button class="bits-btn"
        variant="outline"
        onclick={run3DVisualization}
        disabled={isLoading}
      >
        {#snippet children()}
          <Zap class="w-4 h-4 mr-2" />
          Start 3D Visualization
        {/snippet}
      </Button>

      <div class="ml-auto bg-gray-100 px-4 py-2 rounded-md text-sm">
        <strong>Status:</strong> 
        {#if isLoading}
          <span class="text-orange-600">Processing...</span>
        {:else}
          <span class="text-green-600">Ready</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Component -->
  <div class="bg-white rounded-xl shadow-2xl border overflow-hidden">
    <div class="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4">
      <h2 class="text-xl font-semibold flex items-center">
        <Gavel class="w-5 h-5 mr-2" />
        Hybrid Legal Analysis 3D Interface
      </h2>
      <p class="text-gray-300 text-sm mt-1">
        Interactive 3D semantic analysis with NES YoRHa theming
      </p>
    </div>
    
    <div class="p-6">
      <HybridLegalAnalysis3D 
        bind:this={componentInstance}
        caseId="demo-hybrid-analysis"
        height="700px"
        enableDebugMode={true}
        showPerformanceStats={true}
      />
    </div>
  </div>

  <!-- Feature Showcase -->
  <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="bg-blue-50 rounded-xl p-6">
      <h3 class="text-xl font-semibold mb-4 flex items-center text-blue-800">
        <BookOpen class="w-6 h-6 mr-2" />
        Sample Use Cases
      </h3>
      <div class="space-y-3">
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <strong class="text-blue-700">Contract Risk Analysis:</strong><br />
          <span class="text-sm text-gray-600">
            "Analyze all contract clauses and identify potential legal risks with confidence scoring"
          </span>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <strong class="text-blue-700">Document Similarity:</strong><br />
          <span class="text-sm text-gray-600">
            "Find semantically similar clauses across multiple legal documents using 3D clustering"
          </span>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <strong class="text-blue-700">Evidence Mapping:</strong><br />
          <span class="text-sm text-gray-600">
            "Visualize relationships between evidence items and case arguments in 3D space"
          </span>
        </div>
      </div>
    </div>

    <div class="bg-green-50 rounded-xl p-6">
      <h3 class="text-xl font-semibold mb-4 flex items-center text-green-800">
        <Zap class="w-6 h-6 mr-2" />
        Technical Capabilities
      </h3>
      <div class="space-y-3">
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>EmbeddingGemma model with 768D→384D quantization</span>
        </div>
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>PostgreSQL pgvector + Qdrant hybrid backend</span>
        </div>
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>GPU-accelerated vector operations with CUDA</span>
        </div>
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>Three.js 3D visualization with WebGL optimization</span>
        </div>
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>NES.css + YoRHa UI retro-futuristic theming</span>
        </div>
        <div class="flex items-center text-sm">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <span>Real-time health monitoring and fallback systems</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Technical Implementation Notes -->
  <div class="mt-8 bg-gray-50 rounded-xl p-6">
    <h3 class="text-lg font-semibold mb-3 text-gray-800">Implementation Notes</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
      <div>
        <h4 class="font-medium text-gray-800 mb-2">Svelte 5 Integration:</h4>
        <ul class="space-y-1">
          <li>• Uses <code>$state()</code>, <code>$effect()</code>, and <code>$derived()</code> runes</li>
          <li>- Modern snippet pattern instead of legacy slots</li>
          <li>• TypeScript strict mode with comprehensive interfaces</li>
          <li>• UnoCSS atomic styling with custom shortcuts</li>
        </ul>
      </div>
      <div>
        <h4 class="font-medium text-gray-800 mb-2">Backend Integration:</h4>
        <ul class="space-y-1">
          <li>• Hybrid embedding API with automatic fallback</li>
          <li>• PostgreSQL 17 with pgvector extension</li>
          <li>• Qdrant vector database for distributed search</li>
          <li>• Redis caching with memory fallback</li>
        </ul>
      </div>
    </div>
  </div>
</div>
