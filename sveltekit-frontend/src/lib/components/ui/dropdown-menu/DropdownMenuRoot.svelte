<script lang="ts">
</script>
  import { DropdownMenu } from 'bits-ui';
  
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<DropdownMenu.Root>
  {@render children?.()}
</DropdownMenu.Root>

