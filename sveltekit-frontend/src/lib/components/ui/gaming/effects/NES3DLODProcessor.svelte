<!-- 3D NES.css LOD Effects for Document Processing -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut, elasticOut } from 'svelte/easing';

  interface Props {
    processing?: boolean;
    document?: {
      id: string;
      title: string;
      type: 'case' | 'evidence' | 'statute' | 'brief';
      progress: number;
      complexity: number;
    };
    connections?: Array<{
      id: string;
      source: string;
      target: string;
      strength: number;
    }>;
    lodLevel?: 'low' | 'medium' | 'high' | 'ultra';
    style?: 'nes' | 'snes' | 'n64' | 'ps1' | 'yorha';
  }

  let {
    processing = false,
    document = null,
    connections = [],
    lodLevel = 'medium',
    style = 'n64'
  }: Props = $props();

  // State
  let container: HTMLDivElement;
  let animationFrame: number;
  let particles: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    velocity: { x: number; y: number; z: number };
    type: 'data' | 'connection' | 'analysis' | 'result';
    color: string;
    size: number;
    life: number;
    maxLife: number;
  }> = [];

  let processingStage = $state<'parsing' | 'analyzing' | 'connecting' | 'synthesizing' | 'complete'>('parsing');
  let rotationX = $state(0);
  let rotationY = $state(0);
  let rotationZ = $state(0);
  let zoom = $state(1);
  let pulseIntensity = $state(0);

  // Style configurations
  const styleConfigs = {
    nes: {
      pixelSize: 4,
      colors: {
        primary: '#00D4AA',
        secondary: '#FC0F0F',
        accent: '#FFFF00',
        background: '#2D2D2D'
      },
      shadows: 'drop-shadow(4px 4px 0px #000000)',
      filter: 'contrast(1.2) saturate(1.3)',
      borderRadius: '0px'
    },
    snes: {
      pixelSize: 2,
      colors: {
        primary: '#FFE066',
        secondary: '#FF6B9D',
        accent: '#5A4FCF',
        background: '#E4E4FF'
      },
      shadows: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.7))',
      filter: 'contrast(1.1) saturate(1.2)',
      borderRadius: '4px'
    },
    n64: {
      pixelSize: 1,
      colors: {
        primary: '#10B981',
        secondary: '#F59E0B',
        accent: '#60A5FA',
        background: 'linear-gradient(135deg, #1E3A8A, #3730A3)'
      },
      shadows: 'drop-shadow(0 0 20px rgba(96, 165, 250, 0.5))',
      filter: 'contrast(1.0) saturate(1.1)',
      borderRadius: '8px'
    },
    ps1: {
      pixelSize: 1,
      colors: {
        primary: '#3B82F6',
        secondary: '#EF4444',
        accent: '#F3F4F6',
        background: '#1F2937'
      },
      shadows: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
      filter: 'contrast(0.9) saturate(1.0)',
      borderRadius: '2px'
    },
    yorha: {
      pixelSize: 0,
      colors: {
        primary: '#D4AF37',
        secondary: '#00FF41',
        accent: '#E0E0E0',
        background: 'linear-gradient(135deg, #0F0F0F, #2D2D2D)'
      },
      shadows: 'drop-shadow(0 0 40px rgba(212, 175, 55, 0.4))',
      filter: 'contrast(1.1) saturate(0.9)',
      borderRadius: '0px'
    }
  };

  let currentStyle = $derived(styleConfigs[style]);

  // LOD configurations
  const lodConfigs = {
    low: { particleCount: 25, updateRate: 8, effectIntensity: 0.5 },
    medium: { particleCount: 50, updateRate: 4, effectIntensity: 0.7 },
    high: { particleCount: 100, updateRate: 2, effectIntensity: 0.9 },
    ultra: { particleCount: 200, updateRate: 1, effectIntensity: 1.0 }
  };

  let currentLOD = $derived(lodConfigs[lodLevel]);

  onMount(() => {
    if (processing) {
      startProcessingAnimation();
    }
  });

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  $effect(() => {
    if (processing) {
      startProcessingAnimation();
    } else {
      stopProcessingAnimation();
    }
  });

  function startProcessingAnimation() {
    processingStage = 'parsing';
    initializeParticles();
    animate();
    runProcessingSequence();
  }

  function stopProcessingAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    particles = [];
    processingStage = 'complete';
  }

  function initializeParticles() {
    particles = [];
    
    for (let i = 0; i < currentLOD.particleCount; i++) {
      particles.push(createParticle('data'));
    }
  }

  function createParticle(type: 'data' | 'connection' | 'analysis' | 'result') {
    const colors = {
      data: currentStyle.colors.primary,
      connection: currentStyle.colors.secondary,
      analysis: currentStyle.colors.accent,
      result: '#00FF00'
    };

    return {
      id: `particle_${Date.now()}_${Math.random()}`,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 300,
      z: (Math.random() - 0.5) * 200,
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 1
      },
      type,
      color: colors[type],
      size: Math.random() * 6 + 2,
      life: 1.0,
      maxLife: Math.random() * 3000 + 2000
    };
  }

  function animate() {
    updateParticles();
    updateCamera();
    
    animationFrame = requestAnimationFrame(() => {
      if (processing) animate();
    });
  }

  function updateParticles() {
    const now = Date.now();
    
    particles.forEach((particle, index) => {
      // Update position
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.z += particle.velocity.z;

      // Apply physics based on processing stage
      switch (processingStage) {
        case 'parsing':
          particle.velocity.x *= 0.99;
          particle.velocity.y *= 0.99;
          break;
        case 'analyzing':
          // Orbital motion
          const centerDistance = Math.sqrt(particle.x * particle.x + particle.y * particle.y);
          const orbitalForce = 0.01;
          particle.velocity.x += -particle.y * orbitalForce / Math.max(centerDistance, 50);
          particle.velocity.y += particle.x * orbitalForce / Math.max(centerDistance, 50);
          break;
        case 'connecting':
          // Attraction to connections
          connections.forEach(connection => {
            const dx = Math.random() * 100 - particle.x;
            const dy = Math.random() * 100 - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = connection.strength * 0.001;
            
            particle.velocity.x += (dx / Math.max(distance, 1)) * force;
            particle.velocity.y += (dy / Math.max(distance, 1)) * force;
          });
          break;
        case 'synthesizing':
          // Converge to center
          const centerForce = 0.02;
          particle.velocity.x += -particle.x * centerForce;
          particle.velocity.y += -particle.y * centerForce;
          particle.velocity.z += -particle.z * centerForce;
          break;
      }

      // Boundary wrapping
      if (Math.abs(particle.x) > 300) particle.velocity.x *= -0.8;
      if (Math.abs(particle.y) > 200) particle.velocity.y *= -0.8;
      if (Math.abs(particle.z) > 150) particle.velocity.z *= -0.8;

      // Life decay
      particle.life = Math.max(0, particle.life - 0.002);
      
      // Regenerate dead particles
      if (particle.life <= 0) {
        particles[index] = createParticle(particle.type);
      }
    });

    // Add new particles based on processing stage
    if (particles.length < currentLOD.particleCount && Math.random() < 0.1) {
      const types: Array<'data' | 'connection' | 'analysis' | 'result'> = ['data', 'connection', 'analysis', 'result'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      particles.push(createParticle(randomType));
    }
  }

  function updateCamera() {
    rotationX += 0.5;
    rotationY += 0.3;
    rotationZ += 0.1;
    
    // Breathing zoom effect
    zoom = 1 + Math.sin(Date.now() * 0.001) * 0.1;
    
    // Pulse intensity based on processing stage
    const stageIntensities = {
      parsing: 0.3,
      analyzing: 0.6,
      connecting: 0.8,
      synthesizing: 1.0,
      complete: 0.2
    };
    
    const targetIntensity = stageIntensities[processingStage];
    pulseIntensity += (targetIntensity - pulseIntensity) * 0.05;
  }

  async function runProcessingSequence() {
    const stages = [
      { stage: 'parsing', duration: 2000 },
      { stage: 'analyzing', duration: 3000 },
      { stage: 'connecting', duration: 2500 },
      { stage: 'synthesizing', duration: 2000 }
    ];

    for (const { stage, duration } of stages) {
      if (!processing) break;
      
      processingStage = stage as any;
      await new Promise(resolve => setTimeout(resolve, duration));
    }

    if (processing) {
      processingStage = 'complete';
    }
  }

  function getParticleStyle(particle: any) {
    const scale = Math.max(0.1, particle.life);
    const opacity = Math.min(1, particle.life * 2);
    const perspective = 1000;
    const translateZ = particle.z;
    
    return `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: 
        translateX(${particle.x}px) 
        translateY(${particle.y}px) 
        translateZ(${translateZ}px)
        scale(${scale});
      opacity: ${opacity};
      background: ${particle.color};
      width: ${particle.size}px;
      height: ${particle.size}px;
      border-radius: ${currentStyle.borderRadius};
      box-shadow: ${currentStyle.shadows};
      filter: ${currentStyle.filter};
      pointer-events: none;
      z-index: ${Math.round(100 + translateZ)};
    `;
  }

  function getContainerStyle() {
    return `
      transform: 
        perspective(1000px)
        rotateX(${rotationX * 0.1}deg) 
        rotateY(${rotationY * 0.1}deg) 
        rotateZ(${rotationZ * 0.05}deg)
        scale(${zoom});
      filter: ${currentStyle.filter} brightness(${1 + pulseIntensity * 0.3});
    `;
  }

  function getStageColor() {
    const colors = {
      parsing: currentStyle.colors.primary,
      analyzing: currentStyle.colors.secondary,
      connecting: currentStyle.colors.accent,
      synthesizing: '#00FF00',
      complete: '#FFFFFF'
    };
    return colors[processingStage];
  }

  function getStageDescription() {
    const descriptions = {
      parsing: 'Parsing document structure...',
      analyzing: 'Running AI analysis...',
      connecting: 'Finding connections...',
      synthesizing: 'Synthesizing results...',
      complete: 'Processing complete'
    };
    return descriptions[processingStage];
  }
</script>

<div 
  bind:this={container}
  class="nes-lod-processor"
  style="
    background: {currentStyle.colors.background};
    image-rendering: {currentStyle.pixelSize > 2 ? 'pixelated' : 'auto'};
  "
>
  <!-- 3D Scene Container -->
  <div 
    class="scene-container"
    style={getContainerStyle()}
  >
    <!-- Document Representation -->
    {#if document}
      <div 
        class="document-core"
        style="
          color: {getStageColor()};
          text-shadow: 0 0 20px {getStageColor()};
          border: 2px solid {getStageColor()};
          border-radius: {currentStyle.borderRadius};
          box-shadow: {currentStyle.shadows}, inset 0 0 20px {getStageColor()}33;
        "
        transition:scale={{ duration: 500, easing: elasticOut }}
      >
        <div class="doc-icon">📄</div>
        <div class="doc-title">{document.title}</div>
        <div class="doc-type">{document.type.toUpperCase()}</div>
        
        <!-- Progress Ring -->
        <div class="progress-ring">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="25"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="2"
            />
            <circle
              cx="30"
              cy="30"
              r="25"
              fill="none"
              stroke={getStageColor()}
              stroke-width="2"
              stroke-dasharray={`${2 * Math.PI * 25}`}
              stroke-dashoffset={`${2 * Math.PI * 25 * (1 - (document.progress || 0))}`}
              transform="rotate(-90 30 30)"
              style="transition: stroke-dashoffset 0.5s ease;"
            />
          </svg>
          <div class="progress-text">{Math.round((document.progress || 0) * 100)}%</div>
        </div>
      </div>
    {/if}

    <!-- 3D Particles -->
    {#each particles as particle (particle.id)}
      <div 
        class="particle {particle.type}"
        style={getParticleStyle(particle)}
        transition:scale={{ duration: 300, easing: quintOut }}
      ></div>
    {/each}

    <!-- Connection Lines -->
    {#each connections as connection (connection.id)}
      <div 
        class="connection-line"
        style="
          background: {currentStyle.colors.secondary};
          opacity: {connection.strength};
          box-shadow: 0 0 10px {currentStyle.colors.secondary};
        "
        transition:fly={{ duration: 500, easing: quintOut }}
      ></div>
    {/each}
  </div>

  <!-- UI Overlay -->
  <div class="ui-overlay">
    <!-- Processing Stage Indicator -->
    <div 
      class="stage-indicator"
      style="
        background: {getStageColor()}22;
        border: 1px solid {getStageColor()};
        color: {getStageColor()};
        border-radius: {currentStyle.borderRadius};
        box-shadow: {currentStyle.shadows};
      "
      transition:fade={{ duration: 300 }}
    >
      <div class="stage-icon">
        {#if processingStage === 'parsing'}🔍
        {:else if processingStage === 'analyzing'}🧠
        {:else if processingStage === 'connecting'}🔗
        {:else if processingStage === 'synthesizing'}⚡
        {:else}✅
        {/if}
      </div>
      <div class="stage-text">{getStageDescription()}</div>
    </div>

    <!-- LOD Level Indicator -->
    <div 
      class="lod-indicator"
      style="
        background: {currentStyle.colors.accent}22;
        border: 1px solid {currentStyle.colors.accent};
        color: {currentStyle.colors.accent};
        border-radius: {currentStyle.borderRadius};
      "
    >
      <div class="lod-text">LOD: {lodLevel.toUpperCase()}</div>
      <div class="particle-count">{particles.length} particles</div>
    </div>

    <!-- Style Indicator -->
    <div 
      class="style-indicator"
      style="
        background: {currentStyle.colors.primary}22;
        border: 1px solid {currentStyle.colors.primary};
        color: {currentStyle.colors.primary};
        border-radius: {currentStyle.borderRadius};
      "
    >
      {style.toUpperCase()} Mode
    </div>
  </div>

  <!-- Debug Info (only in development) -->
  {#if import.meta.env.DEV}
    <div class="debug-info">
      <div>Particles: {particles.length}</div>
      <div>Stage: {processingStage}</div>
      <div>Pulse: {pulseIntensity.toFixed(2)}</div>
      <div>Zoom: {zoom.toFixed(2)}</div>
    </div>
  {/if}
</div>

<style>
  .nes-lod-processor {
    position: relative;
    width: 100%;
    height: 400px;
    overflow: hidden;
    border: 2px solid;
    margin: 1rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .scene-container {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: all 0.1s ease-out;
  }

  .document-core {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    padding: 2rem;
    text-align: center;
    z-index: 100;
    min-width: 200px;
    backdrop-filter: blur(5px);
  }

  .doc-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .doc-title {
    font-weight: bold;
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .doc-type {
    font-size: 0.8rem;
    opacity: 0.8;
    margin-bottom: 1rem;
  }

  .progress-ring {
    position: relative;
    display: inline-block;
    margin-top: 1rem;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
    font-size: 0.8rem;
  }

  .particle {
    animation: float 3s ease-in-out infinite;
  }

  .particle.data {
    border-radius: 50%;
  }

  .particle.connection {
    border-radius: 25%;
    transform-origin: center;
    animation: spin 2s linear infinite;
  }

  .particle.analysis {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  }

  .particle.result {
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    animation: pulse 1s ease-in-out infinite;
  }

  .connection-line {
    position: absolute;
    height: 2px;
    transform-origin: left center;
    animation: flow 2s ease-in-out infinite;
  }

  .ui-overlay {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    z-index: 200;
    pointer-events: none;
  }

  .stage-indicator,
  .lod-indicator,
  .style-indicator {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    backdrop-filter: blur(10px);
  }

  .stage-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stage-icon {
    font-size: 1.2rem;
  }

  .debug-info {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    font-size: 0.7rem;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.8);
    color: #00ff00;
    padding: 0.5rem;
    border-radius: 4px;
    line-height: 1.4;
  }

  /* Animations */
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(180deg); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  @keyframes flow {
    0% { opacity: 0.3; transform: scaleX(0); }
    50% { opacity: 1; transform: scaleX(1); }
    100% { opacity: 0.3; transform: scaleX(0); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .nes-lod-processor {
      height: 300px;
    }
    
    .document-core {
      padding: 1rem;
      min-width: 150px;
    }
    
    .doc-icon {
      font-size: 2rem;
    }
    
    .doc-title {
      font-size: 1rem;
    }
    
    .ui-overlay {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>