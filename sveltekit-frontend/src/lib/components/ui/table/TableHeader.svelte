<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)}>
  {@render children?.()}
</thead>
