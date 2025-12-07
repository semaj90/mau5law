<script lang="ts">
  export let color: 'default' | 'green' | 'red' | 'yellow' | 'blue' = 'default';
</script>

<span
  class={color === 'green'
    ? 'pill-green'
    : color === 'red'
      ? 'pill-red'
      : color === 'yellow'
        ? 'pill-yellow'
        : color === 'blue'
          ? 'pill-blue'
          : 'tag'}
>
  <slot />
</span>
