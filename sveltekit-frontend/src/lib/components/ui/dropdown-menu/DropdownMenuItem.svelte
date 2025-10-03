<script lang="ts">
  import DropdownMenu from 'bits-ui';
  // bits-ui does not export a named DropdownMenuItem; extract the Item component from the default export at runtime
  const DropdownMenuItem = (DropdownMenu as any).Item;

  import { cn } from '$lib/utils';

  // Replace rune-style $props and $derived with standard Svelte props + rest props
  export let href: string | undefined;
  export let disabled = false;
  export let destructive = false;
  export let onclick: (() => void) | undefined;
  export let onselect: (() => void) | undefined;
  export let className = ''; // optional explicit class prop if consumers use it

  // compute classes reactively
  $: itemClasses = cn(
    "legal-ai-dropdown-item relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
    "focus:outline-none focus:bg-slate-800/60 focus:text-amber-400",
    "data-[highlighted]:bg-slate-800/60 data-[highlighted]:text-amber-400",
    destructive
      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
      : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/60",
    disabled && "pointer-events-none opacity-50 cursor-not-allowed",
    className // preserve explicit className prop if provided
  );

  function handleClick(event?: MouseEvent) {
    if (disabled) {
      event?.preventDefault?.();
      return;
    }
    onclick?.();
    onselect?.();
  }
</script>

{#if href}
  <DropdownMenuItem asChild>
    <a
      href={href}
      class={itemClasses}
      data-disabled={disabled ? '' : undefined}
      on:click|preventDefault={handleClick}
      {...$$restProps}
    >
      <slot />
    </a>
  </DropdownMenuItem>
{:else}
  <DropdownMenuItem class={itemClasses} {disabled} onSelect={onselect} {...$$restProps}>
    <button
      type="button"
      class="flex w-full items-center gap-2 text-left"
      on:click={handleClick}
      disabled={disabled}
    >
      <slot />
    </button>
  </DropdownMenuItem>
{/if}
