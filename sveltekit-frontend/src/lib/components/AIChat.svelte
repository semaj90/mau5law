<script lang="ts">
	import 'uno.css';

	import type { AttachmentMetadata } from '$lib/types/sharedTypes';

	type Role = 'user' | 'assistant';

	interface ChatMessage {
		id: string;
		role: Role;
		content: string;
		timestamp: number;
		attachments?: AttachmentMetadata[];
	}

	export let sessionId: string | undefined = undefined;
	export let userId: string | undefined = undefined;

	let messages = $state<ChatMessage[]>([]);
	let userInput = $state<string>('');
	let isSending = $state<boolean>(false);
	let error = $state<string | null>(null);
	let chatContainer = $state<HTMLDivElement | null>(null);
	let attachment = $state<File | null>(null);
	let attachmentInput = $state<HTMLInputElement | null>(null);
	let dragActive = $state<boolean>(false);

	const attachmentLabel = $derived(
		attachment ? `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)` : ''
	);

	async function sendMessage(): Promise<void> {
		const trimmed = userInput.trim();
		if (!trimmed || isSending) return;

		isSending = true;
		error = null;
		try {
			const useFormData = Boolean(attachment);
			let response: Response;

			if (useFormData) {
				const formData = new FormData();
				formData.set('message', trimmed);
				if (sessionId) formData.set('sessionId', sessionId);
				if (userId) formData.set('userId', userId);
				formData.set('enableFunctions', 'true');
				formData.set('file', attachment as File);
				response = await fetch('/api/contextual/chat', {
					method: 'POST',
					body: formData
				});
			} else {
				response = await fetch('/api/contextual/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: trimmed,
						sessionId,
						userId,
						enableFunctions: true
					})
				});
			}

			if (!response.ok) {
				throw new Error(`API error: ${response.statusText}`);
			}

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error ?? 'Contextual chat failed');
			}

			const assistantReply: string = result.data?.response ?? result.data?.text ?? '';
			const attachmentMeta: AttachmentMetadata[] = result.data?.attachments ?? [];

			messages = [
				...messages,
				{
					id: crypto.randomUUID(),
					role: 'user',
					content: trimmed,
					timestamp: Date.now(),
					attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined
				},
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: assistantReply,
					timestamp: Date.now(),
					attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined
				}
			];

			userInput = '';
			clearAttachment();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[AIChat] sendMessage failed', err);
		} finally {
			isSending = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void sendMessage();
		}
	}

	function handleFileChange(event: Event): void {
		const file = (event.currentTarget as HTMLInputElement)?.files?.[0];
		attachment = file ?? null;
	}

	function clearAttachment(): void {
		attachment = null;
		if (attachmentInput) {
			attachmentInput.value = '';
		}
	}

	function handleDragOver(event: DragEvent): void {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent): void {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files?.[0];
		attachment = file ?? null;
	}

	$effect(() => {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});
</script>

<div class="ai-chat-shell bg-base-100 dark:bg-neutral-900 text-base-content">
	<div bind:this={chatContainer} class="messages-panel">
		{#if messages.length === 0}
			<div class="empty-state">
				<h3>Start a contextual conversation</h3>
				<p>Attach supplemental evidence to enrich the agent's understanding.</p>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<div class={`chat-message ${message.role}`}>
					<div class="message-bubble">
						<div class="message-meta">
							<span class="message-role">{message.role === 'user' ? 'You' : 'Gemma'}</span>
							<span class="message-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
						</div>
						<div class="message-content" {@html message.content.replace(/\n/g, '<br />')}></div>

						{#if message.attachments && message.attachments.length > 0}
							<div class="message-attachments">
								<h5>Attachments</h5>
								<ul>
									{#each message.attachments as file}
										<li>
											<span class="attachment-name">{file.originalName ?? file.key}</span>
											<span class="attachment-meta">{file.contentType}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
		</div>
	{/if}

	<div class="composer">
		<div
			class={`dropzone ${dragActive ? 'dragging' : ''}`}
			on:dragover|preventDefault={handleDragOver}
			on:dragleave={handleDragLeave}
			on:drop={handleDrop}
		>
			<div class="dropzone-content">
				<p class="dropzone-title">Drag & drop evidence</p>
				<p class="dropzone-hint">PDF, DOCX, TXT, or images up to 25MB</p>
				<label class="dropzone-action">
					<input
						type="file"
						bind:this={attachmentInput}
						class="sr-only"
						on:change={handleFileChange}
					/>
					<span>Browse files</span>
				</label>
			</div>
		</div>

		{#if attachment}
			<div class="attachment-chip">
				<span>{attachmentLabel}</span>
				<button type="button" on:click={clearAttachment} aria-label="Remove attachment">×</button>
			</div>
		{/if}

		<div class="input-row">
			<textarea
				class="chat-input"
				placeholder="Summarize the latest deposition, highlight risks..."
				bind:value={userInput}
				rows="3"
				on:keydown={handleKeyDown}
			/>
			<button class="send-btn" on:click|preventDefault={sendMessage} disabled={isSending || !userInput.trim()}
				>Send</button
			>
		</div>
	</div>
</div>

<style>
	.ai-chat-shell {
		display: flex;
		flex-direction: column;
		height: 100%;
		border-radius: 1.5rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
	}

	.messages-panel {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.5));
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #64748b;
	}

	.chat-message {
		display: flex;
		margin-bottom: 1.25rem;
	}

	.chat-message.user {
		justify-content: flex-end;
	}

	.chat-message.assistant {
		justify-content: flex-start;
	}

	.message-bubble {
		max-width: min(80%, 720px);
		padding: 1.25rem;
		border-radius: 1.25rem;
		background: #fff;
		border: 1px solid rgba(99, 102, 241, 0.1);
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
	}

	.chat-message.user .message-bubble {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: #fff;
		border-bottom-right-radius: 0.5rem;
	}

	.chat-message.assistant .message-bubble {
		background: #fff;
		color: #0f172a;
		border-bottom-left-radius: 0.5rem;
	}

	.message-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.75rem;
		opacity: 0.7;
	}

	.message-attachments {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(148, 163, 184, 0.3);
	}

	.message-attachments h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.message-attachments ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.message-attachments li {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: inherit;
		opacity: 0.9;
	}

	.error-banner {
		padding: 0.75rem 1.25rem;
		margin: 0 2rem;
		border-radius: 0.75rem;
		background: #fee2e2;
		color: #991b1b;
		font-size: 0.9rem;
	}

	.composer {
		padding: 1.5rem 2rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: #fff;
		border-top: 1px solid rgba(15, 23, 42, 0.08);
	}

	.dropzone {
		border: 1px dashed rgba(99, 102, 241, 0.5);
		border-radius: 1rem;
		padding: 1rem;
		text-align: center;
		background: rgba(99, 102, 241, 0.04);
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.dropzone.dragging {
		border-color: #2563eb;
		background: rgba(37, 99, 235, 0.08);
	}

	.dropzone-title {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.dropzone-hint {
		font-size: 0.85rem;
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.dropzone-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		background: #2563eb;
		color: #fff;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.attachment-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.8rem;
		background: rgba(37, 99, 235, 0.08);
		border-radius: 999px;
		font-size: 0.85rem;
	}

	.attachment-chip button {
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 1rem;
		color: inherit;
	}

	.input-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
	}

	.chat-input {
		flex: 1;
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		min-height: 90px;
		resize: vertical;
		font-size: 1rem;
	}

	.send-btn {
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

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.ai-chat-shell {
			border-radius: 1rem;
		}

		.messages-panel,
		.composer {
			padding: 1.25rem;
		}
	}
</style>
