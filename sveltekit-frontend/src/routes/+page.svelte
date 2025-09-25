<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { browser } from '$app/environment';
  import {
    Brain, Activity, Zap, Shield, Search, Users, User,
    Database, Folder, Eye, TrendingUp, Clock,
    CheckCircle, FileText, MapPin, Calendar, Pencil, Edit3
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import EvidenceBoardLayout from '$lib/components/layout/EvidenceBoardLayout.svelte';
  import EvidenceCard from '$lib/components/ui/EvidenceCard.svelte';
  import Card from '$lib/components/ui/enhanced-bits/Card.svelte';
  import RAGAssistantChat from '$lib/components/ai/RAGAssistantChat.svelte';
  let isLoading = $state(false);
  let systemMetrics = $state({
    totalCases: 247,
    activeCases: 18,
    personsOfInterest: 156,
    evidenceItems: 892,
    searchQueries: 1234,
    aiAnalyses: 567,
    systemUptime: '99.8%',
    responseTime: '0.3s'
  });
  let recentActivity = $state([
    {
      id: 1,
      type: 'case_created',
      title: 'New case opened: Corporate Fraud Investigation',
      timestamp: '2 minutes ago',
      priority: 'high',
      icon: Folder
    },
    {
      id: 2,
      type: 'person_added',
      title: 'Person of interest added: Marcus Chen',
      timestamp: '15 minutes ago',
      priority: 'medium',
      icon: User
    },
    {
      id: 3,
      type: 'evidence_uploaded',
      title: 'Evidence uploaded: Financial records batch',
      timestamp: '1 hour ago',
      priority: 'medium',
      icon: FileText
    },
    {
      id: 4,
      type: 'ai_analysis',
      title: 'AI analysis completed for Case #2024-001',
      timestamp: '2 hours ago',
      priority: 'low',
      icon: Brain
    }
  ]);
  let quickActions = [
    {
      title: 'New Investigation',
      description: 'Start a new legal investigation',
      href: '/cases/create',
      icon: Folder,
      gradient: 'from-blue-600 to-blue-700',
      stats: '+12 this month'
    },
    {
      title: 'AI Analysis',
      description: 'Run intelligent case analysis',
      href: '/analysis',
      icon: Brain,
      gradient: 'from-purple-600 to-purple-700',
      stats: '567 completed'
    },
    {
      title: 'Evidence Search',
      description: 'Search across all evidence',
      href: '/evidence',
      icon: Search,
      gradient: 'from-green-600 to-green-700',
      stats: '892 items indexed'
    },
    {
      title: 'Person Tracking',
      description: 'Manage persons of interest',
      href: '/persons-of-interest',
      icon: Users,
      gradient: 'from-yellow-600 to-yellow-700',
      stats: '156 active records'
    },
    {
      title: '🧠 AI Legal Chat',
      description: 'TensorRT-powered legal AI assistant',
      href: '/ai-chat',
      icon: Brain,
      gradient: 'from-blue-600 to-purple-700',
      stats: 'TensorRT Q4_K_M',
      isNew: true
    },
    {
      title: '🎮 SPA Canvas',
      description: 'Full-screen gaming UX with gemma3:legal-latest',
      href: '/spa',
      icon: Brain,
      gradient: 'from-purple-600 to-blue-700',
      stats: 'NEW',
      isNew: true
    },
    {
      title: 'Text Editor',
      description: 'NieR-themed rich text editor',
      href: '/text-editor',
      icon: Pencil,
      gradient: 'from-red-600 to-red-700',
      stats: 'Legal documents'
    }
  ];
  let systemStatus = $state([
    { name: 'AI Engine', status: 'operational', uptime: '99.9%', color: 'green' },
    { name: 'Database', status: 'operational', uptime: '99.8%', color: 'green' },
    { name: 'Search Index', status: 'operational', uptime: '99.7%', color: 'green' },
    { name: 'GPU Cluster', status: 'limited', uptime: '87.3%', color: 'yellow' }
  ]);
  let demoRoutes = $state([
    // AI Category Routes
    { path: '/demo/ai-assistant', title: 'AI Assistant', description: 'Interactive AI assistant testing interface with conversation capabilities.', category: 'AI' },
    { path: '/demo/ai-complete-test', title: 'AI Complete Test', description: 'Complete AI system testing with all legal AI functionality.', category: 'AI' },
    { path: '/demo/ai-dashboard', title: 'AI Dashboard', description: 'AI metrics and performance monitoring with real-time insights.', category: 'AI' },
    { path: '/demo/ai-integration', title: 'AI Integration', description: 'Full AI system integration showcase with legal capabilities.', category: 'AI' },
    { path: '/demo/ai-pipeline', title: 'AI Pipeline', description: 'AI processing pipeline demonstration with workflow stages.', category: 'AI' },
    { path: '/demo/ai-summary', title: 'AI Summary', description: 'AI-powered document summarization and content analysis.', category: 'AI' },
    { path: '/demo/ai-test', title: 'AI Test', description: 'AI service health checking and functionality validation.', category: 'AI' },
    { path: '/demo/document-ai', title: 'Document AI', description: 'AI-powered document processing and intelligent analysis.', category: 'AI' },
    { path: '/demo/legal-ai-complete', title: 'Legal AI Complete', description: 'Complete legal AI platform with all features integrated.', category: 'AI' },
    { path: '/demo/legal-ai-orchestrator', title: 'Legal AI Orchestrator', description: 'AI orchestration system for complex legal workflows.', category: 'AI' },
    { path: '/demo/legal-ai-platform', title: 'Legal AI Platform', description: 'Comprehensive legal AI platform demonstration.', category: 'AI' },
    { path: '/demo/ollama-integration', title: 'Ollama Integration', description: 'Ollama LLM integration with legal AI processing.', category: 'AI' },
    { path: '/demo/productivity-ai-integration', title: 'Productivity AI', description: 'AI integration for enhanced legal productivity workflows.', category: 'AI' },
    { path: '/demo/rag-integration', title: 'RAG Integration', description: 'Retrieval Augmented Generation for legal document processing.', category: 'AI' },
    { path: '/demo/webasm-ai-complete', title: 'WebAssembly AI', description: 'WebAssembly-powered AI processing for browser performance.', category: 'AI' },
    // GPU Category Routes
    { path: '/demo/cuda-minio-upload', title: 'CUDA MinIO Upload', description: 'GPU-accelerated file upload with CUDA and MinIO storage.', category: 'GPU' },
    { path: '/demo/cuda-rtx-integration', title: 'CUDA RTX Integration', description: 'RTX GPU integration with CUDA acceleration for legal AI.', category: 'GPU' },
    { path: '/demo/gpu-acceleration', title: 'GPU Acceleration', description: 'GPU acceleration demonstration for legal processing.', category: 'GPU' },
    { path: '/demo/gpu-assistant', title: 'GPU Assistant', description: 'GPU-powered AI assistant with accelerated inference.', category: 'GPU' },
    { path: '/demo/gpu-cache-integration', title: 'GPU Cache', description: 'GPU-accelerated caching system for faster processing.', category: 'GPU' },
    { path: '/demo/gpu-chat', title: 'GPU Chat', description: 'GPU-accelerated chat interface with enhanced speeds.', category: 'GPU' },
    { path: '/demo/gpu-inference', title: 'GPU Inference', description: 'GPU-powered inference engine for legal AI models.', category: 'GPU' },
    { path: '/demo/gpu-legal-ai', title: 'GPU Legal AI', description: 'Legal AI processing accelerated with GPU compute.', category: 'GPU' },
    { path: '/demo/gpu-vector-processing', title: 'GPU Vector Processing', description: 'Vector operations accelerated with GPU processing.', category: 'GPU' },
    { path: '/demo/nes-gpu-quantization', title: 'NES GPU Quantization', description: 'GPU quantization with retro NES styling integration.', category: 'GPU' },
    { path: '/demo/nes-texture-streaming', title: 'NES Texture Streaming', description: 'GPU texture streaming with NES-themed graphics.', category: 'GPU' },
    { path: '/demo/retro-gpu-metrics', title: 'Retro GPU Metrics', description: 'GPU performance metrics with retro gaming aesthetics.', category: 'GPU' },
    { path: '/demo/webgpu-acceleration', title: 'WebGPU Acceleration', description: 'WebGPU acceleration for browser-based legal AI.', category: 'GPU' },
    { path: '/demo/webgpu-graph', title: 'WebGPU Graph', description: 'Graph visualization powered by WebGPU acceleration.', category: 'GPU' },
    { path: '/demo/webgpu-quantization', title: 'WebGPU Quantization', description: 'Model quantization using WebGPU for efficiency.', category: 'GPU' },
    { path: '/demo/webgpu-webasm-integration', title: 'WebGPU WebAssembly', description: 'WebGPU and WebAssembly integration for performance.', category: 'GPU' },
    // UI Category Routes
    { path: '/demo/bits-ui', title: 'Bits UI Showcase', description: 'Complete Bits UI component library with YoRHa theme.', category: 'UI' },
    { path: '/demo/component-gallery', title: 'Component Gallery', description: 'Full showcase of UI components with interactive examples.', category: 'UI' },
    { path: '/demo/headless-ui-showcase', title: 'Headless UI Showcase', description: 'Headless UI components with legal platform styling.', category: 'UI' },
    { path: '/demo/legal-components', title: 'Legal Components', description: 'Specialized UI components for legal applications.', category: 'UI' },
    { path: '/demo/legal-form', title: 'Legal Form', description: 'Legal document form components with validation.', category: 'UI' },
    { path: '/demo/nes-bits-ui', title: 'NES Bits UI', description: 'Bits UI components with retro NES gaming aesthetics.', category: 'UI' },
    { path: '/demo/nes-yorha-3d', title: 'NES YoRHa 3D', description: '3D NES and YoRHa theme integration with depth effects.', category: 'UI' },
    { path: '/demo/nes-yorha-hybrid', title: 'NES YoRHa Hybrid', description: 'Hybrid NES and YoRHa theme combination interface.', category: 'UI' },
    { path: '/demo/professional-editor', title: 'Professional Editor', description: 'Advanced text editor for legal document formatting.', category: 'UI' },
    { path: '/demo/progressive-gaming-ui', title: 'Progressive Gaming UI', description: 'Gaming-inspired progressive UI with animations.', category: 'UI' },
    { path: '/demo/ps1-effects-advanced', title: 'PS1 Effects Advanced', description: 'Advanced PlayStation 1 style visual effects.', category: 'UI' },
    { path: '/demo/ps1-stories', title: 'PS1 Stories', description: 'Story interface with PlayStation 1 retro aesthetics.', category: 'UI' },
    { path: '/demo/ui-components', title: 'UI Components', description: 'General UI components library for the platform.', category: 'UI' },
    { path: '/demo/unocss-svelte5', title: 'UnoCSS Svelte 5', description: 'UnoCSS utility framework with Svelte 5 integration.', category: 'UI' },
    { path: '/demo/yorha-tables', title: 'YoRHa Tables', description: 'Data tables with YoRHa theme and styling.', category: 'UI' },
    // Search Category Routes
    { path: '/demo/enhanced-rag-demo', title: 'Enhanced RAG Demo', description: 'Enhanced RAG demonstration with semantic search.', category: 'Search' },
    { path: '/demo/enhanced-rag-semantic', title: 'Enhanced RAG Semantic', description: 'Semantic RAG processing with advanced search.', category: 'Search' },
    { path: '/demo/enhanced-semantic-architecture', title: 'Enhanced Semantic Architecture', description: 'Advanced semantic search architecture demonstration.', category: 'Search' },
    { path: '/demo/instant-search', title: 'Instant Search', description: 'Real-time instant search with immediate results.', category: 'Search' },
    { path: '/demo/legal-search', title: 'Legal Search', description: 'Specialized search for legal documents and cases.', category: 'Search' },
    { path: '/demo/real-time-search', title: 'Real-time Search', description: 'Live search results with dynamic filtering.', category: 'Search' },
    { path: '/demo/semantic-3d', title: 'Semantic 3D', description: '3D visualization of semantic search relationships.', category: 'Search' },
    { path: '/demo/semantic-search', title: 'Semantic Search', description: 'Advanced semantic search with vector similarity.', category: 'Search' },
    { path: '/demo/vector-intelligence', title: 'Vector Intelligence', description: 'Vector AI capabilities with intelligent processing.', category: 'Search' },
    { path: '/demo/vector-pipeline', title: 'Vector Pipeline', description: 'Vector processing pipeline for document embeddings.', category: 'Search' },
    { path: '/demo/vector-search', title: 'Vector Search', description: 'Vector similarity search for document retrieval.', category: 'Search' },
    // Integration Category Routes
    { path: '/demo/clean-architecture', title: 'Clean Architecture', description: 'Clean architecture patterns in legal AI system.', category: 'Integration' },
    { path: '/demo/complete-integration', title: 'Complete Integration', description: 'Complete system integration with all components.', category: 'Integration' },
    { path: '/demo/crud-integration', title: 'CRUD Integration', description: 'CRUD operations integration with legal data.', category: 'Integration' },
    { path: '/demo/full-stack-integration', title: 'Full Stack Integration', description: 'Full-stack integration demonstration.', category: 'Integration' },
    { path: '/demo/hybrid-cache-architecture', title: 'Hybrid Cache Architecture', description: 'Hybrid caching system architecture demonstration.', category: 'Integration' },
    { path: '/demo/hybrid-legal-analysis', title: 'Hybrid Legal Analysis', description: 'Hybrid analysis combining AI and traditional methods.', category: 'Integration' },
    { path: '/demo/integrated-system', title: 'Integrated System', description: 'Integrated legal AI system with all features.', category: 'Integration' },
    { path: '/demo/system-integration', title: 'System Integration', description: 'System architecture and integration patterns.', category: 'Integration' },
    { path: '/demo/unified-architecture', title: 'Unified Architecture', description: 'Unified system architecture design demonstration.', category: 'Integration' },
    { path: '/demo/unified-integration', title: 'Unified Integration', description: 'Unified integration patterns and practices.', category: 'Integration' },
    { path: '/demo/unified-vector', title: 'Unified Vector', description: 'Unified vector operations across the platform.', category: 'Integration' },
    // Performance Category Routes
    { path: '/demo/glyph-cache', title: 'Glyph Cache', description: 'Font glyph caching system for performance.', category: 'Performance' },
    { path: '/demo/glyph-generator', title: 'Glyph Generator', description: 'Dynamic glyph generation with caching optimization.', category: 'Performance' },
    { path: '/demo/lazy-loading', title: 'Lazy Loading', description: 'Lazy loading implementation for better performance.', category: 'Performance' },
    { path: '/demo/loading-button', title: 'Loading Button', description: 'Loading button states and performance optimization.', category: 'Performance' },
    { path: '/demo/observability', title: 'Observability', description: 'System observability and performance monitoring.', category: 'Performance' },
    { path: '/demo/production-analytics', title: 'Production Analytics', description: 'Production-level analytics and performance metrics.', category: 'Performance' },
    { path: '/demo/shader-cache', title: 'Shader Cache', description: 'GPU shader caching for improved rendering performance.', category: 'Performance' },
    { path: '/demo/simd-glyphs', title: 'SIMD Glyphs', description: 'SIMD-accelerated glyph processing for performance.', category: 'Performance' },
    { path: '/demo/upload-analytics', title: 'Upload Analytics', description: 'File upload analytics and performance tracking.', category: 'Performance' },
    // Advanced Category Routes
    { path: '/demo/case-scoring', title: 'Case Scoring', description: 'AI-powered legal case scoring and evaluation.', category: 'Advanced' },
    { path: '/demo/chat-stream', title: 'Chat Stream', description: 'Streaming chat interface with real-time updates.', category: 'Advanced' },
    { path: '/demo/cyber-elephant', title: 'Cyber Elephant', description: 'Advanced cybersecurity analysis with AI integration.', category: 'Advanced' },
    { path: '/demo/document-upload-gpu', title: 'Document Upload GPU', description: 'GPU-accelerated document upload and processing.', category: 'Advanced' },
    { path: '/demo/drag-drop', title: 'Drag & Drop', description: 'Advanced drag and drop functionality for documents.', category: 'Advanced' },
    { path: '/demo/editor-test', title: 'Editor Test', description: 'Advanced editor testing and functionality validation.', category: 'Advanced' },
    { path: '/demo/embedding-chat', title: 'Embedding Chat', description: 'Chat interface with document embedding integration.', category: 'Advanced' },
    { path: '/demo/enhanced-legal-upload', title: 'Enhanced Legal Upload', description: 'Enhanced legal document upload with AI processing.', category: 'Advanced' },
    { path: '/demo/evidence-hybrid', title: 'Evidence Hybrid', description: 'Hybrid evidence processing with AI and manual review.', category: 'Advanced' },
    { path: '/demo/gaming-evolution', title: 'Gaming Evolution', description: 'Gaming interface evolution with legal AI integration.', category: 'Advanced' },
    { path: '/demo/inline-suggestions', title: 'Inline Suggestions', description: 'Real-time inline suggestions for legal documents.', category: 'Advanced' },
    { path: '/demo/langextract-ollama', title: 'Language Extract Ollama', description: 'Language extraction using Ollama AI models.', category: 'Advanced' },
    { path: '/demo/live-agents', title: 'Live Agents', description: 'Live AI agents for real-time legal assistance.', category: 'Advanced' },
    { path: '/demo/neural-sprite', title: 'Neural Sprite', description: 'Neural network-generated sprite graphics system.', category: 'Advanced' },
    { path: '/demo/neural-sprite-engine', title: 'Neural Sprite Engine', description: 'Advanced neural sprite generation engine.', category: 'Advanced' },
    { path: '/demo/recommendation-system', title: 'Recommendation System', description: 'AI-powered legal recommendation and suggestion system.', category: 'Advanced' },
    { path: '/demo/streaming-workflow', title: 'Streaming Workflow', description: 'Real-time streaming workflow for legal processes.', category: 'Advanced' },
    { path: '/demo/wasm-parser', title: 'WebAssembly Parser', description: 'WebAssembly-powered document parsing for performance.', category: 'Advanced' },
    { path: '/demo/xstate-auth', title: 'XState Auth', description: 'XState-powered authentication and authorization system.', category: 'Advanced' },
    // Development Category Routes
    { path: '/demo/notes', title: 'Notes', description: 'Note-taking and annotation system for legal documents.', category: 'Development' },
    { path: '/demo/phase14', title: 'Phase 14', description: 'Development phase 14 features and functionality.', category: 'Development' },
    { path: '/demo/phase5', title: 'Phase 5', description: 'Development phase 5 features and testing.', category: 'Development' },
    { path: '/demo/simple-test', title: 'Simple Test', description: 'Simple testing interface for development validation.', category: 'Development' },
    { path: '/demo/system-summary', title: 'System Summary', description: 'System summary and status overview for development.', category: 'Development' }
  ]);
  $effect(() => {
    if (!browser) return;
    let cancelled = false;
    isLoading = true;
    console.debug('Initializing dashboard; isLoading =', isLoading);
    (async () => {
      try {
        // Simulate loading dashboard data
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      } finally {
        if (!cancelled) {
          isLoading = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  });
  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  }
  function getStatusColor(status: string) {
    switch (status) {
      case 'operational': return 'text-green-400';
      case 'limited': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }
  function getCategoryColor(category: string) {
    switch (category) {
      case 'AI': return 'from-blue-600/20 to-blue-800/40 border-blue-500/30';
      case 'GPU': return 'from-green-600/20 to-green-800/40 border-green-500/30';
      case 'UI': return 'from-purple-600/20 to-purple-800/40 border-purple-500/30';
      case 'Search': return 'from-amber-600/20 to-amber-800/40 border-amber-500/30';
      case 'Integration': return 'from-cyan-600/20 to-cyan-800/40 border-cyan-500/30';
      case 'Performance': return 'from-orange-600/20 to-orange-800/40 border-orange-500/30';
      case 'Advanced': return 'from-red-600/20 to-red-800/40 border-red-500/30';
      case 'Development': return 'from-slate-600/20 to-slate-800/40 border-slate-500/30';
      default: return 'from-gray-600/20 to-gray-800/40 border-gray-500/30';
    }
  }
  // removed unused getCategoryIcon and userId to prevent TypeScript noUnusedLocals
  function handleCaseCreated(caseId: string | number) {
    console.log('New case created:', caseId);
    // navigate to case or show a notification here
  }
  function handleCaseCreatedEvent(e: CustomEvent<string | number>) {
    console.log('New case created (event):', e.detail);
  }
  // reference to RAGAssistantChat instance for event wiring
  let ragAssistantRef: any = $state(null);
  // wire up caseCreated event without relying on typed on: directive
  $effect(() => {
    if (!browser) return;
    if (!ragAssistantRef) return;
    const off = ragAssistantRef.$on('caseCreated', (e: CustomEvent<string | number>) => {
      const caseId = e.detail;
      // ignore invalid sentinel id "0"
      if (String(caseId) === '0') {
        console.warn('Received invalid case id "0" — ignoring.');
        return;
      }
      handleCaseCreated(caseId);
      // Also call the event handler
      handleCaseCreatedEvent(e);
    });
    return () => {
      off && off();
    };
  });
</script>
<svelte:head>
  <title>Legal AI Platform - Professional Command Center</title>
  <meta name="description" content="Professional legal investigation platform with AI-powered analysis and intelligent case management" />
</svelte:head>
<EvidenceBoardLayout
  title="LEGAL AI COMMAND CENTER"
  caseInfo="CORPORATE ESPIONAGE INVESTIGATION"
  demoMode={true}
>
  {#snippet children()}
    <!-- Hero Statistics (Evidence Board Style) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-blue-600/20 rounded-lg">
            <Database class="w-6 h-6 text-blue-400" />
          </div>
          <div class="text-blue-400 text-sm font-medium">Total</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.totalCases}</div>
        <div class="text-sm text-gray-400">Legal Cases</div>
      </div>
      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-green-600/20 rounded-lg">
            <Activity class="w-6 h-6 text-green-400" />
          </div>
          <div class="text-green-400 text-sm font-medium">Active</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.activeCases}</div>
        <div class="text-sm text-gray-400">In Progress</div>
      </div>
      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-yellow-600/20 rounded-lg">
            <Users class="w-6 h-6 text-yellow-400" />
          </div>
          <div class="text-yellow-400 text-sm font-medium">Tracked</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.personsOfInterest}</div>
        <div class="text-sm text-gray-400">Persons</div>
      </div>
      <div class="yorha-3d-panel p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="p-2 bg-purple-600/20 rounded-lg">
            <Eye class="w-6 h-6 text-purple-400" />
          </div>
          <div class="text-purple-400 text-sm font-medium">Stored</div>
        </div>
        <div class="text-3xl font-bold text-white mb-1">{systemMetrics.evidenceItems}</div>
        <div class="text-sm text-gray-400">Evidence Items</div>
      </div>
    </div>
    <!-- Quick Actions -->
    <section aria-label="Quick action shortcuts">
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-6">
          <Zap class="w-6 h-6 text-amber-400" />
          <h2 class="text-xl font-semibold text-amber-400 tracking-wide">Quick Actions</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each quickActions as action}
            <a
              href={action.href}
              class="group relative overflow-hidden rounded-lg bg-gradient-to-br {action.gradient} p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label={`${action.title}: ${action.description}`}
            >
              <div class="relative z-10">
{#if action.icon}
                  {@const IconComponent = action.icon}
                  <div class="flex items-center justify-between mb-4">
                    <IconComponent class="w-8 h-8" />
                    <div class="text-xs opacity-75 font-medium">{action.stats}</div>
                  </div>
                {/if}
                <h3 class="font-bold text-lg mb-2">{action.title}</h3>
                <p class="text-sm opacity-90">{action.description}</p>
              </div>
              <!-- Hover effect overlay -->
              <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          {/each}
          <!-- Live Demo Button -->
          <a
            href="/w1"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl ring-2 ring-emerald-400/50"
            aria-label="Live Demo: Experience the full Legal AI Platform"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <Brain class="w-8 h-8 animate-pulse" />
                <div class="text-xs opacity-75 font-medium bg-white/20 px-2 py-1 rounded">LIVE</div>
              </div>
              <h3 class="font-bold text-lg mb-2">🚀 Live Demo</h3>
              <p class="text-sm opacity-90">Full AI Assistant with auto case creation</p>
            </div>
            <!-- Special glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>
          <!-- SPA Canvas Button -->
          <a
            href="/spa"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-600 to-blue-700 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="SPA Canvas: Full-screen gaming UX with gemma3:legal-latest"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="relative">
                  <Brain class="w-8 h-8 animate-pulse" />
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <div class="text-xs opacity-75 font-medium bg-green-400/20 px-2 py-1 rounded">NEW</div>
              </div>
              <h3 class="font-bold text-lg mb-2">🎮 SPA Canvas</h3>
              <p class="text-sm opacity-90">Full-screen gaming UX with gemma3:legal-latest</p>
            </div>
            <!-- Special gaming glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>
          <!-- All Routes Button - Enhanced -->
          <a
            href="/all-routes"
            class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl ring-2 ring-indigo-400/50"
            aria-label="All Routes: Browse 66+ essential routes and 100+ demos"
          >
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="relative">
                  <MapPin class="w-8 h-8" />
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                <div class="text-xs opacity-75 font-medium bg-yellow-400/20 px-2 py-1 rounded">148+</div>
              </div>
              <h3 class="font-bold text-lg mb-2">🗺️ All Routes</h3>
              <p class="text-sm opacity-90">66 essential + 100+ demos with live testing</p>
            </div>
            <!-- Special routes glow effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>
        </div>
      </div>
    </div>
    </section>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Activity -->
      <div class="yorha-3d-panel">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <Clock class="w-6 h-6 text-amber-400" />
              <h3 class="text-xl font-semibold text-amber-400 tracking-wide">Recent Activity</h3>
            </div>
            <a href="/activity" class="text-amber-400 hover:text-amber-300 text-sm font-medium">
              View All →
            </a>
          </div>
          <div class="space-y-4">
            {#each recentActivity as activity}
              <div class="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-yellow-600/50 transition-colors">
{#if activity.icon}
                  {@const IconComponent = activity.icon}
                  <div class="p-2 bg-gray-700 rounded-lg">
                    <IconComponent class="w-4 h-4 {getPriorityColor(activity.priority)}" />
                  </div>
                {/if}
                <div class="flex-1">
                  <p class="text-white text-sm font-medium mb-1">{activity.title}</p>
                  <div class="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar class="w-3 h-3" />
                    {activity.timestamp}
                    <span class="w-1 h-1 bg-gray-500 rounded-full"></span>
                    <span class={cn("uppercase font-medium", getPriorityColor(activity.priority))}>
                      {activity.priority}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
      <!-- System Status -->
      <div class="yorha-3d-panel">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <Shield class="w-6 h-6 text-amber-400" />
              <h3 class="text-xl font-semibold text-amber-400 tracking-wide">System Status</h3>
            </div>
            <div class="flex items-center gap-2 text-green-400">
              <CheckCircle class="w-4 h-4" />
              <span class="text-sm font-medium">All Systems Operational</span>
            </div>
          </div>
          <div class="space-y-4">
            {#each systemStatus as system}
              <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                <div class="flex items-center gap-3">
                  <div class={cn(
                    "w-3 h-3 rounded-full",
                    system.color === 'green' ? 'bg-green-400' :
                    system.color === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                  )}></div>
                  <span class="text-white font-medium">{system.name}</span>
                </div>
                <div class="text-right">
                  <div class={cn("text-sm font-medium", getStatusColor(system.status))}>
                    {system.status.toUpperCase()}
                  </div>
                  <div class="text-xs text-gray-400">{system.uptime} uptime</div>
                </div>
              </div>
            {/each}
          </div>
          <!-- Performance Metrics -->
          <div class="mt-6 pt-6 border-t border-gray-600">
            <h4 class="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wide">Performance</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-400">{systemMetrics.systemUptime}</div>
                <div class="text-xs text-gray-400">System Uptime</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-400">{systemMetrics.responseTime}</div>
                <div class="text-xs text-gray-400">Avg Response</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Demo Routes Showcase -->
    <section aria-label="Demo routes and testing dashboard">
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <MapPin class="w-6 h-6 text-amber-400" />
            <h3 class="text-xl font-semibold text-amber-400 tracking-wide">🗺️ Routes & Demos Dashboard</h3>
          </div>
          <a href="/all-routes" class="text-amber-400 hover:text-amber-300 text-sm font-medium bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20 hover:border-amber-400/40 transition-colors">
            Browse All 148+ Routes →
          </a>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Essential Routes -->
          <div class="group p-4 bg-green-600/10 rounded-lg border border-green-600/20 hover:border-green-400/40 transition-colors">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <CheckCircle class="w-5 h-5 text-green-400" />
                <span class="font-semibold text-green-400">Essential</span>
              </div>
              <div class="text-2xl font-bold text-green-300">66</div>
            </div>
            <p class="text-sm text-green-200 mb-3">Core legal AI functionality - all working</p>
            <div class="space-y-1 text-xs text-green-300">
              <div>• Legal cases & evidence</div>
              <div>• AI analysis & chat</div>
              <div>• Admin & reporting</div>
            </div>
          </div>
          <!-- AI Demo Routes -->
          <div class="group p-4 bg-blue-600/10 rounded-lg border border-blue-600/20 hover:border-blue-400/40 transition-colors">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Brain class="w-5 h-5 text-blue-400" />
                <span class="font-semibold text-blue-400">AI Demos</span>
              </div>
              <div class="text-2xl font-bold text-blue-300">25+</div>
            </div>
            <p class="text-sm text-blue-200 mb-3">AI capabilities showcase</p>
            <div class="space-y-1 text-xs text-blue-300">
              <div>• AI assistant demos</div>
              <div>• GPU acceleration</div>
              <div>• Legal AI pipeline</div>
            </div>
          </div>
          <!-- UI Component Demos -->
          <div class="group p-4 bg-purple-600/10 rounded-lg border border-purple-600/20 hover:border-purple-400/40 transition-colors">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Edit3 class="w-5 h-5 text-purple-400" />
                <Pencil class="w-5 h-5 text-purple-400" />
              </div>
              <div class="text-2xl font-bold text-purple-300">20+</div>
            </div>
            <p class="text-sm text-purple-200 mb-3">Component galleries & styling</p>
            <div class="space-y-1 text-xs text-purple-300">
              <div>• Bits UI showcase</div>
              <div>• YoRHa themes</div>
              <div>• Gaming effects</div>
            </div>
          </div>
          <!-- Integration Demos -->
          <div class="group p-4 bg-amber-600/10 rounded-lg border border-amber-600/20 hover:border-amber-400/40 transition-colors">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Zap class="w-5 h-5 text-amber-400" />
                <span class="font-semibold text-amber-400">Integration</span>
              </div>
              <div class="text-2xl font-bold text-amber-300">35+</div>
            </div>
            <p class="text-sm text-amber-200 mb-3">System integration demos</p>
            <div class="space-y-1 text-xs text-amber-300">
              <div>• Search & vectors</div>
              <div>• GPU processing</div>
              <div>• Cache systems</div>
            </div>
          </div>
        </div>
        <!-- Popular Demo Routes Quick Access -->
        <div class="mt-6 pt-6 border-t border-gray-600">
          <h4 class="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <MapPin class="w-4 h-4" />
            Popular Demo Routes
          </h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/demo/ai-dashboard" class="p-3 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-blue-500/50 transition-colors text-center group">
              <Brain class="w-5 h-5 mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
              <div class="text-xs text-blue-300 font-medium">AI Dashboard</div>
            </a>
            <a href="/demo/bits-ui" class="p-3 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-purple-500/50 transition-colors text-center group">
              <Edit3 class="w-5 h-5 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
              <div class="text-xs text-purple-300 font-medium">Bits UI</div>
            </a>
            <a href="/demo/gpu-legal-ai" class="p-3 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-green-500/50 transition-colors text-center group">
              <Zap class="w-5 h-5 mx-auto mb-2 text-green-400 group-hover:scale-110 transition-transform" />
              <div class="text-xs text-green-300 font-medium">GPU Legal AI</div>
            </a>
            <a href="/demo/semantic-search" class="p-3 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-yellow-500/50 transition-colors text-center group">
              <Search class="w-5 h-5 mx-auto mb-2 text-yellow-400 group-hover:scale-110 transition-transform" />
              <div class="text-xs text-yellow-300 font-medium">Search Demo</div>
            </a>
          </div>
        </div>
      </div>
    </div>
    </section>
    <!-- Interactive Demo Routes Grid -->
    <section aria-label="Interactive demo routes grid" class="mt-8">
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <Eye class="w-6 h-6 text-amber-400" />
            <h3 class="text-xl font-semibold text-amber-400 tracking-wide">🎮 Interactive Demo Routes</h3>
          </div>
          <div class="text-amber-300 text-sm font-medium bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20">
            {demoRoutes.length} Live Demos
          </div>
        </div>
        <!-- 3-Column CSS Flexbox Grid -->
<!-- 3-Column CSS Flexbox Grid -->
<div class="demo-routes-grid">
  {#each demoRoutes as route (route.path)}
    <div class="demo-route-modal">
      <a href={route.path} class="block">
        <Card class="demo-route-card bg-gradient-to-br {getCategoryColor(route.category)} border-2 hover:scale-105 transition-all duration-300 cursor-pointer p-4 rounded-lg shadow-lg">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              {#if route.category === 'AI'}<Brain class="w-5 h-5 text-white" />
              {:else if route.category === 'GPU'}<Zap class="w-5 h-5 text-white" />
              {:else if route.category === 'UI'}<Pencil class="w-5 h-5 text-white" />
              {:else if route.category === 'Search'}<Search class="w-5 h-5 text-white" />
              {:else if route.category === 'Integration'}<Activity class="w-5 h-5 text-white" />
              {:else if route.category === 'Performance'}<TrendingUp class="w-5 h-5 text-white" />
              {:else if route.category === 'Advanced'}<Shield class="w-5 h-5 text-white" />
              {:else if route.category === 'Development'}<FileText class="w-5 h-5 text-white" />
              {:else}<Eye class="w-5 h-5 text-white" />
              {/if}
            </div>
            <div>
              <h4 class="text-white font-bold text-lg group-hover:text-amber-200 transition-colors">
                {route.title}
              </h4>
              <div class="text-xs text-white/70 font-medium uppercase tracking-wide">
                {route.category}
              </div>
            </div>
          </div>
          <div class="text-white/50 group-hover:text-white/80 transition-colors">
            <Eye class="w-4 h-4" />
          </div>
        </div>
        <p class="text-white/90 text-sm leading-relaxed group-hover:text-white transition-colors">
          {route.description}
        </p>
        <div class="mt-4 pt-4 border-t border-white/10">
          <div class="flex items-center justify-between">
            <span class="text-xs text-white/60 uppercase tracking-wide font-medium">
              Live Demo
            </span>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-green-300 font-medium">Active</span>
            </div>
          </div>
        </div>
        </Card>
      </a>
    </div>
  {/each}
</div>
      </div>
    </div>
    </section>
    <!-- AI Intelligence Summary -->
    <section aria-label="AI Intelligence Summary">
    <div class="yorha-3d-panel">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <Brain class="w-6 h-6 text-amber-400" />
            <h3 class="text-xl font-semibold text-amber-400 tracking-wide">AI Intelligence Summary</h3>
          </div>
          <div class="flex items-center gap-2 text-purple-400">
            <TrendingUp class="w-4 h-4" />
            <span class="text-sm">Analysis Active</span>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-purple-600/30">
            <div class="text-3xl font-bold text-purple-400 mb-2">{systemMetrics.aiAnalyses}</div>
            <div class="text-sm text-gray-400">AI Analyses Completed</div>
            <div class="text-xs text-purple-300 mt-1">+23% this week</div>
          </div>
          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-blue-600/30">
            <div class="text-3xl font-bold text-blue-400 mb-2">{systemMetrics.searchQueries}</div>
            <div class="text-sm text-gray-400">Search Queries Processed</div>
            <div class="text-xs text-blue-300 mt-1">+15% this week</div>
          </div>
          <div class="text-center p-4 bg-gray-800/30 rounded-lg border border-green-600/30">
            <div class="text-3xl font-bold text-green-400 mb-2">94.2%</div>
            <div class="text-sm text-gray-400">Pattern Recognition Accuracy</div>
            <div class="text-xs text-green-300 mt-1">+2.1% improvement</div>
          </div>
        </div>
        <!-- AI Assistant Section -->
        <div class="mt-6 pt-6 border-t border-gray-600">
          {#if systemMetrics.totalCases === 0}
            <div class="p-6">
              <div class="text-yellow-300 font-medium">No cases yet</div>
              <p class="text-sm text-gray-400">Start by creating a new case to enable the AI assistant.</p>
              <a href="/cases/create" class="mt-3 inline-block text-emerald-400 hover:underline">Create a case →</a>
            </div>
          {:else}
            <RAGAssistantChat bind:this={ragAssistantRef} />
          {/if}
        </div>
      </div>
    </section>
    {/snippet}
  {#snippet rightPanel()}
    <!-- Right Status Panel (matching Evidence Board) -->
    <div class="space-y-4">
      <!-- Active Tasks -->
      <div class="nes-container is-rounded">
        <h3 class="nes-text is-primary mb-4">📋 ACTIVE TASKS</h3>
        <div class="space-y-2">
          <EvidenceCard
            title="Corporate Espionage Investigation"
            description="Investigation active"
            status="active"
            type="case"
          >
            {#snippet children()}
              <!-- no extra child content -->
            {/snippet}
          </EvidenceCard>
          <EvidenceCard
            title="Missing Person: Dr. Sarah Chen"
            description="Person of interest located"
            status="active"
            type="person"
          >
            {#snippet children()}
              <!-- no extra child content -->
            {/snippet}
          </EvidenceCard>
          <EvidenceCard
            title="Financial Fraud Analysis"
            description="Analysis in progress"
            status="pending"
            type="analysis"
          >
            {#snippet children()}
              <!-- no extra child content -->
            {/snippet}
          </EvidenceCard>
          <EvidenceCard
            title="Security Breach Analysis"
            description="Completed investigation"
            status="active"
            type="security"
          >
            {#snippet children()}
              <!-- no extra child content -->
            {/snippet}
          </EvidenceCard>
        </div>
      </div>
      <!-- System Status -->
      <div class="nes-container is-rounded">
        <h3 class="nes-text is-primary mb-4">🛡 SYSTEM STATUS</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Total Cases:</span>
            <span class="nes-text is-primary">{systemMetrics.totalCases}</span>
          </div>
          <div class="flex justify-between">
            <span>Active Cases:</span>
            <span class="nes-text is-primary">{systemMetrics.activeCases}</span>
          </div>
          <div class="flex justify-between">
            <span>AI Analyses:</span>
            <span class="nes-text is-success">{systemMetrics.aiAnalyses}</span>
          </div>
          <div class="flex justify-between">
            <span>Response Time:</span>
            <span class="nes-text is-warning">{systemMetrics.responseTime}</span>
          </div>
          <div class="flex justify-between">
            <span>Uptime:</span>
            <span class="nes-text is-success">{systemMetrics.systemUptime}</span>
          </div>
        </div>
      </div>
    </div>
    {/snippet}
  </EvidenceBoardLayout>
  <style>
  .yorha-3d-panel {
      /* Professional card styling with modern glass morphism */
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.85) 100%);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 0.75rem;
    backdrop-filter: blur(12px);
    box-shadow:
      0 8px 32px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(148, 163, 184, 0.05),
      inset 0 1px 0 rgba(248, 250, 252, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .yorha-3d-panel:hover {
    transform: translateY(-2px);
    box-shadow:
      0 20px 64px -12px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(251, 191, 36, 0.1),
      inset 0 1px 0 rgba(248, 250, 252, 0.1);
    border-color: rgba(251, 191, 36, 0.2);
  }
  /* Animation enhancements */
  @keyframes glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .neural-pulse {
    animation: glow 2s ease-in-out infinite;
  }
  /* 3-Column Demo Routes Grid */
  .demo-routes-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: stretch;
  }
  .demo-route-modal {
    flex: 1 1 calc(33.333% - 1rem);
    min-width: 320px;
    display: flex;
  }
  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .demo-route-modal {
      flex: 1 1 calc(50% - 0.75rem);
    }
  }
  @media (max-width: 640px) {
    .demo-route-modal {
      flex: 1 1 100%;
    }
    .demo-routes-grid {
      gap: 1rem;
    }
  }
  .demo-route-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(12px);
    box-shadow:
      0 8px 32px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .demo-route-card:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow:
      0 20px 64px -12px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(251, 191, 36, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
  .demo-route-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .demo-route-card:hover::before {
    opacity: 1;
  }
  /* Accessibility improvements */
  /* svelte-ignore css-unused-selector */
  .demo-route-card a:focus {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
    border-radius: 0.75rem;
  }
  /* svelte-ignore css-unused-selector */
  .demo-route-card a:focus-visible {
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2);
  }
</style>