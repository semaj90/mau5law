<script lang="ts">
  import * as BitsDialog from 'bits-ui';
  import { cn } from '$lib/utils/cn';

  interface DialogProps {
    /** Whether the dialog is open */
    open?: boolean;
    /** Callback when open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Dialog size */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** Legal context styling */
    legal?: boolean;
    /** Evidence analysis specific styling */
    evidenceAnalysis?: boolean;
    /** Case management styling */
    caseManagement?: boolean;
    /** Modal vs non-modal behavior */
    modal?: boolean;
    /** Custom overlay class */
    overlayClass?: string;
    /** Custom content class */
    contentClass?: string;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    size = 'md',
    legal = false,
    evidenceAnalysis = false,
    caseManagement = false,
    modal = true,
    overlayClass = '',
    contentClass = ''
  }: DialogProps = $props();

  const dialogContentClasses = $derived(cn(
    'bits-dialog-content',
    size === 'sm' && 'max-w-md',
    size === 'md' && 'max-w-lg',
    size === 'lg' && 'max-w-2xl',
    size === 'xl' && 'max-w-4xl',
    size === 'full' && 'max-w-full',
    contentClass
  ));

  const overlayClasses = $derived(cn(
    'bits-dialog-overlay',
    legal && 'backdrop-blur-md',
    evidenceAnalysis && 'bg-nier-evidence-overlay',
    caseManagement && 'bg-nier-case-overlay',
    (evidenceAnalysis || caseManagement) && 'bg-nier-overlay',
    overlayClass
  ));

  function handleOpenChange(newOpen: boolean) {
    onOpenChange?.(newOpen);
  }

  const BitsDialogRoot: any =
    (BitsDialog as any).Root ??
    (BitsDialog as any).Dialog ??
    (BitsDialog as any).default ??
    BitsDialog;

  const BitsDialogPortal: any =
    (BitsDialog as any).Portal ??
    (BitsDialog as any).DialogPortal ??
    null;

  const BitsDialogOverlay: any =
    (BitsDialog as any).Overlay ??
    (BitsDialog as any).DialogOverlay ??
    null;

  const BitsDialogContent: any =
    (BitsDialog as any).Content ??
    (BitsDialog as any).DialogContent ??
    null;
</script>

{#if BitsDialogRoot}
	<BitsDialogRoot
		open={open}
		on:openChange={(e: CustomEvent) => handleOpenChange((e as any).detail ?? e)}
	>
		{#if BitsDialogPortal}
			<BitsDialogPortal>
				{#if BitsDialogOverlay}
					<BitsDialogOverlay
						class={overlayClasses}
						data-ssr-dialog-overlay="true"
						data-evidence-analysis={evidenceAnalysis}
						data-case-management={caseManagement}
					></BitsDialogOverlay>
				{/if}

				{#if BitsDialogContent}
					<BitsDialogContent
						class={dialogContentClasses}
						data-ssr-dialog-content="true"
						role="dialog"
						aria-modal={modal}
						tabindex="-1"
						data-evidence-analysis={evidenceAnalysis}
						data-case-management={caseManagement}
					>
						<div class="bits-dialog-accent"></div>
						{#if $$slots.default}
							{@render $$slots.default}
						{/if}
					</BitsDialogContent>
				{/if}
			</BitsDialogPortal>
		{:else}
			{#if BitsDialogOverlay}
				<BitsDialogOverlay
					class={overlayClasses}
					data-ssr-dialog-overlay="true"
					data-evidence-analysis={evidenceAnalysis}
					data-case-management={caseManagement}
				></BitsDialogOverlay>
			{/if}

			{#if BitsDialogContent}
				<BitsDialogContent
					class={dialogContentClasses}
					data-ssr-dialog-content="true"
					role="dialog"
					aria-modal={modal}
					tabindex="-1"
					data-evidence-analysis={evidenceAnalysis}
					data-case-management={caseManagement}
				>
					<div class="bits-dialog-accent"></div>
					{#if $$slots.default}
						{@render $$slots.default}
					{/if}
				</BitsDialogContent>
			{/if}
		{/if}
	</BitsDialogRoot>
{:else}
	<div class={cn('bits-dialog-content', 'nier-bits-dialog', dialogContentClasses)} role="dialog" aria-modal={modal} hidden={!open} data-evidence-analysis={evidenceAnalysis} data-case-management={caseManagement}>
		<div class="bits-dialog-accent"></div>
		{#if $$slots.default}
			{@render $$slots.default}
		{/if}
	</div>
{/if}

<script lang="ts" module>
  import * as BitsDialogModule from 'bits-ui';

  export const Dialog = BitsDialogModule;
  export const DialogTrigger = (BitsDialogModule as any).Trigger;
  export const DialogPortal = (BitsDialogModule as any).Portal;
  export const DialogOverlay = (BitsDialogModule as any).Overlay;
  export const DialogContent = (BitsDialogModule as any).Content;
  export const DialogTitle = (BitsDialogModule as any).Title;
  export const DialogDescription = (BitsDialogModule as any).Description;
  export const DialogClose = (BitsDialogModule as any).Close;

  export const DialogHeader = 'div';
  export const DialogFooter = 'div';
</script>

<style>
  /* @unocss-include */
  :global(.bits-dialog-overlay) {
    animation: overlay-show 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  :global(.bits-dialog-content) {
    animation: content-show 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes overlay-show {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes content-show {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  :global(.nier-bits-dialog) {
    background: linear-gradient(
      135deg,
      var(--color-nier-bg-primary) 0%,
      var(--color-nier-bg-secondary) 100%
    );
    border: 2px solid var(--color-nier-border-primary);
  }

  :global(.bits-dialog-accent) {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      var(--color-nier-accent-warm),
      var(--color-nier-accent-cool),
      var(--color-nier-accent-warm)
    );
  }

  :global([data-evidence-analysis] .bits-dialog-content) {
    background-image: linear-gradient(45deg, transparent 25%, rgba(0, 0, 0, 0.02) 25%),
      linear-gradient(-45deg, transparent 25%, rgba(0, 0, 0, 0.02) 25%),
      linear-gradient(45deg, rgba(0, 0, 0, 0.02) 75%, transparent 75%),
      linear-gradient(-45deg, rgba(0, 0, 0, 0.02) 75%, transparent 75%);
    background-size: 20px 20px;
    background-position: 0, 0 10px, 10px -10px, -10px 0px;
  }

  :global([data-case-management] .bits-dialog-content) {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  :global([data-ssr-dialog-overlay]) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.5);
    contain: layout style;
    will-change: opacity;
  }

  @supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
    :global([data-ssr-dialog-overlay]) {
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
  }

  :global([data-ssr-dialog-content]) {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: 90vw;
    max-width: 512px;
    max-height: 85vh;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow-y: auto;
    padding: 1.5rem;
    outline: none;
  }

  :global([data-bits-dialog-content]:focus-visible) {
    outline: 2px solid var(--color-nier-border-primary);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    :global(.bits-dialog-content),
    :global([data-ssr-dialog-content]) {
      margin: 1rem;
      width: 95vw;
      max-width: calc(100vw - 2rem);
      max-height: calc(100vh - 2rem);
      border-radius: 0.25rem;
    }
  }
</style>
