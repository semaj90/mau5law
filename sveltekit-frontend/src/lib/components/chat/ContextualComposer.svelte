<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Variant = 'modern' | 'retro';

	export let value = '';
	export let attachmentLabel: string | null = null;
	export let isSending = false;
	export let placeholder = 'Type a message...';
	export let buttonLabel = 'Send';
	export let dropzoneTitle = 'Drag & drop evidence';
	export let dropzoneHint = 'Upload supporting files to enrich responses';
	export let variant: Variant = 'modern';
	export let textareaRows = 3;
	export let allowDropzone = true;
	export let disabled = false;

	const dispatch = createEventDispatcher<{
		input: string;
		send: void;
		attachmentSelected: File | null;
		clearAttachment: void;
	}>();

	let dragActive = $state(false);

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLTextAreaElement;
		dispatch('input', target.value);
	}

	function handleSend() {
		if (disabled || isSending) return;
		dispatch('send');
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	function handleFileChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0] ?? null;
		dispatch('attachmentSelected', file);
		target.value = '';
	}

	function clearAttachment() {
		dispatch('clearAttachment');
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!allowDropzone) return;
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (!allowDropzone) return;
		dragActive = false;
		const file = event.dataTransfer?.files?.[0] ?? null;
		if (file) {
			dispatch('attachmentSelected', file);
		}
	}
</script>

<div class={`contextual-composer composer-${variant}`}>
	{#if allowDropzone}
		<div
			class={`composer-dropzone ${dragActive ? 'is-dragging' : ''}`}
			on:dragover|preventDefault={handleDragOver}
			on:dragleave={handleDragLeave}
			on:drop={handleDrop}
		>
			<div class="dropzone-text">
				<p class="dropzone-title">{dropzoneTitle}</p>
				<p class="dropzone-hint">{dropzoneHint}</p>
			</div>
			<label class="dropzone-action">
				<input
					type="file"
					class="sr-only"
					aria-label="Upload attachment"
					on:change={handleFileChange}
				/>
				<span>Browse files</span>
			</label>
		</div>
	{/if}

	{#if attachmentLabel}
		<div class="attachment-chip">
			<span>{attachmentLabel}</span>
			<button type="button" aria-label="Remove attachment" on:click={clearAttachment}>×</button>
		</div>
	{/if}

	<div class="composer-input-row">
		<textarea
			class="composer-textarea"
			rows={textareaRows}
			placeholder={placeholder}
			value={value}
			disabled={disabled}
			on:input={handleInput}
			on:keydown={handleKeyDown}
		/>
		<button
			type="button"
			class="composer-send-btn"
			on:click={handleSend}
			disabled={disabled || isSending || value.trim().length === 0}
		>
			{isSending ? 'Sending…' : buttonLabel}
		</button>
	</div>
</div>

<style>
	.contextual-composer {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.composer-modern .composer-dropzone {
		border: 1px dashed rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.05);
	}

	.composer-retro .composer-dropzone {
		border: 2px dashed #5c6ac4;
		background: rgba(2, 6, 23, 0.85);
		color: #f4f4f5;
		font-family: 'Press Start 2P', 'Courier New', monospace;
	}

	.composer-dropzone {
		border-radius: 1rem;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.composer-dropzone.is-dragging {
		border-color: #2563eb;
		background: rgba(37, 99, 235, 0.1);
	}

	.dropzone-title {
		font-weight: 600;
		margin: 0;
	}

	.dropzone-hint {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		opacity: 0.8;
	}

	.dropzone-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		background: #2563eb;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.composer-retro .dropzone-action {
		background: #f97316;
		color: #0f0f0f;
		border: 2px solid #000;
		box-shadow: 3px 3px 0 #000;
	}

	.attachment-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: rgba(37, 99, 235, 0.08);
		border-radius: 0.75rem;
		font-size: 0.85rem;
	}

	.composer-retro .attachment-chip {
		background: rgba(94, 234, 212, 0.15);
		border: 1px solid #5eead4;
	}

	.attachment-chip button {
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1rem;
		color: inherit;
	}

	.composer-input-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
	}

	.composer-textarea {
		flex: 1;
		border-radius: 1rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		padding: 1rem;
		resize: vertical;
		font-size: 1rem;
		min-height: 90px;
	}

	.composer-retro .composer-textarea {
		border: 2px solid #000;
		box-shadow: 4px 4px 0 #000;
		background: #fffaf0;
		font-family: 'Press Start 2P', 'Courier New', monospace;
	}

	.composer-send-btn {
		min-width: 120px;
		height: 48px;
		border-radius: 1rem;
		border: none;
		background: linear-gradient(135deg, #2563eb, #7c3aed);
		color: #fff;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.composer-send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.composer-retro .composer-send-btn {
		background: #10b981;
		color: #0f0f0f;
		border: 2px solid #000;
		box-shadow: 4px 4px 0 #000;
	}

	@media (max-width: 768px) {
		.composer-dropzone {
			flex-direction: column;
			align-items: flex-start;
		}

		.composer-input-row {
			flex-direction: column;
		}

		.composer-send-btn {
			width: 100%;
		}
	}
</style>
