<script lang="ts">
</script>
  import { cn } from "$lib/utils";
  
  let className: string = "";
  export { className as class };
</script>

<td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
  <slot />
</td>
