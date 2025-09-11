<!-- @migration-task Error while migrating Svelte code: Expected token } -->
&lt;script&gt;
  import { onMount } from 'svelte';
  import './PS1CRTEffects.stories.svelte';

  let containerRef;
  let curvatureIntensity = $state(0.6);
  let vignette = $state(0.8);
  let phosphorDecay = $state(0.3);
  let scanlineOpacity = $state(0.05);
  let chromaticAberration = $state(0.2);
  let glowIntensity = $state(0.4);
  let frameRate = $state(60);
  let isPerformanceMode = $state(false);
  let effectsEnabled = $state(true);
  let currentVariant = $state('ps1-crt');

  const crtVariants = [
    { id: 'ps1-crt', name: 'Standard CRT', className: 'ps1-crt' },
    { id: 'ps1-crt-curved', name: 'Curved CRT', className: 'ps1-crt ps1-crt-curved' },
    { id: 'ps1-phosphor', name: 'Phosphor Display', className: 'ps1-crt ps1-phosphor' },
    { id: 'ps1-crt-glitch', name: 'Glitch Effect', className: 'ps1-crt ps1-crt-glitch' }
  ];

  let performanceMetrics = $state({
    renderTime: 0,
    gpuUtilization: 0,
    memoryUsage: 0,
    frameDrops: 0
  });

  onMount(() =&gt; {
    updateCSSProperties();
    startPerformanceMonitoring();
    initializeCRTAnimation();
  });

  function updateCSSProperties() {
    if (!containerRef) return;
    
    const root = containerRef;
    root.style.setProperty('--ps1-crt-curvature', curvatureIntensity);
    root.style.setProperty('--ps1-crt-vignette', vignette);
    root.style.setProperty('--ps1-phosphor-decay', phosphorDecay);
    root.style.setProperty('--ps1-scanline-opacity', scanlineOpacity);
    root.style.setProperty('--ps1-chromatic-aberration', chromaticAberration);
    root.style.setProperty('--ps1-crt-glow', glowIntensity);
  }

  function startPerformanceMonitoring() {
    let lastFrame = performance.now();
    let frames = 0;
    let frameDrops = 0;

    function measurePerformance(timestamp) {
      frames++;
      const delta = timestamp - lastFrame;
      
      if (delta &gt; 16.67) frameDrops++; // 60fps baseline
      
      if (frames % 60 === 0) {
        performanceMetrics.frameRate = Math.round(1000 / (delta / 60));
        performanceMetrics.frameDrops = frameDrops;
        performanceMetrics.renderTime = delta.toFixed(2);
        
        // Auto-adjust performance mode
        if (frameDrops &gt; 30 &amp;&amp; !isPerformanceMode) {
          isPerformanceMode = true;
          console.log('🎮 Auto-enabled performance mode due to frame drops');
        }
        
        frames = 0;
        frameDrops = 0;
      }
      
      lastFrame = timestamp;
      requestAnimationFrame(measurePerformance);
    }
    
    requestAnimationFrame(measurePerformance);
  }

  function initializeCRTAnimation() {
    if (!containerRef) return;
    
    const glitchElements = containerRef.querySelectorAll('.ps1-crt-glitch');
    
    glitchElements.forEach(el =&gt; {
      setInterval(() =&gt; {
        if (Math.random() &lt; 0.05) { // 5% chance of glitch
          el.style.setProperty('--glitch-offset', `${Math.random() * 10 - 5}px`);
          el.style.setProperty('--glitch-color', Math.random() &gt; 0.5 ? '#ff0040' : '#00ff40');
          
          setTimeout(() =&gt; {
            el.style.setProperty('--glitch-offset', '0px');
          }, 100 + Math.random() * 200);
        }
      }, 100);
    });
  }

  function togglePerformanceMode() {
    isPerformanceMode = !isPerformanceMode;
    
    if (isPerformanceMode) {
      curvatureIntensity = 0.3;
      phosphorDecay = 0.1;
      scanlineOpacity = 0.02;
      chromaticAberration = 0.1;
    } else {
      curvatureIntensity = 0.6;
      phosphorDecay = 0.3;
      scanlineOpacity = 0.05;
      chromaticAberration = 0.2;
    }
    
    updateCSSProperties();
  }

  function resetToDefaults() {
    curvatureIntensity = 0.6;
    vignette = 0.8;
    phosphorDecay = 0.3;
    scanlineOpacity = 0.05;
    chromaticAberration = 0.2;
    glowIntensity = 0.4;
    updateCSSProperties();
  }

  $effect(() =&gt; {
    updateCSSProperties();
  });
&lt;/script&gt;

&lt;div class="story-container ps1-root" bind:this={containerRef}&gt;
  &lt;h1&gt;🖥️ PS1 CRT Effects Demo&lt;/h1&gt;
  
  &lt;div class="controls-panel ps1-surface"&gt;
    &lt;h3 class="ps1-panel__title"&gt;🎛️ CRT Controls&lt;/h3&gt;
    
    &lt;div class="control-grid"&gt;
      &lt;label&gt;
        Effect Variant:
        &lt;select bind:value={currentVariant} class="ps1-textfield"&gt;
          {#each crtVariants as variant}
            &lt;option value={variant.id}&gt;{variant.name}&lt;/option&gt;
          {/each}
        &lt;/select&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Curvature: {curvatureIntensity.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={curvatureIntensity} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Vignette: {vignette.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={vignette} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Phosphor Decay: {phosphorDecay.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={phosphorDecay} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Scanline Opacity: {scanlineOpacity.toFixed(3)}
        &lt;input type="range" min="0" max="0.2" step="0.005" 
               bind:value={scanlineOpacity} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Chromatic Aberration: {chromaticAberration.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={chromaticAberration} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Glow Intensity: {glowIntensity.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={glowIntensity} class="ps1-slider"&gt;
      &lt;/label&gt;
    &lt;/div&gt;

    &lt;div class="button-row"&gt;
      &lt;button class="ps1-btn" onclick={togglePerformanceMode}&gt;
        {isPerformanceMode ? '🚀 Performance Mode ON' : '🎨 Quality Mode'}
      &lt;/button&gt;
      
      &lt;button class="ps1-btn" onclick={resetToDefaults}&gt;
        🔄 Reset Defaults
      &lt;/button&gt;
      
      &lt;label class="ps1-toggle-wrapper"&gt;
        &lt;div class="ps1-toggle" data-checked={effectsEnabled}&gt;
          &lt;div class="ps1-toggle__thumb"&gt;&lt;/div&gt;
        &lt;/div&gt;
        Effects {effectsEnabled ? 'ON' : 'OFF'}
      &lt;/label&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class="demo-grid"&gt;
    {#each crtVariants as variant}
      &lt;div class="demo-item {variant.className} {currentVariant === variant.id ? 'active' : ''}"&gt;
        &lt;div class="demo-content"&gt;
          &lt;h4&gt;{variant.name}&lt;/h4&gt;
          &lt;div class="text-content"&gt;
            &lt;p&gt;PLAYSTATION™&lt;/p&gt;
            &lt;p&gt;SYSTEM DATA&lt;/p&gt;
            &lt;div class="scanlines"&gt;&lt;/div&gt;
            &lt;div class="phosphor-trail"&gt;
              ████████████████
              ░░░░▓▓▓▓████████
              ████▓▓▓▓░░░░████
            &lt;/div&gt;
          &lt;/div&gt;
          
          {#if variant.id === 'ps1-crt-glitch'}
            &lt;div class="glitch-overlay"&gt;
              &lt;span&gt;E▓▓OR 404&lt;/span&gt;
              &lt;span&gt;SY▓TEM ▓▓LURE&lt;/span&gt;
            &lt;/div&gt;
          {/if}
        &lt;/div&gt;
      &lt;/div&gt;
    {/each}
  &lt;/div&gt;

  &lt;div class="performance-panel ps1-surface"&gt;
    &lt;h3 class="ps1-panel__title"&gt;📊 Performance Metrics&lt;/h3&gt;
    &lt;div class="metrics-grid"&gt;
      &lt;div class="metric"&gt;
        &lt;span&gt;Frame Rate:&lt;/span&gt;
        &lt;span class="{performanceMetrics.frameRate &lt; 30 ? 'warning' : 'good'}"&gt;
          {performanceMetrics.frameRate}fps
        &lt;/span&gt;
      &lt;/div&gt;
      &lt;div class="metric"&gt;
        &lt;span&gt;Render Time:&lt;/span&gt;
        &lt;span&gt;{performanceMetrics.renderTime}ms&lt;/span&gt;
      &lt;/div&gt;
      &lt;div class="metric"&gt;
        &lt;span&gt;Frame Drops:&lt;/span&gt;
        &lt;span class="{performanceMetrics.frameDrops &gt; 10 ? 'warning' : 'good'}"&gt;
          {performanceMetrics.frameDrops}
        &lt;/span&gt;
      &lt;/div&gt;
      &lt;div class="metric"&gt;
        &lt;span&gt;Performance Mode:&lt;/span&gt;
        &lt;span class="{isPerformanceMode ? 'active' : ''}"&gt;
          {isPerformanceMode ? 'ENABLED' : 'DISABLED'}
        &lt;/span&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/div&gt;

&lt;style&gt;
  @import '../yorha/ps1.css';
  
  .story-container {
    min-height: 100vh;
    padding: 20px;
  }

  .controls-panel {
    margin: 20px 0;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 16px 0;
  }

  .control-grid label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--ps1-text);
    font-weight: 600;
  }

  .button-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .ps1-toggle-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 30px 0;
  }

  .demo-item {
    height: 250px;
    border: 1px solid var(--ps1-border);
    border-radius: var(--ps1-radius);
    overflow: hidden;
    position: relative;
    transition: all 0.3s ease;
  }

  .demo-item.active {
    border-color: var(--ps1-accent);
    box-shadow: 0 0 20px var(--ps1-glow);
  }

  .demo-content {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(45deg, #001122, #002244);
  }

  .demo-content h4 {
    color: var(--ps1-accent);
    font-weight: bold;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    font-size: 14px;
    letter-spacing: 1px;
  }

  .text-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-family: var(--ps1-mono);
    font-size: 16px;
  }

  .text-content p {
    margin: 4px 0;
    color: var(--ps1-text);
    text-shadow: 0 0 8px currentColor;
  }

  .phosphor-trail {
    margin: 12px 0;
    line-height: 1.2;
    color: #00ff88;
    font-family: monospace;
    text-shadow: 0 0 10px currentColor;
    animation: phosphorGlow 2s ease-in-out infinite alternate;
  }

  .glitch-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: rgba(255, 0, 64, 0.1);
    color: #ff0040;
    font-family: var(--ps1-mono);
    font-weight: bold;
    text-shadow: 2px 2px 0 #00ff40;
    opacity: 0;
    animation: glitchFlicker 3s infinite;
  }

  .performance-panel {
    margin-top: 30px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--ps1-border);
    font-family: var(--ps1-mono);
    font-size: 13px;
  }

  .metric span:first-child {
    color: var(--ps1-muted);
  }

  .metric span:last-child {
    color: var(--ps1-text);
    font-weight: 600;
  }

  .metric .warning {
    color: var(--ps1-accent-2);
  }

  .metric .good {
    color: #00ff88;
  }

  .metric .active {
    color: var(--ps1-accent);
  }

  @keyframes phosphorGlow {
    from { text-shadow: 0 0 10px currentColor; }
    to { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
  }

  @keyframes glitchFlicker {
    0%, 90%, 100% { opacity: 0; }
    91%, 95% { opacity: 1; }
  }

  @media (max-width: 768px) {
    .demo-grid {
      grid-template-columns: 1fr;
    }
    
    .control-grid {
      grid-template-columns: 1fr;
    }
    
    .button-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
&lt;/style&gt;
