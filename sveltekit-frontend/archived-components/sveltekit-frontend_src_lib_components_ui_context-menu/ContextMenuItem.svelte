<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  // Context menu item component
</script>

<button 
  class="space-y-4"
  
>
  {@render children?.()}
</button>

