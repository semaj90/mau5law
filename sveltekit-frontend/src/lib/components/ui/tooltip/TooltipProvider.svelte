<script, lang="ts">
  import type { Props } from '$lib/types/global';
  let { children }: Props = $props();
</script>
<div, class="tooltip-provider" style="display: contents">
  <slot />
</div>
<style>
  .tooltip-provider {
    position: relative;
    display: inline-block;
  }
</style>
