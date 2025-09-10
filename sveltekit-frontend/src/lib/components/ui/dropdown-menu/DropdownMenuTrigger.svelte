<script lang="ts">
</script>
  import { DropdownMenu } from 'bits-ui';

  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
  }
  
  let { 
    children, 
    class: className = ''
  }: Props = $props();
</script>

<DropdownMenu.Trigger 
  class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className}"
>
  {@render children?.()}
</DropdownMenu.Trigger>

