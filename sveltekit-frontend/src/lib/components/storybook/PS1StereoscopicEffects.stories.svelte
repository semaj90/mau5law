<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
&lt;script&gt;
  import { onMount } from 'svelte';
  import './PS1StereoscopicEffects.stories.svelte';

  let containerRef;
  let stereoSeparation = $state(0.06);
  let depthStrength = $state(0.8);
  let anaglyphType = $state('redcyan');
  let stereoMode = $state('anaglyph');
  let convergence = $state(0.5);
  let parallaxOffset = $state(0.02);
  let frameRate = $state(60);
  let eyeStrain = $state(0);
  let autoAdjust = $state(true);
  
  const anaglyphTypes = [
    { id: 'redcyan', name: 'Red-Cyan', left: '#ff0000', right: '#00ffff' },
    { id: 'redblue', name: 'Red-Blue', left: '#ff0000', right: '#0000ff' },
    { id: 'greenmagenta', name: 'Green-Magenta', left: '#00ff00', right: '#ff00ff' },
    { id: 'amberblue', name: 'Amber-Blue', left: '#ffaa00', right: '#0066ff' }
  ];

  const stereoModes = [
    { id: 'anaglyph', name: 'Anaglyph 3D', desc: 'Colored glasses required' },
    { id: 'crosseyed', name: 'Cross-eyed', desc: 'No glasses needed' },
    { id: 'parallellook', name: 'Parallel View', desc: 'Relaxed viewing' },
    { id: 'sidebyside', name: 'Side-by-Side', desc: 'VR compatible' }
  ];

  let performanceMetrics = $state({
    renderTime: 0,
    stereoOverhead: 0,
    eyeStrainLevel: 'Low',
    viewingComfort: 'Good'
  });

  let demoObjects = $state([
    { id: 'cube1', x: -100, y: -50, z: 200, rotation: 0 },
    { id: 'cube2', x: 0, y: 0, z: 100, rotation: 45 },
    { id: 'cube3', x: 100, y: 50, z: 300, rotation: 90 },
    { id: 'text1', x: -80, y: -100, z: 150, type: 'text' },
    { id: 'text2', x: 80, y: 100, z: 250, type: 'text' }
  ]);

  onMount(() =&gt; {
    updateStereoProperties();
    startPerformanceMonitoring();
    animateDemoObjects();
    if (autoAdjust) startEyeStrainMonitoring();
  });

  function updateStereoProperties() {
    if (!containerRef) return;
    
    const root = containerRef;
    const currentAnaglyph = anaglyphTypes.find(a =&gt; a.id === anaglyphType);
    
    root.style.setProperty('--ps1-stereo-separation', stereoSeparation);
    root.style.setProperty('--ps1-depth-strength', depthStrength);
    root.style.setProperty('--ps1-convergence', convergence);
    root.style.setProperty('--ps1-parallax-offset', `${parallaxOffset}px`);
    
    if (currentAnaglyph) {
      root.style.setProperty('--ps1-anaglyph-left', currentAnaglyph.left);
      root.style.setProperty('--ps1-anaglyph-right', currentAnaglyph.right);
    }
  }

  function startPerformanceMonitoring() {
    let lastFrame = performance.now();
    let renderStart = 0;

    function measureFrame() {
      renderStart = performance.now();
      
      requestAnimationFrame((timestamp) =&gt; {
        const frameTime = timestamp - lastFrame;
        const renderTime = performance.now() - renderStart;
        
        performanceMetrics.renderTime = renderTime.toFixed(2);
        performanceMetrics.stereoOverhead = ((renderTime / frameTime) * 100).toFixed(1);
        performanceMetrics.frameRate = Math.round(1000 / frameTime);
        
        lastFrame = timestamp;
        
        setTimeout(measureFrame, 100); // Sample every 100ms
      });
    }
    
    measureFrame();
  }

  function startEyeStrainMonitoring() {
    let viewingTime = 0;
    let blinkCount = 0;
    
    const interval = setInterval(() =&gt; {
      viewingTime += 1;
      
      // Simulate eye strain based on separation and viewing time
      const strainFactor = (stereoSeparation * 10) + (viewingTime / 60);
      eyeStrain = Math.min(strainFactor, 10);
      
      if (eyeStrain &gt; 7 &amp;&amp; autoAdjust) {
        stereoSeparation = Math.max(0.02, stereoSeparation - 0.01);
        depthStrength = Math.max(0.3, depthStrength - 0.1);
        updateStereoProperties();
        console.log('🎮 Auto-adjusting stereo settings to reduce eye strain');
      }
      
      performanceMetrics.eyeStrainLevel = 
        eyeStrain &lt; 3 ? 'Low' : 
        eyeStrain &lt; 6 ? 'Moderate' : 'High';
      
      performanceMetrics.viewingComfort =
        eyeStrain &lt; 3 ? 'Excellent' :
        eyeStrain &lt; 5 ? 'Good' :
        eyeStrain &lt; 7 ? 'Fair' : 'Poor';
        
    }, 1000);
    
    return () =&gt; clearInterval(interval);
  }

  function animateDemoObjects() {
    let animationFrame;
    
    function animate() {
      demoObjects = demoObjects.map(obj =&gt; ({
        ...obj,
        rotation: obj.rotation + 1,
        z: obj.z + Math.sin(Date.now() * 0.001 + obj.id.length) * 10
      }));
      
      animationFrame = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () =&gt; {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }

  function resetToComfortable() {
    stereoSeparation = 0.04;
    depthStrength = 0.6;
    convergence = 0.5;
    parallaxOffset = 0.015;
    updateStereoProperties();
  }

  function presetExtreme() {
    stereoSeparation = 0.12;
    depthStrength = 1.0;
    convergence = 0.8;
    parallaxOffset = 0.05;
    updateStereoProperties();
  }

  function presetSubtle() {
    stereoSeparation = 0.02;
    depthStrength = 0.4;
    convergence = 0.3;
    parallaxOffset = 0.01;
    updateStereoProperties();
  }

  $effect(() =&gt; {
    updateStereoProperties();
  });
&lt;/script&gt;

&lt;div class="story-container ps1-root" bind:this={containerRef}&gt;
  &lt;h1&gt;👁️ PS1 Stereoscopic 3D Effects Demo&lt;/h1&gt;
  
  &lt;div class="warning-notice ps1-surface"&gt;
    &lt;h3&gt;⚠️ Viewing Safety Notice&lt;/h3&gt;
    &lt;p&gt;Stereoscopic effects may cause eye strain, dizziness, or headaches. Take breaks every 15-20 minutes. 
    If you experience discomfort, reduce the stereo separation or disable 3D effects.&lt;/p&gt;
  &lt;/div&gt;

  &lt;div class="controls-panel ps1-surface"&gt;
    &lt;h3 class="ps1-panel__title"&gt;🎛️ Stereoscopic Controls&lt;/h3&gt;
    
    &lt;div class="control-tabs"&gt;
      &lt;button class="ps1-btn {stereoMode === 'anaglyph' ? 'ps1-btn--primary' : ''}"
              onclick={() =&gt; stereoMode = 'anaglyph'}&gt;
        🕶️ Anaglyph
      &lt;/button&gt;
      &lt;button class="ps1-btn {stereoMode === 'crosseyed' ? 'ps1-btn--primary' : ''}"
              onclick={() =&gt; stereoMode = 'crosseyed'}&gt;
        👁️ Cross-eyed
      &lt;/button&gt;
      &lt;button class="ps1-btn {stereoMode === 'parallellook' ? 'ps1-btn--primary' : ''}"
              onclick={() =&gt; stereoMode = 'parallellook'}&gt;
        👀 Parallel
      &lt;/button&gt;
      &lt;button class="ps1-btn {stereoMode === 'sidebyside' ? 'ps1-btn--primary' : ''}"
              onclick={() =&gt; stereoMode = 'sidebyside'}&gt;
        📱 Side-by-Side
      &lt;/button&gt;
    &lt;/div&gt;

    &lt;div class="control-grid"&gt;
      {#if stereoMode === 'anaglyph'}
        &lt;label&gt;
          Anaglyph Type:
          &lt;select bind:value={anaglyphType} class="ps1-textfield"&gt;
            {#each anaglyphTypes as type}
              &lt;option value={type.id}&gt;{type.name}&lt;/option&gt;
            {/each}
          &lt;/select&gt;
        &lt;/label&gt;
      {/if}

      &lt;label&gt;
        Stereo Separation: {stereoSeparation.toFixed(3)}
        &lt;input type="range" min="0.01" max="0.15" step="0.005" 
               bind:value={stereoSeparation} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Depth Strength: {depthStrength.toFixed(2)}
        &lt;input type="range" min="0.1" max="1" step="0.05" 
               bind:value={depthStrength} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Convergence: {convergence.toFixed(2)}
        &lt;input type="range" min="0" max="1" step="0.05" 
               bind:value={convergence} class="ps1-slider"&gt;
      &lt;/label&gt;

      &lt;label&gt;
        Parallax Offset: {parallaxOffset.toFixed(3)}px
        &lt;input type="range" min="0.005" max="0.08" step="0.005" 
               bind:value={parallaxOffset} class="ps1-slider"&gt;
      &lt;/label&gt;
    &lt;/div&gt;

    &lt;div class="button-row"&gt;
      &lt;button class="ps1-btn" onclick={resetToComfortable}&gt;
        😌 Comfortable
      &lt;/button&gt;
      
      &lt;button class="ps1-btn" onclick={presetSubtle}&gt;
        🔹 Subtle
      &lt;/button&gt;
      
      &lt;button class="ps1-btn" onclick={presetExtreme}&gt;
        💥 Extreme
      &lt;/button&gt;
      
      &lt;label class="ps1-toggle-wrapper"&gt;
        &lt;div class="ps1-toggle" data-checked={autoAdjust}&gt;
          &lt;div class="ps1-toggle__thumb"&gt;&lt;/div&gt;
        &lt;/div&gt;
        Auto-Adjust for Comfort
      &lt;/label&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class="demo-viewport ps1-stereo-{stereoMode} {stereoMode === 'anaglyph' ? `ps1-anaglyph-${anaglyphType}` : ''}"&gt;
    &lt;div class="stereo-scene"&gt;
      {#each demoObjects as obj}
        &lt;div class="demo-object {obj.type || 'cube'}"
             style="
               --object-x: {obj.x}px;
               --object-y: {obj.y}px;
               --object-z: {obj.z}px;
               --rotation: {obj.rotation}deg;
             "&gt;
          {#if obj.type === 'text'}
            &lt;div class="stereo-text"&gt;PS1 3D&lt;/div&gt;
          {:else}
            &lt;div class="cube-face front"&gt;F&lt;/div&gt;
            &lt;div class="cube-face back"&gt;B&lt;/div&gt;
            &lt;div class="cube-face left"&gt;L&lt;/div&gt;
            &lt;div class="cube-face right"&gt;R&lt;/div&gt;
            &lt;div class="cube-face top"&gt;T&lt;/div&gt;
            &lt;div class="cube-face bottom"&gt;Bot&lt;/div&gt;
          {/if}
        &lt;/div&gt;
      {/each}
      
      &lt;div class="depth-grid"&gt;
        {#each Array(20) as _, i}
          &lt;div class="grid-line" style="--depth: {i * 50}px"&gt;&lt;/div&gt;
        {/each}
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;

  &lt;div class="info-panels"&gt;
    &lt;div class="performance-panel ps1-surface"&gt;
      &lt;h3 class="ps1-panel__title"&gt;📊 Performance &amp; Health&lt;/h3&gt;
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
          &lt;span&gt;Stereo Overhead:&lt;/span&gt;
          &lt;span&gt;{performanceMetrics.stereoOverhead}%&lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;Eye Strain:&lt;/span&gt;
          &lt;span class="{performanceMetrics.eyeStrainLevel === 'High' ? 'warning' : 'good'}"&gt;
            {performanceMetrics.eyeStrainLevel}
          &lt;/span&gt;
        &lt;/div&gt;
        &lt;div class="metric"&gt;
          &lt;span&gt;Viewing Comfort:&lt;/span&gt;
          &lt;span class="{performanceMetrics.viewingComfort === 'Poor' ? 'warning' : 'good'}"&gt;
            {performanceMetrics.viewingComfort}
          &lt;/span&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;div class="instructions-panel ps1-surface"&gt;
      &lt;h3 class="ps1-panel__title"&gt;🎮 Viewing Instructions&lt;/h3&gt;
      {#if stereoMode === 'anaglyph'}
        &lt;p&gt;&lt;strong&gt;Anaglyph Mode:&lt;/strong&gt; Put on {anaglyphTypes.find(a =&gt; a.id === anaglyphType)?.name} 3D glasses. 
        The scene should appear to have depth with objects popping out or receding.&lt;/p&gt;
      {:else if stereoMode === 'crosseyed'}
        &lt;p&gt;&lt;strong&gt;Cross-eyed Mode:&lt;/strong&gt; Look at the two images and slowly cross your eyes until 
        they merge into a single 3D image in the center. Takes practice!&lt;/p&gt;
      {:else if stereoMode === 'parallellook'}
        &lt;p&gt;&lt;strong&gt;Parallel Mode:&lt;/strong&gt; Relax your eyes as if looking at something far behind 
        the screen. The two images should merge into one 3D view.&lt;/p&gt;
      {:else if stereoMode === 'sidebyside'}
        &lt;p&gt;&lt;strong&gt;Side-by-Side Mode:&lt;/strong&gt; Use with VR headset, 3D TV, or view each image 
        with the corresponding eye. Compatible with most 3D displays.&lt;/p&gt;
      {/if}
      
      &lt;div class="health-tips"&gt;
        &lt;h4&gt;👁️ Healthy Viewing Tips:&lt;/h4&gt;
        &lt;ul&gt;
          &lt;li&gt;Take 5-minute breaks every 15 minutes&lt;/li&gt;
          &lt;li&gt;Sit 2-3 feet away from the screen&lt;/li&gt;
          &lt;li&gt;Adjust separation if you feel eye strain&lt;/li&gt;
          &lt;li&gt;Stop if you experience headaches or dizziness&lt;/li&gt;
        &lt;/ul&gt;
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

  .warning-notice {
    background: linear-gradient(135deg, rgba(255, 64, 0, 0.1), rgba(255, 100, 0, 0.05));
    border: 1px solid rgba(255, 64, 0, 0.3);
    margin: 20px 0;
  }

  .warning-notice h3 {
    color: #ff6600;
    margin: 0 0 8px 0;
  }

  .controls-panel {
    margin: 20px 0;
  }

  .control-tabs {
    display: flex;
    gap: 8px;
    margin: 16px 0;
    flex-wrap: wrap;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

  .demo-viewport {
    height: 400px;
    border: 1px solid var(--ps1-border);
    border-radius: var(--ps1-radius);
    overflow: hidden;
    position: relative;
    background: linear-gradient(135deg, #001122, #002244, #001133);
    margin: 30px 0;
  }

  .stereo-scene {
    width: 100%;
    height: 100%;
    perspective: 1000px;
    perspective-origin: 50% 50%;
    position: relative;
    overflow: hidden;
  }

  .demo-object {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 40px;
    height: 40px;
    transform-style: preserve-3d;
    transform: 
      translate(-50%, -50%)
      translate3d(var(--object-x), var(--object-y), var(--object-z))
      rotateX(var(--rotation))
      rotateY(calc(var(--rotation) * 1.5));
  }

  .demo-object.cube .cube-face {
    position: absolute;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--ps1-accent), var(--ps1-accent-2));
    border: 1px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
    color: white;
    text-shadow: 0 0 5px rgba(0,0,0,0.8);
  }

  .cube-face.front { transform: translateZ(20px); }
  .cube-face.back { transform: rotateY(180deg) translateZ(20px); }
  .cube-face.left { transform: rotateY(-90deg) translateZ(20px); }
  .cube-face.right { transform: rotateY(90deg) translateZ(20px); }
  .cube-face.top { transform: rotateX(90deg) translateZ(20px); }
  .cube-face.bottom { transform: rotateX(-90deg) translateZ(20px); }

  .demo-object.text {
    width: auto;
    height: auto;
    padding: 8px 12px;
  }

  .stereo-text {
    background: rgba(0,0,0,0.8);
    color: var(--ps1-accent);
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 18px;
    text-shadow: 0 0 10px currentColor;
    border: 1px solid currentColor;
  }

  .depth-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .grid-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(108, 124, 255, 0.1);
    transform: translateZ(var(--depth)) rotateX(90deg);
    transform-origin: center;
  }

  /* Stereoscopic Effects */
  .ps1-stereo-anaglyph .demo-object {
    filter: 
      drop-shadow(calc(var(--ps1-stereo-separation) * -20px) 0 0 var(--ps1-anaglyph-left))
      drop-shadow(calc(var(--ps1-stereo-separation) * 20px) 0 0 var(--ps1-anaglyph-right));
  }

  .ps1-stereo-crosseyed,
  .ps1-stereo-parallellook {
    display: flex;
  }

  .ps1-stereo-crosseyed .stereo-scene,
  .ps1-stereo-parallellook .stereo-scene {
    width: 50%;
  }

  .ps1-stereo-crosseyed .stereo-scene:first-child {
    transform: translateX(calc(var(--ps1-parallax-offset) * 100));
  }

  .ps1-stereo-crosseyed .stereo-scene:last-child {
    transform: translateX(calc(var(--ps1-parallax-offset) * -100));
  }

  .ps1-stereo-parallellook .stereo-scene:first-child {
    transform: translateX(calc(var(--ps1-parallax-offset) * -100));
  }

  .ps1-stereo-parallellook .stereo-scene:last-child {
    transform: translateX(calc(var(--ps1-parallax-offset) * 100));
  }

  .ps1-stereo-sidebyside {
    display: flex;
    border-radius: 0;
  }

  .ps1-stereo-sidebyside .stereo-scene {
    width: 50%;
    border-right: 1px solid var(--ps1-border);
  }

  .ps1-stereo-sidebyside .stereo-scene:last-child {
    border-right: none;
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

  .instructions-panel h4 {
    color: var(--ps1-accent);
    margin: 16px 0 8px 0;
  }

  .instructions-panel ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .instructions-panel li {
    margin: 4px 0;
    color: var(--ps1-muted);
  }

  .health-tips {
    background: rgba(0, 255, 136, 0.05);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 6px;
    padding: 12px;
    margin-top: 16px;
  }

  @media (max-width: 768px) {
    .demo-viewport {
      height: 300px;
    }
    
    .control-grid {
      grid-template-columns: 1fr;
    }
    
    .control-tabs {
      flex-direction: column;
    }
    
    .info-panels {
      grid-template-columns: 1fr;
    }
    
    .ps1-stereo-crosseyed,
    .ps1-stereo-parallellook,
    .ps1-stereo-sidebyside {
      flex-direction: column;
    }
    
    .ps1-stereo-crosseyed .stereo-scene,
    .ps1-stereo-parallellook .stereo-scene,
    .ps1-stereo-sidebyside .stereo-scene {
      width: 100%;
      height: 50%;
    }
  }
&lt;/style&gt;
