<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { class: className = "" } = $props();
</script>

<thead class={cn("[&_tr]:border-b", className)}>
  <slot />
</thead>
