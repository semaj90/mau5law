<script lang="ts">
  import Dropdown from '../Dropdown.svelte';
  import type { Snippet } from 'svelte';

  let {
    align = 'left' as 'left' | 'right',
    onitemclick,
    trigger,
    children
  }: {
    align?: 'left' | 'right';
    onitemclick?: (e: CustomEvent<any>) => void;
    trigger?: Snippet;
    children?: Snippet;
  } = $props();

  let dropdownRef = $state<Dropdown | null>(null);

  function handleItemClick(e: CustomEvent<any>) {
    // call the internal close() method on Dropdown via the bound instance
    if (onitemclick) onitemclick(e);
    dropdownRef?.close();
  }
</script>

<Dropdown bind:this={dropdownRef} {align} on:itemclick={handleItemClick}>
  {#if trigger}
    {@render trigger()}
  {/if}

  {#if children}
    {@render children()}
  {/if}
</Dropdown>
