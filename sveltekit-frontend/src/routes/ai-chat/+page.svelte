<script lang="ts">
	import 'nes.css/css/nes.min.css';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	// Svelte 5 runes
	let messages = $state<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
	let currentMessage = $state('');
	let isLoading = $state(false);
	let chatContainer: HTMLElement;

	// Enhanced UX state
	let typingIndicator = $state(false);
	let connectionStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');
	let modelInfo = $state<{name: string, status: string} | null>(null);

	// Check TensorRT service health
	async function checkServiceHealth() {
		try {
			connectionStatus = 'connecting';
			const response = await fetch('http://localhost:8101/health');
			const data = await response.json();
			connectionStatus = 'connected';
			modelInfo = {
				name: 'Gemma3-Legal Q4_K_M',
				status: data.status || 'Running'
			};
		} catch (error) {
			connectionStatus = 'disconnected';
			console.error('Service health check failed:', error);
		}
	}

	// Send message to TensorRT service
	async function sendMessage() {
		if (!currentMessage.trim() || isLoading) return;

		const userMessage = {
			id: crypto.randomUUID(),
			role: 'user' as const,
			content: currentMessage.trim(),
			timestamp: new Date()
		};

		messages = [...messages, userMessage];
		const messageToSend = currentMessage;
		currentMessage = '';
		isLoading = true;
		typingIndicator = true;

		// Scroll to bottom
		setTimeout(() => {
			chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
		}, 100);

		try {
			const response = await fetch('http://localhost:8101/infer', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					prompt: messageToSend,
					max_tokens: 512,
					temperature: 0.7,
					legal_context: true
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			const assistantMessage = {
				id: crypto.randomUUID(),
				role: 'assistant' as const,
				content: data.response || data.text || 'No response received',
				timestamp: new Date()
			};

			messages = [...messages, assistantMessage];

		} catch (error) {
			console.error('Error sending message:', error);
			const errorMessage = {
				id: crypto.randomUUID(),
				role: 'assistant' as const,
				content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
				timestamp: new Date()
			};
			messages = [...messages, errorMessage];
		} finally {
			isLoading = false;
			typingIndicator = false;
			setTimeout(() => {
				chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
			}, 100);
		}
	}

	// Handle Enter key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Format timestamp
	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		checkServiceHealth();
		// Check health every 30 seconds
		const interval = setInterval(checkServiceHealth, 30000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>AI Legal Chat - TensorRT Demo</title>
	<meta name="description" content="Legal AI Chat powered by TensorRT and Gemma3-Legal" />
</svelte:head>

<div class="nes-container with-title chat-container">
	<!-- Header -->
	<p class="title">🧠 LEGAL AI CHAT SYSTEM</p>
	<div class="nes-container is-dark header-box">
		<div class="header-content">
			<div class="model-info">
				{#if modelInfo}
					<span class="nes-text is-success">📡 {modelInfo.name}</span>
				{:else}
					<span class="nes-text is-warning">📡 CONNECTING...</span>
				{/if}
			</div>

			<div class="connection-status">
				{#if connectionStatus === 'connected'}
					<span class="nes-text is-success">● ONLINE</span>
				{:else if connectionStatus === 'connecting'}
					<span class="nes-text is-warning">● CONNECTING</span>
				{:else}
					<span class="nes-text is-error">● OFFLINE</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Chat Messages -->
	<div class="nes-container is-dark chat-messages" bind:this={chatContainer}>
		{#if messages.length === 0}
			<div class="welcome-message">
				<div class="nes-container welcome-content">
					<h2 class="nes-text is-primary">👋 LEGAL AI SYSTEM READY</h2>
					<p class="nes-text">POWERED BY TENSORRT + GEMMA3-LEGAL Q4_K_M</p>
					<div class="example-prompts">
						<p class="nes-text">SELECT QUERY TYPE:</p>
						<button class="nes-btn is-primary example-btn"
						        onclick={() => currentMessage = "What are the key elements of a valid contract?"}>
							📋 CONTRACT ELEMENTS
						</button>
						<button class="nes-btn is-success example-btn"
						        onclick={() => currentMessage = "Explain intellectual property basics"}>
							💡 IP LAW BASICS
						</button>
						<button class="nes-btn is-warning example-btn"
						        onclick={() => currentMessage = "What is due diligence in M&A?"}>
							🔍 DUE DILIGENCE
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#each messages as message (message.id)}
			<div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
				<div class="message-avatar">
					{#if message.role === 'user'}
						👤
					{:else}
						🧠
					{/if}
				</div>
				<div class="message-content">
					<div class="message-text">{message.content}</div>
					<div class="message-time">{formatTime(message.timestamp)}</div>
				</div>
			</div>
		{/each}

		{#if typingIndicator}
			<div class="message assistant">
				<div class="message-avatar">🧠</div>
				<div class="message-content">
					<div class="typing-indicator">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Input Area -->
	<footer class="chat-input">
		<div class="input-container">
			<textarea
				bind:value={currentMessage}
				onkeydown={handleKeydown}
				placeholder="Ask a legal question..."
				rows="1"
				class="message-input"
				disabled={isLoading || connectionStatus === 'disconnected'}
			></textarea>
			<button
				onclick={sendMessage}
				disabled={!currentMessage.trim() || isLoading || connectionStatus === 'disconnected'}
				class="send-button"
			>
				{#if isLoading}
					⏳
				{:else}
					📤
				{/if}
			</button>
		</div>
	</footer>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		max-width: 1200px;
		margin: 0 auto;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.chat-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		padding: 1rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.model-info h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #2d3748;
	}

	.model-name {
		font-size: 0.875rem;
		color: #718096;
		font-weight: 500;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.connection-status.connected {
		background: #48bb78;
		color: white;
	}

	.connection-status.connecting {
		background: #ed8936;
		color: white;
	}

	.connection-status.disconnected {
		background: #e53e3e;
		color: white;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.welcome-message {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.welcome-content {
		text-align: center;
		background: rgba(255, 255, 255, 0.95);
		padding: 2rem;
		border-radius: 20px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.welcome-content h2 {
		margin: 0 0 0.5rem 0;
		color: #2d3748;
	}

	.example-prompts {
		margin-top: 1.5rem;
	}

	.example-prompts p {
		margin-bottom: 1rem;
		color: #718096;
	}

	.example-btn {
		display: block;
		width: 100%;
		margin: 0.5rem 0;
		padding: 0.75rem;
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.example-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
	}

	.message {
		display: flex;
		gap: 1rem;
		max-width: 80%;
	}

	.message.user {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.message.assistant {
		align-self: flex-start;
	}

	.message-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.message-content {
		flex: 1;
	}

	.message-text {
		background: rgba(255, 255, 255, 0.95);
		padding: 1rem;
		border-radius: 15px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.user .message-text {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
	}

	.message-time {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 0.25rem;
		text-align: right;
	}

	.user .message-time {
		text-align: left;
	}

	.typing-indicator {
		display: flex;
		gap: 0.25rem;
		padding: 1rem;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		background: #718096;
		border-radius: 50%;
		animation: typing 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
	.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

	@keyframes typing {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}

	.chat-input {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		padding: 1rem;
	}

	.input-container {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
	}

	.message-input {
		flex: 1;
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 15px;
		font-size: 1rem;
		resize: none;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.message-input:focus {
		outline: none;
		border-color: #667eea;
	}

	.message-input:disabled {
		background: #f7fafc;
		color: #a0aec0;
	}

	.send-button {
		padding: 1rem;
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		font-size: 1.2rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.send-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
	}

	.send-button:disabled {
		background: #e2e8f0;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.chat-container {
			height: 100vh;
		}

		.message {
			max-width: 95%;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}
	}
</style>