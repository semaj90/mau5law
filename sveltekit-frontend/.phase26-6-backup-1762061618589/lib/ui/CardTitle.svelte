<script lang="ts">
  export let as: keyof HTMLElementTagNameMap = 'h3';
  export let className = '';
  const Tag: any = as;
</script>

<svelte:component this={Tag} class={`px-4 pt-4 text-xl font-semibold text-gray-900 ${className}`}>
  <slot />
</svelte:component>