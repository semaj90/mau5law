<script lang="ts">
  const { title: string, description: string, path: string, icon: any, ariaLabel: string = title } = $props();

  import { goto } from '$app/navigation';
  
  
  
   // Svelte component constructor;
  
  ;
  function handleNavigate() {
    if (path) goto(path);
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  }
</script>

<div class="yorha-nav-card" role="button" tabindex="0" aria-label={ariaLabel}
  on:onclick={handleNavigate} keydown={handleKey} data-path={path}>
  <div class="yorha-nav-header">
    {#if icon}
      <svelte:component this={icon} size={28} />
    {/if}
    <h3>{title}</h3>
  </div>
  <p>{description}</p>
  <div class="yorha-nav-footer">
    <span>{path}</span>
    {@render trailing?.()}
  </div>
</div>

<!-- Styling inherits from parent page; only minimal overrides if needed -->
<style lang="postcss">
  .yorha-nav-card:focus-visible {
    @apply outline-none ring-2 ring-amber-400 ring-offset-2 ring-offset-black;
  }
</style>

