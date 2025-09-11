<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { class: className = "" } = $props();
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)}>
  <slot />
</caption>
