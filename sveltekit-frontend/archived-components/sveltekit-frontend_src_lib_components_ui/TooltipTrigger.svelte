<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    asChild?: any;
    builder: any
  }
  let {
    asChild = false,
    builder = null,
    children
  }: Props & { children?: any } = $props();




  let className = "";
</script>

{#if asChild}
  {#if children}
    {@render children({ builder })}
  {/if}
{:else}
  <button type="button"  use:builder>
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}

