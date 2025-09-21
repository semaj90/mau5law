<!--
Demo RAG Testing Page
Tests the demo RAG functionality with interactive interface
-->
<script lang="ts">
  import DemoChat from '$lib/components/DemoChat.svelte';
  import { onMount } from 'svelte';

  let isClient = $state(false);

  onMount(() => {
    isClient = true;
  });
</script>

<svelte:head>
  <title>Demo RAG Testing - Legal AI</title>
</svelte:head>

<div class="demo-page">
  <header class="demo-header">
    <h1>🤖 Demo RAG Testing</h1>
    <p>Test the AI-powered case analysis with simulated data</p>
  </header>

  <main class="demo-main">
    {#if isClient}
      <div class="demo-container">
        <div class="demo-info">
          <h2>📋 Demo Case Information</h2>
          <div class="case-details">
            <h3>Case: Financial Fraud Investigation</h3>
            <p>Investigation into suspicious financial transactions involving multiple parties and evidence types.</p>

            <h4>Available Evidence:</h4>
            <ul>
              <li>📄 <strong>bank_statements.pdf</strong> - Bank statements showing unusual transfers ($50,000)</li>
              <li>📧 <strong>email_thread.eml</strong> - Email communications between suspect and accomplice</li>
              <li>📊 <strong>transaction_logs.csv</strong> - Digital transaction logs (247 entries)</li>
              <li>🎥 <strong>security_footage.mp4</strong> - Security camera footage from server room</li>
              <li>🌐 <strong>network_logs.txt</strong> - Network access logs showing unauthorized transfers</li>
            </ul>

            <h4>Sample Questions to Try:</h4>
            <ul>
              <li>"Give me a summary of this case"</li>
              <li>"What evidence do we have about financial transactions?"</li>
              <li>"Show me a timeline of events"</li>
              <li>"Analyze patterns in the evidence"</li>
              <li>"Who are the persons of interest?"</li>
            </ul>
          </div>
        </div>

        <div class="demo-chat-container">
          <DemoChat />
        </div>
      </div>
    {:else}
      <div class="loading">
        <p>Loading demo interface...</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
    color: #fff;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .demo-header {
    text-align: center;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid #333;
  }

  .demo-header h1 {
    margin: 0 0 1rem 0;
    font-size: 2.5rem;
    background: linear-gradient(45deg, #00ff00, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .demo-header p {
    margin: 0;
    font-size: 1.2rem;
    opacity: 0.8;
  }

  .demo-main {
    padding: 2rem;
  }

  .demo-container {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    height: calc(100vh - 200px);
  }

  .demo-info {
    background: rgba(0, 0, 0, 0.4);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid #333;
    overflow-y: auto;
  }

  .demo-info h2 {
    margin: 0 0 1.5rem 0;
    color: #00ff00;
    font-size: 1.5rem;
  }

  .case-details h3 {
    margin: 0 0 1rem 0;
    color: #00ccff;
    font-size: 1.3rem;
  }

  .case-details h4 {
    margin: 1.5rem 0 0.75rem 0;
    color: #ffaa00;
    font-size: 1.1rem;
  }

  .case-details p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
    opacity: 0.9;
  }

  .case-details ul {
    margin: 0 0 1rem 1rem;
    padding: 0;
  }

  .case-details li {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .demo-chat-container {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .loading {
    text-align: center;
    padding: 4rem;
    opacity: 0.6;
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .demo-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .demo-info {
      max-height: 300px;
    }
  }

  @media (max-width: 768px) {
    .demo-main {
      padding: 1rem;
    }

    .demo-header h1 {
      font-size: 2rem;
    }

    .demo-header p {
      font-size: 1rem;
    }

    .demo-info, .demo-chat-container {
      padding: 1rem;
    }
  }
</style>