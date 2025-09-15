<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  
  let { children, class: className = ""  }: { children, class: className = "" : unknown } = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)}>
  {@render children?.()}
</tbody>
