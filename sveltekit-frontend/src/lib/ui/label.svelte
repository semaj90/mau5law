<script lang="ts">
  // Props
  export let forId: string | undefined = undefined;
  export let required: boolean = false;
  export let srOnly: boolean = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let className: string = '';

  // Small utility for class names (keeps component minimal)
  const sizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  } as const;
  $: sizeClass = sizeMap[size] ?? sizeMap.md;
  $: srOnlyClass = srOnly ? 'sr-only' : '';
  $: computedClass = `${sizeClass} ${srOnlyClass} ${className}`.trim();
</script>

<label class={computedClass} {...(forId ? { for: forId } : {})}>
  <slot />
  {#if required}
    <span aria-hidden="true" style="margin-left:.25rem; color:var(--danger,#b91c1c)">*</span>
    <span class="sr-only">required</span>
  {/if}
</label>

<style>
  /* Minimal sr-only helper if project doesn't already provide one */
  :global(.sr-only) {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0,0,0,0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
</style>
