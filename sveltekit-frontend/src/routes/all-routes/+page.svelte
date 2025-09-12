<script lang="ts">
  import { onMount } from 'svelte';
  import { CheckCircle, AlertTriangle, Clock, Target, ExternalLink, Info, Code, BookOpen, X, Gamepad2, Zap, Brain } from 'lucide-svelte';
  import Dialog from '$lib/components/ui/enhanced-bits/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import CardContent from '$lib/components/ui/CardContent.svelte';
  import CardHeader from '$lib/components/ui/CardHeader.svelte';
  import CardTitle from '$lib/components/ui/CardTitle.svelte';
  import type { RoutePageData } from './+page.server';

  interface Props {
    data: RoutePageData;
  }

  let { data }: Props = $props();

  // Modal state
  let showModal = $state(false);
  let selectedRoute = $state<any>(null);
  let searchQuery = $state('');
  let selectedCategory = $state<string>('all');

  // Modal functions
  const openModal = (route: any, category: string) => {
    selectedRoute = { ...route, category };
    showModal = true;
  };

  const closeModal = () => {
    showModal = false;
    selectedRoute = null;
  };

  // Search and filter functionality
  const filteredRoutes = $derived(() => {
    return data.routesByCategory.filter(category => {
      if (selectedCategory !== 'all' && category.name !== selectedCategory) return false;
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();
      return category.name.toLowerCase().includes(searchLower) ||
             category.routes.some(route =>
               route.path.toLowerCase().includes(searchLower) ||
               route.description?.toLowerCase().includes(searchLower)
             );
    });
  });

  // Keyboard event handling for modal
  $effect(() => {
    if (showModal) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeModal();
        }
      };

      document.addEventListener('keydown', handleKeydown);

      return () => {
        document.removeEventListener('keydown', handleKeydown);
      };
    }
  });

  // Route documentation and scaffolding data
  const getRouteInfo = (path: string) => {
    const routeInfoMap: Record<string, any> = {
      '/': {
        description: 'Main dashboard providing overview of legal cases, recent activity, and quick access to AI tools.',
        purpose: 'Central hub for legal professionals to access all platform features',
        scaffold: `<!-- Home Dashboard Page -->
<script lang="ts">
  import DashboardStats from '$lib/components/DashboardStats.svelte';
  import RecentCases from '$lib/components/RecentCases.svelte';
  import QuickActions from '$lib/components/QuickActions.svelte';

  let stats = $state({ cases: 0, documents: 0, analyses: 0 });
<\/script>

<div class="dashboard-container">
  <DashboardStats {stats} />
  <RecentCases />
  <QuickActions />
</div>`,
        features: ['Dashboard statistics', 'Recent case preview', 'Quick action shortcuts', 'Activity feed']
      },
      '/ai': {
        description: 'AI assistant interface for legal research, document analysis, and case insights.',
        purpose: 'Provide intelligent AI-powered legal assistance with chat interface',
        scaffold: `<!-- AI Assistant Page -->
<script lang="ts">
  import ChatInterface from '$lib/components/ai/ChatInterface.svelte';
  import AIModelSelector from '$lib/components/ai/ModelSelector.svelte';

  let selectedModel = $state('gemma-3');
  let conversationId = $state(null);
<\/script>

<div class="ai-container">
  <AIModelSelector bind:selectedModel />
  <ChatInterface {conversationId} {selectedModel} />
</div>`,
        features: ['Multi-model chat interface', 'Legal research assistance', 'Document analysis', 'Case insights']
      },
      '/cases': {
        description: 'Comprehensive case management system with AI-powered insights and document organization.',
        purpose: 'Manage legal cases with evidence tracking, timeline, and AI analysis',
        scaffold: `<!-- Case Management Page -->
<script lang="ts">
  import CaseList from '$lib/components/cases/CaseList.svelte';
  import CaseFilters from '$lib/components/cases/CaseFilters.svelte';
  import CreateCaseButton from '$lib/components/cases/CreateCaseButton.svelte';

  let cases = $state([]);
  let filters = $state({ status: 'all', priority: 'all' });
<\/script>

<div class="cases-container">
  <div class="cases-header">
    <CaseFilters bind:filters />
    <CreateCaseButton />
  </div>
  <CaseList {cases} {filters} />
</div>`,
        features: ['Case CRUD operations', 'Evidence attachments', 'Timeline tracking', 'AI case scoring']
      },
      '/evidence': {
        description: 'Evidence processing and analysis with AI-powered insights and secure document handling.',
        purpose: 'Manage and analyze evidence with GPU-accelerated processing',
        scaffold: `<!-- Evidence Management Page -->
<script lang="ts">
  import EvidenceUploader from '$lib/components/evidence/Uploader.svelte';
  import EvidenceProcessor from '$lib/components/evidence/Processor.svelte';
  import EvidenceViewer from '$lib/components/evidence/Viewer.svelte';

  let evidenceList = $state([]);
  let processingQueue = $state([]);
<\/script>

<div class="evidence-container">
  <EvidenceUploader bind:evidenceList />
  <EvidenceProcessor bind:processingQueue />
  <EvidenceViewer {evidenceList} />
</div>`,
        features: ['Secure file upload', 'GPU-accelerated processing', 'AI content analysis', 'Metadata extraction']
      },
      '/admin': {
        description: 'Administrative dashboard for system monitoring, user management, and platform configuration.',
        purpose: 'System administration and monitoring for legal AI platform',
        scaffold: `<!-- Admin Dashboard Page -->
<script lang="ts">
  import SystemHealth from '$lib/components/admin/SystemHealth.svelte';
  import UserManagement from '$lib/components/admin/UserManagement.svelte';
  import PerformanceMetrics from '$lib/components/admin/PerformanceMetrics.svelte';

  let systemStatus = $state({ healthy: true, services: {} });
<\/script>

<div class="admin-container">
  <SystemHealth bind:systemStatus />
  <UserManagement />
  <PerformanceMetrics />
</div>`,
        features: ['System health monitoring', 'User management', 'Performance metrics', 'Service configuration']
      },
      '/upload': {
        description: 'Document upload interface with drag-and-drop, batch processing, and AI preprocessing.',
        purpose: 'Secure document upload with AI-powered preprocessing and metadata extraction',
        scaffold: `<!-- Document Upload Page -->
<script lang="ts">
  import FileDropzone from '$lib/components/upload/FileDropzone.svelte';
  import UploadProgress from '$lib/components/upload/UploadProgress.svelte';
  import ProcessingQueue from '$lib/components/upload/ProcessingQueue.svelte';

  let uploadQueue = $state([]);
  let processingStatus = $state({});
<\/script>

<div class="upload-container">
  <FileDropzone bind:uploadQueue />
  <UploadProgress {uploadQueue} />
  <ProcessingQueue {processingStatus} />
</div>`,
        features: ['Drag-and-drop upload', 'Batch processing', 'AI preprocessing', 'Progress tracking']
      },
      '/webgpu': {
        description: 'WebGPU demonstration showcasing browser-based GPU acceleration for legal computations.',
        purpose: 'Demonstrate WebGPU capabilities for legal AI processing',
        scaffold: `<!-- WebGPU Demo Page -->
<script lang="ts">
  import WebGPURenderer from '$lib/components/gpu/WebGPURenderer.svelte';
  import ComputeShaderDemo from '$lib/components/gpu/ComputeShaderDemo.svelte';
  import PerformanceBenchmark from '$lib/components/gpu/PerformanceBenchmark.svelte';

  let gpuSupported = $state(false);
  let computeResults = $state([]);

  onMount(async () => {
    gpuSupported = !!navigator.gpu;
  });
<\/script>

<div class="webgpu-container">
  {#if gpuSupported}
    <WebGPURenderer />
    <ComputeShaderDemo bind:computeResults />
    <PerformanceBenchmark />
  {:else}
    <p>WebGPU not supported in this browser</p>
  {/if}
</div>`,
        features: ['GPU detection', 'Compute shaders', 'Performance benchmarking', 'Browser compatibility']
      }
    };

    return routeInfoMap[path] || {
      description: 'This route provides specialized functionality for the Legal AI platform.',
      purpose: 'Part of the comprehensive legal technology suite',
      scaffold: `<!-- ${path} Page -->
<script lang="ts">
  // Import required components
  import { onMount } from 'svelte';

  let pageData = $state({});

  onMount(async () => {
    // Initialize page
  });
<\/script>

<div class="page-container">
  <h1>Page Title</h1>
  <p>Page content goes here</p>
</div>`,
      features: ['Custom functionality', 'Svelte 5 implementation', 'TypeScript support']
    };
  };

  // Comprehensive route categories based on your Legal AI platform
  const routeCategories = [
    {
      category: "🏠 Core Pages",
      routes: [
        { path: "/", title: "Home Dashboard", status: "working" },
        { path: "/all-routes", title: "Route Manager", status: "working" }
      ]
    },
    {
      category: "🤖 AI Features",
      routes: [
        { path: "/ai", title: "AI Overview", status: "working" },
        { path: "/ai/dashboard", title: "AI Dashboard", status: "working" },
        { path: "/ai/modular", title: "Modular AI Experience", status: "working" },
        { path: "/ai/orchestrator", title: "AI Orchestrator", status: "working" },
        { path: "/ai/enhanced-mcp", title: "Enhanced MCP", status: "working" },
        { path: "/ai/case-scoring", title: "Case Scoring", status: "demo" },
        { path: "/ai/document-drafting", title: "Document Drafting", status: "demo" },
        { path: "/ai/pattern-detection", title: "Pattern Detection", status: "demo" },
        { path: "/ai/recommendations", title: "AI Recommendations", status: "demo" },
        { path: "/ai/processing", title: "AI Processing", status: "demo" },
        { path: "/ai-assistant", title: "AI Assistant", status: "working" }
      ]
    },
    {
      category: "⚖️ Legal Operations",
      routes: [
        { path: "/cases", title: "Case Management", status: "working" },
        { path: "/cases/create", title: "Create Case", status: "demo" },
        { path: "/cases/[caseId]", title: "Case Details", status: "working" },
        { path: "/cases/[caseId]/rag", title: "Case RAG Analysis", status: "demo" },
        { path: "/evidence", title: "Evidence Management", status: "working" },
        { path: "/evidence/analysis", title: "Evidence Analysis", status: "demo" },
        { path: "/evidence/processing", title: "Evidence Processing", status: "demo" },
        { path: "/legal", title: "Legal Tools", status: "working" },
        { path: "/legal/research", title: "Legal Research", status: "demo" },
        { path: "/legal/templates", title: "Legal Templates", status: "demo" }
      ]
    },
    {
      category: "📄 Document Management",
      routes: [
        { path: "/upload", title: "Document Upload", status: "working" },
        { path: "/documents", title: "Document Library", status: "working" },
        { path: "/documents/viewer", title: "Document Viewer", status: "demo" },
        { path: "/documents/editor", title: "Document Editor", status: "demo" },
        { path: "/pdf-viewer", title: "PDF Viewer", status: "working" }
      ]
    },
    {
      category: "🔐 Authentication & Admin",
      routes: [
        { path: "/auth", title: "Authentication", status: "working" },
        { path: "/auth/login", title: "Login", status: "working" },
        { path: "/auth/login/simple", title: "Simple Login", status: "working" },
        { path: "/admin", title: "Admin Dashboard", status: "working" },
        { path: "/admin/cluster", title: "Cluster Management", status: "working" },
        { path: "/admin/gpu-demo", title: "GPU Demo", status: "working" },
        { path: "/admin/performance-dashboard", title: "Performance", status: "working" },
        { path: "/admin/users", title: "User Management", status: "working" }
      ]
    },
    {
      category: "🎮 YoRHa Interface",
      routes: [
        { path: "/yorha", title: "YoRHa Main", status: "working" },
        { path: "/yorha-dashboard", title: "YoRHa Dashboard", status: "working" },
        { path: "/yorha-demo", title: "YoRHa Demo", status: "working" },
        { path: "/yorha-home", title: "YoRHa Home", status: "working" },
        { path: "/yorha-terminal", title: "YoRHa Terminal", status: "working" },
        { path: "/yorha-test", title: "YoRHa Test", status: "working" }
      ]
    },
    {
      category: "🔬 Technical Demos",
      routes: [
        { path: "/demo", title: "Demo Overview", status: "demo" },
        { path: "/demo/ai-assistant", title: "AI Assistant Demo", status: "demo" },
        { path: "/demo/ai-complete-test", title: "AI Complete Test", status: "demo" },
        { path: "/demo/ai-integration", title: "AI Integration", status: "demo" },
        { path: "/demo/clean-architecture", title: "Clean Architecture", status: "demo" },
        { path: "/demo/component-gallery", title: "Component Gallery", status: "demo" },
        { path: "/demo/crud-integration", title: "CRUD Integration", status: "demo" },
        { path: "/demo/cyber-elephant", title: "Cyber Elephant", status: "demo" },
        { path: "/demo/document-upload-gpu", title: "GPU Document Upload", status: "demo" },
        { path: "/demo/enhanced-rag-demo", title: "Enhanced RAG", status: "demo" },
        { path: "/demo/full-stack-integration", title: "Full Stack Demo", status: "demo" },
        { path: "/canvas-demo", title: "Canvas Demo", status: "demo" },
        { path: "/cache-demo", title: "Cache Demo", status: "demo" },
        { path: "/brain", title: "Brain Demo", status: "demo" }
      ]
    },
    {
      category: "⚡ Performance & GPU",
      routes: [
        { path: "/cuda-streaming", title: "CUDA Streaming", status: "working" },
        { path: "/gpu-compute", title: "GPU Compute", status: "working" },
        { path: "/webgpu", title: "WebGPU Demo", status: "working" },
        { path: "/vector-demo", title: "Vector Demo", status: "working" },
        { path: "/test-integration", title: "Integration Tests", status: "working" }
      ]
    },
    {
      category: "🧪 Experimental & Testing",
      routes: [
        { path: "/copilot", title: "Copilot", status: "experimental" },
        { path: "/copilot/autonomous", title: "Autonomous Copilot", status: "experimental" },
        { path: "/compiler-ai-demo", title: "Compiler AI", status: "experimental" },
        { path: "/complete-demo", title: "Complete Demo", status: "experimental" },
        { path: "/crud-dashboard", title: "CRUD Dashboard", status: "experimental" },
        { path: "/gaming-evolution", title: "Gaming Evolution", status: "experimental" },
        { path: "/simple-test", title: "Simple Test", status: "experimental" }
      ]
    }
  ];

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-green-600 bg-green-100';
      case 'demo': return 'text-blue-600 bg-blue-100';
      case 'experimental': return 'text-purple-600 bg-purple-100';
      case 'broken': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return CheckCircle;
      case 'demo': return Target;
      case 'experimental': return Clock;
      case 'broken': return AlertTriangle;
      default: return Clock;
    }
  };

  // Modal status icon (dynamic component)
  let ModalStatusIcon: any = null;
  let routeInfo: any = null;
  $effect(() => {
    if (selectedRoute) {
      ModalStatusIcon = getStatusIcon(selectedRoute.status);
      routeInfo = getRouteInfo(selectedRoute.path);
    } else {
      ModalStatusIcon = null;
      routeInfo = null;
    }
  });

  // Calculate totals
  let totalRoutes = $state(0);
  let workingRoutes = $state(0);
  let demoRoutes = $state(0);
  let experimentalRoutes = $state(0);

  $effect(() => {
    totalRoutes = routeCategories.reduce((sum, cat) => sum + cat.routes.length, 0);
    workingRoutes = routeCategories.reduce((sum, cat) => sum + cat.routes.filter(r => r.status === 'working').length, 0);
    demoRoutes = routeCategories.reduce((sum, cat) => sum + cat.routes.filter(r => r.status === 'demo').length, 0);
    experimentalRoutes = routeCategories.reduce((sum, cat) => sum + cat.routes.filter(r => r.status === 'experimental').length, 0);
  });
</script>

<style>
  /* N64/NES Gaming Animations */
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
    }
    50% {
      box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
    }
  }

  @keyframes matrix-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  @keyframes console-boot {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .animation-delay-1000 {
    animation-delay: 1s;
  }

  .animation-delay-2000 {
    animation-delay: 2s;
  }

  /* Custom scrollbar for gaming feel */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #00ffff, #0080ff);
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #00ffff, #00ff80);
  }

  /* Gaming card hover effects */
  .group:hover {
    animation: glow-pulse 2s infinite;
  }

  /* Terminal text effect */
  .font-mono {
    font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.5px;
  }

  /* Retro scan lines effect */
  .bg-gradient-to-br::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      transparent 50%,
      rgba(0, 255, 255, 0.02) 50%
    );
    background-size: 100% 4px;
    pointer-events: none;
    animation: matrix-flicker 3s infinite;
  }

  /* Gaming button press effect */
  button:active {
    transform: scale(0.95);
  }

  /* Matrix-style text selection */
  ::selection {
    background: rgba(0, 255, 255, 0.3);
    color: #00ff00;
  }

  /* Shared transition utility */
  .transition-colors {
    transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
  }
</style>

<!-- N64/NES Gaming-Inspired Routes Dashboard -->
<div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black relative overflow-hidden">
  <!-- Animated background elements -->
  <div class="absolute inset-0">
    <div class="absolute top-0 left-0 w-full h-full opacity-10">
      <div class="animate-pulse absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full blur-xl"></div>
      <div class="animate-pulse absolute top-20 right-20 w-24 h-24 bg-blue-400 rounded-full blur-xl animation-delay-1000"></div>
      <div class="animate-pulse absolute bottom-20 left-1/4 w-40 h-40 bg-purple-400 rounded-full blur-xl animation-delay-2000"></div>
    </div>
  </div>

  <div class="relative z-10 max-w-7xl mx-auto px-6 py-8">

    <!-- Gaming-Style Header -->
    <div class="mb-8 text-center">
      <div class="inline-block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-transparent bg-clip-text mb-4">
        <h1 class="text-5xl font-black tracking-wider mb-2 drop-shadow-lg">⚡ ROUTE MATRIX ⚡</h1>
      </div>
      <div class="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/30 shadow-lg shadow-cyan-500/20">
        <p class="text-cyan-300 text-lg font-mono tracking-wide">
          <span class="text-yellow-400">></span> SYSTEM ONLINE • {totalRoutes} ROUTES DETECTED • AI LEGAL PLATFORM ACTIVE
        </p>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="mb-8">
      <div class="bg-black/70 backdrop-blur-sm rounded-lg p-6 border border-green-400/30 shadow-lg shadow-green-500/20">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search Input -->
          <div class="flex-1">
            <input
              bind:value={searchQuery}
              type="text"
              placeholder="🔍 Search routes, demos, AI features..."
              class="w-full bg-gray-900/80 border border-cyan-400/50 rounded-lg px-4 py-3 text-cyan-300 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 font-mono"
            />
          </div>

          <!-- Category Filter -->
          <div class="min-w-48">
            <select
              bind:value={selectedCategory}
              class="w-full bg-gray-900/80 border border-purple-400/50 rounded-lg px-4 py-3 text-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-mono"
            >
              <option value="all">🎯 All Categories</option>
              {#each data.routesByCategory as category}
                <option value={category.name}>🔥 {category.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Gaming Stats Panel -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-lg p-4 border border-green-400/30 shadow-lg">
        <div class="flex items-center">
          <CheckCircle class="w-8 h-8 text-green-400 mr-3 animate-pulse" />
          <div>
            <p class="text-green-300 text-sm font-mono">ACTIVE</p>
            <p class="text-2xl font-black text-white">{workingRoutes}</p>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30 shadow-lg">
        <div class="flex items-center">
          <Gamepad2 class="w-8 h-8 text-blue-400 mr-3 animate-bounce" />
          <div>
            <p class="text-blue-300 text-sm font-mono">DEMOS</p>
            <p class="text-2xl font-black text-white">{demoRoutes}</p>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-lg p-4 border border-purple-400/30 shadow-lg">
        <div class="flex items-center">
          <Zap class="w-8 h-8 text-purple-400 mr-3 animate-pulse" />
          <div>
            <p class="text-purple-300 text-sm font-mono">BETA</p>
            <p class="text-2xl font-black text-white">{experimentalRoutes}</p>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-yellow-600/20 to-orange-800/20 backdrop-blur-sm rounded-lg p-4 border border-yellow-400/30 shadow-lg">
        <div class="flex items-center">
          <Brain class="w-8 h-8 text-yellow-400 mr-3 animate-pulse" />
          <div>
            <p class="text-yellow-300 text-sm font-mono">TOTAL</p>
            <p class="text-2xl font-black text-white">{totalRoutes}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced 3-Column Gaming Grid -->
    <div class="space-y-8">
      {#each filteredRoutes as category}
        <div class="bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden border border-cyan-400/30 shadow-xl shadow-cyan-500/10">
          <!-- Category Header -->
          <div class="px-6 py-4 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-400/20">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-black text-cyan-300 tracking-wider">
                  🎮 {category.name.toUpperCase()}
                </h2>
                <p class="text-cyan-400/70 text-sm font-mono mt-1">
                  {category.routes.length} modules • Ready for deployment
                </p>
              </div>
              <div class="text-right">
                <div class="bg-cyan-400/20 px-3 py-1 rounded-full border border-cyan-400/30">
                  <span class="text-cyan-300 text-sm font-mono font-bold">{category.routes.length}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3-Column Route Grid -->
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each category.routes as route}
                {@const StatusIcon = getStatusIcon(route.status)}
                <Card class="group bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-600/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/20 hover:scale-105">
                  <CardHeader class="pb-3">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center space-x-2">
                        <StatusIcon class="w-5 h-5 text-cyan-400 group-hover:animate-pulse" />
                        <span class="px-2 py-1 text-xs font-mono font-bold rounded-full {getStatusColor(route.status)} border">
                          {route.status.toUpperCase()}
                        </span>
                      </div>
                      <div class="text-gray-400 group-hover:text-cyan-400 transition-colors">
                        <Gamepad2 class="w-4 h-4" />
                      </div>
                    </div>
                    <CardTitle class="text-white group-hover:text-cyan-300 transition-colors font-mono text-lg leading-tight">
                      {route.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent class="pt-0">
                    <div class="space-y-3">
                      <!-- Route Path -->
                      <div class="bg-black/60 rounded-lg p-3 border border-gray-700/50">
                        <code class="text-sm text-green-400 font-mono break-all">
                          {route.path}
                        </code>
                      </div>

                      <!-- Route Description -->
                      {#if route.description}
                        <p class="text-gray-300 text-sm leading-relaxed">
                          {route.description.slice(0, 80)}...
                        </p>
                      {/if}

                      <!-- Action Buttons -->
                      <div class="flex items-center gap-2 pt-2">
                        <Button
                          onclick={() => openModal(route, category.name)}
                          variant="outline"
                          size="sm"
                          class="flex-1 bg-blue-900/30 border-blue-400/50 text-blue-300 hover:bg-blue-800/50 hover:border-blue-400 transition-all duration-200 font-mono"
                        >
                          <Info class="w-4 h-4 mr-2" />
                          INFO
                        </Button>

                        <Button
                          onclick={() => window.open(route.path, '_blank')}
                          variant="outline"
                          size="sm"
                          class="flex-1 bg-green-900/30 border-green-400/50 text-green-300 hover:bg-green-800/50 hover:border-green-400 transition-all duration-200 font-mono"
                        >
                          <ExternalLink class="w-4 h-4 mr-2" />
                          VISIT
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Gaming System Status Panel -->
    <div class="mt-8 bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden border border-yellow-400/30 shadow-xl shadow-yellow-500/10">
      <div class="px-6 py-4 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-b border-yellow-400/20">
        <h2 class="text-2xl font-black text-yellow-300 tracking-wider">
          ⚙️ SYSTEM STATUS
        </h2>
        <p class="text-yellow-400/70 text-sm font-mono mt-1">
          Platform diagnostics • All systems operational
        </p>
      </div>

      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-br from-green-900/20 to-green-700/20 rounded-lg p-4 border border-green-400/30">
            <h3 class="text-green-300 font-mono font-bold mb-3">🎯 AI MODULES</h3>
            <ul class="text-sm text-green-200 space-y-2 font-mono">
              <li class="flex items-center"><span class="text-green-400 mr-2">●</span> Document Processing Engine</li>
              <li class="flex items-center"><span class="text-green-400 mr-2">●</span> Case Analysis Neural Net</li>
              <li class="flex items-center"><span class="text-green-400 mr-2">●</span> Evidence Processing Matrix</li>
              <li class="flex items-center"><span class="text-green-400 mr-2">●</span> Legal Research AI Core</li>
              <li class="flex items-center"><span class="text-green-400 mr-2">●</span> GPU Tensor Acceleration</li>
            </ul>
          </div>

          <div class="bg-gradient-to-br from-cyan-900/20 to-blue-700/20 rounded-lg p-4 border border-cyan-400/30">
            <h3 class="text-cyan-300 font-mono font-bold mb-3">⚡ TECH STACK</h3>
            <ul class="text-sm text-cyan-200 space-y-2 font-mono">
              <li class="flex items-center"><span class="text-cyan-400 mr-2">●</span> SvelteKit 5.0 + Runes</li>
              <li class="flex items-center"><span class="text-cyan-400 mr-2">●</span> WebGPU + CUDA Cores</li>
              <li class="flex items-center"><span class="text-cyan-400 mr-2">●</span> PostgreSQL + Redis</li>
              <li class="flex items-center"><span class="text-cyan-400 mr-2">●</span> Ollama + LangChain</li>
              <li class="flex items-center"><span class="text-cyan-400 mr-2">●</span> N64/NES UI Framework</li>
            </ul>
          </div>

          <div class="bg-gradient-to-br from-purple-900/20 to-purple-700/20 rounded-lg p-4 border border-purple-400/30">
            <h3 class="text-purple-300 font-mono font-bold mb-3">🚀 METRICS</h3>
            <ul class="text-sm text-purple-200 space-y-2 font-mono">
              <li class="flex items-center justify-between"><span>PORT:</span><span class="text-purple-400">5173</span></li>
              <li class="flex items-center justify-between"><span>ROUTES:</span><span class="text-purple-400">{totalRoutes}</span></li>
              <li class="flex items-center justify-between"><span>ACTIVE:</span><span class="text-green-400">{workingRoutes}</span></li>
              <li class="flex items-center justify-between"><span>DEMOS:</span><span class="text-blue-400">{demoRoutes}</span></li>
              <li class="flex items-center justify-between"><span>BETA:</span><span class="text-yellow-400">{experimentalRoutes}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Gaming Footer -->
    <div class="mt-8 text-center">
      <div class="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <p class="text-green-400 font-mono text-sm mb-1">
          <span class="text-yellow-400">></span> LEGAL.AI.PLATFORM.EXE - ROUTE.MATRIX.ACTIVE
        </p>
        <p class="text-cyan-400 font-mono text-xs">
          SYSTEM.ONLINE • DYNAMIC.PORT.5173 • AI.NEURAL.CORES.READY
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Enhanced Gaming Modal -->
{#if showModal && selectedRoute}
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    onclick={closeModal}
  >
    <div
      class="bg-gradient-to-br from-gray-900 to-black border-2 border-cyan-400/50 rounded-lg shadow-2xl shadow-cyan-500/25 max-w-5xl max-h-[90vh] overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Gaming Modal Header -->
      <div class="flex items-center justify-between p-6 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-400/20">
        <div class="flex items-center gap-4">
          {#if ModalStatusIcon}
            <ModalStatusIcon class="w-8 h-8 text-cyan-400 animate-pulse" />
          {/if}
          <div>
            <h2 class="text-2xl font-black text-white tracking-wider">{selectedRoute.title}</h2>
            <p class="text-cyan-300 font-mono text-sm">{selectedRoute.category} MODULE</p>
          </div>
          <span class="px-3 py-1 text-xs font-mono font-bold rounded-full {getStatusColor(selectedRoute.status)} border uppercase">
            {selectedRoute.status}
          </span>
        </div>
        <Button
          onclick={closeModal}
          variant="outline"
          size="sm"
          class="bg-red-900/30 border-red-400/50 text-red-300 hover:bg-red-800/50 hover:border-red-400"
        >
          <X class="w-5 h-5" />
        </Button>
      </div>

      <!-- Modal Content -->
  <div class="overflow-y-auto max-h-[calc(90vh-200px)]">

        <div class="p-6 space-y-6 bg-gradient-to-b from-gray-900/50 to-black/50">
          <!-- Gaming Route Path Display -->
          <div class="bg-black/60 rounded-lg p-4 border border-green-400/30 shadow-lg shadow-green-400/10">
            <div class="flex items-center gap-3 mb-3">
              <Code class="w-6 h-6 text-green-400 animate-pulse" />
              <h3 class="text-green-300 font-mono font-bold tracking-wider">ROUTE.PATHWAY</h3>
            </div>
            <div class="bg-gray-900/80 rounded-lg p-4 border border-gray-600/50">
              <code class="text-lg text-green-400 font-mono tracking-wide block">
                {selectedRoute.path}
              </code>
            </div>
          </div>

          {#if routeInfo}
            <!-- Description & Purpose -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <BookOpen class="w-5 h-5 text-blue-600" />
                  <h3 class="font-medium text-gray-900">Description</h3>
                </div>
                <p class="text-gray-700 leading-relaxed">{routeInfo.description}</p>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <Target class="w-5 h-5 text-purple-600" />
                  <h3 class="font-medium text-gray-900">Purpose</h3>
                </div>
                <p class="text-gray-700 leading-relaxed">{routeInfo.purpose}</p>
              </div>
            </div>

            <!-- Features -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <CheckCircle class="w-5 h-5 text-green-600" />
                <h3 class="font-medium text-gray-900">Key Features</h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                {#each routeInfo.features as feature}
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    {feature}
                  </div>
                {/each}
              </div>
            </div>

            <!-- Scaffolding Code -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Code class="w-5 h-5 text-orange-600" />
                <h3 class="font-medium text-gray-900">Scaffolding Template</h3>
              </div>
              <div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                <pre class="text-sm font-mono whitespace-pre-wrap">{routeInfo.scaffold}</pre>
              </div>
            </div>
          {/if}

          <!-- Implementation Notes -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <Info class="w-5 h-5 text-blue-600" />
              <h3 class="font-medium text-blue-900">Implementation Notes</h3>
            </div>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• Uses Svelte 5 runes ($state, $props, $effect)</li>
              <li>• TypeScript support with proper type definitions</li>
              <li>• Follows Legal AI platform architecture patterns</li>
              <li>• Integrates with existing component library</li>
              {#if selectedRoute.status === 'working'}
                <li>• ✅ Production ready and fully functional</li>
              {:else if selectedRoute.status === 'demo'}
                <li>• 🧪 Demo/prototype - may need additional implementation</li>
              {:else if selectedRoute.status === 'experimental'}
                <li>• ⚗️ Experimental - under active development</li>
              {/if}
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between p-6 border-t bg-gray-50">
        <div class="text-sm text-gray-500">
          Click outside the modal or press ESC to close
        </div>
        <div class="flex items-center gap-3">
          <a
            href={selectedRoute.path}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink class="w-4 h-4" />
            Test Route
          </a>
          <button
            onclick={closeModal}
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
