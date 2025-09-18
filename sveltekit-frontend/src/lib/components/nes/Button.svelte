<script lang="ts">
  interface Props {
    label?: string;
    type?: 'primary' | 'success' | 'warning' | 'error';
    onClick?: () => void;
  }

  let { label = 'Click Me', type = 'primary', onClick = () => {} }: Props = $props();
</script>

<button class={`nes-btn is-${type}`} onclick={onClick}>
  {label}
</button>
