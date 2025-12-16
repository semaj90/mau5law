<script lang="ts">
  import ErrorStreamMonitor from '$lib/components/ErrorStreamMonitor.svelte';
</script>

<svelte:head>
  <title>Error Stream Dashboard</title>
</svelte:head>

<main>
  <header>
    <h1>🔴 Real-Time Error Dashboard</h1>
    <p>Live TypeScript error streaming via SSE</p>
  </header>

  <ErrorStreamMonitor />

  <section class="help">
    <h2>Getting Started</h2>
    <ol>
      <li>Start error watcher: <code>node scripts/error-analysis-redis.mjs --watch</code></li>
      <li>Errors will appear below in real-time</li>
      <li>Color indicates priority (RED=HIGH, YELLOW=MEDIUM, BLUE=LOW)</li>
    </ol>
  </section>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 1.5rem;
  }

  header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
  }

  header p {
    margin: 0;
    color: #6b7280;
    font-size: 1.05rem;
  }

  .help {
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .help h2 {
    margin-top: 0;
    color: #1e40af;
  }

  .help ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .help li {
    margin: 0.5rem 0;
  }

  code {
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #dbeafe;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
  }
</style>
