<script lang="ts">
  interface Props {
    onPress?: (button: string) => void;
  }

  let { onPress = () => {} }: Props = $props();
</script>

<style>
  .controller { display: flex gap:8px; padding:8px; background:#222; color:#fff; border-radius:6px }
  button { padding:6px 8px; background:#444; color:#fff; border:0; border-radius:4px }
</style>

<div class="controller">
  <button onclick={() => onPress('A')}>A</button>
  <button onclick={() => onPress('B')}>B</button>
  <button onclick={() => onPress('Start')}>Start</button>
</div>


