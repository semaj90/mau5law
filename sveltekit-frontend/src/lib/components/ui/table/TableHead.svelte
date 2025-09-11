<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<th class={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)}>
  {@render children?.()}
</th>
