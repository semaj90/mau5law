<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    className?: string;
  }
  let {
    className = '',
    children
  }: Props & { children?: any } = $props();

  const classes = $derived(className)
</script>

<div class="space-y-4">
  {#if children}
    {@render children()}
  {/if}
</div>

