<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { Props } from "$lib/types/global";

  let { children }: Props = $props();
</script>

<div class="tooltip-provider" style="display: contents">
  {@render children?.()}
</div>

<style>
  .tooltip-provider {
    position: relative;
    display: inline-block;
  }
</style>


