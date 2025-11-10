<script lang="ts">
  import { onMount } from 'svelte';

  let recommendations = $state<any[]>([]);
  let loading = $state<boolean>(true);
  let error = $state<string | null>(null);

  onMount(() => {
    (async () => {
      try {
        const response = await fetch('/api/recommendations');
        if (response.ok) {
          recommendations = await response.json();
        } else {
          error = `Failed to load recommendations: ${response.statusText}`;
        }
      } catch (e: any) {
        console.error('Error loading recommendations:', e);
        error = `Error loading recommendations: ${e.message}`;
      } finally {
        loading = false;
      }
    })();
  });
</script>

<main class="recommendations-page">
  <h1>AI Recommendations</h1>

  {#if loading}
    <p>Loading recommendations...</p>
  {:else if error}
    <p class="error-message">{error}</p>
  {:else if recommendations.length > 0}
    <div class="recommendations-grid">
      {#each recommendations as recommendation (recommendation.id)}
        <div class="recommendation-card">
          <h2>{recommendation.title}</h2>
          <p>{recommendation.description}</p>
        </div>
      {/each}
    </div>
  {:else}
    <p>No recommendations found.</p>
  {/if}
</main>

<style>
  .recommendations-page {
    padding: 2rem;
    font-family: sans-serif;
  }

  .recommendations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .recommendation-card {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .recommendation-card h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.25rem;
  }

  .recommendation-card p {
    color: #666;
    line-height: 1.5;
  }

  .error-message {
    color: red;
    font-weight: bold;
  }
</style>
