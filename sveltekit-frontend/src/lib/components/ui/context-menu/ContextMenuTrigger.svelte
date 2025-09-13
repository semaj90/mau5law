<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { ContextMenu } from 'bits-ui';
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();
</script>

<ContextMenu.Trigger>
  {@render children?.()}
</ContextMenu.Trigger>

