<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    children?: Snippet;
    class?: string;
    disabled?: boolean;
    asChild?: boolean;
  }

  let {
    children,
    class: className = '',
    disabled = false,
    asChild = false
  }: Props = $props();

  let triggerClasses = $derived(cn(
    "legal-ai-trigger inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "bg-slate-800/80 border border-amber-500/20 text-slate-200 hover:text-amber-400 hover:border-amber-500/40",
    className
  ));
</script>

<DropdownMenu.Trigger
  class={triggerClasses}
  {disabled}
  {asChild}
>
  {@render children?.()}
</DropdownMenu.Trigger>

