<script lang="ts">
  import { Select as BitsSelect } from 'bits-ui';
  import type { SelectProps } from 'bits-ui';
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  interface EnhancedSelectProps extends Partial<SelectProps> {
    theme?: 'default' | 'primary' | 'secondary' | 'gaming' | 'legal';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'outline';
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    label?: string;
    items: Array<{ value: string; label: string; disabled?: boolean }>;
    value?: string;
    animation?: 'fade' | 'fly' | 'scale';
  }

  let {
    theme = 'default',
    size = 'md',
    variant = 'default',
    placeholder = 'Select an option...',
    disabled = false,
    error = '',
    label = '',
    items = [],
    value = $bindable(),
    animation = 'fade',
    ...props
  }: EnhancedSelectProps = $props();

  const dispatch = createEventDispatcher();

  let open = $state(false);

  const themeClasses = {
    default: 'bg-background border-border text-foreground hover:bg-accent',
    primary: 'bg-primary border-primary-foreground text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary border-secondary-foreground text-secondary-foreground hover:bg-secondary/90',
    gaming: 'bg-black border-green-400 text-green-400 hover:bg-green-400/10 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
    legal: 'bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
  };

  const sizeClasses = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-10 px-3 text-base',
    lg: 'h-12 px-4 text-lg'
  };

  const variantClasses = {
    default: 'bg-background border border-input',
    ghost: 'bg-transparent border-transparent hover:bg-accent',
    outline: 'bg-transparent border border-input hover:bg-accent'
  };

  function handleValueChange(newValue: string) {
    value = newValue;
    dispatch('change', { value: newValue });
  }
</script>

<div class="enhanced-select-wrapper">
  {#if label}
    <label class="block text-sm font-medium mb-2 text-foreground">
      {label}
    </label>
  {/if}

  <BitsSelect.Root
    bind:open
    {disabled}
    onValueChange={handleValueChange}
    {...props}
  >
    <BitsSelect.Trigger
      class={`
        inline-flex items-center justify-between rounded-md font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${themeClasses[theme]}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${error ? 'border-destructive' : ''}
        w-full
      `}
    >
      <BitsSelect.Value {placeholder} />
      <BitsSelect.Icon class="h-4 w-4 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </BitsSelect.Icon>
    </BitsSelect.Trigger>

    <BitsSelect.Portal>
      <BitsSelect.Content
        class={`
          relative z-50 min-w-[8rem] overflow-hidden rounded-md border
          bg-popover text-popover-foreground shadow-md
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
          data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
          data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
          ${theme === 'gaming' ? 'bg-black border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}
          ${theme === 'legal' ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : ''}
        `}
        sideOffset={4}
        transition={animation === 'fade' ? fade : fly}
        transitionConfig={animation === 'fly' ? { y: -10, duration: 200 } : { duration: 200 }}
      >
        <BitsSelect.ScrollUpButton class="flex cursor-default items-center justify-center py-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </BitsSelect.ScrollUpButton>

        <BitsSelect.Viewport class="p-1">
          {#each items as item (item.value)}
            <BitsSelect.Item
              value={item.value}
              disabled={item.disabled}
              class={`
                relative flex w-full cursor-default select-none items-center
                rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none
                focus:bg-accent focus:text-accent-foreground
                data-[disabled]:pointer-events-none data-[disabled]:opacity-50
                ${theme === 'gaming' ? 'hover:bg-green-400/10 hover:text-green-400' : ''}
                ${theme === 'legal' ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
              `}
            >
              <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <BitsSelect.ItemIndicator>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </BitsSelect.ItemIndicator>
              </span>
              <BitsSelect.ItemText>{item.label}</BitsSelect.ItemText>
            </BitsSelect.Item>
          {/each}
        </BitsSelect.Viewport>

        <BitsSelect.ScrollDownButton class="flex cursor-default items-center justify-center py-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </BitsSelect.ScrollDownButton>
      </BitsSelect.Content>
    </BitsSelect.Portal>
  </BitsSelect.Root>

  {#if error}
    <p class="mt-2 text-sm text-destructive" transition:fade>
      {error}
    </p>
  {/if}
</div>

<style>
  .enhanced-select-wrapper {
    position: relative;
    width: 100%;
  }

  /* Gaming theme enhancements */
  :global(.enhanced-select-wrapper[data-theme="gaming"]) {
    --select-glow: 0 0 10px rgba(34, 197, 94, 0.3);
  }

  /* Legal theme enhancements */
  :global(.enhanced-select-wrapper[data-theme="legal"]) {
    --select-border: rgba(148, 163, 184, 0.3);
  }

  /* Animation keyframes */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>