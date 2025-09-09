<script lang="ts">
  import RoutesList from '../RoutesList.svelte';
</script>

<svelte:head>
  <title>All Routes - Legal AI Platform</title>
  <meta name="description" content="Browse all available routes and pages in the Legal AI Platform" />
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <h1>All Routes</h1>
    <p>Browse all available pages and features in the Legal AI Platform</p>
  </header>
  
  <RoutesList />
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
  }
</style>