<script lang="ts">
  let { title, children }: { title: unknown; children?: unknown } = $props();
</script>

<h2 use:title class="space-y-4">
  {@render children?.()}
</h2>
;