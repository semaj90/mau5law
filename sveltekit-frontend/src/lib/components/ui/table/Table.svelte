<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  
  let { children, class: className = "" } = $props();
</script>

<div class={cn("relative w-full overflow-auto", className)}>
  <table class="w-full caption-bottom text-sm">
    {@render children?.()}
  </table>
</div>
