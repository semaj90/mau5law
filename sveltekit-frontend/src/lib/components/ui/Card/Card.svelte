<script context="module" lang="ts">
  // Module-level declaration to type Svelte's automatically injected $$restProps
  declare let $$restProps: Record<string, any>;
</script>

<script lang="ts">
  // Svelte 5 runes are auto-imported
  import type { Snippet } from 'svelte';
  import { cn } from "$lib/utils";

  // Explicit, typed props to avoid complex destructuring issues.
  export let className: string = '';
  export let variant: 'default' | 'evidence' | 'legal' | 'nes' | 'yorha' = 'default';
  // Access remaining incoming attributes (typed via module declaration)
  export let interactive: boolean = false;
  export let children: Snippet | undefined;

  // Added missing props to avoid "Cannot find name" compile errors.
  export let priority: 'critical' | 'high' | 'medium' | 'low' | undefined = undefined;
  export let loading: boolean = false;

  // Remove any incoming class from the spread target so we can merge it intentionally.
  let restProps: Record<string, any> = {};
  $: restProps = (() => {
    const r = { ...$$restProps };
    delete r.class;
    return r;
  })();

  // Compute the final class string reactively.
  $: cardClass = cn(
    "border shadow-sm transition-all duration-200",
    {
      default: "card-nes-default",
      evidence: "card-nes-evidence legal-document-evidence",
      legal: "card-nes-legal legal-document-contract",
      nes: "yorha-3d-card bg-gray-900/90 border-yellow-400/50 text-yellow-100",
      yorha: "yorha-3d-panel text-yellow-400",
    }[variant],
    priority
      ? {
          critical: "nes-legal-priority-critical ring-2 ring-red-400",
          high: "nes-legal-priority-high ring-2 ring-yellow-400",
          medium: "nes-legal-priority-medium ring-2 ring-blue-400",
          low: "nes-legal-priority-low",
        }[priority]
      : '',
    loading ? "nes-loading opacity-75" : '',
    interactive ? "hover:scale-[1.01] cursor-pointer" : '',
    // Merge any explicit className prop and any incoming class attribute
    className,
    $$restProps?.class
  );
</script>

{#if interactive}
  <div {...restProps} class={cardClass} role="button" tabindex="0">
    {#if loading}
      <div
        class="neural-sprite-loading absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      ></div>
    {/if}
    {@render children?.()}
  </div>
{:else}
  <div {...restProps} class={cardClass}>
    {#if loading}
      <div
        class="neural-sprite-loading absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      ></div>
    {/if}
    {@render children?.()}
  </div>
{/if}
