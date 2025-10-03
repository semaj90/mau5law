<script lang="ts">
  // bits-ui default export is a namespace/object of components; import it and pick the ctor
  import Bits from 'bits-ui';

  import { cn } from '$lib/utils';
  import { scale } from 'svelte/transition';

  // Use slot instead of a 'children' prop; avoid exporting 'class' (reserved) — use className
  export let className = '';
  export let side: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
  export let align: 'start' | 'center' | 'end' = 'start';
  export let sideOffset: number = 4;
  export let alignOffset: number = 0;
  export let avoidCollisions: boolean = true;
  export let collisionBoundary: Element | Element[] | undefined;
  export let collisionPadding: number = 8;
  export let sticky: 'partial' | 'always' = 'partial';

  // Compute classes reactively
  $: contentClasses = cn(
    "legal-ai-dropdown-content z-50 min-w-48 overflow-hidden rounded-xl border bg-slate-900/95 backdrop-blur-md shadow-2xl",
    "border-amber-500/20 shadow-amber-500/10 p-1",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    className
  );
</script>

<!-- Render the imported constructor via svelte:component and use a slot for children -->
<svelte:component
  this={(Bits as any).DropdownMenuContent}
  class={contentClasses}
  {side}
  {align}
  {sideOffset}
  {alignOffset}
  {avoidCollisions}
  {collisionBoundary}
  {collisionPadding}
  {sticky}
>
  <slot />
</svelte:component>