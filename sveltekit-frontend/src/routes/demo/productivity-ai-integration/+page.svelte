<!-- Productivity AI Integration Demo -->
<script lang="ts">
</script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  // Import components
  import QLorATrainingPanel from '$lib/components/ai/QLorATrainingPanel.svelte';
  import NES3DLODProcessor from '$lib/components/ui/gaming/effects/NES3DLODProcessor.svelte';
  import EnhancedMinIODragDrop from '$lib/components/upload/EnhancedMinIODragDrop.svelte';
  import RecommendationContainer from '$lib/components/ui/gaming/RecommendationContainer.svelte';
  
  // Import services
  import { 
    userAnalyticsRLIntegration, 
    userHistory, 
    analyticsProfile 
  } from '$lib/services/user-analytics-rl-integration';
  import { recommendations } from '$lib/services/recommendation-orchestrator';

  // State
  let activeDemo = $state<'overview' | 'qlora' | 'analytics' | 'minio' | 'effects'>('overview');
  let processing = $state(false);
  let demoDocument = $state({
    id: 'demo_doc_123',
    title: 'Sample Legal Case Analysis',
    type: 'case' as const,
    progress: 0,
    complexity: 0.7
  });
  let demoConnections = $state([
    { id: 'conn1', source: 'evidence1', target: 'case1', strength: 0.8 },
    { id: 'conn2', source: 'statute1', target: 'case1', strength: 0.6 },
    { id: 'conn3', source: 'precedent1', target: 'case1', strength: 0.9 }
  ]);

  // Analytics subscriptions
  let currentHistory = $state<any[]>([]);
  let currentProfile = $state<any>(null);
  let currentRecommendations = $state<any[]>([]);

  onMount(() => {
    // Subscribe to analytics
    const unsubHistory = userHistory.subscribe(value => currentHistory = value);
    const unsubProfile = analyticsProfile.subscribe(value => currentProfile = value);
    const unsubRecs = recommendations.subscribe(value => currentRecommendations = value);

    // Start demo tracking
    startDemoTracking();

    return () => {
      unsubHistory();
      unsubProfile();
      unsubRecs();
    };
  });

  async function startDemoTracking() {
    // Track demo page visit
    await userAnalyticsRLIntegration.trackUserAction(
      'document_open',
      'productivity-ai-demo',
      { demoMode: true },
      { complexity: 0.3, caseId: 'demo_case' }
    );
  }

  async function switchDemo(demo: typeof activeDemo) {
    const actionId = await userAnalyticsRLIntegration.trackUserAction(
      'search',
      `demo_switch_${demo}`,
      { previousDemo: activeDemo, newDemo: demo },
      { complexity: 0.2 }
    );

    activeDemo = demo;

    // Complete action after brief delay
    setTimeout(() => {
      userAnalyticsRLIntegration.completeAction(actionId, {
        success: true,
        userFeedback: 'positive',
        confidence: 0.9
      });
    }, 500);
  }

  async function startProcessingDemo() {
    const actionId = await userAnalyticsRLIntegration.trackUserAction(
      'analysis_run',
      'demo_processing',
      { documentId: demoDocument.id },
      { complexity: demoDocument.complexity }
    );

    processing = true;
    demoDocument.progress = 0;

    // Simulate processing with progress updates
    const progressInterval = setInterval(() => {
      demoDocument.progress += Math.random() * 0.15;
      
      if (demoDocument.progress >= 1) {
        demoDocument.progress = 1;
        processing = false;
        clearInterval(progressInterval);
        
        // Complete action
        userAnalyticsRLIntegration.completeAction(actionId, {
          success: true,
          result: { insights: 5, connections: 3 },
          confidence: 0.85,
          userFeedback: 'positive'
        });
      }
    }, 800);
  }

  async function handleFileUpload(event: CustomEvent) {
    const actionId = await userAnalyticsRLIntegration.trackUserAction(
      'evidence_upload',
      'demo_file_upload',
      { fileCount: event.detail.length },
      { complexity: 0.5 }
    );

    // Simulate upload completion
    setTimeout(() => {
      userAnalyticsRLIntegration.completeAction(actionId, {
        success: true,
        result: { uploadedFiles: event.detail.length },
        confidence: 0.95
      });
    }, 2000);
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
</script>

<svelte:head>
  <title>Productivity AI Integration Demo</title>
  <meta name="description" content="Comprehensive demo of user analytics, QLorA training, and AI-powered productivity features" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
  <!-- Recommendations Container -->
  <RecommendationContainer />

  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        🚀 Productivity AI Integration
      </h1>
      <p class="text-xl text-gray-300 max-w-3xl mx-auto">
        Comprehensive user analytics, QLorA training, Moogle Graph Synthesizer, and MinIO file processing with 3D NES.css effects
      </p>
    </div>

    <!-- Navigation -->
    <div class="flex flex-wrap justify-center gap-4 mb-8">
      {#each [
        { id: 'overview', name: '📊 Overview', desc: 'System status' },
        { id: 'qlora', name: '🧠 QLorA Training', desc: 'AI fine-tuning' },
        { id: 'analytics', name: '📈 User Analytics', desc: 'Behavior analysis' },
        { id: 'minio', name: '📁 File Upload', desc: 'MinIO integration' },
        { id: 'effects', name: '🎮 3D Effects', desc: 'NES.css processing' }
      ] as demo}
        <button
          onclick={() => switchDemo(demo.id)}
          class="px-6 py-3 rounded-lg border border-cyan-500/30 transition-all duration-300 {
            activeDemo === demo.id 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-cyan-500/50'
          }"
        >
          <div class="font-semibold">{demo.name}</div>
          <div class="text-xs opacity-75">{demo.desc}</div>
        </button>
      {/each}
    </div>

    <!-- Content Area -->
    <div class="grid gap-8">
      
      <!-- Overview Section -->
      {#if activeDemo === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8" transition:fade={{ duration: 300 }}>
          <!-- System Stats -->
          <div class="bg-gray-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
            <h3 class="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              📊 System Analytics
            </h3>
            
            {#if currentProfile}
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-blue-500/20 p-3 rounded">
                    <div class="text-sm text-gray-400">Productivity Score</div>
                    <div class="text-2xl font-bold text-blue-400">
                      {(currentProfile.performance.overallProductivity * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div class="bg-green-500/20 p-3 rounded">
                    <div class="text-sm text-gray-400">Success Rate</div>
                    <div class="text-2xl font-bold text-green-400">
                      {(currentProfile.performance.taskCompletionRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div class="bg-purple-500/20 p-3 rounded">
                    <div class="text-sm text-gray-400">Learning Rate</div>
                    <div class="text-2xl font-bold text-purple-400">
                      {(currentProfile.performance.learningVelocity * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div class="bg-yellow-500/20 p-3 rounded">
                    <div class="text-sm text-gray-400">Expertise</div>
                    <div class="text-lg font-bold text-yellow-400 capitalize">
                      {currentProfile.performance.expertiseLevel}
                    </div>
                  </div>
                </div>
                
                <div class="bg-gray-700/50 p-3 rounded">
                  <div class="text-sm text-gray-400 mb-2">Reinforcement Learning</div>
                  <div class="text-sm">
                    • {currentProfile.reinforcement.rewardHistory.length} actions tracked
                  </div>
                  <div class="text-sm">
                    • {Object.keys(currentProfile.reinforcement.actionPreferences).length} learned preferences
                  </div>
                  <div class="text-sm">
                    • {(currentProfile.reinforcement.explorationTendency * 100).toFixed(0)}% exploration rate
                  </div>
                </div>
              </div>
            {:else}
              <div class="text-gray-400">Loading analytics profile...</div>
            {/if}
          </div>

          <!-- Recent Activity -->
          <div class="bg-gray-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
            <h3 class="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              🕒 Recent Activity
            </h3>
            
            <div class="space-y-3 max-h-80 overflow-y-auto">
              {#each currentHistory.slice(0, 10) as action (action.id)}
                <div class="flex items-center gap-3 p-3 bg-gray-700/30 rounded" transition:fly={{ x: -20, duration: 200 }}>
                  <div class="w-8 h-8 rounded-full flex items-center justify-center {
                    action.outcome.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }">
                    {action.outcome.success ? '✓' : '✗'}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm capitalize">
                      {action.action.type.replace('_', ' ')} • {action.action.target}
                    </div>
                    <div class="text-xs text-gray-400">
                      {formatDuration(action.outcome.duration)} • {new Date(action.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Active Recommendations -->
          <div class="bg-gray-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 lg:col-span-2">
            <h3 class="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              💡 Active Recommendations ({currentRecommendations.length})
            </h3>
            
            {#if currentRecommendations.length > 0}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each currentRecommendations.slice(0, 6) as rec (rec.id)}
                  <div class="bg-gray-700/50 p-4 rounded border-l-4 {
                    rec.priority === 'critical' ? 'border-red-500' :
                    rec.priority === 'high' ? 'border-orange-500' :
                    rec.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                  }" transition:scale={{ duration: 200 }}>
                    <div class="font-semibold text-sm mb-2">{rec.title}</div>
                    <div class="text-xs text-gray-400 mb-2 line-clamp-2">{rec.description}</div>
                    <div class="flex justify-between items-center text-xs">
                      <span class="bg-gray-600 px-2 py-1 rounded">{rec.type}</span>
                      <span>{(rec.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-gray-400">No active recommendations</div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- QLorA Training Section -->
      {#if activeDemo === 'qlora'}
        <div transition:fade={{ duration: 300 }}>
          <QLorATrainingPanel enabledByDefault={true} />
        </div>
      {/if}

      <!-- User Analytics Section -->
      {#if activeDemo === 'analytics'}
        <div class="bg-gray-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6" transition:fade={{ duration: 300 }}>
          <h3 class="text-xl font-bold text-cyan-400 mb-6">User Analytics & Reinforcement Learning</h3>
          
          {#if currentProfile}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Performance Metrics -->
              <div class="space-y-6">
                <div>
                  <h4 class="text-lg font-semibold mb-4 text-purple-400">📊 Performance Metrics</h4>
                  <div class="space-y-3">
                    <div class="flex justify-between items-center">
                      <span>Overall Productivity</span>
                      <div class="w-32 bg-gray-700 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: {currentProfile.performance.overallProductivity * 100}%"></div>
                      </div>
                      <span class="text-sm">{(currentProfile.performance.overallProductivity * 100).toFixed(0)}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span>Task Completion</span>
                      <div class="w-32 bg-gray-700 rounded-full h-2">
                        <div class="bg-green-500 h-2 rounded-full" style="width: {currentProfile.performance.taskCompletionRate * 100}%"></div>
                      </div>
                      <span class="text-sm">{(currentProfile.performance.taskCompletionRate * 100).toFixed(0)}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span>Learning Velocity</span>
                      <div class="w-32 bg-gray-700 rounded-full h-2">
                        <div class="bg-purple-500 h-2 rounded-full" style="width: {currentProfile.performance.learningVelocity * 100}%"></div>
                      </div>
                      <span class="text-sm">{(currentProfile.performance.learningVelocity * 100).toFixed(0)}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span>Accuracy Rate</span>
                      <div class="w-32 bg-gray-700 rounded-full h-2">
                        <div class="bg-cyan-500 h-2 rounded-full" style="width: {currentProfile.performance.accuracyRate * 100}%"></div>
                      </div>
                      <span class="text-sm">{(currentProfile.performance.accuracyRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 class="text-lg font-semibold mb-4 text-green-400">🎯 Reinforcement Learning</h4>
                  <div class="bg-gray-700/50 p-4 rounded">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-gray-400">Total Rewards:</span>
                        <div class="font-bold text-green-400">{currentProfile.reinforcement.rewardHistory.length}</div>
                      </div>
                      <div>
                        <span class="text-gray-400">Exploration Rate:</span>
                        <div class="font-bold text-yellow-400">{(currentProfile.reinforcement.explorationTendency * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <span class="text-gray-400">Adaptation Rate:</span>
                        <div class="font-bold text-blue-400">{(currentProfile.reinforcement.adaptationRate * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <span class="text-gray-400">Learned Actions:</span>
                        <div class="font-bold text-purple-400">{Object.keys(currentProfile.reinforcement.actionPreferences).length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Predictions -->
              <div class="space-y-6">
                <div>
                  <h4 class="text-lg font-semibold mb-4 text-yellow-400">🔮 AI Predictions</h4>
                  <div class="space-y-3">
                    {#if currentProfile.predictions.nextLikelyActions.length > 0}
                      {#each currentProfile.predictions.nextLikelyActions.slice(0, 5) as prediction}
                        <div class="bg-gray-700/50 p-3 rounded">
                          <div class="flex justify-between items-center">
                            <span class="font-medium">{prediction.action}</span>
                            <span class="text-sm text-green-400">{(prediction.probability * 100).toFixed(0)}%</span>
                          </div>
                          <div class="w-full bg-gray-600 rounded-full h-1 mt-2">
                            <div class="bg-yellow-500 h-1 rounded-full" style="width: {prediction.probability * 100}%"></div>
                          </div>
                        </div>
                      {/each}
                    {:else}
                      <div class="text-gray-400 text-center py-4">
                        Building predictive model...
                      </div>
                    {/if}
                  </div>
                </div>

                <button
                  onclick={startProcessingDemo}
                  disabled={processing}
                  class="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-200"
                >
                  {processing ? 'Processing Analytics...' : '🚀 Run Analytics Demo'}
                </button>
              </div>
            </div>
          {:else}
            <div class="text-center py-8">
              <div class="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p class="text-gray-400">Initializing user analytics profile...</p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- MinIO Upload Section -->
      {#if activeDemo === 'minio'}
        <div transition:fade={{ duration: 300 }}>
          <EnhancedMinIODragDrop
            caseId="demo_case"
            enableCudaAcceleration={true}
            enableGpuOptimization={true}
            useMsvcOptimizations={true}
            on:uploadComplete={handleFileUpload}
          />
        </div>
      {/if}

      <!-- 3D Effects Section -->
      {#if activeDemo === 'effects'}
        <div transition:fade={{ duration: 300 }}>
          <div class="mb-6">
            <h3 class="text-xl font-bold text-cyan-400 mb-4">🎮 3D NES.css LOD Effects</h3>
            <p class="text-gray-300 mb-4">
              Experience retro gaming-inspired document processing with Level-of-Detail optimization and multiple console styles.
            </p>
            
            <div class="flex flex-wrap gap-4 mb-6">
              <button
                onclick={startProcessingDemo}
                disabled={processing}
                class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold transition-colors"
              >
                {processing ? 'Processing...' : '▶️ Start Processing'}
              </button>
              
              <select 
                class="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                onchange={(e) => {
                  // In a real implementation, this would change the effect style
                  console.log('Style changed to:', e.target.value);
                }}
              >
                <option value="n64">N64 Style</option>
                <option value="nes">NES Style</option>
                <option value="snes">SNES Style</option>
                <option value="ps1">PlayStation 1</option>
                <option value="yorha">YoRHa Style</option>
              </select>
              
              <select 
                class="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                onchange={(e) => {
                  console.log('LOD changed to:', e.target.value);
                }}
              >
                <option value="medium">Medium LOD</option>
                <option value="low">Low LOD</option>
                <option value="high">High LOD</option>
                <option value="ultra">Ultra LOD</option>
              </select>
            </div>
          </div>
          
          <NES3DLODProcessor
            processing={processing}
            document={demoDocument}
            connections={demoConnections}
            lodLevel="medium"
            style="n64"
          />
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="mt-16 text-center text-gray-400">
      <p class="text-sm">
        🚀 Powered by QLorA Training, Moogle Graph Synthesizer, MinIO Storage, and NES-RL Reinforcement Learning
      </p>
      <p class="text-xs mt-2">
        Concurrent data parallelism with intelligent caching for enhanced user productivity
      </p>
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
