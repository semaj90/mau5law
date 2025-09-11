<script lang="ts">
  import { getContext } from "svelte";
  import { writable } from "svelte/store";
  import type { SelectContext } from "./types";

  interface Props {
    class_?: string;
    children?: import('svelte').Snippet<[any]>;
    placeholder?: import('svelte').Snippet;
  }

  let { class_ = "", children, placeholder }: Props = $props();

  const context =
    getContext<SelectContext>("select") ||
    ({
      selected: writable(null),
      open: writable(false),
      onSelect: () => {},
      onToggle: () => {},
    } as SelectContext);
  const { selected } = context;
</script>

<span class="mx-auto px-4 max-w-7xl">
  {#if $selected}
    {#if children}{@render children({ value: $selected, })}{:else}
      {$selected}
    {/if}
  {:else}
    {#if placeholder}{@render placeholder()}{:else}Select an option...{/if}
  {/if}
</span>

<style>
  .select-value {
    flex: 1;
    display: flex;
    align-items: center;
  }
</style>

