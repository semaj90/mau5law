<!-- Enhanced chat surface with contextual attachment support -->
<script lang="ts">
	import 'uno.css';
	import 'nes.css/css/nes.min.css';

	import type { AttachmentMetadata } from '$lib/types/sharedTypes';

	import ContextualComposer from '$lib/components/chat/ContextualComposer.svelte';

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

	const models = [
		{ value: 'gemma3-legal', label: 'Gemma3 Legal' },
		{ value: 'gemma3:latest', label: 'Gemma3 General' },
		{ value: 'gemma2:2b', label: 'Gemma2 2B' }
	];

	let selectedModel = $state<string>(models[0]?.value ?? 'gemma3-legal');
	let messageInput = $state<string>('');
	let messages = $state<ChatMessage[]>([]);
	let isSending = $state<boolean>(false);
	let error = $state<string | null>(null);
	let chatContainer = $state<HTMLDivElement | null>(null);
	let lastConfidence = $state<number | null>(null);

	let attachment = $state<File | null>(null);

	const attachmentLabel = $derived(
		attachment ? `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)` : ''
	);

	async function handleSend(): Promise<void> {
		const trimmed = messageInput.trim();
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
				formData.set('model', selectedModel);
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
						model: selectedModel,
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

			lastConfidence = Number(result.data?.confidence ?? result.data?.confidenceScore ?? null);
			messageInput = '';
			clearAttachment();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[EnhancedChat] handleSend failed', err);
		} finally {
			isSending = false;
		}
	}

	function clearAttachment(): void {
		attachment = null;
	}

	$effect(() => {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});
</script>

<div class="enhanced-chat-container flex flex-col h-full max-w-5xl mx-auto p-4 gap-4">
	<!-- Header -->
	<div class="chat-header flex flex-wrap gap-4 items-center justify-between p-4 rounded-2xl nes-container with-title">
		<div class="flex items-center gap-3">
			<div class="status-dot animate-pulse" aria-hidden="true"></div>
			<div>
				<h2 class="text-xl font-semibold">Legal AI Assistant</h2>
				<p class="text-sm text-slate-500">Context-aware chat with attachment grounding</p>
			</div>
			{#if lastConfidence !== null}
				<span class="confidence-chip nes-badge">
					<span class="is-primary">
						Confidence {Math.round((lastConfidence ?? 0) * 100)}%
					</span>
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<label for="model-select" class="text-sm font-medium text-slate-600">Model</label>
			<select
				id="model-select"
				bind:value={selectedModel}
				class="model-select"
				aria-label="Select model"
			>
				{#each models as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Messages -->
	<div
		class="messages-container flex-1 min-h-[12rem] max-h-[32rem] overflow-y-auto p-4 bg-white rounded-2xl border shadow-sm space-y-4"
		bind:this={chatContainer}
	>
		{#if messages.length === 0}
			<div class="nes-balloon from-left w-full text-center py-6 text-slate-500">
				<p>Drop evidence or ask about case strategy to get started.</p>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<div class={`message-item ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
					<div class={`message-bubble ${message.role}`}>
						<div class="message-top">
							<span class="message-role">{message.role === 'user' ? 'You' : 'Gemma'}</span>
							<span class="message-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
						</div>
						<div class="message-content">{message.content}</div>

						{#if message.attachments && message.attachments.length > 0}
							<div class="message-attachments">
								{#each message.attachments as meta}
									<div class="attachment-pill">
										<span>{meta.originalName ?? meta.key}</span>
										<small>{meta.contentType}</small>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}

		{#if isSending}
			<div class="loading-message flex justify-start">
				<div class="message-bubble assistant">
					<div class="typing-indicator flex gap-2 items-center">
						<span class="nes-icon close is-small animate-bounce"></span>
						<span>Analyzing contextual state…</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="nes-container is-rounded is-error text-sm text-red-800">
			{error}
		</div>
	{/if}

	<!-- Input -->
	<div class="composer nes-container with-title rounded-2xl space-y-3">
		<p class="title">Compose</p>
		<ContextualComposer
			variant="retro"
			value={messageInput}
			isSending={isSending}
			buttonLabel="Send"
			attachmentLabel={attachment ? attachmentLabel : null}
			placeholder="Draft a cross-examination, summarize opposing counsel's argument..."
			dropzoneTitle="Evidence uploader"
			dropzoneHint="Drag & drop or browse to ground the AI response"
			on:input={(event) => (messageInput = event.detail)}
			on:send={() => void handleSend()}
			on:attachmentSelected={(event) => (attachment = event.detail)}
			on:clearAttachment={clearAttachment}
		/>
	</div>
</div>

<style>
	.status-dot {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		background: #16a34a;
		box-shadow: 0 0 12px rgba(22, 163, 74, 0.6);
	}

	.confidence-chip {
		font-size: 0.75rem;
	}

	.model-select {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(15, 23, 42, 0.16);
		background: #fff;
		font-size: 0.9rem;
	}

	.message-item {
		display: flex;
	}

	.message-item .message-bubble {
		max-width: min(75%, 720px);
		padding: 1rem 1.25rem;
		border-radius: 1.25rem;
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
		border: 1px solid rgba(15, 23, 42, 0.08);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.message-bubble.user {
		background: linear-gradient(135deg, #2563eb, #7c3aed);
		color: #fff;
		border-bottom-right-radius: 0.5rem;
	}

	.message-bubble.assistant {
		background: #f8fafc;
		color: #0f172a;
		border-bottom-left-radius: 0.5rem;
	}

	.message-top {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.8;
	}

	.message-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.attachment-pill {
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.1);
		font-size: 0.8rem;
		display: inline-flex;
		flex-direction: column;
	}

	.typing-indicator span {
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.messages-container {
			max-height: none;
		}
	}
</style>
