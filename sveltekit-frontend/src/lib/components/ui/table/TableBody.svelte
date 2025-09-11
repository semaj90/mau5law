<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { class: className = "" } = $props();
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)}>
  <slot />
</tbody>
