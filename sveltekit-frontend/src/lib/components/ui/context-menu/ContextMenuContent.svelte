<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    menu: unknown;
    children?: unknown;
  }
  let { children, menu }: Props = $props();
</script>

<div 
  use:menu 
  class="space-y-4"
  
>
  {@render children?.()}
</div>

