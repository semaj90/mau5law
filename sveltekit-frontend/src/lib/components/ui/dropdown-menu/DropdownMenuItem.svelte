<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    children?: Snippet;
    class?: string;
    href?: string;
    disabled?: boolean;
    destructive?: boolean;
    onclick?: () => void;
    onselect?: () => void;
  }

  let {
    children,
    class: className = '',
    href,
    disabled = false,
    destructive = false,
    onclick,
    onselect;
  }: Props = $props();

  let itemClasses = $derived(cn(
    "legal-ai-dropdown-item relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
    "focus:outline-none focus:bg-slate-800/60 focus:text-amber-400",
    "data-[highlighted]:bg-slate-800/60 data-[highlighted]:text-amber-400",
    destructive
      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
      : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/60",
    disabled && "pointer-events-none opacity-50 cursor-not-allowed",
    className
  ));

  function handleClick() {
    if (!disabled) {
      onclick?.();
      onselect?.();
    }
  }
</script>

{#if href}
  <DropdownMenu.Item asChild>
    <a
      {href}
      class={itemClasses}
      data-disabled={disabled ? '' : undefined}
      onclick={handleClick}
    >
      {@render children?.()}
    </a>
  </DropdownMenu.Item>
{:else}
  <DropdownMenu.Item
    class={itemClasses}
    {disabled}
    onSelect={onselect}
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 text-left"
      onclick={handleClick}
      {disabled}
    >
      {@render children?.()}
    </button>
  </DropdownMenu.Item>
{/if}

