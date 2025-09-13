<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface TabItem {
    value: string;
    label: string;
    disabled?: boolean;
    content?: Snippet;
  }

  interface Props {
    tabs: TabItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    variant?: 'default' | 'pills' | 'underline';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    children?: Snippet;
  }

  let {
    tabs,
    value = $bindable(tabs[0]?.value || ''),
    onValueChange,
    variant = 'default',
    size = 'md',
    class: className = '',
    children
  }: Props = $props();

  const sizeClasses = {
    sm: "text-sm px-3 py-2",
    md: "text-base px-4 py-3",
    lg: "text-lg px-6 py-4"
  };

  const variantClasses = {
    default: {
      list: "bg-slate-800/40 rounded-xl p-1",
      trigger: "rounded-lg transition-all duration-300",
      triggerActive: "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25",
      triggerInactive: "text-slate-400 hover:text-amber-400 hover:bg-slate-700/50"
    },
    pills: {
      list: "space-x-2",
      trigger: "rounded-full border border-slate-600/50 transition-all duration-300",
      triggerActive: "bg-amber-500 text-slate-900 border-amber-500 shadow-lg shadow-amber-500/25",
      triggerInactive: "text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 hover:border-amber-500/50"
    },
    underline: {
      list: "border-b border-slate-700 space-x-1",
      trigger: "border-b-2 border-transparent pb-3 transition-all duration-300",
      triggerActive: "border-amber-500 text-amber-400",
      triggerInactive: "text-slate-400 hover:text-amber-400 hover:border-slate-500"
    }
  };

  function handleValueChange(newValue: string) {
    value = newValue;
    onValueChange?.(newValue);
  }
</script>

<TabsPrimitive.Root
  bind:value
  onValueChange={handleValueChange}
  class={cn("legal-ai-tabs w-full", className)}
>
  <TabsPrimitive.List
    class={cn(
      "legal-ai-tabs-list flex",
      variantClasses[variant].list
    )}
  >
    {#each tabs as tab}
      <TabsPrimitive.Trigger
        value={tab.value}
        disabled={tab.disabled}
        class={cn(
          "legal-ai-tabs-trigger font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
          sizeClasses[size],
          variantClasses[variant].trigger,
          value === tab.value
            ? variantClasses[variant].triggerActive
            : variantClasses[variant].triggerInactive
        )}
      >
        {tab.label}
      </TabsPrimitive.Trigger>
    {/each}
  </TabsPrimitive.List>

  {#if children}
    {@render children()}
  {:else}
    {#each tabs as tab}
      <TabsPrimitive.Content
        value={tab.value}
        class="legal-ai-tabs-content mt-6 focus:outline-none"
      >
        {#if tab.content}
          {@render tab.content()}
        {:else}
          <div class="text-slate-300">
            Content for {tab.label} tab
          </div>
        {/if}
      </TabsPrimitive.Content>
    {/each}
  {/if}
</TabsPrimitive.Root>

<style>
  :global(.legal-ai-tabs) {
    font-family: var(--legal-ai-font-family-sans);
  }

  :global(.legal-ai-tabs-trigger) {
    font-family: var(--legal-ai-font-family-sans);
  }

  :global(.legal-ai-tabs-trigger:focus-visible) {
    outline: 2px solid var(--legal-ai-primary);
    outline-offset: 2px;
  }

  :global(.legal-ai-tabs-content) {
    font-family: var(--legal-ai-font-family-sans);
    animation: legal-ai-fade-in 200ms ease-out;
  }

  @keyframes legal-ai-fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>