<script lang="ts">
  let { class: className = '', ...rest }: { class?: string; [key: string]: any } = $props();
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<div class={className} {...rest}>
  <slot />
</div>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
