<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
  {@render children?.()}
</td>
