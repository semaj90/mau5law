<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)}>
  {@render children?.()}
</tbody>
