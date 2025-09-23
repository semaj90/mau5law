<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = ""  }: { children, class: className = "" : unknown } = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)}>
  {@render children?.()}
</tbody>
