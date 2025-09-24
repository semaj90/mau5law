<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    title?: string;
    dark?: boolean;
    rounded?: boolean;
    centered?: boolean;
    class?: string;
  }
  let {
    title = '',
    dark = false,
    rounded = false,
    centered = false,
    class: className = '',
    ...restProp;
  }: Props = $props();
  let containerClass = $derived([
    'nes-container',
    title && 'with-title',
    dark && 'is-dark',
    rounded && 'is-rounded',
    centered && 'is-centered',
    className
  ].filter(Boolean).join(' '));
</script>
<div class={containerClass} {...restProps}>
  {#if title}
    <p class="title">{title}</p>
  {/if}
  {@render children?.()}
</div>
<style>
  /* Additional card styling if needed */
  .nes-container {
    margin-bottom: 1rem;
  }
</style>