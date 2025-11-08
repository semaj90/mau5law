<script lang="ts">
  import CRUDDashboard from '$lib/components/CRUDDashboard.svelte';
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* @unocss-include */
  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 3rem 2rem;
    margin: -2rem -2rem 2rem -2rem;
    text-align: center;
  }
  .page-title h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin:
      0,
      0 1rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  .page-title p {
    font-size: 1.125rem;
    margin: 0;
    opacity: 0.9;
  }
  @media (max-width: 768px) {
    .page-header {
      padding: 2rem 1rem;
      margin: -1rem -1rem 1rem -1rem;
    }
    .page-title h1 {
      font-size: 2rem;
    }
    .page-title p {
      font-size: 1rem;
    }
  }
</style>
