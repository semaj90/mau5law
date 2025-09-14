<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    class?: string;
  }
  let {
    children
  }: { children?: any } = $props();
</script>

<button 
  class="space-y-4"
  
>
  {#if children}
    {@render children()}
  {/if}
</button>

