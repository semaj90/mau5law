<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  
  let { children, class: className = ""  }: { children, class: className = "" : unknown } = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)}>
  {@render children?.()}
</thead>
