<!--
  NieR Rich Text Editor Test Page
  Quick test to verify editor functionality
-->
<script lang="ts">
  import NierRichTextEditor from '$lib/components/editors/NierRichTextEditor.svelte';
  
  let editorValue = $state('');
  let testCaseId = $state('TEST-CASE-001');

  function handleEditorChange(value: string) {
    editorValue = value;
    console.log('Editor content changed:', value);
  }
</script>

<svelte:head>
  <title>NieR Editor Test - Legal AI Platform</title>
</svelte:head>

<div class="test-container">
  <div class="test-header">
    <h1 class="test-title">NieR Rich Text Editor Test</h1>
    <p class="test-description">Testing the NieR-themed rich text editor functionality</p>
  </div>

  <div class="editor-test-section">
    <h2>Editor Component</h2>
    
    <NierRichTextEditor
      bind:value={editorValue}
      placeholder="Begin your investigation notes here..."
      caseId={testCaseId}
      readonly={false}
      autosave={true}
    />
    
    {#if editorValue}
      <div class="output-preview">
        <h3>Editor Output:</h3>
        <pre class="output-content">{editorValue}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .test-container {
    min-height: 100vh;
    background: var(--yorha-bg-primary, #0a0a0a);
    color: var(--yorha-text-primary, #e0e0e0);
    padding: 24px;
    font-family: var(--gaming-font-16bit, 'Orbitron', sans-serif);
  }

  .test-header {
    text-align: center;
    padding: 32px;
    margin-bottom: 32px;
    background: var(--yorha-bg-secondary, #1a1a1a);
    border-radius: 8px;
    border: 2px solid var(--yorha-border, #606060);
  }

  .test-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--nes-blue, #3cbcfc);
  }

  .test-description {
    font-size: 1.1rem;
    color: var(--yorha-text-muted, #b0b0b0);
    letter-spacing: 1px;
  }

  .editor-test-section {
    background: var(--yorha-bg-secondary, #1a1a1a);
    padding: 32px;
    border-radius: 8px;
    border: 2px solid var(--yorha-border, #606060);
  }

  .editor-test-section h2 {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--nes-green, #92cc41);
    margin-bottom: 24px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .output-preview {
    margin-top: 32px;
    padding: 24px;
    background: var(--yorha-bg-tertiary, #2a2a2a);
    border-radius: 8px;
    border: 1px solid var(--yorha-border, #606060);
  }

  .output-preview h3 {
    font-size: 1.2rem;
    color: var(--nes-yellow, #f7d51d);
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .output-content {
    background: var(--yorha-bg-primary, #0a0a0a);
    padding: 16px;
    border-radius: 6px;
    border: 1px solid var(--yorha-border, #606060);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--nes-green, #92cc41);
    white-space: pre-wrap;
    overflow-x: auto;
  }
</style>
