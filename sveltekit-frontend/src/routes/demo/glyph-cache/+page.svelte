<!--
  NES Glyph Cache Demo Page
  Demonstrates cached glyph embeddings for local LLM orchestration
  Shows how gemma3:legal-latest reads cached computations
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import NESTyepwriterStream from '$lib/components/chat/nes-typewriter-stream.svelte';
  import { glyphCacheSystem, getCachedGlyph, preloadLegalGlyphs, getGlyphCacheMetrics } from '$lib/systems/glyph-cache-system';
  import { contextualEngineeringMachine, validateContextualSystem } from '$lib/systems/contextual-engineering-machine';
  import { processGemmaResponse } from '$lib/text/base64-fp32-quantizer';
  import type { GlyphTexture, GlyphCacheMetrics } from '$lib/systems/glyph-cache-system';
  
  // Page state
  const isLoading = writable(true);
  const demoText = writable('');
  const currentGlyph = writable<GlyphTexture | null>(null);
  const cacheMetrics = writable<GlyphCacheMetrics | null>(null);
  const gemmaResponse = writable('');
  const systemValidation = writable<any>(null);
  
  // Demo controls
  let selectedFontStyle: 'classic' | 'modern' | 'legal' | 'retro' = 'legal';
  let selectedCharacter = 'A';
  let demoTextInput = 'The quick brown fox jumps over the lazy dog. § Legal symbols ¶ work perfectly!';
  let typewriterSpeed = 50;
  let showGlyphDetails = false;
  let showEmbeddingData = false;
  let showSystemMetrics = false;
  
  // Visual state
  let glyphCanvas: HTMLCanvasElement;
  let patternCanvas: HTMLCanvasElement;
  let embeddingVisualization: HTMLCanvasElement;
  
  // Demo messages for contextual engineering
  const DEMO_LEGAL_MESSAGES = [
    "Can you help me review this employment contract?",
    "What are the key risks in this NDA agreement?", 
    "I need to check compliance with GDPR requirements",
    "Help me draft a liability waiver clause",
    "What precedents exist for this type of case?",
    "Can you analyze the termination provisions?",
    "§ Review the confidentiality section carefully",
    "¶ Check paragraph 4.2 for unusual terms"
  ];
  
  let currentMessageIndex = 0;
  let orchestrationLog: string[] = [];
  
  onMount(async () => {
    await initializeDemo();
  });
  
  async function initializeDemo(): Promise<void> {
    try {
      console.log('🚀 Initializing Glyph Cache Demo...');
      
      // Preload legal glyphs
      await preloadLegalGlyphs();
      
      // Update initial metrics
      await updateCacheMetrics();
      
      // Set initial demo text
      $demoText = demoTextInput;
      
      // Load initial glyph
      await loadGlyph(selectedCharacter, selectedFontStyle);
      
      // Initialize canvases
      initializeCanvases();
      
      // Run system validation
      await runSystemValidation();
      
      $isLoading = false;
      console.log('✅ Demo initialized successfully');
      
    } catch (error) {
      console.error('❌ Demo initialization failed:', error);
      $isLoading = false;
    }
  }
  
  async function updateCacheMetrics(): Promise<void> {
    const metrics = getGlyphCacheMetrics();
    $cacheMetrics = metrics;
  }
  
  async function loadGlyph(char: string, style: typeof selectedFontStyle): Promise<void> {
    try {
      const glyph = await getCachedGlyph(char, style);
      $currentGlyph = glyph;
      
      // Update visualizations
      if (glyphCanvas && glyph.textureData) {
        renderGlyphToCanvas(glyph);
      }
      
      if (patternCanvas) {
        renderNESPatternToCanvas(glyph.nesPattern);
      }
      
      if (embeddingVisualization) {
        renderEmbeddingVisualization(glyph.quantizedData);
      }
      
      await updateCacheMetrics();
      
    } catch (error) {
      console.error(`❌ Failed to load glyph '${char}':`, error);
    }
  }
  
  function initializeCanvases(): void {
    // Configure glyph canvas
    if (glyphCanvas) {
      glyphCanvas.width = 64;  // 8x scaled
      glyphCanvas.height = 64;
      const ctx = glyphCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
    }
    
    // Configure pattern canvas
    if (patternCanvas) {
      patternCanvas.width = 128; // 16x scaled  
      patternCanvas.height = 128;
      const ctx = patternCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
    }
    
    // Configure embedding visualization
    if (embeddingVisualization) {
      embeddingVisualization.width = 256;
      embeddingVisualization.height = 64;
    }
  }
  
  function renderGlyphToCanvas(glyph: GlyphTexture): void {
    if (!glyphCanvas || !glyph.textureData) return;
    
    const ctx = glyphCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    
    // Scale up the 8x8 texture to 64x64
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 8;
    tempCanvas.height = 8;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(glyph.textureData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, 8, 8, 0, 0, 64, 64);
  }
  
  function renderNESPatternToCanvas(nesPattern: Uint8Array): void {
    if (!patternCanvas) return;
    
    const ctx = patternCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    
    // Render 8x8 pattern scaled to 128x128
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelValue = nesPattern[y * 8 + x];
        const intensity = pixelValue / 255;
        
        ctx.fillStyle = `rgba(255, 215, 0, ${intensity})`; // Gold with alpha
        ctx.fillRect(x * 16, y * 16, 16, 16);
        
        // Add pixel border for clarity
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * 16, y * 16, 16, 16);
      }
    }
  }
  
  function renderEmbeddingVisualization(quantizedData: Float32Array): void {
    if (!embeddingVisualization) return;
    
    const ctx = embeddingVisualization.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    
    // Visualize quantized embedding as waveform
    const width = 256;
    const height = 64;
    const dataLength = quantizedData.length;
    
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < dataLength && i < width; i++) {
      const x = (i / dataLength) * width;
      const value = quantizedData[i];
      const y = height / 2 - (value * height / 4); // Scale to fit
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Add grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let y = 0; y <= height; y += height / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x <= width; x += width / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }
  
  async function runSystemValidation(): Promise<void> {
    try {
      console.log('🧪 Running contextual system validation...');
      const validation = await validateContextualSystem();
      $systemValidation = validation;
      
      if (validation.success) {
        console.log('✅ All systems operational');
      } else {
        console.log('⚠️ Some systems need attention');
      }
      
    } catch (error) {
      console.error('❌ System validation failed:', error);
    }
  }
  
  async function processWithGemma(): Promise<void> {
    try {
      const currentMessage = DEMO_LEGAL_MESSAGES[currentMessageIndex];
      orchestrationLog.push(`🤖 Processing: "${currentMessage}"`);
      
      // Process with Gemma3:legal-latest
      const gemmaResult = await processGemmaResponse(currentMessage);
      
      orchestrationLog.push(`📊 Confidence: ${(gemmaResult.confidence * 100).toFixed(1)}%`);
      orchestrationLog.push(`⚖️ Legal Type: ${gemmaResult.legalClassification.documentType}`);
      orchestrationLog.push(`🎯 Risk Level: ${gemmaResult.legalClassification.riskLevel}`);
      
      $gemmaResponse = `Gemma3 Analysis:\n` +
        `Intent: ${gemmaResult.legalClassification.documentType}\n` +
        `Risk: ${gemmaResult.legalClassification.riskLevel}\n` +
        `Confidence: ${(gemmaResult.confidence * 100).toFixed(1)}%\n` +
        `Tokens: ${gemmaResult.quantizedTokens.length}\n` +
        `Perplexity: ${gemmaResult.perplexity.toFixed(2)}`;
      
      currentMessageIndex = (currentMessageIndex + 1) % DEMO_LEGAL_MESSAGES.length;
      
      // Force reactivity update
      orchestrationLog = [...orchestrationLog];
      
    } catch (error) {
      console.error('❌ Gemma processing failed:', error);
      orchestrationLog.push(`❌ Error: ${error.message}`);
      orchestrationLog = [...orchestrationLog];
    }
  }
  
  function clearOrchestrationLog(): void {
    orchestrationLog = [];
  }
  
  // Reactive updates
  $: if (selectedCharacter || selectedFontStyle) {
    loadGlyph(selectedCharacter, selectedFontStyle);
  }
  
  $: if (demoTextInput) {
    $demoText = demoTextInput;
  }
</script>

<svelte:head>
  <title>NES Glyph Cache Demo - Legal AI Platform</title>
  <meta name="description" content="Demonstration of cached glyph embeddings for local LLM orchestration" />
</svelte:head>

<div class="demo-container">
  <header class="demo-header">
    <h1 class="nes-title">🎮 NES Glyph Cache Demo</h1>
    <p class="nes-subtitle">Cached Embeddings for Gemma3:Legal-Latest Orchestration</p>
  </header>

  {#if $isLoading}
    <div class="loading-container">
      <div class="nes-spinner"></div>
      <p>Loading glyph cache system...</p>
    </div>
  {:else}
    <div class="demo-content">
      
      <!-- Typewriter Demo Section -->
      <section class="demo-section">
        <h2 class="section-title">📝 NES Typewriter with Cached Glyphs</h2>
        
        <div class="controls-panel">
          <div class="control-group">
            <label for="demo-text">Demo Text:</label>
            <textarea 
              id="demo-text"
              bind:value={demoTextInput}
              class="nes-textarea"
              rows="3"
            ></textarea>
          </div>
          
          <div class="control-row">
            <div class="control-group">
              <label for="font-style">Font Style:</label>
              <select id="font-style" bind:value={selectedFontStyle} class="nes-select">
                <option value="legal">Legal (Gold)</option>
                <option value="classic">Classic (White)</option>
                <option value="modern">Modern (Green)</option>
                <option value="retro">Retro (Magenta)</option>
              </select>
            </div>
            
            <div class="control-group">
              <label for="speed">Speed: {typewriterSpeed} CPS</label>
              <input 
                id="speed"
                type="range" 
                min="10" 
                max="200" 
                bind:value={typewriterSpeed}
                class="nes-slider"
              />
            </div>
          </div>
        </div>
        
        <div class="typewriter-demo">
          <NESTyepwriterStream 
            text={$demoText}
            speed={typewriterSpeed}
            nesTheme={selectedFontStyle}
            cacheTextures={true}
            quantizeText={true}
            maxWidth="100%"
          />
        </div>
      </section>

      <!-- Glyph Analysis Section -->
      <section class="demo-section">
        <h2 class="section-title">🔍 Glyph Cache Analysis</h2>
        
        <div class="analysis-controls">
          <div class="control-group">
            <label for="character">Character:</label>
            <input 
              id="character"
              type="text" 
              bind:value={selectedCharacter}
              maxlength="1"
              class="nes-input character-input"
            />
          </div>
          
          <div class="toggle-controls">
            <label class="nes-checkbox">
              <input type="checkbox" bind:checked={showGlyphDetails} />
              <span>Show Glyph Details</span>
            </label>
            
            <label class="nes-checkbox">
              <input type="checkbox" bind:checked={showEmbeddingData} />
              <span>Show Embedding Data</span>
            </label>
          </div>
        </div>
        
        {#if $currentGlyph}
          <div class="glyph-analysis">
            <div class="glyph-visual">
              <div class="canvas-container">
                <h4>Rendered Glyph (8x8 → 64x64)</h4>
                <canvas bind:this={glyphCanvas} class="glyph-canvas"></canvas>
              </div>
              
              <div class="canvas-container">
                <h4>NES Pattern (8x8 → 128x128)</h4>
                <canvas bind:this={patternCanvas} class="pattern-canvas"></canvas>
              </div>
              
              {#if showEmbeddingData}
                <div class="canvas-container">
                  <h4>Quantized Embedding (64 values)</h4>
                  <canvas bind:this={embeddingVisualization} class="embedding-canvas"></canvas>
                </div>
              {/if}
            </div>
            
            {#if showGlyphDetails}
              <div class="glyph-details">
                <h4>Glyph Information</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Character:</span>
                    <span class="value">'{$currentGlyph.char}'</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Char Code:</span>
                    <span class="value">{$currentGlyph.charCode}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">CHR-ROM Bank:</span>
                    <span class="value">{$currentGlyph.chrRomBankId}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Access Count:</span>
                    <span class="value">{$currentGlyph.accessCount}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Cache Time:</span>
                    <span class="value">{new Date($currentGlyph.cacheTimestamp).toLocaleTimeString()}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Quantized Size:</span>
                    <span class="value">{$currentGlyph.quantizedData.byteLength} bytes</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </section>

      <!-- Gemma3 Orchestration Section -->
      <section class="demo-section">
        <h2 class="section-title">🤖 Gemma3:Legal-Latest Orchestration</h2>
        
        <div class="orchestration-controls">
          <button 
            class="nes-btn is-primary"
            on:click={processWithGemma}
          >
            Process Legal Query
          </button>
          
          <button 
            class="nes-btn is-warning"
            on:click={clearOrchestrationLog}
          >
            Clear Log
          </button>
          
          <button 
            class="nes-btn is-success"
            on:click={runSystemValidation}
          >
            Validate Systems
          </button>
        </div>
        
        <div class="orchestration-display">
          <div class="gemma-response">
            <h4>Current Analysis:</h4>
            {#if $gemmaResponse}
              <pre class="response-text">{$gemmaResponse}</pre>
            {:else}
              <p class="placeholder">Click "Process Legal Query" to see Gemma3 analysis</p>
            {/if}
          </div>
          
          <div class="orchestration-log">
            <h4>Orchestration Log:</h4>
            <div class="log-container">
              {#each orchestrationLog as logEntry}
                <div class="log-entry">{logEntry}</div>
              {/each}
              {#if orchestrationLog.length === 0}
                <div class="log-placeholder">Processing log will appear here...</div>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <!-- System Metrics Section -->
      <section class="demo-section">
        <h2 class="section-title">📊 System Metrics</h2>
        
        <label class="nes-checkbox">
          <input type="checkbox" bind:checked={showSystemMetrics} />
          <span>Show Detailed Metrics</span>
        </label>
        
        {#if $cacheMetrics}
          <div class="metrics-display">
            <div class="metric-card">
              <h4>Cache Performance</h4>
              <div class="metric-value">{($cacheMetrics.cacheHitRate * 100).toFixed(1)}%</div>
              <div class="metric-label">Hit Rate</div>
            </div>
            
            <div class="metric-card">
              <h4>Total Glyphs</h4>
              <div class="metric-value">{$cacheMetrics.totalGlyphs}</div>
              <div class="metric-label">Cached</div>
            </div>
            
            <div class="metric-card">
              <h4>Memory Usage</h4>
              <div class="metric-value">{($cacheMetrics.memoryUsage / 1024).toFixed(1)}</div>
              <div class="metric-label">KB</div>
            </div>
            
            <div class="metric-card">
              <h4>Render Time</h4>
              <div class="metric-value">{$cacheMetrics.renderingTime.toFixed(2)}</div>
              <div class="metric-label">ms avg</div>
            </div>
          </div>
          
          {#if showSystemMetrics && $systemValidation}
            <div class="system-validation">
              <h4>System Validation Results</h4>
              <div class="validation-summary">
                <span class="validation-status" class:success={$systemValidation.success}>
                  {$systemValidation.success ? '✅ All Systems Operational' : '⚠️ Some Issues Detected'}
                </span>
              </div>
              
              <div class="validation-details">
                {#each $systemValidation.results as result}
                  <div class="validation-item" class:success={result.success}>
                    <span class="test-name">{result.testName}</span>
                    <span class="test-time">{result.executionTime.toFixed(2)}ms</span>
                    <span class="test-status">{result.success ? '✅' : '❌'}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Courier New', monospace;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    min-height: 100vh;
    color: #ffffff;
  }
  
  .demo-header {
    text-align: center;
    margin-bottom: 40px;
    padding: 20px;
    border: 2px solid #FFD700;
    background: rgba(255, 215, 0, 0.1);
  }
  
  .nes-title {
    font-size: 2.5rem;
    color: #FFD700;
    text-shadow: 2px 2px 0px #B8860B;
    margin: 0;
  }
  
  .nes-subtitle {
    font-size: 1.2rem;
    color: #FFF8DC;
    margin: 10px 0 0 0;
  }
  
  .loading-container {
    text-align: center;
    padding: 60px 20px;
  }
  
  .nes-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #FFD700;
    border-top: 4px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .demo-content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  
  .demo-section {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid #FFD700;
    padding: 20px;
    border-radius: 8px;
  }
  
  .section-title {
    color: #FFD700;
    font-size: 1.8rem;
    margin: 0 0 20px 0;
    text-shadow: 1px 1px 0px #B8860B;
  }
  
  .controls-panel {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .control-row {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 200px;
  }
  
  .control-group label {
    color: #FFF8DC;
    font-weight: bold;
  }
  
  .nes-textarea, .nes-select, .nes-input {
    background: #1a1a2e;
    border: 2px solid #FFD700;
    color: #ffffff;
    padding: 8px;
    font-family: 'Courier New', monospace;
    border-radius: 4px;
  }
  
  .nes-textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .nes-slider {
    background: #1a1a2e;
    height: 8px;
    border-radius: 4px;
    outline: none;
  }
  
  .character-input {
    width: 60px;
    text-align: center;
    font-size: 1.5rem;
  }
  
  .typewriter-demo {
    background: #000000;
    border: 2px solid #FFD700;
    padding: 20px;
    min-height: 100px;
    border-radius: 4px;
  }
  
  .analysis-controls {
    display: flex;
    gap: 20px;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .toggle-controls {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
  }
  
  .nes-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #FFF8DC;
    cursor: pointer;
  }
  
  .nes-checkbox input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }
  
  .glyph-analysis {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .glyph-visual {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .canvas-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.3);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #FFD700;
  }
  
  .canvas-container h4 {
    color: #FFD700;
    margin: 0;
    font-size: 0.9rem;
  }
  
  .glyph-canvas, .pattern-canvas {
    border: 1px solid #FFD700;
    background: #000000;
    image-rendering: pixelated;
  }
  
  .embedding-canvas {
    border: 1px solid #00FF00;
    background: #001100;
  }
  
  .glyph-details {
    background: rgba(255, 215, 0, 0.1);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #FFD700;
  }
  
  .glyph-details h4 {
    color: #FFD700;
    margin: 0 0 15px 0;
  }
  
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  }
  
  .detail-item .label {
    color: #FFF8DC;
    font-weight: bold;
  }
  
  .detail-item .value {
    color: #FFD700;
    font-family: monospace;
  }
  
  .orchestration-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .nes-btn {
    background: #1a1a2e;
    border: 2px solid #FFD700;
    color: #FFD700;
    padding: 10px 20px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .nes-btn:hover {
    background: #FFD700;
    color: #1a1a2e;
    transform: translateY(-2px);
  }
  
  .nes-btn.is-primary {
    border-color: #00FF00;
    color: #00FF00;
  }
  
  .nes-btn.is-primary:hover {
    background: #00FF00;
    color: #1a1a2e;
  }
  
  .nes-btn.is-warning {
    border-color: #FFA500;
    color: #FFA500;
  }
  
  .nes-btn.is-warning:hover {
    background: #FFA500;
    color: #1a1a2e;
  }
  
  .nes-btn.is-success {
    border-color: #32CD32;
    color: #32CD32;
  }
  
  .nes-btn.is-success:hover {
    background: #32CD32;
    color: #1a1a2e;
  }
  
  .orchestration-display {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .gemma-response, .orchestration-log {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #FFD700;
    padding: 15px;
    border-radius: 8px;
  }
  
  .gemma-response h4, .orchestration-log h4 {
    color: #FFD700;
    margin: 0 0 10px 0;
  }
  
  .response-text {
    background: #000000;
    color: #00FF00;
    padding: 10px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    border: 1px solid #00FF00;
  }
  
  .placeholder, .log-placeholder {
    color: #888888;
    font-style: italic;
  }
  
  .log-container {
    max-height: 200px;
    overflow-y: auto;
    background: #000000;
    border: 1px solid #FFD700;
    border-radius: 4px;
    padding: 10px;
  }
  
  .log-entry {
    color: #FFF8DC;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    margin-bottom: 5px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  }
  
  .metrics-display {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }
  
  .metric-card {
    background: rgba(255, 215, 0, 0.1);
    border: 2px solid #FFD700;
    padding: 15px;
    text-align: center;
    border-radius: 8px;
  }
  
  .metric-card h4 {
    color: #FFD700;
    margin: 0 0 10px 0;
    font-size: 0.9rem;
  }
  
  .metric-value {
    font-size: 2rem;
    font-weight: bold;
    color: #FFD700;
    text-shadow: 1px 1px 0px #B8860B;
  }
  
  .metric-label {
    color: #FFF8DC;
    font-size: 0.8rem;
    margin-top: 5px;
  }
  
  .system-validation {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #FFD700;
    padding: 15px;
    border-radius: 8px;
  }
  
  .system-validation h4 {
    color: #FFD700;
    margin: 0 0 15px 0;
  }
  
  .validation-summary {
    margin-bottom: 15px;
    text-align: center;
  }
  
  .validation-status {
    font-size: 1.2rem;
    font-weight: bold;
    padding: 10px 20px;
    border-radius: 4px;
    border: 2px solid;
  }
  
  .validation-status.success {
    color: #32CD32;
    border-color: #32CD32;
    background: rgba(50, 205, 50, 0.1);
  }
  
  .validation-status:not(.success) {
    color: #FFA500;
    border-color: #FFA500;
    background: rgba(255, 165, 0, 0.1);
  }
  
  .validation-details {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .validation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    border-left: 4px solid;
  }
  
  .validation-item.success {
    border-left-color: #32CD32;
  }
  
  .validation-item:not(.success) {
    border-left-color: #FF6B6B;
  }
  
  .test-name {
    color: #FFF8DC;
    flex: 1;
  }
  
  .test-time {
    color: #888888;
    font-family: monospace;
    font-size: 0.8rem;
    margin: 0 15px;
  }
  
  .test-status {
    font-size: 1.2rem;
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .demo-container {
      padding: 10px;
    }
    
    .orchestration-display {
      grid-template-columns: 1fr;
    }
    
    .glyph-visual {
      justify-content: center;
    }
    
    .control-row {
      flex-direction: column;
    }
    
    .nes-title {
      font-size: 2rem;
    }
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .nes-spinner {
      animation: none;
    }
    
    .nes-btn {
      transition: none;
    }
    
    .nes-btn:hover {
      transform: none;
    }
  }
</style>