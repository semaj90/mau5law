<script lang="ts">
  interface Props {
    id?: string | undefined;
    extraClass?: string;
    padding?: string;
    elevation?: number;
    role?: string | undefined;
    children?: import('svelte').Snippet;
  }

  let {
    id = undefined,
    extraClass = '',
    padding = '12px',
    elevation = 0,
    role = undefined,
    children
  }: Props = $props();
</script>

<style>
  .n64-surface {
	background: rgba(0, 0, 0, 0.14);
	color: var(--n64-text, #fff);
	border-radius: var(--n64-radius, 6px);
	box-sizing: border-box;
	padding: var(--n64-surface-padding, 12px);
  }

  .n64-surface[data-elevation="0"] {
	box-shadow: var(--n64-shadow, 0 1px 3px rgba(0, 0, 0, 0.18));
  }
  .n64-surface[data-elevation="1"] {
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
  }
  .n64-surface[data-elevation="2"] {
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  }
  .n64-surface[data-elevation="3"] {
	box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
  }
</style>

<div
  {id}
  class="n64-surface {extraClass}"
  data-elevation={elevation}
  role={role}
  style="padding: {padding};"
>
  {@render children?.()}
</div>

