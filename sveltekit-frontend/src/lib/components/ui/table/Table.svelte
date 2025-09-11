<script lang="ts">
  import { cn } from "$lib/utils";
  
  let { class: className = "" } = $props();
</script>

<div class={cn("relative w-full overflow-auto", className)}>
  <table class="w-full caption-bottom text-sm">
    <slot />
  </table>
</div>
