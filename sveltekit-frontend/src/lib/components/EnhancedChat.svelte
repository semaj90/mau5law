<!-- Enhanced Chat Component with bits-ui, melt-ui, shadcn-svelte integration -->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { useMachine } from '@xstate/svelte';
  import { createMachine, assign } from 'xstate';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import { cn } from '$lib/utils/cn';
  import { chatStore } from '$lib/stores/chat';
  import type { ChatMessage, ChatSession } from '$lib/types/chat';

  // Local state
  let messageInput: string = '';
  let chatContainer: HTMLDivElement | null = null;

  // UnoCSS + bits-ui base styles
  import 'uno.css';

	// Keep local messageInput / chatContainer as plain locals (no $state collision)
	// Auto-scroll integration for Svelte 5 + bits-ui: subscribe to the machine state on mount
	let machineUnsub: (() => void) | undefined;

	onMount(() => {
		// subscribe to the XState store when it's available (it will be assigned later in the file)
		if (typeof state !== 'undefined' && state?.subscribe) {
			machineUnsub = state.subscribe((s: any) => {
				if (s?.context?.messages?.length) {
					// wait for DOM updates then scroll
					tick().then(() => scrollToBottom());
				}
			});
		}
	});

	onDestroy(() => {
		machineUnsub?.();
	});
	// Available models (kept simple — no melt-ui / shadcn-svelte dependencies)
	const models = [
		{ value: 'gemma3-legal', label: 'Gemma3 Legal', description: 'Legal-specialized model' },
		{ value: 'gemma3:latest', label: 'Gemma3 General', description: 'General purpose model' },
		{ value: 'gemma2:2b', label: 'Gemma2 2B', description: 'Fast, lightweight model' }
	];
  	// Enhanced Chat Machine with proper error handling
  	const enhancedChatMachine = createMachine({
  		id: 'enhancedChat',
  		initial: 'idle',
  		context: {
  			messages: [] as ChatMessage[],
  			currentMessage: '',
  			isTyping: false,
  			isLoading: false,
  			session: null as ChatSession | null,
  			error: null as string | null,
  			confidence: 0,
  			model: 'gemma3-legal'
  		},
  		states: {
  			idle: {
  				on: {
  					SEND: 'sending',
  					CONNECT: 'connecting',
  					SET_MODEL: {
  						actions: assign({
  							model: ({ event }) => event.model
  						})
  					}
  				}
  			},
  			connecting: {
  				invoke: {
  					src: 'initializeSession',
  					onDone: {
  						target: 'idle',
  						actions: assign({
  							session: ({ event }) => event.data
  						})
  					},
  					onError: {
  						target: 'error',
  						actions: assign({
  							error: ({ event }) => event.data.message || 'Failed to initialize session'
  						})
  					}
  				}
  			},
  			sending: {
  				entry: assign({
  					isLoading: true,
  					error: null
  				}),
  				invoke: {
  					src: 'sendMessageToOllama',
  					onDone: {
  						target: 'idle',
  						actions: [
  							assign({
  								messages: ({ context, event }) => [
  									...context.messages,
  									event.data.userMessage,
  									event.data.aiResponse
  								],
  								currentMessage: '',
  								isLoading: false,
  								confidence: ({ event }) => event.data.confidence || 0
  							}),
  							'saveChatHistory',
  							'updateChatStore'
  						]
  					},
  					onError: {
  						target: 'error',
  						actions: assign({
  							error: ({ event }) => event.data.message || 'Failed to send message',
  							isLoading: false
  						})
  					}
  				}
  			},
  			error: {
  				on: {
  					RETRY: 'sending',
  					CLEAR_ERROR: {
  						target: 'idle',
  						actions: assign({
  							error: null
  						})
  					}
  				}
  			}
  		}
  	}, {
  		actions: {
  			updateChatStore: ({ context }) => {
  				chatStore.setMessages(context.messages);
  			},
  			saveChatHistory: async ({ context }) => {
  				// Save to PostgreSQL with pgvector
  				try {
  					await fetch('/api/chat/save', {
  						method: 'POST',
  						headers: { 'Content-Type': 'application/json' },
  						body: JSON.stringify({
  							messages: context.messages.slice(-2), // Last user + AI message
  							sessionId: context.session?.id,
  							model: context.model
  						})
  					});
  				} catch (error) {
  					console.warn('Failed to save chat history:', error);
  				}
  			}
  		},
  		services: {
  			initializeSession: async () => {
  				const sessionId = crypto.randomUUID();
  				const session: ChatSession = {
  					id: sessionId,
  					createdAt: new Date(),
  					model: 'gemma3-legal',
  					metadata: {
  						userAgent: navigator.userAgent,
  						context: 'legal-ai-chat'
  					}
  				};
  				// Initialize session in database
  				try {
  					await fetch('/api/chat/session', {
  						method: 'POST',
  						headers: { 'Content-Type': 'application/json' },
  						body: JSON.stringify(session)
  					});
  				} catch (error) {
  					console.warn('Failed to save session:', error);
  				}
  				return session;
  			},
  			sendMessageToOllama: async ({ context, event }) => {
  				const userMessage: ChatMessage = {
  					id: crypto.randomUUID(),
  					content: event.message,
  					role: 'user',
  					timestamp: new Date(),
  					sessionId: context.session?.id
  				};

  				// Direct Ollama API call with streaming disabled for now
  				const response = await fetch('http://localhost:11434/api/generate', {
  					method: 'POST',
  					headers: { 'Content-Type': 'application/json' },
  					body: JSON.stringify({
  						model: context.model,
  						prompt: event.message,
  						stream: false,
  						options: {
  							temperature: 0.7,
  							max_tokens: 1000,
  							top_p: 0.9
  						},
  						system: "You are a helpful legal AI assistant. Provide accurate, professional responses about legal matters. Always include appropriate disclaimers that your advice should not replace professional legal counsel."
  					})
  				});

  				if (!response.ok) {
  					throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  				}

  				const data = await response.json();
  				const aiResponse: ChatMessage = {
  					id: crypto.randomUUID(),
  					content: data.response || 'Sorry, I could not generate a response.',
  					role: 'assistant',
  					timestamp: new Date(),
  					sessionId: context.session?.id,
  					metadata: {
  						model: context.model,
  						confidence: data.confidence || 0.8,
  						totalDuration: data.total_duration,
  						loadDuration: data.load_duration,
  						promptEvalCount: data.prompt_eval_count,
  						evalCount: data.eval_count
  					}
  				};

  				return {
  					userMessage,
  					aiResponse,
  					confidence: data.confidence || 0.8
  				};
  			}
  		}
  	});

  	const { state, send } = useMachine(enhancedChatMachine);
  let messageInput = $state('');
  let chatContainer = $state<HTMLDivElement;

  	// Available models
  	const models >([
  		{ value: 'gemma3-legal', label: 'Gemma3 Legal', description: 'Legal-specialized model' },
  		{ value: 'gemma3:latest', label: 'Gemma3 General', description: 'General purpose model' },
  		{ value: 'gemma2:2b', label: 'Gemma2 2B', description: 'Fast, lightweight model' }
const { state, send } = useMachine(enhancedChatMachine);
  		if (event.key === 'Enter' && !event.shiftKey) {
  			event.preventDefault();
  			handleSend();
  		}
  	}

  	function scrollToBottom() {
  		if (chatContainer) {
  			setTimeout(() => {
  				chatContainer.scrollTop = chatContainer.scrollHeight;
  			}, 50);
  		}
  	}

  	function formatTime(date: Date): string {
  		return new Intl.DateTimeFormat('en-US', {
  			hour: '2-digit',
  			minute: '2-digit',
  			second: '2-digit'
  		}).format(date);
  	}

  	onMount(() => {
  		send({ type: 'CONNECT' });
  	});

  	// Auto-scroll when messages update
  	// TODO: Convert to $derived: if ($state.context.messages.length > 0) {
  		scrollToBottom()
  	}
</script>

<div class="enhanced-chat-container flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
	<!-- Header with model selector -->
	<div class="chat-header flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
		<div class="flex items-center space-x-3">
			<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
			<h2 class="text-xl font-semibold text-gray-800">Legal AI Assistant</h2>
			{#if $state.context.confidence > 0}
				<span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">Confidence: {Math.round($state.context.confidence * 100)}%</span>
			{/if}
		</div>

		<div class="flex items-center space-x-2">
	// Auto-scroll when messages update
	$: if ($state.context.messages.length > 0) {
		tick().then(() => scrollToBottom());
	}
				change={(e) => send({ type: 'SET_MODEL', model: e.target.value })}
				class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
				{#each models as model}
					<option value={model.value}>{model.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Messages Area -->
	<div
		class="messages-container flex-1 min-h-96 max-h-96 overflow-y-auto p-4 bg-white rounded-lg border shadow-sm"
		bind:this={chatContainer}
	>
			<select
				id="model-select"
				value={$state.context.model}
				on:change={(e) => send({ type: 'SET_MODEL', model: (e.currentTarget as HTMLSelectElement).value })}
				class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to Legal AI</h3>
				<p class="text-gray-500">Ask me about legal documents, contracts, or any legal questions you have.</p>
			</div>
		{:else}
			{#each $state.context.messages as message}
				<div class={cn(
					"message-item mb-4 flex",
					message.role === 'user' ? 'justify-end' : 'justify-start'
				)}>
					<div class={cn(
						"message-bubble max-w-[70%] rounded-lg px-4 py-3 shadow-sm",
						message.role === 'user'
							? 'bg-blue-600 text-white rounded-br-sm'
							: 'bg-gray-100 text-gray-900 rounded-bl-sm border'
					)}>
						<div class="message-content">
							<p class="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
						</div>
						<div class={cn(
							"message-meta mt-2 flex items-center justify-between text-xs",
							message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
						)}>
							<span class="timestamp">{formatTime(message.timestamp)}</span>
							{#if message.metadata?.model}
								<span class="model-badge">
									{models.find(m => m.value === message.metadata?.model)?.label || message.metadata.model}
								</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}

		<!-- Loading indicator -->
		{#if $state.matches('sending')}
			<div class="loading-message flex justify-start mb-4">
				<div class="message-bubble max-w-[70%] rounded-lg px-4 py-3 bg-gray-100 border rounded-bl-sm">
					<div class="flex items-center space-x-2">
						<div class="typing-indicator flex space-x-1">
							<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
							<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
							<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
						</div>
						<span class="text-sm text-gray-600">AI is thinking...</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Error Display -->
	{#if $state.matches('error') && $state.context.error}
		<div class="error-container p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span class="text-sm text-red-700">{$state.context.error}</span>
				</div>
				<div class="flex space-x-2">
					<Button
						class="bits-btn text-red-700 border-red-300 hover:bg-red-50"
						size="sm"
						variant="outline"
						onclick={() => send({ type: 'RETRY' })}
					>
						Retry
					</Button>
					<Button
						class="bits-btn text-red-700 hover:bg-red-50"
						size="sm"
						variant="ghost"
						onclick={() => send({ type: 'CLEAR_ERROR' })}
					>
						Dismiss
					</Button>
				</div>
			</div>
					<Button
						class="bits-btn text-red-700 border-red-300 hover:bg-red-50"
						size="sm"
						variant="outline"
						on:click={() => send({ type: 'RETRY' })}
					>
						Retry
					</Button>
					<Button
						class="bits-btn text-red-700 hover:bg-red-50"
						size="sm"
						variant="ghost"
						on:click={() => send({ type: 'CLEAR_ERROR' })}
					>
						Dismiss
					</Button>
			<div class="flex flex-col justify-end">
				<Button
					onclick={handleSend}
					disabled={!messageInput.trim() || $state.matches('sending')}
					class={cn(
						"px-6 py-3 rounded-lg font-medium transition-colors",
						messageInput.trim() && !$state.matches('sending')
							? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
							: "bg-gray-300 text-gray-500 cursor-not-allowed"
				<textarea
					bind:value={messageInput}
					on:keydown={handleKeyPress}
					placeholder="Ask me about legal documents, contracts, or any legal questions..."
					disabled={$state.matches('sending')}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
					rows="3"
				></textarea>
					{:else}
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<Button
					on:click={handleSend}
					disabled={!messageInput.trim() || $state.matches('sending')}
					class={cn(
						"px-6 py-3 rounded-lg font-medium transition-colors",
						messageInput.trim() && !$state.matches('sending')
							? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
							: "bg-gray-300 text-gray-500 cursor-not-allowed"
					)}
				>
			<span>Press Enter to send, Shift+Enter for new line</span>
			<span class="flex items-center space-x-1">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				<span>Connected to {$state.context.model}</span>
			</span>
		</div>
	</div>
</div>

<style>
	.typing-indicator div:nth-child(1) {
		animation-delay: 0s;
	}
	.typing-indicator div:nth-child(2) {
		animation-delay: 0.1s;
	}
	.typing-indicator div:nth-child(3) {
		animation-delay: 0.2s;
	}

	/* Custom scrollbar */
	.messages-container::-webkit-scrollbar {
		width: 6px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 3px;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 3px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>


