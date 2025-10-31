<script lang="ts">
  import {
    Dialog as BitsDialog,
    DialogContent as BitsDialogContent,
    DialogDescription as BitsDialogDescription,
    DialogFooter as BitsDialogFooter,
    DialogHeader as BitsDialogHeader,
    DialogOverlay as BitsDialogOverlay,
    DialogTitle as BitsDialogTitle,
    DialogTrigger as BitsDialogTrigger,
    DialogClose as BitsDialogClose
  } from 'bits-ui'; // Changed import path
  import type {
    DialogProps,
    DialogTriggerProps,
    DialogContentProps,
    DialogHeaderProps,
    DialogTitleProps,
    DialogDescriptionProps,
    DialogFooterProps,
    DialogCloseProps,
    DialogOverlayProps
  } from '$lib/ui/types/dialog';
  import { cn } from '$lib/utils'; // Assuming a utility for class merging exists

  // --- Dialog Root Props ---
  type $$Props = DialogProps;
  export let open: $$Props['open'] = undefined;
  export let onOpenChange: $$Props['onOpenChange'] = undefined;
  export let modal: $$Props['modal'] = true;

  // --- Dialog Trigger Props ---
  type $$TriggerProps = DialogTriggerProps;
  export let triggerAsChild: $$TriggerProps['asChild'] = false;
  export let triggerClass: $$TriggerProps['class'] = undefined;
  export let triggerProps: Omit<$$TriggerProps, 'asChild' | 'class'> = {};

  // --- Dialog Overlay Props ---
  type $$OverlayProps = DialogOverlayProps;
  export let overlayClass: $$OverlayProps['class'] = undefined;
  export let overlayProps: Omit<$$OverlayProps, 'class'> = {};

  // --- Dialog Content Props ---
  type $$ContentProps = DialogContentProps;
  export let contentClass: $$ContentProps['class'] = undefined;
  export let onEscapeKeyDown: $$ContentProps['onEscapeKeyDown'] = undefined;
  export let onPointerDownOutside: $$ContentProps['onPointerDownOutside'] = undefined;
  export let contentProps: Omit<$$ContentProps, 'class' | 'onEscapeKeyDown' | 'onPointerDownOutside'> = {};

  // --- Dialog Header Props ---
  type $$HeaderProps = DialogHeaderProps;
  export let headerClass: $$HeaderProps['class'] = undefined;
  export let headerProps: Omit<$$HeaderProps, 'class'> = {};

  // --- Dialog Title Props ---
  type $$TitleProps = DialogTitleProps;
  export let titleClass: $$TitleProps['class'] = undefined;
  export let titleProps: Omit<$$TitleProps, 'class'> = {};

  // --- Dialog Description Props ---
  type $$DescriptionProps = DialogDescriptionProps;
  export let descriptionClass: $$DescriptionProps['class'] = undefined;
  export let descriptionProps: Omit<$$DescriptionProps, 'class'> = {};

  // --- Dialog Footer Props ---
  type $$FooterProps = DialogFooterProps;
  export let footerClass: $$FooterProps['class'] = undefined;
  export let footerProps: Omit<$$FooterProps, 'class'> = {};

  // --- Dialog Close Props ---
  type $$CloseProps = DialogCloseProps;
  export let closeAsChild: $$CloseProps['asChild'] = false;
  export let closeClass: $$CloseProps['class'] = undefined;
  export let closeProps: Omit<$$CloseProps, 'asChild' | 'class'> = {};

  // Default classes for styling (can be customized or moved to UnoCSS config)
  const defaultOverlayClass = 'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';
  const defaultContentClass = 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg';
  const defaultHeaderClass = 'flex flex-col space-y-1.5 text-center sm:text-left';
  const defaultFooterClass = 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2';
  const defaultTitleClass = 'text-lg font-semibold leading-none tracking-tight';
  const defaultDescriptionClass = 'text-sm text-muted-foreground';
  const defaultCloseClass = 'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground';
</script>

<BitsDialog bind:open onOpenChange={onOpenChange} {modal} {...$$restProps}>
  <slot name="trigger">
    {#if $$slots.trigger}
      <BitsDialogTrigger asChild={triggerAsChild} class={triggerClass} {...triggerProps}>
        <slot name="trigger" />
      </BitsDialogTrigger>
    {/if}
  </slot>

  <BitsDialogOverlay class={cn(defaultOverlayClass, overlayClass)} {...overlayProps} />

  <BitsDialogContent
    class={cn(defaultContentClass, contentClass)}
    onEscapeKeyDown={onEscapeKeyDown}
    onPointerDownOutside={onPointerDownOutside}
    {...contentProps}
  >
    <slot name="header">
      {#if $$slots.header || $$slots.title || $$slots.description}
        <BitsDialogHeader class={cn(defaultHeaderClass, headerClass)} {...headerProps}>
          <slot name="title">
            {#if $$slots.title}
              <BitsDialogTitle class={cn(defaultTitleClass, titleClass)} {...titleProps}>
                <slot name="title" />
              </BitsDialogTitle>
            {/if}
          </slot>
          <slot name="description">
            {#if $$slots.description}
              <BitsDialogDescription class={cn(defaultDescriptionClass, descriptionClass)} {...descriptionProps}>
                <slot name="description" />
              </BitsDialogDescription>
            {/if}
          </slot>
        </BitsDialogHeader>
      {/if}
    </slot>

    <slot /> <!-- Default slot for main content -->

    <slot name="footer">
      {#if $$slots.footer}
        <BitsDialogFooter class={cn(defaultFooterClass, footerClass)} {...footerProps}>
          <slot name="footer" />
        </BitsDialogFooter>
      {/if}
    </slot>

    <BitsDialogClose class={cn(defaultCloseClass, closeClass)} asChild={closeAsChild} {...closeProps}>
      <slot name="close">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
        >
          <path d="M18 6L6 18" />
          <path d="M6 6L18 18" />
        </svg>
        <span class="sr-only">Close</span>
      </slot>
    </BitsDialogClose>
  </BitsDialogContent>
</BitsDialog>
