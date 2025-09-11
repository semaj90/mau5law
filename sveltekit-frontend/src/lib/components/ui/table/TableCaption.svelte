<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)}>
  {@render children?.()}
</caption>
