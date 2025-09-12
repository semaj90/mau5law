<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { X } from "lucide-svelte";
  import { quadOut } from "svelte/easing";
  import { cn } from '$lib/utils';

  const dispatch = createEventDispatcher();

  let {
    open = $bindable(),
    title = $bindable(),
    description = $bindable(),
    size = $bindable(),
    showClose = $bindable(),
    closeOnOutsideClick = $bindable(),
    closeOnEscape = $bindable(),
    children,
    footer,
    trigger
  } = $props();

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[95vw] max-h-[95vh]"
  };

  // close function exposed to footer slot via {close}
  function close() {
    open = false;
    dispatch("close");
  }

  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === "Escape") {
      close();
    }
  }

  function handleOutsideClick(event: MouseEvent) {
    if (closeOnOutsideClick && event.target === event.currentTarget) {
      close();
    }
  }
</script>

<!-- keyboard handling on window for accessibility -->
<svelte:window on:keydown={handleKeydown} />

<!-- optional trigger -->
{@render trigger?.()}

{#if open}
  <!-- overlay -->
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
    transitifade={{ duration: 200, easing: quadOut }}
    onclick={handleOutsideClick}
    onkeydown={(e) => e.key === 'Escape' ? handleOutsideClick(e) : null}
    role="presentation"
    aria-hidden="true"
  >
    <!-- dialog content -->
    <div
      class={cn(
        "relative z-50 w-full max-h-[95vh] overflow-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:mx-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        sizeClasses[size]
      )}
      transitifly={{ y: -8, duration: 200, easing: quadOut }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
      tabindex={0}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Escape' ? close() : null}
    >
    >
      <!-- header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          {#if title}
            <h2 id="dialog-title" class="text-lg font-semibold">
              {title}
            </h2>
          {/if}
          {#if description}
            <p id="dialog-description" class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          {/if}
        </div>

        {#if showClose}
          <button
            type="button"
            class="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onclick={close}
            aria-label="Close dialog"
          >
            <X size="20" />
          </button>
        {/if}
      </div>

      <!-- body slot -->
      <div class="mt-4">
        {@render children?.()}
      </div>

      <!-- footer slot receives close() -->
      {#if footer}
        <div class="mt-4">
          {@render footer({ close })}
        </div>
      {/if}
    </div>
  </div>
{/if}

