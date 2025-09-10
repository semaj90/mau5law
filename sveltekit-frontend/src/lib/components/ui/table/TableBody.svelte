<script lang="ts">
</script>
  import { cn } from "$lib/utils";
  
  let className: string = "";
  export { className as class };
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)}>
  <slot />
</tbody>
