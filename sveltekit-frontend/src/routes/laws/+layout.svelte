<script lang="ts">
  import '$lib/styles/laws-global.css';
</script>

<div class="laws-layout">
  <slot />
</div>

<style>
  .laws-layout {
    display: grid;
    grid-template-columns: 260px 1fr auto;
    min-height: 100vh;
    background-color: #fafafa;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  @media (max-width: 1024px) {
    .laws-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
