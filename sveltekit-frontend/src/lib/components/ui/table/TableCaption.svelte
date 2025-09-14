<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  
  let { children, class: className = ""  }: { children, class: className = "" : any } = $props();
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)}>
  {@render children?.()}
</caption>
