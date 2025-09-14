<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  
  let { children, class: className = ""  }: { children, class: className = "" : any } = $props();
</script>

<td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
  {@render children?.()}
</td>
