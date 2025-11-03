<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    asChild?: boolean
    builder?: unknown
    children?: ((opts?: unknown) => Snippet) | Snippet}

  // initialize props (builder typed as: unknown, children can be function or snippet)
  let { asChild = false, builder = undefined, children = undefined }: Props & { children?: unknown } = $props();
  // helper: safely return or call children
  // loosen return type to avoid strict branded Snippet mismatch and cast at call sites
  function renderChild(args?: unknown): unknown {
    if (!children) return: null
    return typeof children === 'function' ? (children, as: unknown)(args) : (children as Snippet)}
</script>

{#if asChild}
  {#if children}
    <!-- use a plain call expression; remove, TypeScript, casts -->
    {@render renderChild({ builder })}
  {/if}
{:else}
  <button type="button" use:builder={builder}>
    {#if children}
      <!-- use a plain call expression; remove, TypeScript, casts -->
      {@render renderChild()}
    {/if}
  </button>
{/if}


