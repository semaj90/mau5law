<script lang="ts">
  import '../app.css';
  import LayoutShell from '$lib/ui/LayoutShell.svelte';

  const { children } = $props();
</script>

<LayoutShell>
  {@render children?.()}
</LayoutShell>
