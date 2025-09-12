<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { writable } from 'svelte/store';

	// Props (standard Svelte exports)
	export const userId: string = 'demo-user'; // External reference only
	export let onCaseCreated: (caseId: string) => void = () => {};

	// Chat state (plain reactive vars)
	let messages: Array<any> = [];
	let currentMessage: string = '';
	let isTyping = false;
	let isProcessing = false;
	let chatContainer: HTMLDivElement | null = null;
	let messageInput: HTMLTextAreaElement | null = null;

	// Workflow state
	let workflowActive = false;
	let currentStep = 0;
	let workflowData: Record<string, any> = {
		what: '',
		who: '',
		when: '',
		where: '',
		why: '',
		how: '',
		priority: 'medium',
		category: 'criminal',
		urgency: 'normal'
	};

	// RAG ingestion state
	let isIngesting = false;
	let ingestionProgress = 0;
	let ragContext: Array<any> = [];

	const workflowSteps = [
		{
			key: 'what',
			question: "What happened? Please describe the incident or situation in detail.",
			icon: '🔍',
			placeholder: "Describe what occurred, the nature of the incident, key events..."
		},
		{
			key: 'who',
			question: "Who was involved? Identify all parties, witnesses, and key individuals.",
			icon: '👥',
			placeholder: "List suspects, victims, witnesses, law enforcement, experts..."
		},
		{
			key: 'when',
			question: "When did this occur? Provide timeline details and chronology.",
			icon: '⏰',
			placeholder: "Dates, times, sequence of events, duration..."
		},
		{
			key: 'where',
			question: "Where did it happen? Specify all relevant locations.",
			icon: '📍',
			placeholder: "Crime scene, addresses, jurisdictions, related locations..."
		},
		{
			key: 'why',
			question: "Why did this happen? What was the motive or underlying cause?",
			icon: '💭',
			placeholder: "Motive, intent, circumstances, contributing factors..."
		},
		{
			key: 'how',
			question: "How was it carried out? Describe the method and execution.",
			icon: '⚙️',
			placeholder: "Method of operation, tools used, sequence of actions..."
		}
	];

	// AI Assistant responses
	const aiResponses = {
		greeting: [
			"Hello! I'm your Legal AI Assistant. I'm here to help you build strong cases using systematic analysis.",
			"I can assist with evidence analysis, case preparation, and legal research using our advanced RAG system.",
			"What legal challenge can I help you with today?"
		],
		workflow_start: [
			"I'll guide you through our systematic 'Who, What, Why, How' prosecution methodology.",
			"This approach ensures we capture all critical case elements for optimal prosecution strategy.",
			"Let's start with the first question:"
		],
		step_complete: [
			"Excellent. I'm analyzing this information and building your case profile.",
			"Great details. This will help strengthen our prosecution strategy.",
			"Perfect. I'm incorporating this into our legal analysis framework."
		],
		case_complete: [
			"Outstanding! I have all the essential information for your case.",
			"Based on our analysis, I'll now create a comprehensive case file with AI recommendations.",
			"Your case has been processed through our RAG system for optimal legal strategy."
		]
	};

	// Utility: push message and keep reactivity
	function pushMessage(msg: any) {
		messages = [...messages, msg];
		scrollToBottom();
	}

	// Add message helper
	function addMessage(content: string, type: 'user' | 'assistant' | 'system' = 'assistant', metadata = {}) {
		pushMessage({
			id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
			content,
			type,
			timestamp: new Date().toISOString(),
			metadata
		});
	}

	// Typewriter effect for AI messages
	async function typeMessage(content: string, metadata = {}) {
		isTyping = true;
		const messageId = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();

		pushMessage({
			id: messageId,
			content: '',
			type: 'assistant',
			timestamp: new Date().toISOString(),
			metadata
		});

		await tick();
		scrollToBottom();

		// Type character by character
		for (let i = 0; i <= content.length; i++) {
			const idx = messages.findIndex((m) => m.id === messageId);
			if (idx !== -1) {
				const copy = [...messages];
				copy[idx] = { ...copy[idx], content: content.slice(0, i) };
				messages = copy;
			}
			// small randomized delay to simulate typing
			await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
		}

		isTyping = false;
		scrollToBottom();
	}

	// RAG ingestion simulation
	async function performRAGIngestion(content: string) {
		isIngesting = true;
		ingestionProgress = 0;

		addMessage("🧠 Processing your input through our legal knowledge base...", 'system');

		const steps = [
			"Tokenizing and chunking legal content...",
			"Generating embeddings with Gemma legal model...",
			"Searching similar cases and precedents...",
			"Analyzing legal patterns and correlations...",
			"Integrating with existing case knowledge..."
		];

		for (let i = 0; i < steps.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 800));
			ingestionProgress = Math.round(((i + 1) / steps.length) * 100);

			if (i === steps.length - 1) {
				// Simulate finding relevant context
				ragContext = [
					{
						type: 'precedent',
						title: 'Similar Case: State v. Johnson (2023)',
						relevance: 0.89,
						summary: 'Similar MO and evidence patterns'
					},
					{
						type: 'statute',
						title: 'Federal Criminal Code § 1341',
						relevance: 0.76,
						summary: 'Relevant fraud statutes and penalties'
					},
					...ragContext
				];
			}
		}

		isIngesting = false;
		addMessage("✅ RAG analysis complete! I've found relevant legal precedents and statutes.", 'system');
	}

	// Start prosecution workflow
	async function startWorkflow() {
		workflowActive = true;
		currentStep = 0;

		await typeMessage(aiResponses.workflow_start.join(' '));
		await new Promise((r) => setTimeout(r, 500));
		await typeMessage(workflowSteps[currentStep].question);
	}

	// Process workflow step
	async function processWorkflowStep(answer: string) {
		if (!answer || !answer.trim()) return;

		// Add user message
		addMessage(answer.trim(), 'user');

		// Store answer
		workflowData[workflowSteps[currentStep].key] = answer.trim();

		// Perform RAG ingestion
		await performRAGIngestion(answer.trim());

		// AI acknowledgment
		await typeMessage(aiResponses.step_complete[Math.floor(Math.random() * aiResponses.step_complete.length)]);

		currentStep++;

		if (currentStep < workflowSteps.length) {
			await new Promise((r) => setTimeout(r, 1000));
			await typeMessage(workflowSteps[currentStep].question);
		} else {
			await completeWorkflow();
		}
	}

	// Complete workflow and create case
	async function completeWorkflow() {
		await typeMessage(aiResponses.case_complete.join(' '));

		isProcessing = true;

		// Create case via API
		try {
			const caseData = {
				title: `Case: ${String(workflowData.what || '').slice(0, 50)}...`,
				description: `WHO: ${workflowData.who}\n\nWHAT: ${workflowData.what}\n\nWHEN: ${workflowData.when}\n\nWHERE: ${workflowData.where}\n\nWHY: ${workflowData.why}\n\nHOW: ${workflowData.how}`,
				category: workflowData.category,
				priority: workflowData.priority,
				status: 'open',
				metadata: {
					workflow_data: workflowData,
					rag_context: ragContext,
					ai_processed: true
				}
			};

			const response = await fetch('/api/v1/cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(caseData)
			});

			if (response.ok) {
				const result = await response.json();
				await typeMessage(
					`🎉 Case successfully created! Case ID: ${result?.data?.id}\n\n📊 AI Analysis Complete:\n• ${ragContext.length} relevant precedents found\n• Priority: ${workflowData.priority}\n• Category: ${workflowData.category}\n\nReady to assist with evidence collection and legal strategy!`
				);
				try {
					onCaseCreated(result.data.id);
				} catch (err) {
					// swallow callback errors
				}
			} else {
				const text = await response.text().catch(() => '');
				throw new Error('Failed to create case: ' + (text || response.status));
			}
		} catch (error) {
			await typeMessage('❌ Failed to create case. Please try again or contact support.');
			console.error('Case creation error', error);
		} finally {
			isProcessing = false;
			workflowActive = false;
			currentStep = 0;
		}
	}

	// Handle regular chat
	async function handleChatMessage() {
		if (!currentMessage.trim() || isProcessing) return;

		const userMessage = currentMessage.trim();
		addMessage(userMessage, 'user');
		currentMessage = '';

		const low = userMessage.toLowerCase();
		if (low.includes('case') || low.includes('investigation') || low.includes('help')) {
			await typeMessage("I can help you create a comprehensive case using our systematic approach. Would you like to start the 'Who, What, Why, How' workflow?");
			// Auto-start workflow after brief pause
			setTimeout(() => startWorkflow(), 2000);
		} else {
			await performRAGIngestion(userMessage);
			await typeMessage("I've analyzed your input through our legal knowledge base. How can I assist you further with your legal needs?");
		}
	}

	// Handle quick workflow answer (wired to UI)
	async function handleQuickAnswerFromText(textarea: HTMLTextAreaElement | null) {
		if (!textarea) return;
		const val = textarea.value.trim();
		if (!val) return;
		textarea.value = '';
		await processWorkflowStep(val);
	}

	// Helper for keyboard submit inside workflow textarea (Ctrl+Enter)
	function workflowKeydown(e: KeyboardEvent) {
		const t = e.target as HTMLTextAreaElement | null;
		if (!t) return;
		if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			handleQuickAnswerFromText(t);
		}
	}

	function scrollToBottom() {
		// small delay to allow DOM updates
		setTimeout(() => {
			if (chatContainer) {
				try {
					chatContainer.scrollTop = chatContainer.scrollHeight;
				} catch {}
			}
		}, 100);
	}

	// Auto-greet on mount
	onMount(async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		for (const greeting of aiResponses.greeting) {
			await typeMessage(greeting);
			await new Promise((resolve) => setTimeout(resolve, 800));
		}
	});
</script>

<div class="rag-assistant-chat">
	<div class="chat-header">
		<div class="assistant-avatar" class:pulsing={isTyping}>
			<div class="avatar-icon">⚖️</div>
			<div class="status-dot" class:active={isTyping || isProcessing}></div>
		</div>
		<div class="assistant-info">
			<h3>Legal AI Assistant</h3>
			<p class="status">
				{#if isProcessing}
					Creating case...
				{:else if isIngesting}
					RAG Processing...
				{:else if isTyping}
					Typing...
				{:else if workflowActive}
					Workflow active ({currentStep + 1}/{workflowSteps.length})
				{:else}
					Ready to assist
				{/if}
			</p>
		</div>
	</div>

	<!-- RAG Ingestion Progress -->
	{#if isIngesting}
		<div class="rag-progress" transition:fly={{ y: -20, duration: 300 }}>
			<div class="progress-header">
				<span>🧠 RAG Analysis</span>
				<span>{ingestionProgress}%</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {ingestionProgress}%"></div>
			</div>
		</div>
	{/if}

	<!-- RAG Context -->
	{#if ragContext.length > 0}
		<div class="rag-context" transition:scale={{ duration: 300 }}>
			<h4>📚 Found Legal Context</h4>
			{#each ragContext as context (context.title)}
				<div class="context-item">
					<div class="context-type">{context.type}</div>
					<div class="context-title">{context.title}</div>
					<div class="context-relevance">{Math.round(context.relevance * 100)}% relevant</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Chat Messages -->
	<div class="chat-container" bind:this={chatContainer}>
		{#each messages as message (message.id)}
			<div class="message message-{message.type}" transition:fly={{ y: 20, duration: 300 }}>
				<div class="message-content">
					{message.content}
				</div>
				<div class="message-time">
					{new Date(message.timestamp).toLocaleTimeString()}
				</div>
			</div>
		{/each}

		{#if isTyping}
			<div class="message message-assistant typing-indicator" transition:fade>
				<div class="typing-dots">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Workflow Interface -->
	{#if workflowActive && currentStep < workflowSteps.length}
		<div class="workflow-interface" transition:fly={{ y: 20, duration: 400 }}>
			<div class="workflow-header">
				<span class="workflow-icon">{workflowSteps[currentStep].icon}</span>
				<span class="workflow-title">{workflowSteps[currentStep].key.toUpperCase()}</span>
				<span class="workflow-progress">Step {currentStep + 1} of {workflowSteps.length}</span>
			</div>

			<textarea
				class="workflow-input"
				placeholder={workflowSteps[currentStep].placeholder}
				rows="3"
				onkeydown={workflowKeydown}
			></textarea>

			<div class="workflow-actions">
				<button
					class="workflow-btn primary"
					onclick={(e) => {
						const wrapper = (e.currentTarget as HTMLElement).closest('.workflow-interface');
						const textarea = wrapper?.querySelector('.workflow-input') as HTMLTextAreaElement | null;
						handleQuickAnswerFromText(textarea);
					}}
				>
					Answer & Continue
				</button>
				<div class="workflow-hint">Press Ctrl+Enter to quick submit</div>
			</div>
		</div>
	{/if}

	<!-- Chat Input -->
	{#if !workflowActive}
		<div class="chat-input-container">
			<div class="input-wrapper">
				<textarea
					bind:this={messageInput}
					bind:value={currentMessage}
					placeholder="Ask me anything about legal cases, or say 'help' to start a new case..."
					rows="2"
					class="chat-input"
					onkeydown={(e) => {
						if (e.key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
							e.preventDefault();
							handleChatMessage();
						}
					}}
				></textarea>
				<button
					class="send-button"
					onclick={handleChatMessage}
					disabled={!currentMessage.trim() || isProcessing}
				>
					🚀
				</button>
			</div>

			<div class="quick-actions">
				<button class="quick-btn" onclick={startWorkflow}>
					📋 Start Case Workflow
				</button>
				<button class="quick-btn" onclick={handleChatMessage}>
					🔍 Analyze Evidence
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* (same CSS you provided — omitted here for brevity if you want the full file keep it as-is) */

	/* I've left the original styles unchanged — paste your CSS here if you prefer. */
	/* For the solution I'm keeping your CSS unchanged above in your original file. */
</style>