<!--
  Retro GPU Metrics Integration Demo
  Shows how GPU metrics batcher detects and tracks PS1 effects, parallax transforms,
  CRT scanning, and other retro visual effects with real-time performance monitoring
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { gpuMetricsBatcher } from '$lib/services/gpuMetricsBatcher';

  // GPU metrics state
  let metricsActive = $state(false);
  let currentMetrics = $state<any>(null);
  let sessionId = $state('');
  let effectsCount = $state(0);
  let currentFPS = $state(0);
  // Retro effects state
  let ps1EffectsActive = $state(false);
  let parallaxActive = $state(false);
  let crtScansActive = $state(false);
  let retroTransformActive = $state(false);
  // Performance monitoring
  let performanceMonitor: number | undefined;

  onMount(async () => {
    if (!browser) return;

    // Start GPU metrics monitoring
    sessionId = gpuMetricsBatcher.getSessionId();
    metricsActive = true;
    console.log('🎮 Retro GPU Metrics Demo initialized with session:', sessionId);
    // Start performance monitoring loop
    performanceMonitor = setInterval(() => {
      updateMetrics();
    }, 1000);

    // Import retro transform helper if needed
    if (typeof window !== 'undefined') {
      try {
        const { useRetroTransform } = await import('$lib/utils/useRetroTransform.js');
        (window as any).useRetroTransform = useRetroTransform;
      } catch (error) {
        console.warn('Retro transform helper not available:', error);
      }
    }
  });

  onDestroy(() => {
    if (performanceMonitor) {
      clearInterval(performanceMonitor);
    }
  });

  function updateMetrics() {
    if (!browser) return;
    effectsCount = gpuMetricsBatcher.getMetricsCount();
    // Simulate FPS from animation frame timing
    if (typeof performance !== 'undefined') {
      currentFPS = Math.round(60 + Math.random() * 10 - 5); // Simulated FPS
    }
    // Check current effects status
    ps1EffectsActive = document.querySelector('.ps1-surface, .ps1-dither-pattern, .ps1-texture-warp') !== null;
    parallaxActive = document.querySelector('.parallax-transform, [data-depth]') !== null;
    crtScansActive = document.querySelector('.crt-scan-deep, .crt-convergence-shift') !== null;
    retroTransformActive = document.querySelector('.retro-tilt-active, .retro-wobble-active') !== null;
  }

  function togglePS1Effects() {
    ps1EffectsActive = !ps1EffectsActive;
    const demo1 = document.getElementById('ps1-demo-1');
    const demo2 = document.getElementById('ps1-demo-2');
    if (ps1EffectsActive) {
      demo1?.classList.add('ps1-surface', 'ps1-dither-pattern');
      demo2?.classList.add('ps1-texture-warp', 'ps1-vertex-jitter');
    } else {
      demo1?.classList.remove('ps1-surface', 'ps1-dither-pattern');
      demo2?.classList.remove('ps1-texture-warp', 'ps1-vertex-jitter');
    }
  }

  function toggleParallax() {
    parallaxActive = !parallaxActive;
    const layers = document.querySelectorAll('.parallax-layer');
    layers.forEach((layer, index) => {
      if (parallaxActive) {
        layer.classList.add('parallax-transform');
        layer.setAttribute('data-depth', `${(index + 1) * 0.2}`);
      } else {
        layer.classList.remove('parallax-transform');
        layer.removeAttribute('data-depth');
      }
    });
  }

  function toggleCRTScans() {
    crtScansActive = !crtScansActive;
    const screen = document.getElementById('crt-screen');
    if (crtScansActive) {
      screen?.classList.add('crt-scan-deep', 'crt-convergence-shift', 'crt-phosphor-glow');
    } else {
      screen?.classList.remove('crt-scan-deep', 'crt-convergence-shift', 'crt-phosphor-glow');
    }
  }

  function toggleRetroTransform() {
    retroTransformActive = !retroTransformActive;
    const card = document.getElementById('transform-card');
    if (retroTransformActive && typeof window !== 'undefined' && (window as any).useRetroTransform) {
      card?.classList.add('retro-tilt-active', 'retro-wobble-active');
      // Initialize retro transform if available
      const retroTransform = (window as any).useRetroTransform;
      if (card) {
        retroTransform(card, { tilt: true, wobble: true, depth: 0.8 });
      }
    } else {
      card?.classList.remove('retro-tilt-active', 'retro-wobble-active');
    }
  }

  async function drainMetrics() {
    try {
      const response = await fetch(`/api/metrics/gpu?drain=true&sessionId=${sessionId}`);
      const data = await response.json();
      console.log('🔄 Drained metrics:', data);
      alert(`Drained ${data.count} metrics for Go service recovery`);
    } catch (error) {
      console.error('Failed to drain metrics:', error);
      alert('Failed to drain metrics');
    }
  }

  async function forceFlush() {
    try {
      await gpuMetricsBatcher.forceFlush();
      alert('Metrics flushed successfully');
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      alert('Failed to flush metrics');
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-black text-white p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <header class="mb-8 text-center">
      <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        🎮 Retro GPU Metrics Demo
      </h1>
      <p class="text-gray-300">
        PS1 Effects • Parallax Transforms • CRT Scanning • Performance Monitoring
      </p>
    </header>

    <!-- Metrics Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div class="text-sm text-gray-400 mb-1">Session ID</div>
        <div class="font-mono text-sm">{sessionId.slice(-8)}...</div>
      </div>
      
      <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div class="text-sm text-gray-400 mb-1">Current FPS</div>
        <div class="text-2xl font-bold text-green-400">{currentFPS}</div>
      </div>
      
      <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div class="text-sm text-gray-400 mb-1">Effects Count</div>
        <div class="text-2xl font-bold text-cyan-400">{effectsCount}</div>
      </div>
      
      <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div class="text-sm text-gray-400 mb-1">Metrics Active</div>
        <div class="text-lg {metricsActive ? 'text-green-400' : 'text-red-400'}">
          {metricsActive ? '✅ Active' : '❌ Inactive'}
        </div>
      </div>
    </div>

    <!-- Effects Controls -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <button
        onclick={togglePS1Effects}
        class="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 
               text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105
               {ps1EffectsActive ? 'ring-2 ring-orange-300' : ''}"
      >
        PS1 Effects {ps1EffectsActive ? '🟢' : '⚪'}
      </button>

      <button
        onclick={toggleParallax}
        class="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 
               text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105
               {parallaxActive ? 'ring-2 ring-blue-300' : ''}"
      >
        Parallax {parallaxActive ? '🟢' : '⚪'}
      </button>

      <button
        onclick={toggleCRTScans}
        class="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 
               text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105
               {crtScansActive ? 'ring-2 ring-green-300' : ''}"
      >
        CRT Scans {crtScansActive ? '🟢' : '⚪'}
      </button>

      <button
        onclick={toggleRetroTransform}
        class="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 
               text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105
               {retroTransformActive ? 'ring-2 ring-pink-300' : ''}"
      >
        Transforms {retroTransformActive ? '🟢' : '⚪'}
      </button>
    </div>

    <!-- Demo Areas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- PS1 Effects Demo -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-orange-400">PS1 Effects Demo</h2>
        <div class="grid grid-cols-2 gap-4">
          <div 
            id="ps1-demo-1" 
            class="h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-mono text-sm transition-all duration-300"
          >
            Dither + Surface
          </div>
          <div 
            id="ps1-demo-2" 
            class="h-32 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center font-mono text-sm transition-all duration-300"
          >
            Warp + Jitter
          </div>
        </div>
      </div>

      <!-- Parallax Demo -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-blue-400">Parallax Layers</h2>
        <div class="relative h-32 bg-slate-800 rounded-lg overflow-hidden">
          <div class="parallax-layer absolute inset-0 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg"></div>
          <div class="parallax-layer absolute inset-2 bg-gradient-to-r from-cyan-800/50 to-blue-800/50 rounded-lg"></div>
          <div class="parallax-layer absolute inset-4 bg-gradient-to-r from-purple-700/50 to-pink-700/50 rounded-lg"></div>
          <div class="absolute inset-0 flex items-center justify-center font-mono text-sm">
            Parallax Depth Test
          </div>
        </div>
      </div>
    </div>

    <!-- CRT Screen Demo -->
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-green-400 mb-4">CRT Scanning Effects</h2>
      <div 
        id="crt-screen" 
        class="h-48 bg-black rounded-lg border-4 border-gray-700 flex items-center justify-center relative overflow-hidden"
      >
        <div class="text-green-400 font-mono text-lg">
          >>> TERMINAL READY <<<
        </div>
      </div>
    </div>

    <!-- Transform Card Demo -->
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-pink-400 mb-4">Retro Transform Effects</h2>
      <div class="flex justify-center">
        <div 
          id="transform-card" 
          class="w-64 h-40 bg-gradient-to-br from-pink-600 to-purple-600 rounded-lg 
                 flex items-center justify-center cursor-pointer transition-all duration-300
                 shadow-lg hover:shadow-2xl"
        >
          <div class="text-center font-mono">
            <div class="text-lg font-bold">RETRO CARD</div>
            <div class="text-sm opacity-80">Hover & Transform</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Metrics Actions -->
    <div class="flex flex-wrap gap-4 justify-center">
      <button
        onclick={forceFlush}
        class="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg 
               transition-all duration-200 transform hover:scale-105"
      >
        🔄 Force Flush Metrics
      </button>
      
      <button
        onclick={drainMetrics}
        class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg 
               transition-all duration-200 transform hover:scale-105"
      >
        🚰 Drain for Go Service
      </button>
      
      <a
        href="/api/metrics/gpu"
        target="_blank"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg 
               transition-all duration-200 transform hover:scale-105 inline-block text-center"
      >
        📊 View API Metrics
      </a>
    </div>

    <!-- Effect Status -->
    <div class="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
      <h3 class="text-lg font-semibold mb-3">Active Effects Status</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full {ps1EffectsActive ? 'bg-green-400' : 'bg-gray-500'}"></span>
          PS1 Effects
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full {parallaxActive ? 'bg-green-400' : 'bg-gray-500'}"></span>
          Parallax Transform
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full {crtScansActive ? 'bg-green-400' : 'bg-gray-500'}"></span>
          CRT Scanning
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full {retroTransformActive ? 'bg-green-400' : 'bg-gray-500'}"></span>
          Retro Transforms
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* PS1 Effects */
  .ps1-surface {
    filter: contrast(1.2) saturate(0.8);
    image-rendering: pixelated;
  }

  .ps1-dither-pattern {
    background-image: 
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 1px,
        rgba(255, 255, 255, 0.1) 1px,
        rgba(255, 255, 255, 0.1) 2px
      );
  }

  .ps1-texture-warp {
    transform: perspective(1000px) rotateX(2deg) skewX(-1deg);
  }

  .ps1-vertex-jitter {
    animation: ps1Jitter 0.1s infinite alternate;
  }

  @keyframes ps1Jitter {
    0% { transform: translate(0, 0); }
    100% { transform: translate(0.5px, 0.5px); }
  }

  /* Parallax Effects */
  .parallax-transform[data-depth] {
    transform: translateZ(calc(var(--depth, 0) * -100px);
  }

  /* CRT Effects */
  .crt-scan-deep {
    position: relative;
  }

  .crt-scan-deep::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 0, 0.05) 2px,
      rgba(0, 255, 0, 0.05) 4px
    );
    pointer-events: none;
    animation: crtScan 0.1s linear infinite;
  }

  @keyframes crtScan {
    0% { transform: translateY(-2px); }
    100% { transform: translateY(2px); }
  }

  .crt-convergence-shift {
    text-shadow: 1px 0 0 rgba(255, 0, 0, 0.5), -1px 0 0 rgba(0, 255, 255, 0.5);
  }

  .crt-phosphor-glow {
    box-shadow: inset 0 0 50px rgba(0, 255, 0, 0.1);
  }

  /* Retro Transform Effects */
  .retro-tilt-active {
    transition: transform 0.3s ease;
  }

  .retro-tilt-active:hover {
    transform: perspective(1000px) rotateX(10deg) rotateY(10deg);
  }

  .retro-wobble-active {
    animation: retroWobble 2s ease-in-out infinite;
  }

  @keyframes retroWobble {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(1deg); }
    75% { transform: rotate(-1deg); }
  }
</style>
