<!-- DropdownMenu component combining dropdown-menu parts -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import DropdownMenuRoot from './dropdown-menu/DropdownMenuRoot.svelte';
  import DropdownMenuTrigger from './dropdown-menu/DropdownMenuTrigger.svelte';
  import DropdownMenuContent from './dropdown-menu/DropdownMenuContent.svelte';
  import DropdownMenuItem from './dropdown-menu/DropdownMenuItem.svelte';
  import DropdownMenuSeparator from './dropdown-menu/DropdownMenuSeparator.svelte';
  // Component props
  let { items = [],
    trigger = 'Menu',
    ...props 
   }: { items = [],
    trigger = 'Menu',
    ...props 
  : any } = $props();
</script>

<DropdownMenuRoot {...props}>
  <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
  
  <DropdownMenuContent>
    {#each items as item, index}
      {#if (item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).separator}
        <DropdownMenuSeparator />
      {:else}
        <DropdownMenuItem 
          value={(item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).value}
          disabled={(item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).disabled || false}
          on:click={() => (item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).onClick?.((item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).value)}
        >
          {(item as { separator?: any; value?: any; disabled?: any; onClick?: any; label?: any }).label}
        </DropdownMenuItem>
      {/if}
    {/each}
  </DropdownMenuContent>
</DropdownMenuRoot>
