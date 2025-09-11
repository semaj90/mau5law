<script lang="ts">
  import { melt } from '@melt-ui/svelte';
  interface Props {
    trigger: unknown;
    selectedLabel: unknown;
    children?: import('svelte').Snippet<[any]>;
  }

  let { trigger, selectedLabel, children }: Props = $props();
</script>

<button  class="mx-auto px-4 max-w-7xl">
  {@render children?.({ selectedLabel, })}
</button>

<style>
  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    min-width: 8rem;
  }
</style>

