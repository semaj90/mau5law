<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">props.
  interface Props {
    onclick: () => any;
    children?: import('svelte').Snippet;
    [key: string]: any
  }

  let { ...props }: Props = $props();
</script>

<button
  class="font-semibold {props.class}"
  onclick={props.onclick}
  type="button"
>
  <span class="i-logos:svelte-icon"></span>
  {@render props.children?.()}</button
>

<style>
  button {
    --at-apply: bg-red-100 hover:bg-red-200 p-3 rounded dark:bg-red-700 dark:hover:bg-red-600;
  }
</style>


