<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  import { scale } from 'svelte/transition';

  interface Props {
    children?: Snippet;
    class?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    avoidCollisions?: boolean;
    collisionBoundary?: Element | Element[];
    collisionPadding?: number;
    sticky?: 'partial' | 'always';
  }

  let {
    children,
    class: className = '',
    side = 'bottom',
    align = 'start',
    sideOffset = 4,
    alignOffset = 0,
    avoidCollisions = true,
    collisionBoundary,
    collisionPadding = 8,
    sticky = 'partial';
  }: Props = $props();

  let contentClasses = $derived(cn(
    "legal-ai-dropdown-content z-50 min-w-48 overflow-hidden rounded-xl border bg-slate-900/95 backdrop-blur-md shadow-2xl",
    "border-amber-500/20 shadow-amber-500/10 p-1",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    className
  ));
</script>

<DropdownMenu.Content
  class={contentClasses}
  {side}
  {align}
  {sideOffset}
  {alignOffset}
  {avoidCollisions}
  {collisionBoundary}
  {collisionPadding}
  {sticky}
  transition={scale}
  transitionConfig={{ duration: 200, start: 0.95 }}
>
  {@render children?.()}
</DropdownMenu.Content>

