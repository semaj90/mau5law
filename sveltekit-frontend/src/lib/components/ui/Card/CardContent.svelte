<script lang="ts">
  let { class: className = '', children, ...rest }: { class?: string; children?: any; [key: string]: any } = $props();
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<div class={className} {...rest}>
  {@render children()}
</div>
