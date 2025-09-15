<script lang="ts">
  import 'nes.css/css/nes.min.css';
  let { title, children }: { title: unknown; children?: unknown } = $props();
</script>

<h2 use:title class="space-y-4">
  {@render children?.()}
</h2>
