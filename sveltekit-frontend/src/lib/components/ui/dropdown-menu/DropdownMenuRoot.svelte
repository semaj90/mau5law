<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { DropdownMenu } from 'bits-ui';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<DropdownMenu.Root>
  {@render children?.()}
</DropdownMenu.Root>

