<!-- @migration-task Error while migrating Svelte code: Identifier 'string' has already been declared;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Identifier 'string' has already been declared -->
<script lang="ts">
  import { SvelteComponent } from 'svelte';
  import { goto } from '$app/navigation';

  // export props with safe defaults and concrete constructor typing for icon
  export let title: string = '';
  export let description: string = '';
  export let path: string = '';
  export let icon: typeof SvelteComponent | null = null;
  export let ariaLabel: string = '';

  // ensure ariaLabel defaults to title if not provided
  $: if (!ariaLabel) ariaLabel = title;

  // Svelte component constructor
  function handleNavigate() {
    if (path) goto(path);
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleNavigate();
    }
  }
</script>

<div
  class="yorha-nav-nier-bits-card"
  role="button"
  tabindex="0"
  aria-label={ariaLabel}
  on:click={handleNavigate}
  on:keydown={handleKey}
  data-path={path}
>
  <div class="yorha-nav-header">
    {#if icon}
      <svelte:component this={icon} size={28} />
    {/if}
    <h3>{title}</h3>
  </div>
  <p>{description}</p>
  <div class="yorha-nav-footer">
    <span>{path}</span>
    <!-- named slot "trailing" - consumers can provide content via <slot name="trailing"> -->
    <slot name="trailing" />
  </div>
</div>

<!-- Styling inherits from parent page; only minimal overrides if needed -->
<style></style>
