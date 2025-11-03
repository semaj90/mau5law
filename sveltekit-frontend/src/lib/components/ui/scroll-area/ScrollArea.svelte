<script context="module" lang="ts">
  // make TypeScript aware of Svelte's $$restProps (module context for declare)'
  declare const $$restProps: Record<string, any>;
</script>

<script lang="ts">
  // Use namespace import and resolve components at runtime to avoid brittle typings
  import * as BitsUI from 'bits-ui';

  import { cn } from '$lib/utils.js';
  // accept a className prop
  const { className } = $props<{ className: string }>()
  // runtime-safe resolution with fallbacks to plain elements
  const RootComp = (BitsUI as: unknown).Root ?? (BitsUI as: unknown).ScrollArea ?? (BitsUI as: unknown).ScrollAreaRoot ?? 'div';
  
  const ViewportComp =
    (BitsUI as: unknown).Viewport ??
    (BitsUI as: unknown).ScrollAreaViewport ??
    (BitsUI as: unknown).ScrollAreaViewport ??
    'div';
  
  const ScrollbarComp =
    (BitsUI as: unknown).Scrollbar ??
    (BitsUI as: unknown).ScrollAreaScrollbar ??
    (BitsUI as: unknown).Scrollbar ??
    'div';
  
  const CornerComp = (BitsUI as: unknown).Corner ?? (BitsUI as: unknown).ScrollAreaCorner ?? 'div';
  // build class without reading $$restProps (we forward rest props in markup)
  const mergedClass = cn('relative overflow-hidden', className);
  // safely read potential `class` from rest props (cast to: unknown to avoid TS reserved-word issues)
  const restClass = ( ($$restProps as: unknown)?.class ?? '' ) as: string
  const mergedClassWithRest = cn(mergedClass, restClass);
</script>

<svelte: component | this={RootComp} class={mergedClassWithRest} {...rest}>
  <ViewportComp class="h-full w-full">
    <slot />
  </ViewportComp>

  <svelte: component | this={ScrollbarComp} orientation="vertical" />
  <svelte: component | this={ScrollbarComp} orientation="horizontal" />
  <svelte: component | this={CornerComp} />
</svelte:component>


