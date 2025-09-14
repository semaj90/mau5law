<!--
Vector Intelligence Demo Page
Comprehensive showcase of Phase 4 capabilities
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import VectorIntelligenceDemo from '$lib/components/vector/VectorIntelligenceDemo.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    ArrowLeft,
    ExternalLink,
    BookOpen,
    Code,
    Github,
    Zap
  } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Vector Intelligence Demo - Phase 4 AI System</title>
  <meta name="description" content="Experience advanced vector intelligence, semantic search, AI recommendations, and document analysis for legal professionals." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

  <!-- Navigation Header -->
  <div class="bg-white dark:bg-gray-800 shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button class="bits-btn" variant="ghost" size="sm" on:click="history.back()">
<ArrowLeft class="h-4 w-4 mr-2" />
            Back

          <div class="h-6 w-px bg-border"></div>
          <div>
            <h1 class="text-xl font-semibold">Vector Intelligence Demo</h1>
            <p class="text-sm nes-text is-disabled">Phase 4 AI System Showcase</p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <Badge class="bits-badge-default flex items-center gap-1">
            <Zap class="h-3 w-3" />
            Phase 4 Complete
          </Badge>
          <Button class="bits-btn" variant="outline" size="sm">
<BookOpen class="h-4 w-4 mr-2" />
            Documentation

          <Button class="bits-btn" variant="outline" size="sm">
<Github class="h-4 w-4 mr-2" />
            Source Code

        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">

    <!-- Introduction Section -->
    <div class="mb-8 text-center space-y-4">
      <div class="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
        <Code class="h-4 w-4" />
        <span>Interactive Demo Environment</span>
      </div>

      <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Vector Intelligence System
      </h1>

      <p class="text-xl nes-text is-disabled max-w-4xl mx-auto leading-relaxed">
        Experience the cutting-edge capabilities of our Phase 4 Vector Intelligence system.
        Featuring advanced semantic search, AI-powered recommendations, comprehensive document
        analysis, and real-time system monitoring - all optimized for legal professionals.
      </p>
    </div>

    <!-- Feature Highlights -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bits-nier-bits-card border-l-4 border-l-blue-500 nes-container">
        <div class="yorha-panel-header bits-nier-bits-yorha-panel-header" variant="default" legal={true}>
          <h3 class="nes-text is-primary text-lg flex items-center gap-2">
            🔍 Semantic Vector Search
          </h3>
        </div>
        <div class="yorha-panel-content bits-nier-bits-yorha-panel-content" variant="default" legal={true}>
          <ul class="text-sm nes-text is-disabled space-y-1">
            <li>• Multi-modal embedding support</li>
            <li>• Contextual filtering by case type</li>
            <li>• Advanced relevance scoring</li>
            <li>• Real-time result highlighting</li>
          </ul>
        </div>
      </div>

      <div class="bits-nier-bits-card border-l-4 border-l-green-500 nes-container">
        <div class="yorha-panel-header bits-nier-bits-yorha-panel-header" variant="default" legal={true}>
          <h3 class="nes-text is-primary text-lg flex items-center gap-2">
            💡 AI Recommendations
          </h3>
        </div>
        <div class="yorha-panel-content bits-nier-bits-yorha-panel-content" variant="default" legal={true}>
          <ul class="text-sm nes-text is-disabled space-y-1">
            <li>• Personalized by user role</li>
            <li>• Context-aware suggestions</li>
            <li>• Priority-based execution</li>
            <li>• Confidence scoring</li>
          </ul>
        </div>
      </div>

      <div class="bits-nier-bits-card border-l-4 border-l-purple-500 nes-container">
        <div class="yorha-panel-header bits-nier-bits-yorha-panel-header" variant="default" legal={true}>
          <h3 class="nes-text is-primary text-lg flex items-center gap-2">
            📊 Document Analysis
          </h3>
        </div>
        <div class="yorha-panel-content bits-nier-bits-yorha-panel-content" variant="default" legal={true}>
          <ul class="text-sm nes-text is-disabled space-y-1">
            <li>• Entity extraction & classification</li>
            <li>• Theme identification</li>
            <li>• Relationship mapping</li>
            <li>• Complexity assessment</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- API Information -->
    <div class="bits-nier-bits-card mb-8 nes-container">
      <div class="yorha-panel-header bits-nier-bits-yorha-panel-header" variant="default" legal={true}>
        <h3 class="nes-text is-primary flex items-center gap-2">
          <ExternalLink class="h-5 w-5" />
          API Endpoints Available
        </h3>
      </div>
      <div class="yorha-panel-content bits-nier-bits-yorha-panel-content" variant="default" legal={true}>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="space-y-2">
            <h3 class="font-semibold">Vector Search</h3>
            <p class="nes-text is-disabled">POST /api/vector/search</p>
            <p class="nes-text is-disabled">GET /api/vector/search?q=query</p>
          </div>
          <div class="space-y-2">
            <h3 class="font-semibold">Recommendations</h3>
            <p class="nes-text is-disabled">POST /api/vector/recommendations</p>
            <p class="nes-text is-disabled">GET /api/vector/recommendations?context=...</p>
          </div>
          <div class="space-y-2">
            <h3 class="font-semibold">Analysis</h3>
            <p class="nes-text is-disabled">POST /api/vector/analyze</p>
            <p class="nes-text is-disabled">GET /api/vector/analyze (docs)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Component -->
    <VectorIntelligenceDemo />

    <!-- Technical Information -->
    <div class="mt-12 space-y-8">
      <div class="text-center">
        <h2 class="text-2xl font-bold mb-4">Technology Stack</h2>
        <p class="nes-text is-disabled mb-8">
          Built with cutting-edge AI and web technologies for optimal performance and user experience.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bits-nier-bits-card text-center nes-container">
          <div class="yorha-panel-content bits-nier-bits-yorha-panel-content p-6" variant="default" legal={true}>
            <div class="text-2xl mb-2">🧠</div>
            <h3 class="font-semibold mb-2">Vector Intelligence</h3>
            <p class="text-sm nes-text is-disabled">Advanced semantic search with 384-dimensional embeddings</p>
          </div>
        </div>

        <div class="bits-nier-bits-card text-center nes-container">
          <div class="yorha-panel-content bits-nier-bits-yorha-panel-content p-6" variant="default" legal={true}>
            <div class="text-2xl mb-2">⚡</div>
            <h3 class="font-semibold mb-2">SvelteKit 2</h3>
            <p class="text-sm nes-text is-disabled">Modern framework with Svelte 5 runes system</p>
          </div>
        </div>

        <div class="bits-nier-bits-card text-center nes-container">
          <div class="yorha-panel-content bits-nier-bits-yorha-panel-content p-6" variant="default" legal={true}>
            <div class="text-2xl mb-2">🎨</div>
            <h3 class="font-semibold mb-2">UnoCSS</h3>
            <p class="text-sm nes-text is-disabled">Atomic CSS with bits-ui and shadcn-svelte</p>
          </div>
        </div>

        <div class="bits-nier-bits-card text-center nes-container">
          <div class="yorha-panel-content bits-nier-bits-yorha-panel-content p-6" variant="default" legal={true}>
            <div class="text-2xl mb-2">🤖</div>
            <h3 class="font-semibold mb-2">Multi-Agent AI</h3>
            <p class="text-sm nes-text is-disabled">AutoGen & CrewAI integration for complex analysis</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-16 text-center text-sm nes-text is-disabled">
      <p>
        Vector Intelligence Demo - Phase 4 Implementation Complete
      </p>
      <p class="mt-2">
        Built with ❤️ using SvelteKit, UnoCSS, and advanced AI technologies
      </p>
    </div>
  </div>
</div>

<style>
  /* @unocss-include */
</style>
