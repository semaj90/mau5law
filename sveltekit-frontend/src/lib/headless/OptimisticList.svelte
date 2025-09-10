<script lang="ts">
  export interface Item<T = any> { id: string; __optimistic?: boolean; data: T }
  const {
    items = [],
    optimistic = [],
    keyField = 'id',
    render = null
  } = $props();

  $: merged = [...items, ...optimistic.filter(o => !items.some(i => i[keyField] === o[keyField]))];
</script>

{#if merged.length === 0}
  <slot name="empty" />
{:else}
  {#each merged as item (item[keyField])}
    <slot name="item" {item} />
  {/each}
{/if}
