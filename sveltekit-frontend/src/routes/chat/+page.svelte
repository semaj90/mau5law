<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { 
		Loader2, Send, MessageCircle, Bot, User, FileText, 
		Brain, Zap, Clock, Trash2, Copy, ThumbsUp, ThumbsDown,
		AlertCircle, CheckCircle, BookOpen, Gavel, Search
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
	
	interface Message {
		role: 'user' | 'assistant' | 'system';
		content: string;
		id: string;
		timestamp: Date;
		metadata?: {
			type?: 'analysis' | 'research' | 'legal_advice' | 'case_review';
			confidence?: number;
			sources?: string[];
			legalConcepts?: string[];
			citations?: string[];
			processingTime?: number;
		};
		reactions?: {
			helpful: boolean;
			accurate: boolean;
		};
	}

	interface ChatSession {
		id: string;
		title: string;
		messages: Message[];
		created: Date;
		updated: Date;
	}

	// State management with Svelte 5 runes
	let input = $state('');
	let messages = $state<Message[]>([]);
	let chatSessions = $state<ChatSession[]>([]);
	let currentSessionId = $state<string | null>(null);
	let busy = $state(false);
	let chatContainer = $state<HTMLElement>();
	let showSessions = $state(false);
	let showAdvancedOptions = $state(false);
	let analysisMode = $state<'general' | 'case_analysis' | 'legal_research' | 'document_review'>('general');
	let enableCitations = $state(true);
	let enableContextualSearch = $state(true);
	let processingStatus = $state<{
		stage: string;
		progress: number;
		message: string;
	} | null>(null);

	// Computed properties
	let currentSession = $derived(() => {
		if (!currentSessionId) return null;
		return chatSessions.find(s => s.id === currentSessionId) || null;
	});

	let suggestedQuestions = $derived(() => {
		const baseQuestions = [
			"What are the key elements of probable cause?",
			"How should chain of custody be documented?",
			"Explain Miranda rights requirements",
			"What constitutes admissible evidence?",
			"How to handle confidential informants?",
			"What are the Fourth Amendment protections?"
		];

		if (analysisMode === 'case_analysis') {
			return [
				"Analyze this case for potential prosecution strategies",
				"What are the strengths and weaknesses of this case?",
				"Identify key evidence gaps that need addressing",
				"What legal precedents are relevant here?"
			];
		} else if (analysisMode === 'legal_research') {
			return [
				"Find recent court decisions on this topic",
				"What are the federal vs state law differences?",
				"Research similar cases and their outcomes",
				"Analyze statutory interpretation issues"
			];
		}
		
		return baseQuestions;
	});

	onMount(() => {
		loadChatSessions();
		// Auto-create a session if none exist
		if (chatSessions.length === 0) {
			createNewSession();
		}
	});

	function loadChatSessions() {
		const saved = localStorage.getItem('legal-ai-chat-sessions');
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				chatSessions = parsed.map((s: any) => ({
					...s,
					created: new Date(s.created),
					updated: new Date(s.updated),
					messages: s.messages.map((m: any) => ({
						...m,
						timestamp: new Date(m.timestamp)
					}))
				}));
				
				// Load the most recent session
				if (chatSessions.length > 0) {
					const recent = chatSessions.sort((a, b) => b.updated.getTime() - a.updated.getTime())[0];
					loadSession(recent.id);
				}
			} catch (error) {
				console.warn('Failed to load chat sessions:', error);
				createNewSession();
			}
		}
	}

	function saveChatSessions() {
		localStorage.setItem('legal-ai-chat-sessions', JSON.stringify(chatSessions));
	}

	function createNewSession() {
		const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const newSession: ChatSession = {
			id: sessionId,
			title: `Legal Chat ${new Date().toLocaleDateString()}`,
			messages: [],
			created: new Date(),
			updated: new Date()
		};
		
		chatSessions = [...chatSessions, newSession];
		currentSessionId = sessionId;
		messages = [];
		saveChatSessions();
	}

	function loadSession(sessionId: string) {
		const session = chatSessions.find(s => s.id === sessionId);
		if (session) {
			currentSessionId = sessionId;
			messages = [...session.messages];
			scrollToBottom();
		}
	}

	function deleteSession(sessionId: string) {
		if (chatSessions.length <= 1) {
			toast.error("Cannot delete the last session");
			return;
		}
		
		chatSessions = chatSessions.filter(s => s.id !== sessionId);
		
		if (currentSessionId === sessionId) {
			// Switch to another session
			const remaining = chatSessions[0];
			if (remaining) {
				loadSession(remaining.id);
			} else {
				createNewSession();
			}
		}
		
		saveChatSessions();
		toast.success("Session deleted");
	}

	function updateCurrentSession() {
		if (!currentSessionId) return;
		
		const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
		if (sessionIndex !== -1) {
			chatSessions[sessionIndex] = {
				...chatSessions[sessionIndex],
				messages: [...messages],
				updated: new Date(),
				title: messages.length > 0 
					? messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : '')
					: `Legal Chat ${new Date().toLocaleDateString()}`
			};
			saveChatSessions();
		}
	}

	async function scrollToBottom() {
		await tick();
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	async function send(): Promise<void> {
		if (!input.trim() || busy) return;
		
		const content = input.trim();
		const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Add user message
		const userMessage: Message = { 
			role: 'user', 
			content, 
			id: messageId,
			timestamp: new Date()
		};
		
		messages = [...messages, userMessage];
		input = '';
		busy = true;
		
		// Show processing status
		processingStatus = {
			stage: 'Analyzing query',
			progress: 20,
			message: 'Understanding your legal question...'
		};
		
		await scrollToBottom();

		try {
			// Enhanced request with analysis mode and options
			const requestBody = {
				messages: messages.map(m => ({ role: m.role, content: m.content })),
				analysisMode,
				enableCitations,
				enableContextualSearch,
				sessionId: currentSessionId
			};

			processingStatus = {
				stage: 'Legal research',
				progress: 50,
				message: 'Searching legal databases...'
			};

			const res = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}

			processingStatus = {
				stage: 'Generating response',
				progress: 80,
				message: 'Crafting legal analysis...'
			};

			const data = await res.json();
			const responseText = data?.text || data?.content || (data?.error ? `Error: ${data.error}` : '(no response)');
			
			// Add assistant response with metadata
			const assistantMessage: Message = {
				role: 'assistant',
				content: responseText,
				id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				timestamp: new Date(),
				metadata: {
					type: data?.type || 'general',
					confidence: data?.confidence || 0.85,
					sources: data?.sources || [],
					legalConcepts: data?.legalConcepts || [],
					citations: data?.citations || [],
					processingTime: data?.processingTime || 0
				}
			};
			
			messages = [...messages, assistantMessage];
			updateCurrentSession();
			
		} catch (error: any) {
			const errorMessage: Message = {
				role: 'assistant',
				content: `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try rephrasing your question or check your connection.`,
				id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				timestamp: new Date(),
				metadata: {
					type: 'general',
					confidence: 0
				}
			};
			messages = [...messages, errorMessage];
			updateCurrentSession();
		} finally {
			busy = false;
			processingStatus = null;
			await scrollToBottom();
		}
	}

	function reactToMessage(messageId: string, reaction: 'helpful' | 'accurate', value: boolean) {
		const messageIndex = messages.findIndex(m => m.id === messageId);
		if (messageIndex !== -1) {
			if (!messages[messageIndex].reactions) {
				messages[messageIndex].reactions = { helpful: false, accurate: false };
			}
			messages[messageIndex].reactions![reaction] = value;
			messages = [...messages];
			updateCurrentSession();
			
			toast.success(value ? `Marked as ${reaction}` : `Removed ${reaction} rating`);
		}
	}

	function copyMessage(content: string) {
		navigator.clipboard.writeText(content);
		toast.success('Copied to clipboard');
	}

	function useSuggestedQuestion(question: string) {
		input = question;
	}

	function formatTimestamp(timestamp: Date): string {
		return new Date(timestamp).toLocaleTimeString(undefined, { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}

	function getAnalysisModeIcon(mode: string) {
		switch (mode) {
			case 'case_analysis': return Gavel;
			case 'legal_research': return BookOpen;
			case 'document_review': return FileText;
			default: return Brain;
		}
	}

	function getMessageTypeColor(type?: string) {
		switch (type) {
			case 'analysis': return 'bg-purple-100 text-purple-800';
			case 'research': return 'bg-blue-100 text-blue-800';
			case 'legal_advice': return 'bg-green-100 text-green-800';
			case 'case_review': return 'bg-orange-100 text-orange-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>Legal AI Chat - Advanced Legal Assistant</title>
	<meta name="description" content="Advanced AI-powered legal assistant for case analysis, research, and legal guidance" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
	<div class="max-w-7xl mx-auto px-4 py-6">
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-3">
						<div class="p-3 bg-yellow-600 rounded-lg">
							<MessageCircle class="w-8 h-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold text-yellow-400">Legal AI Assistant</h1>
							<p class="text-gray-400">Advanced legal analysis, research, and case review</p>
						</div>
					</div>
					
					<!-- Analysis Mode Selector -->
					<div class="hidden md:flex items-center gap-2">
						{#each [
							{ key: 'general', label: 'General', icon: Brain },
							{ key: 'case_analysis', label: 'Case Analysis', icon: Gavel },
							{ key: 'legal_research', label: 'Research', icon: BookOpen },
							{ key: 'document_review', label: 'Document Review', icon: FileText }
						] as mode}
							<button
								class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors {analysisMode === mode.key ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
								onclick={() => analysisMode = mode.key as any}
							>
								<svelte:component this={mode.icon} class="w-4 h-4" />
								{mode.label}
							</button>
						{/each}
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" on:click={() => showSessions = true}>
						<Clock class="h-4 w-4 mr-2" />
						Sessions ({chatSessions.length})
					</Button>
					<Button variant="outline" size="sm" on:click={() => showAdvancedOptions = true}>
						<Zap class="h-4 w-4 mr-2" />
						Options
					</Button>
					<Button variant="secondary" size="sm" on:click={createNewSession}>
						New Chat
					</Button>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<!-- Suggestions Sidebar -->
			<div class="lg:col-span-1 space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm font-semibold flex items-center gap-2">
							<Search class="h-4 w-4" />
							Suggested Questions
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each suggestedQuestions.slice(0, 4) as question}
								<button
									class="text-left text-sm p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors w-full text-gray-300"
									onclick={() => useSuggestedQuestion(question)}
								>
									{question}
								</button>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Current Mode Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm font-semibold flex items-center gap-2">
							<svelte:component this={getAnalysisModeIcon(analysisMode)} class="h-4 w-4" />
							Current Mode
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							<Badge variant="secondary">{analysisMode.replace('_', ' ')}</Badge>
							<p class="text-xs text-gray-400">
								{#if analysisMode === 'general'}
									General legal questions and guidance
								{:else if analysisMode === 'case_analysis'}
									Deep case analysis with prosecution strategies
								{:else if analysisMode === 'legal_research'}
									Legal research with citations and precedents
								{:else}
									Document review and analysis
								{/if}
							</p>
							<div class="flex items-center gap-2 text-xs">
								<CheckCircle class="h-3 w-3 text-green-400" />
								<span class="text-green-400">Citations: {enableCitations ? 'On' : 'Off'}</span>
							</div>
							<div class="flex items-center gap-2 text-xs">
								<CheckCircle class="h-3 w-3 text-blue-400" />
								<span class="text-blue-400">Context Search: {enableContextualSearch ? 'On' : 'Off'}</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Main Chat Area -->
			<div class="lg:col-span-3">
				<Card.Root class="h-[75vh] flex flex-col">
					<!-- Messages Area -->
					<div 
						bind:this={chatContainer}
						class="flex-1 overflow-y-auto p-6 space-y-6"
						role="log"
						aria-label="Chat messages"
						aria-live="polite"
					>
						{#if messages.length === 0}
							<div class="text-center text-gray-400 py-12">
								<Bot class="w-16 h-16 mx-auto mb-4 opacity-50" />
								<p class="text-xl font-medium mb-3">Legal AI Assistant Ready</p>
								<p class="text-sm mb-6">Ask me anything about legal procedures, case analysis, research, or document review.</p>
								
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
									{#each suggestedQuestions.slice(0, 4) as question}
										<button
											class="text-left text-sm p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300"
											onclick={() => useSuggestedQuestion(question)}
										>
											{question}
										</button>
									{/each}
								</div>
							</div>
						{:else}
							{#each messages as message (message.id)}
								<div class="flex gap-4 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
									{#if message.role === 'assistant'}
										<div class="flex-shrink-0">
											<div class="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
												<Bot class="w-6 h-6 text-white" />
											</div>
										</div>
									{/if}
									
									<div class="max-w-[80%] {message.role === 'user' ? 'order-first' : ''}">
										<div class="
											px-4 py-3 rounded-lg 
											{message.role === 'user' 
												? 'bg-blue-600 text-white' 
												: 'bg-gray-800 text-gray-100 border border-gray-700'
											}
										">
											<p class="whitespace-pre-wrap leading-relaxed">{message.content}</p>
											
											{#if message.metadata && message.role === 'assistant'}
												<div class="mt-3 pt-3 border-t border-gray-600 space-y-2">
													{#if message.metadata.confidence}
														<div class="flex items-center gap-2 text-xs">
															<Brain class="h-3 w-3" />
															<span>Confidence: {(message.metadata.confidence * 100).toFixed(1)}%</span>
														</div>
													{/if}
													
													{#if message.metadata.type}
														<Badge class={getMessageTypeColor(message.metadata.type)} size="sm">
															{message.metadata.type.replace('_', ' ')}
														</Badge>
													{/if}
													
													{#if message.metadata.legalConcepts && message.metadata.legalConcepts.length > 0}
														<div class="flex flex-wrap gap-1 mt-2">
															{#each message.metadata.legalConcepts.slice(0, 3) as concept}
																<Badge variant="outline" class="text-xs">{concept}</Badge>
															{/each}
														</div>
													{/if}
													
													{#if message.metadata.processingTime}
														<div class="text-xs text-gray-500">
															Processed in {message.metadata.processingTime}ms
														</div>
													{/if}
												</div>
											{/if}
										</div>
										
										<div class="mt-2 flex items-center gap-3 text-xs text-gray-500 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
											<span>{formatTimestamp(message.timestamp)}</span>
											
											{#if message.role === 'assistant'}
												<div class="flex items-center gap-1">
													<button
														class="hover:text-green-400 transition-colors"
														onclick={() => reactToMessage(message.id, 'helpful', !message.reactions?.helpful)}
														title="Mark as helpful"
													>
														<ThumbsUp class="h-3 w-3 {message.reactions?.helpful ? 'text-green-400' : ''}" />
													</button>
													<button
														class="hover:text-red-400 transition-colors"
														onclick={() => reactToMessage(message.id, 'accurate', !message.reactions?.accurate)}
														title="Mark as accurate"
													>
														<ThumbsDown class="h-3 w-3 {message.reactions?.accurate ? 'text-red-400' : ''}" />
													</button>
													<button
														class="hover:text-blue-400 transition-colors"
														onclick={() => copyMessage(message.content)}
														title="Copy message"
													>
														<Copy class="h-3 w-3" />
													</button>
												</div>
											{/if}
										</div>
									</div>
									
									{#if message.role === 'user'}
										<div class="flex-shrink-0">
											<div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
												<User class="w-6 h-6 text-white" />
											</div>
										</div>
									{/if}
								</div>
							{/each}
							
							<!-- Loading indicator -->
							{#if busy}
								<div class="flex gap-4">
									<div class="flex-shrink-0">
										<div class="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
											<Bot class="w-6 h-6 text-white" />
										</div>
									</div>
									<div class="bg-gray-800 px-4 py-3 rounded-lg border border-gray-700 max-w-sm">
										{#if processingStatus}
											<div class="space-y-2">
												<div class="flex items-center gap-2 text-yellow-400 text-sm font-medium">
													<Loader2 class="w-4 h-4 animate-spin" />
													{processingStatus.stage}
												</div>
												<Progress value={processingStatus.progress} class="h-1" />
												<p class="text-xs text-gray-400">{processingStatus.message}</p>
											</div>
										{:else}
											<div class="flex items-center gap-2 text-gray-400">
												<Loader2 class="w-4 h-4 animate-spin" />
												<span>AI is analyzing...</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/if}
					</div>

					<!-- Input Area -->
					<div class="border-t border-gray-700 p-6">
						<div class="flex gap-3 items-end">
							<div class="flex-1">
								<textarea
									bind:value={input}
									onkeydown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											send();
										}
									}}
									placeholder="Ask your legal question... (Enter to send, Shift+Enter for new line)"
									class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 resize-none"
									rows="2"
									disabled={busy}
									aria-label="Type your message"
								></textarea>
							</div>
							<Button
								on:click={send}
								disabled={busy || !input.trim()}
								size="lg"
								class="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
							>
								{#if busy}
									<Loader2 class="w-5 h-5 animate-spin" />
								{:else}
									<Send class="w-5 h-5" />
								{/if}
							</Button>
						</div>
						
						{#if input.length > 0}
							<div class="mt-2 text-xs text-gray-500 flex justify-between">
								<span>Character count: {input.length}</span>
								<span>Mode: {analysisMode.replace('_', ' ')}</span>
							</div>
						{/if}
					</div>
				</Card.Root>
			</div>
		</div>
	</div>
</div>

<!-- Sessions Dialog -->
<Dialog.Root bind:open={showSessions}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Chat Sessions</Dialog.Title>
			<Dialog.Description>Manage your chat sessions and conversation history.</Dialog.Description>
		</Dialog.Header>
		
		<div class="max-h-96 overflow-y-auto space-y-2">
			{#each chatSessions as session}
				<div class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
					<div class="flex-1">
						<h4 class="font-medium text-sm">{session.title}</h4>
						<p class="text-xs text-muted-foreground">
							{session.messages.length} messages • {session.updated.toLocaleDateString()}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant={currentSessionId === session.id ? 'default' : 'outline'}
							size="sm"
							on:click={() => { loadSession(session.id); showSessions = false; }}
						>
							{currentSessionId === session.id ? 'Current' : 'Load'}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							on:click={() => deleteSession(session.id)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
		
		<Dialog.Footer>
			<Button variant="outline" on:click={() => showSessions = false}>Close</Button>
			<Button on:click={() => { createNewSession(); showSessions = false; }}>New Session</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Advanced Options Dialog -->
<Dialog.Root bind:open={showAdvancedOptions}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Advanced Options</Dialog.Title>
			<Dialog.Description>Configure AI assistant settings and features.</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<label class="text-sm font-medium">Enable Legal Citations</label>
					<p class="text-xs text-muted-foreground">Include case law and statute references</p>
				</div>
				<input type="checkbox" bind:checked={enableCitations} class="rounded" />
			</div>
			
			<div class="flex items-center justify-between">
				<div>
					<label class="text-sm font-medium">Contextual Search</label>
					<p class="text-xs text-muted-foreground">Search related legal documents and cases</p>
				</div>
				<input type="checkbox" bind:checked={enableContextualSearch} class="rounded" />
			</div>
		</div>
		
		<Dialog.Footer>
			<Button variant="outline" on:click={() => showAdvancedOptions = false}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>