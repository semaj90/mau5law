<script lang="ts">
</script>
  let { title, children }: { title: any; children?: any } = $props();
</script>

<h2 use:title class="space-y-4">
  {@render children?.()}
</h2>
