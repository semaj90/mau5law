&lt;script&gt;
  import { onMount } from 'svelte';
  import './PS1TextureFiltering.stories.svelte';

  let containerRef;
  let filteringType = $state('nearest');
  let mipmapLevel = $state(0);
  let anisotropicSamples = $state(1);
  let textureScale = $state(1);
  let rotationSpeed = $state(1);
  let enableAntialiasing = $state(false);
  let subsampleRate = $state(1);
  let dithering = $state(true);
  let texelAccuracy = $state(0.8);

  const filteringTypes = [
    { 
      id: 'nearest', 
      name: 'Nearest (Pixelated)', 
      desc: 'Sharp, pixelated look - authentic PS1',
      cssClass: 'ps1-texture-nearest'
    },
    { 
      id: 'linear', 
      name: 'Linear (Smooth)', 
      desc: 'Basic smoothing filter',
      cssClass: 'ps1-texture-linear'
    },
    { 
      id: 'bilinear', 
      name: 'Bilinear', 
      desc: 'Better quality smoothing',
      cssClass: 'ps1-texture-bilinear'
    },
    { 
      id: 'trilinear', 
      name: 'Trilinear', 
      desc: 'Smooth between mipmap levels',
      cssClass: 'ps1-texture-trilinear'
    },
    { 
      id: 'anisotropic', 
      name: 'Anisotropic', 
      desc: 'High quality at angles - modern GPU',
      cssClass: 'ps1-anisotropic-16x ps1-nvidia-optimized'
    }
  ];

  let performanceMetrics = $state({
    fillRate: 0,
    textureMemory: 0,
    filteringCost: 0,
    gpuUtilization: 0,
    vramUsage: 0
  });

  let textureDemo = $state({
    rotation: 0,
    perspective: 45,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  });

  onMount(() =&gt; {
    updateFilteringProperties();
    startPerformanceMonitoring();
    animateTextures();
    generateTestPatterns();
  });

  function updateFilteringProperties() {
    if (!containerRef) return;
    
    const root = containerRef;
    const currentFilter = filteringTypes.find(f =&gt; f.id === filteringType);
    
    root.style.setProperty('--ps1-texture-scale', textureScale);
    root.style.setProperty('--ps1-mipmap-level', mipmapLevel);
    root.style.setProperty('--ps1-anisotropic-samples', anisotropicSamples);
    root.style.setProperty('--ps1-subsample-rate', subsampleRate);
    root.style.setProperty('--ps1-texel-accuracy', texelAccuracy);
    root.style.setProperty('--ps1-dither-amount', dithering ? 0.05 : 0);
    
    // Apply current filtering class
    const demoElements = root.querySelectorAll('.texture-demo');
    demoElements.forEach(el =&gt; {
      // Remove all filtering classes
      filteringTypes.forEach(filter =&gt; {
        el.classList.remove(...filter.cssClass.split(' '));
      });
      // Add current filtering class
      if (currentFilter) {
        el.classList.add(...currentFilter.cssClass.split(' '));
      }
    });
  }

  function startPerformanceMonitoring() {
    function updateMetrics() {
      // Simulate realistic GPU metrics based on settings
      const baselinePerf = 60;
      
      let filterCost = 1;
      switch(filteringType) {
        case 'linear': filterCost = 1.2; break;
        case 'bilinear': filterCost = 1.5; break;
        case 'trilinear': filterCost = 2.0; break;
        case 'anisotropic': filterCost = 3.5; break;
        default: filterCost = 1; // nearest
      }
      
      const antialiasMultiplier = enableAntialiasing ? 1.8 : 1;
      const subsampleMultiplier = subsampleRate &gt; 1 ? subsampleRate * 1.3 : 1;
      
      performanceMetrics.fillRate = Math.round(baselinePerf / (filterCost * antialiasMultiplier));
      performanceMetrics.filteringCost = Math.round(filterCost * 100) / 100;
      performanceMetrics.textureMemory = Math.round(
        (textureScale * textureScale) * (mipmapLevel + 1) * (anisotropicSamples / 4)
      );
      performanceMetrics.gpuUtilization = Math.min(100, 
        filterCost * antialiasMultiplier * subsampleMultiplier * 25
      );
      performanceMetrics.vramUsage = Math.min(100,
        performanceMetrics.textureMemory / 10 + (anisotropicSamples * 2)
      );
    }
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 500);
    
    return () =&gt; clearInterval(interval);
  }

  function animateTextures() {
    let animationFrame;
    
    function animate() {
      textureDemo.rotation += rotationSpeed;
      if (textureDemo.rotation &gt;= 360) textureDemo.rotation = 0;
      
      // Subtle zoom and offset animation
      textureDemo.zoom = 1 + Math.sin(Date.now() * 0.001) * 0.2;
      textureDemo.offsetX = Math.cos(Date.now() * 0.0015) * 20;
      textureDemo.offsetY = Math.sin(Date.now() * 0.0012) * 15;
      
      animationFrame = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () =&gt; {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }

  function generateTestPatterns() {
    // This would generate different texture patterns for testing
    // In a real implementation, this would create canvas-based test textures
    console.log('🎨 Generated test patterns for texture filtering demo');
  }

  function presetRetroPS1() {
    filteringType = 'nearest';
    mipmapLevel = 0;
    anisotropicSamples = 1;
    textureScale = 0.5;
    enableAntialiasing = false;
    subsampleRate = 1;
    dithering = true;
    texelAccuracy = 0.6;
    updateFilteringProperties();
  }

  function presetModernSmooth() {
    filteringType = 'anisotropic';
    mipmapLevel = 4;
    anisotropicSamples = 16;
    textureScale = 2;
    enableAntialiasing = true;
    subsampleRate = 2;
    dithering = false;
    texelAccuracy = 1.0;
    updateFilteringProperties();
  }

  function presetBalanced() {
    filteringType = 'trilinear';
    mipmapLevel = 2;
    anisotropicSamples = 4;
    textureScale = 1;
    enableAntialiasing = true;
    subsampleRate = 1;
    dithering = true;
    texelAccuracy = 0.8;
    updateFilteringProperties();
  }

  $effect(() =&gt; {
    updateFilteringProperties();
  });
&lt;/script&gt;

&lt;div class="story-container ps1-root" bind:this={containerRef}&gt;
  &lt;h1&gt;🖼️ PS1 Texture Filtering &amp; Anti-Aliasing Demo&lt;/h1&gt;
  
  &lt;div class="controls-panel ps1-surface"&gt;
    &lt;h3 class="ps1-panel__title"&gt;🎛️ Texture &amp; Filtering Controls&lt;/h3&gt;
    
    &lt;div class="filter-tabs"&gt;
      {#each filteringTypes as filter}
        &lt;button class="ps1-btn {filteringType === filter.id ? 'ps1-btn--primary' : ''}"
                onclick={() =&gt; filteringType = filter.id}
                title={filter.desc}&gt;
          {filter.name}
        &lt;/button&gt;
      {/each}
    &lt;/div&gt;

    &lt;div class="control-grid"&gt;
      &lt;label&gt;
        Texture Scale: {textureScale.toFixed(1)}x
        &lt;input type="range" min="0.25" max="4" step="0.25" 
               bind:value={textureScale} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Mipmap Level: {mipmapLevel}
        &lt;input type="range" min="0" max="6" step="1" 
               bind:value={mipmapLevel} class="ps1-slider"&gt;
      &lt;/label&gt;

      {#if filteringType === 'anisotropic'}
        &lt;label&gt;
          Anisotropic Samples: {anisotropicSamples}x
          &lt;input type="range" min="1" max="16" step="1" 
                 bind:value={anisotropicSamples} class="ps1-slider"&gt;
        &lt;/label&gt;
      {/if}

      &lt;label&gt;
        Texel Accuracy: {texelAccuracy.toFixed(2)}
        &lt;input type="range" min="0.1" max="1" step="0.05" 
               bind:value={texelAccuracy} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Subsample Rate: {subsampleRate}x
        &lt;input type="range" min="1" max="4" step="1" 
               bind:value={subsampleRate} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Rotation Speed: {rotationSpeed.toFixed(1)}
        &lt;input type="range" min="0" max="5" step="0.5" 
               bind:value={rotationSpeed} class="ps1-slider"&gt;
      &lt;/label&gt;
    &lt;/div&gt;

    &lt;div class="toggle-controls"&gt;
      &lt;label class="ps1-toggle-wrapper"&gt;
        &lt;div class="ps1-toggle" data-checked={enableAntialiasing}&gt;
          &lt;div class="ps1-toggle__thumb"&gt;&lt;/div&gt;
        &lt;/div&gt;
        Anti-Aliasing (MSAA)
      &lt;/label&gt;
      
      &lt;label class="ps1-toggle-wrapper"&gt;
        &lt;div class="ps1-toggle" data-checked={dithering}&gt;
          &lt;div class="ps1-toggle__thumb"&gt;&lt;/div&gt;
        &lt;/div&gt;
        Dithering
      &lt;/label&gt;
    &lt;/div&gt;

    &lt;div class="preset-buttons"&gt;
      &lt;button class="ps1-btn" onclick={presetRetroPS1}&gt;
        🕹️ Retro PS1
      &lt;/button&gt;
      
      &lt;button class="ps1-btn" onclick={presetBalanced}&gt;
        ⚖️ Balanced
      &lt;/button&gt;
      
      &lt;button class="ps1-btn" onclick={presetModernSmooth}&gt;
        🚀 Modern Smooth
      &lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class="demo-viewport"&gt;
    &lt;div class="texture-comparison"&gt;
      &lt;div class="texture-demo main-demo {enableAntialiasing ? 'ps1-antialiased' : ''} 
                  {subsampleRate &gt; 1 ? 'ps1-supersample' : ''} 
                  {dithering ? 'ps1-dither' : ''}"
           style="
             --demo-rotation: {textureDemo.rotation}deg;
             --demo-zoom: {textureDemo.zoom};
             --demo-offset-x: {textureDemo.offsetX}px;
             --demo-offset-y: {textureDemo.offsetY}px;
           "&gt;
        &lt;div class="texture-plane"&gt;
          &lt;div class="texture-pattern checkerboard"&gt;&lt;/div&gt;
          &lt;div class="overlay-text"&gt;{filteringTypes.find(f =&gt; f.id === filteringType)?.name}&lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div class="texture-samples"&gt;
        {#each filteringTypes as filter, i}
          &lt;div class="sample-item {filter.cssClass} {filteringType === filter.id ? 'active' : ''}"&gt;
            &lt;div class="sample-texture"&gt;
              &lt;div class="texture-pattern grid"&gt;&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="sample-label"&gt;{filter.name}&lt;/div&gt;
          &lt;/div&gt;
        {/each}
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;div class="test-patterns"&gt;
      &lt;div class="pattern-item texture-demo"&gt;
        &lt;div class="texture-pattern moire"&gt;&lt;/div&gt;
        &lt;div class="pattern-label"&gt;Moiré Test&lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="pattern-item texture-demo"&gt;
        &lt;div class="texture-pattern diagonal"&gt;&lt;/div&gt;
        &lt;div class="pattern-label"&gt;Diagonal Lines&lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="pattern-item texture-demo"&gt;
        &lt;div class="texture-pattern noise"&gt;&lt;/div&gt;
        &lt;div class="pattern-label"&gt;High Freq Noise&lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div class="pattern-item texture-demo"&gt;
        &lt;div class="texture-pattern gradient"&gt;&lt;/div&gt;
        &lt;div class="pattern-label"&gt;Color Gradient&lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class="info-panels"&gt;
    &lt;div class="performance-panel ps1-surface"&gt;
      &lt;h3 class="ps1-panel__title"&gt;📊 Performance Impact&lt;/h3&gt;
      &lt;div class="metrics-grid"&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;Fill Rate:&lt;/span&gt;
          &lt;span class="{performanceMetrics.fillRate &lt; 30 ? 'warning' : 'good'}"&gt;
            {performanceMetrics.fillRate}fps
          &lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;Filtering Cost:&lt;/span&gt;
          &lt;span&gt;{performanceMetrics.filteringCost}x&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;Texture Memory:&lt;/span&gt;
          &lt;span&gt;{performanceMetrics.textureMemory}MB&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;GPU Utilization:&lt;/span&gt;
          &lt;span class="{performanceMetrics.gpuUtilization &gt; 80 ? 'warning' : 'good'}"&gt;
            {performanceMetrics.gpuUtilization.toFixed(0)}%
          &lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;VRAM Usage:&lt;/span&gt;
          &lt;span class="{performanceMetrics.vramUsage &gt; 80 ? 'warning' : 'good'}"&gt;
            {performanceMetrics.vramUsage.toFixed(0)}%
          &lt;/span&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;div class="technique-info ps1-surface"&gt;
      &lt;h3 class="ps1-panel__title"&gt;🔬 Current Technique Info&lt;/h3&gt;
      {#if filteringType === 'nearest'}
        &lt;div class="technique-description"&gt;
          &lt;h4&gt;Nearest Neighbor Filtering&lt;/h4&gt;
          &lt;p&gt;No interpolation - uses the closest texel value. Creates sharp, pixelated appearance 
          authentic to original PS1 graphics. Minimal GPU cost but can cause aliasing.&lt;/p&gt;
          &lt;ul&gt;
            &lt;li&gt;✅ Authentic retro look&lt;/li&gt;
            &lt;li&gt;✅ Minimal performance cost&lt;/li&gt;
            &lt;li&gt;❌ Aliasing and jaggies&lt;/li&gt;
          &lt;/ul&gt;
        &lt;/div&gt;
      {:else if filteringType === 'linear'}
        &lt;div class="technique-description"&gt;
          &lt;h4&gt;Linear Filtering&lt;/h4&gt;
          &lt;p&gt;Simple bilinear interpolation between adjacent texels. Smooths textures but 
          can cause blur. Low GPU overhead.&lt;/p&gt;
          &lt;ul&gt;
            &lt;li&gt;✅ Reduced aliasing&lt;/li&gt;
            &lt;li&gt;✅ Low performance cost&lt;/li&gt;
            &lt;li&gt;❌ Can cause blur&lt;/li&gt;
          &lt;/ul&gt;
        &lt;/div&gt;
      {:else if filteringType === 'trilinear'}
        &lt;div class="technique-description"&gt;
          &lt;h4&gt;Trilinear Filtering&lt;/h4&gt;
          &lt;p&gt;Bilinear filtering plus interpolation between mipmap levels. Reduces shimmering 
          when textures scale. Moderate GPU cost.&lt;/p&gt;
          &lt;ul&gt;
            &lt;li&gt;✅ Smooth mipmap transitions&lt;/li&gt;
            &lt;li&gt;✅ Reduced shimmering&lt;/li&gt;
            &lt;li&gt;⚠️ Moderate performance cost&lt;/li&gt;
          &lt;/ul&gt;
        &lt;/div&gt;
      {:else if filteringType === 'anisotropic'}
        &lt;div class="technique-description"&gt;
          &lt;h4&gt;Anisotropic Filtering&lt;/h4&gt;
          &lt;p&gt;Advanced filtering that maintains texture quality at steep viewing angles. 
          Requires modern GPU with NVIDIA optimization hints for best performance.&lt;/p&gt;
          &lt;ul&gt;
            &lt;li&gt;✅ Sharp textures at angles&lt;/li&gt;
            &lt;li&gt;✅ High visual quality&lt;/li&gt;
            &lt;li&gt;❌ High performance cost&lt;/li&gt;
            &lt;li&gt;🎮 Requires modern GPU&lt;/li&gt;
          &lt;/ul&gt;
        &lt;/div&gt;
      {/if}
      
      {#if enableAntialiasing}
        &lt;div class="feature-note"&gt;
          &lt;strong&gt;Anti-Aliasing Enabled:&lt;/strong&gt; MSAA is smoothing edge pixels but 
          increasing render cost by ~{subsampleRate * 80}%.
        &lt;/div&gt;
      {/if}
      
      {#if dithering}
        &lt;div class="feature-note"&gt;
          &lt;strong&gt;Dithering Active:&lt;/strong&gt; Adding noise to reduce color banding, 
          authentic to PS1's 16-bit color depth limitations.
        &lt;/div&gt;
      {/if}
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

  .filter-tabs {
    display: flex;
    gap: 8px;
    margin: 16px 0;
    flex-wrap: wrap;
  }

  .filter-tabs .ps1-btn {
    font-size: 12px;
    padding: 6px 10px;
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

  .toggle-controls {
    display: flex;
    gap: 20px;
    margin: 16px 0;
    flex-wrap: wrap;
  }

  .ps1-toggle-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .preset-buttons {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .demo-viewport {
    border: 1px solid var(--ps1-border);
    border-radius: var(--ps1-radius);
    background: var(--ps1-surface);
    padding: 20px;
    margin: 30px 0;
  }

  .texture-comparison {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
  }

  .main-demo {
    height: 300px;
    border: 1px solid var(--ps1-border);
    border-radius: var(--ps1-radius);
    overflow: hidden;
    background: #001122;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .texture-plane {
    position: relative;
    width: 200px;
    height: 200px;
    transform: 
      perspective(500px)
      rotateY(var(--demo-rotation))
      rotateX(calc(var(--demo-rotation) * 0.3))
      scale(var(--demo-zoom))
      translate(var(--demo-offset-x), var(--demo-offset-y));
    transform-style: preserve-3d;
  }

  .overlay-text {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--ps1-accent);
    font-weight: bold;
    font-size: 14px;
    text-align: center;
    background: rgba(0,0,0,0.8);
    padding: 4px 12px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .texture-samples {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .sample-item {
    border: 1px solid var(--ps1-border);
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .sample-item.active {
    border-color: var(--ps1-accent);
    box-shadow: 0 0 10px var(--ps1-glow);
  }

  .sample-texture {
    height: 60px;
    position: relative;
  }

  .sample-label {
    padding: 8px;
    font-size: 11px;
    color: var(--ps1-muted);
    text-align: center;
    background: rgba(0,0,0,0.3);
  }

  .test-patterns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }

  .pattern-item {
    border: 1px solid var(--ps1-border);
    border-radius: var(--ps1-radius-sm);
    overflow: hidden;
  }

  .pattern-item .texture-pattern {
    height: 100px;
  }

  .pattern-label {
    padding: 8px;
    font-size: 12px;
    color: var(--ps1-muted);
    text-align: center;
    background: rgba(0,0,0,0.5);
  }

  /* Texture Patterns */
  .texture-pattern {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .texture-pattern.checkerboard {
    background-image: 
      linear-gradient(45deg, #333 25%, transparent 25%), 
      linear-gradient(-45deg, #333 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, #333 75%), 
      linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  .texture-pattern.grid {
    background-image: 
      linear-gradient(rgba(108, 124, 255, 0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(108, 124, 255, 0.5) 1px, transparent 1px);
    background-size: 10px 10px;
  }

  .texture-pattern.moire {
    background-image: 
      linear-gradient(0deg, #ff6600 1px, transparent 1px),
      linear-gradient(90deg, #0066ff 1px, transparent 1px);
    background-size: 3px 3px;
  }

  .texture-pattern.diagonal {
    background-image: repeating-linear-gradient(
      45deg,
      #ff0040 0px,
      #ff0040 2px,
      transparent 2px,
      transparent 4px
    );
  }

  .texture-pattern.noise {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.8'/%3E%3C/svg%3E");
  }

  .texture-pattern.gradient {
    background: linear-gradient(45deg, 
      #ff0040, #ff4000, #ffaa00, #00ff40, #0040ff, #4000ff, #ff0040
    );
  }

  .info-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 30px 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
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

  .technique-description h4 {
    color: var(--ps1-accent);
    margin: 0 0 12px 0;
    font-size: 16px;
  }

  .technique-description p {
    color: var(--ps1-text);
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .technique-description ul {
    margin: 0;
    padding-left: 16px;
  }

  .technique-description li {
    margin: 4px 0;
    color: var(--ps1-muted);
    font-size: 14px;
  }

  .feature-note {
    background: rgba(108, 124, 255, 0.1);
    border: 1px solid rgba(108, 124, 255, 0.2);
    border-radius: 4px;
    padding: 12px;
    margin: 16px 0;
    color: var(--ps1-text);
    font-size: 14px;
  }

  .feature-note strong {
    color: var(--ps1-accent);
  }

  @media (max-width: 768px) {
    .texture-comparison {
      grid-template-columns: 1fr;
    }
    
    .control-grid {
      grid-template-columns: 1fr;
    }
    
    .filter-tabs {
      flex-direction: column;
    }
    
    .toggle-controls {
      flex-direction: column;
      gap: 12px;
    }
    
    .info-panels {
      grid-template-columns: 1fr;
    }
    
    .test-patterns {
      grid-template-columns: repeat(2, 1fr);
    }
  }
&lt;/style&gt;
