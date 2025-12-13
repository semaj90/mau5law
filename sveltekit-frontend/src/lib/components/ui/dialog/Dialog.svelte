<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		children?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		children,
		onclose
	}: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="dialog-overlay"
		onclick={handleClose}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="dialog-container"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.dialog-container {
		position: relative;
		max-height: 90vh;
		overflow: auto;
	}
</style>
