<script lang="ts">
  interface Props {
    onclick: () => any;
    children?: import('svelte').Snippet;
  }

  let { onclick, children }: Props = $props();
</script>

<button onclick={onclick} type="button">{@render children?.()}</button>

<style>
  button {
    --at-apply: font-semibold bg-red-100 hover:bg-red-200 dark:bg-red-700 dark:hover:bg-red-600 p-3 rounded;
  }
</style>

