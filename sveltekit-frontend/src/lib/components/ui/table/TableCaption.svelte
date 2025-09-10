<script lang="ts">
</script>
  import { cn } from "$lib/utils";
  
  let className: string = "";
  export { className as class };
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)}>
  <slot />
</caption>
