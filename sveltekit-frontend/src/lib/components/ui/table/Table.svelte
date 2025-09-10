<script lang="ts">
</script>
  import { cn } from "$lib/utils";
  
  let className: string = "";
  export { className as class };
</script>

<div class={cn("relative w-full overflow-auto", className)}>
  <table class="w-full caption-bottom text-sm">
    <slot />
  </table>
</div>
