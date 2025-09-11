<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { writable } from 'svelte/store';

	// Props - Svelte 5 runes (remove legacy export let usage)
	const { userId = 'demo-user', onCaseCreated = () => {} }: {
		userId?: string;
		onCaseCreated?: (caseId: string) => void;
	} = $props();

	// Chat state
	let messages = $state([]);
	let currentMessage = $state('');
	let isTyping = $state(false);
	let isProcessing = $state(false);
	let chatContainer = $state<HTMLDivElement>();
	let messageInput = $state<HTMLTextAreaElement>();

	// Workflow state
	let workflowActive = $state(false);
	let currentStep = $state(0);
	let workflowData = $state({
		what: '',
		who: '',
		when: '',
		where: '',
		why: '',
		how: '',
		priority: 'medium',
		category: 'criminal',
		urgency: 'normal'
	});

	// RAG ingestion state
	let isIngesting = $state(false);
	let ingestionProgress = $state(0);
	let ragContext = $state([]);

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

	// Message types
	function addMessage(content: string, type: 'user' | 'assistant' | 'system' = 'assistant', metadata = {}) {
		messages.push({
			id: crypto.randomUUID(),
			content,
			type,
			timestamp: new Date().toISOString(),
			metadata
		});
		scrollToBottom();
	}

	// Typewriter effect for AI messages
	async function typeMessage(content: string, metadata = {}) {
		isTyping = true;
		const messageId = crypto.randomUUID();

		messages.push({
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
			const messageIndex = messages.findIndex(m => m.id === messageId);
			if (messageIndex !== -1) {
				messages[messageIndex].content = content.slice(0, i);
				await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
			}
		}

		isTyping = false;
		scrollToBottom();
	}

	// RAG ingestion simulation
	async function performRAGIngestion(content: string) {
		isIngesting = true;
		ingestionProgress = 0;

		addMessage("🧠 Processing your input through our legal knowledge base...", 'system');

		// Simulate RAG processing steps
		const steps = [
			"Tokenizing and chunking legal content...",
			"Generating embeddings with Gemma legal model...",
			"Searching similar cases and precedents...",
			"Analyzing legal patterns and correlations...",
			"Integrating with existing case knowledge..."
		];

		for (let i = 0; i < steps.length; i++) {
			await new Promise(resolve => setTimeout(resolve, 800));
			ingestionProgress = ((i + 1) / steps.length) * 100;

			if (i === steps.length - 1) {
				// Simulate finding relevant context
				ragContext.push({
					type: 'precedent',
					title: 'Similar Case: State v. Johnson (2023)',
					relevance: 0.89,
					summary: 'Similar MO and evidence patterns'
				});
				ragContext.push({
					type: 'statute',
					title: 'Federal Criminal Code § 1341',
					relevance: 0.76,
					summary: 'Relevant fraud statutes and penalties'
				});
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
		await new Promise(resolve => setTimeout(resolve, 500));
		await typeMessage(workflowSteps[currentStep].question);
	}

	// Process workflow step
	async function processWorkflowStep(answer: string) {
		if (!answer.trim()) return;

		// Add user message
		addMessage(answer, 'user');

		// Store answer
		workflowData[workflowSteps[currentStep].key] = answer;

		// Perform RAG ingestion
		await performRAGIngestion(answer);

		// AI acknowledgment
		await typeMessage(aiResponses.step_complete[Math.floor(Math.random() * aiResponses.step_complete.length)]);

		currentStep++;

		if (currentStep < workflowSteps.length) {
			// Next question
			await new Promise(resolve => setTimeout(resolve, 1000));
			await typeMessage(workflowSteps[currentStep].question);
		} else {
			// Workflow complete
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
				title: `Case: ${workflowData.what.slice(0, 50)}...`,
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
				await typeMessage(`🎉 Case successfully created! Case ID: ${result.data.id}\n\n📊 AI Analysis Complete:\n• ${ragContext.length} relevant precedents found\n• Priority: ${workflowData.priority}\n• Category: ${workflowData.category}\n\nReady to assist with evidence collection and legal strategy!`);
				onCaseCreated(result.data.id);
			} else {
				throw new Error('Failed to create case');
			}
		} catch (error) {
			await typeMessage('❌ Failed to create case. Please try again or contact support.');
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

		// Check if user wants to start workflow
		if (userMessage.toLowerCase().includes('case') ||
			userMessage.toLowerCase().includes('investigation') ||
			userMessage.toLowerCase().includes('help')) {

			await typeMessage("I can help you create a comprehensive case using our systematic approach. Would you like to start the 'Who, What, Why, How' workflow?");

			// Auto-start workflow after brief pause
			setTimeout(() => {
				startWorkflow();
			}, 2000);
		} else {
			// Regular chat response
			await performRAGIngestion(userMessage);
			await typeMessage("I've analyzed your input through our legal knowledge base. How can I assist you further with your legal needs?");
		}
	}

	// Handle quick workflow answer
	async function handleQuickAnswer(answer: string) {
		await processWorkflowStep(answer);
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}

	// Auto-greet on mount
	onMount(async () => {
		await new Promise(resolve => setTimeout(resolve, 1000));
		for (const greeting of aiResponses.greeting) {
			await typeMessage(greeting);
			await new Promise(resolve => setTimeout(resolve, 800));
		}
	});
</script>

<div class="rag-assistant-chat">
	<div class="chat-header">
		<div class="assistant-avatar">
			<div class="avatar-icon" class:pulsing={isTyping}>⚖️</div>
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
					Workflow active ({currentStep + 1}/6)
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
				<span>{Math.round(ingestionProgress)}%</span>
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
			{#each ragContext as context}
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
			<div
				class="message message-{message.type}"
				transition:fly={{ y: 20, duration: 300 }}
			>
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
				<span class="workflow-progress">Step {currentStep + 1} of 6</span>
			</div>

			<textarea
				class="workflow-input"
				placeholder={workflowSteps[currentStep].placeholder}
				rows="3"
				onkeydown={(e) => {
					if (e.key === 'Enter' && e.ctrlKey) {
						handleQuickAnswer(e.target.value);
						e.target.value = '';
					}
				}}
			></textarea>

			<div class="workflow-actions">
				<button
					class="workflow-btn primary"
					onclick={(e) => {
						const textarea = e.target.closest('.workflow-interface').querySelector('.workflow-input');
						handleQuickAnswer(textarea.value);
						textarea.value = '';
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
						if (e.key === 'Enter' && !e.shiftKey) {
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
				<button class="quick-btn" onclick={() => handleChatMessage()}>
					🔍 Analyze Evidence
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.rag-assistant-chat {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border: 1px solid #3d4466;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(20px);
		height: 600px;
		display: flex;
		flex-direction: column;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px;
		border-bottom: 1px solid #3d4466;
		background: rgba(255, 255, 255, 0.05);
	}

	.assistant-avatar {
		position: relative;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.assistant-avatar.pulsing {
		animation: pulse 2s infinite;
	}

	.avatar-icon {
		font-size: 20px;
	}

	.status-dot {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #10b981;
		border: 2px solid #1a1a2e;
	}

	.status-dot.active {
		background: #f59e0b;
		animation: blink 1s infinite;
	}

	.assistant-info h3 {
		margin: 0;
		color: #e5e7eb;
		font-size: 14px;
		font-weight: 600;
	}

	.status {
		margin: 0;
		color: #9ca3af;
		font-size: 11px;
	}

	.rag-progress {
		padding: 12px 20px;
		border-bottom: 1px solid #3d4466;
		background: rgba(16, 185, 129, 0.1);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
		font-size: 12px;
		color: #10b981;
		font-weight: 600;
	}

	.progress-bar {
		height: 4px;
		background: rgba(16, 185, 129, 0.2);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #10b981, #059669);
		transition: width 0.3s ease;
	}

	.rag-context {
		padding: 12px 20px;
		border-bottom: 1px solid #3d4466;
		background: rgba(79, 70, 229, 0.1);
	}

	.rag-context h4 {
		margin: 0 0 8px 0;
		color: #818cf8;
		font-size: 12px;
		font-weight: 600;
	}

	.context-item {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
		font-size: 10px;
	}

	.context-type {
		background: #4f46e5;
		color: white;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.context-title {
		color: #e5e7eb;
		flex: 1;
	}

	.context-relevance {
		color: #10b981;
		font-weight: 600;
	}

	.chat-container {
		flex: 1;
		overflow-y: auto;
		padding: 16px 20px;
		scroll-behavior: smooth;
	}

	.message {
		margin-bottom: 16px;
		max-width: 80%;
	}

	.message-assistant {
		margin-right: auto;
	}

	.message-user {
		margin-left: auto;
		text-align: right;
	}

	.message-system {
		margin: 8px auto;
		text-align: center;
		max-width: 90%;
	}

	.message-content {
		padding: 12px 16px;
		border-radius: 12px;
		line-height: 1.5;
		font-size: 14px;
		white-space: pre-wrap;
	}

	.message-assistant .message-content {
		background: rgba(79, 70, 229, 0.2);
		color: #e5e7eb;
		border: 1px solid #4f46e5;
	}

	.message-user .message-content {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
	}

	.message-system .message-content {
		background: rgba(245, 158, 11, 0.2);
		color: #fbbf24;
		border: 1px solid #f59e0b;
		font-size: 12px;
		padding: 8px 12px;
	}

	.message-time {
		margin-top: 4px;
		font-size: 10px;
		color: #6b7280;
	}

	.typing-indicator .typing-dots {
		display: flex;
		gap: 4px;
		padding: 12px 16px;
	}

	.typing-dots span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #6b7280;
		animation: typing 1.4s infinite ease-in-out;
	}

	.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
	.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

	.workflow-interface {
		padding: 16px 20px;
		border-top: 1px solid #3d4466;
		background: rgba(16, 185, 129, 0.05);
	}

	.workflow-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.workflow-icon {
		font-size: 18px;
	}

	.workflow-title {
		font-weight: 700;
		color: #10b981;
		font-size: 14px;
	}

	.workflow-progress {
		margin-left: auto;
		font-size: 11px;
		color: #6b7280;
	}

	.workflow-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #3d4466;
		border-radius: 8px;
		padding: 12px;
		color: #e5e7eb;
		font-size: 14px;
		resize: vertical;
		margin-bottom: 12px;
	}

	.workflow-input:focus {
		outline: none;
		border-color: #10b981;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.workflow-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.workflow-btn {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.workflow-btn.primary {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
	}

	.workflow-btn.primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}

	.workflow-hint {
		font-size: 10px;
		color: #6b7280;
	}

	.chat-input-container {
		padding: 16px 20px;
		border-top: 1px solid #3d4466;
		background: rgba(0, 0, 0, 0.2);
	}

	.input-wrapper {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}

	.chat-input {
		flex: 1;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #3d4466;
		border-radius: 8px;
		padding: 10px 12px;
		color: #e5e7eb;
		font-size: 14px;
		resize: none;
	}

	.chat-input:focus {
		outline: none;
		border-color: #10b981;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.send-button {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 8px;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
	}

	.send-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}

	.send-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quick-actions {
		display: flex;
		gap: 8px;
	}

	.quick-btn {
		padding: 6px 12px;
		background: rgba(79, 70, 229, 0.2);
		border: 1px solid #4f46e5;
		border-radius: 16px;
		color: #818cf8;
		font-size: 11px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.quick-btn:hover {
		background: rgba(79, 70, 229, 0.3);
		transform: translateY(-1px);
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	@keyframes blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0; }
	}

	@keyframes typing {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}

	/* Responsive */
	@media (max-width: 768px) {
		.rag-assistant-chat {
			height: 500px;
		}

		.message {
			max-width: 95%;
		}

		.quick-actions {
			flex-direction: column;
		}
	}
</style>