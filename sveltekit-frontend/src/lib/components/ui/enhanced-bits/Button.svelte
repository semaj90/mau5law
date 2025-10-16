<script lang="ts">
  export let onclick: (() => void) | undefined;
  export let disabled: boolean = false;
  export let variant: string | undefined;
  export let size: string | undefined;
  export let class: string = '';
</script>

<button
  on:click={() => onclick && onclick()}
  disabled={disabled}
  class={`px-3 py-2 rounded ${class} ${variant ?? ''} ${size ?? ''}`}
>
  <slot />
</button>

<style>
  button[disabled] { opacity: 0.6; cursor: not-allowed; }
</style>
