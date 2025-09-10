<!--
  HTML5 Drag and Drop Demo
  Showcases various drag and drop implementations with gaming aesthetics
-->
<script lang="ts">
</script>
  import SimpleDragDrop from '$lib/components/ui/SimpleDragDrop.svelte';
  import EnhancedMinIODragDrop from '$lib/components/upload/EnhancedMinIODragDrop.svelte';
  
  // Demo state
  let uploadedFiles = $state<File[]>([]);
  let errorMessage = $state<string>('');
  let successMessage = $state<string>('');

  // Demo handlers
  function handleFilesSelected(files: File[]) {
    uploadedFiles = [...uploadedFiles, ...files];
    successMessage = `Added ${files.length} file(s)`;
    errorMessage = '';
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage = '';
    }, 3000);
  }

  function handleError(error: string) {
    errorMessage = error;
    successMessage = '';
    
    // Clear error after 5 seconds
    setTimeout(() => {
      errorMessage = '';
    }, 5000);
  }

  function clearFiles() {
    uploadedFiles = [];
    successMessage = 'Files cleared';
    setTimeout(() => {
      successMessage = '';
    }, 2000);
  }

  // Enhanced upload handlers
  function handleEnhancedUploadComplete(event: CustomEvent) {
    console.log('Enhanced upload complete:', event.detail);
    successMessage = `MinIO upload complete: ${event.detail.length} files`;
  }

  function handleEnhancedUploadError(event: CustomEvent) {
    console.log('Enhanced upload error:', event.detail);
    errorMessage = `Upload error: ${event.detail}`;
  }
</script>

<svelte:head>
  <title>HTML5 Drag & Drop Demo - Legal AI Platform</title>
  <meta name="description" content="Interactive demonstration of HTML5 drag and drop functionality with gaming aesthetics and MinIO integration" />
</svelte:head>

<div class="demo-container nes-scanlines">
  <!-- Header -->
  <div class="demo-header retro-border">
    <h1 class="demo-title gradient-text-retro">HTML5 Drag & Drop Demo</h1>
    <p class="demo-subtitle">
      Modern file upload with gaming aesthetics and MinIO storage
    </p>
  </div>

  <!-- Status Messages -->
  {#if successMessage}
    <div class="status-message success">
      <span class="status-icon">✅</span>
      {successMessage}
    </div>
  {/if}

  {#if errorMessage}
    <div class="status-message error">
      <span class="status-icon">❌</span>
      {errorMessage}
    </div>
  {/if}

  <!-- Demo Sections -->
  <div class="demo-sections">
    <!-- Simple Drag Drop -->
    <section class="demo-section">
      <h2 class="section-title">Simple Drag & Drop</h2>
      <p class="section-description">
        Basic HTML5 drag and drop with retro gaming aesthetics
      </p>
      
      <SimpleDragDrop
        accept="image/*,.pdf,.txt,.docx"
        multiple={true}
        maxSize={10 * 1024 * 1024}
        onFilesSelected={handleFilesSelected}
        onError={handleError}
      />
      
      <!-- File Summary -->
      {#if uploadedFiles.length > 0}
        <div class="file-summary">
          <div class="summary-header">
            <h3>Selected Files ({uploadedFiles.length})</h3>
            <button class="clear-button" onclick={clearFiles}>
              Clear All
            </button>
          </div>
          
          <div class="file-grid">
            {#each uploadedFiles as file, index (file.name + file.size + index)}
              <div class="file-card">
                <div class="file-type">
                  {#if file.type.startsWith('image/')}
                    🖼️
                  {:else if file.type === 'application/pdf'}
                    📄
                  {:else if file.type.startsWith('text/')}
                    📝
                  {:else}
                    📁
                  {/if}
                </div>
                <div class="file-details">
                  <div class="file-name">{file.name}</div>
                  <div class="file-meta">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown'}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <!-- Enhanced MinIO Drag Drop -->
    <section class="demo-section">
      <h2 class="section-title">Enhanced MinIO Upload</h2>
      <p class="section-description">
        Advanced drag and drop with MinIO storage, CUDA processing, and AI analysis
      </p>
      
      <EnhancedMinIODragDrop
        caseId="DEMO-CASE-001"
        enableCudaAcceleration={true}
        enableGpuOptimization={true}
        useMsvcOptimizations={true}
        maxFileSize={50 * 1024 * 1024}
        acceptedTypes={['image/*', 'application/pdf', 'text/*', '.docx', '.xlsx']}
        onuploadComplete={handleEnhancedUploadComplete}
        onuploadError={handleEnhancedUploadError}
      />
    </section>

    <!-- Technical Features -->
    <section class="demo-section">
      <h2 class="section-title">Technical Features</h2>
      
      <div class="features-grid">
        <div class="feature-card">
          <h3 class="feature-title">🎮 Gaming Aesthetics</h3>
          <ul class="feature-list">
            <li>NES/SNES color palettes</li>
            <li>Pixel-perfect animations</li>
            <li>CRT scanline effects</li>
            <li>Retro glow animations</li>
          </ul>
        </div>
        
        <div class="feature-card">
          <h3 class="feature-title">📁 HTML5 Drag & Drop</h3>
          <ul class="feature-list">
            <li>Drag over/leave detection</li>
            <li>File type validation</li>
            <li>Size limit checking</li>
            <li>Multiple file support</li>
          </ul>
        </div>
        
        <div class="feature-card">
          <h3 class="feature-title">⚡ Performance</h3>
          <ul class="feature-list">
            <li>CUDA GPU acceleration</li>
            <li>MinIO object storage</li>
            <li>Redis event streaming</li>
            <li>Async file processing</li>
          </ul>
        </div>
        
        <div class="feature-card">
          <h3 class="feature-title">🔧 Modern Tech</h3>
          <ul class="feature-list">
            <li>Svelte 5 runes</li>
            <li>TypeScript strict mode</li>
            <li>Accessibility support</li>
            <li>Responsive design</li>
          </ul>
        </div>
      </div>
    </section>
  </div>

  <!-- Code Example -->
  <section class="code-section">
    <h2 class="section-title">Usage Example</h2>
    
    <pre class="code-block"><code>{`<script lang="ts">
</script>
  import SimpleDragDrop from '$lib/components/ui/SimpleDragDrop.svelte';
  
  function handleFiles(files) {
    console.log('Files dropped:', files);
  }
</script>

<SimpleDragDrop
  accept="image/*,.pdf,.txt"
  multiple={true}
  maxSize={10 * 1024 * 1024}
  onFilesSelected={handleFiles}
  onError={console.error}
/>`}</code></pre>
  </section>
</div>

<style>
  .demo-container {
    min-height: 100vh;
    background: var(--yorha-bg-primary, #0a0a0a);
    color: var(--yorha-text-primary, #e0e0e0);
    padding: 24px;
    font-family: var(--gaming-font-16bit, 'Orbitron', sans-serif);
  }

  .demo-header {
    text-align: center;
    padding: 32px;
    margin-bottom: 32px;
    background: var(--yorha-bg-secondary, #1a1a1a);
    border-radius: 8px;
  }

  .demo-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .demo-subtitle {
    font-size: 1.1rem;
    color: var(--yorha-text-muted, #b0b0b0);
    letter-spacing: 1px;
  }

  /* Status Messages */
  .status-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 8px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    animation: slide-in 0.3s ease-out;
  }

  .status-message.success {
    background: rgba(146, 204, 65, 0.1);
    border: 2px solid var(--nes-green, #92cc41);
    color: var(--nes-green, #92cc41);
  }

  .status-message.error {
    background: rgba(248, 56, 0, 0.1);
    border: 2px solid var(--nes-red, #f83800);
    color: var(--nes-red, #f83800);
  }

  .status-icon {
    font-size: 1.2rem;
  }

  /* Demo Sections */
  .demo-sections {
    display: flex;
    flex-direction: column;
    gap: 48px;
    margin-bottom: 48px;
  }

  .demo-section {
    background: var(--yorha-bg-secondary, #1a1a1a);
    padding: 32px;
    border-radius: 8px;
    border: 2px solid var(--yorha-border, #606060);
  }

  .section-title {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--nes-blue, #3cbcfc);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .section-description {
    color: var(--yorha-text-muted, #b0b0b0);
    margin-bottom: 32px;
    font-size: 1rem;
    line-height: 1.6;
  }

  /* File Summary */
  .file-summary {
    margin-top: 32px;
    background: var(--yorha-bg-tertiary, #2a2a2a);
    padding: 24px;
    border-radius: 8px;
    border: 1px solid var(--yorha-border, #606060);
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .summary-header h3 {
    color: var(--nes-green, #92cc41);
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .clear-button {
    background: var(--nes-red, #f83800);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-button:hover {
    background: #cc2000;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(248, 56, 0, 0.3);
  }

  .file-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr);
    gap: 16px;
  }

  .file-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--yorha-bg-primary, #0a0a0a);
    border: 1px solid var(--yorha-border, #606060);
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .file-card:hover {
    border-color: var(--nes-blue, #3cbcfc);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(60, 188, 252, 0.2);
  }

  .file-type {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .file-details {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-weight: bold;
    color: var(--yorha-text-primary, #e0e0e0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-meta {
    font-size: 0.85rem;
    color: var(--yorha-text-muted, #b0b0b0);
    margin-top: 4px;
  }

  /* Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr);
    gap: 24px;
  }

  .feature-card {
    background: var(--yorha-bg-tertiary, #2a2a2a);
    padding: 24px;
    border-radius: 8px;
    border: 1px solid var(--yorha-border, #606060);
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    border-color: var(--nes-yellow, #f7d51d);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(247, 209, 29, 0.2);
  }

  .feature-title {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--nes-yellow, #f7d51d);
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .feature-list li {
    padding: 8px 0;
    color: var(--yorha-text-muted, #b0b0b0);
    border-bottom: 1px solid rgba(96, 96, 96, 0.3);
    position: relative;
    padding-left: 20px;
  }

  .feature-list li::before {
    content: '▶';
    position: absolute;
    left: 0;
    color: var(--nes-green, #92cc41);
    font-size: 0.8rem;
  }

  .feature-list li:last-child {
    border-bottom: none;
  }

  /* Code Section */
  .code-section {
    background: var(--yorha-bg-secondary, #1a1a1a);
    padding: 32px;
    border-radius: 8px;
    border: 2px solid var(--yorha-border, #606060);
  }

  .code-block {
    background: var(--yorha-bg-primary, #0a0a0a);
    padding: 24px;
    border-radius: 6px;
    border: 1px solid var(--yorha-border, #606060);
    overflow-x: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--nes-green, #92cc41);
  }

  /* Animations */
  @keyframes slide-in {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .demo-container {
      padding: 16px;
    }

    .demo-title {
      font-size: 2rem;
    }

    .demo-section {
      padding: 24px 20px;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .file-grid {
      grid-template-columns: 1fr;
    }

    .summary-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
  }
</style>
