<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import 'nes.css/css/nes.min.css';

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
    ...restProps
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
  <slot />
</div>

<style>
  /* Additional card styling if needed */
  .nes-container {
    margin-bottom: 1rem;
  }
</style>