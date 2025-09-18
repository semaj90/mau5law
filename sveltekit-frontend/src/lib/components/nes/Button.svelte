<script lang="ts">
  export let label: string = 'Click Me';
  export let type: 'primary' | 'success' | 'warning' | 'error' = 'primary';
  export let onClick: () => void = () => {};
</script>

<button class={`nes-btn is-${type}`} on:click={onClick}>
  {label}
</button>
