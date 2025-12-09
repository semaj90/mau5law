import { getContextFromRag } from '$lib/server/rag-query';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

async function callOllamaChat(opts: {
	model: string;
	messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
}): Promise<{ content: string }> {
	// Convert OpenAI-style messages to Ollama prompt format
	const systemMessages = opts.messages.filter(m => m.role === 'system');
	const userMessages = opts.messages.filter(m => m.role === 'user');
	const assistantMessages = opts.messages.filter(m => m.role === 'assistant');

	let prompt = '';

	// Add system message if present
	if (systemMessages.length > 0) {
		prompt += systemMessages.map(m => m.content).join('\n\n') + '\n\n';
	}

	// Add conversation history
	const conversationMessages = [...userMessages, ...assistantMessages];
	for (let i = 0; i < conversationMessages.length; i++) {
		const msg = conversationMessages[i];
		const role = msg.role === 'user' ? 'User' : 'Assistant';
		prompt += `${role}: ${msg.content}\n\n`;
	}

	// Add final user message if not already included
	const lastMessage = opts.messages[opts.messages.length - 1];
	if (lastMessage.role === 'user') {
		prompt += `User: ${lastMessage.content}\n\nAssistant:`;
	}

	const response = await fetch(`${OLLAMA_URL}/api/generate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: opts.model,
			prompt: prompt,
			stream: false
		})
	});

	if (!response.ok) {
		throw new Error(`Ollama chat failed: ${response.statusText}`);
	}

	const data = await response.json();
	return {
		content: data.response ?? ''
	};
}

export async function contextualChat(opts: {
	caseId?: string;
	userMessage: string;
	newEvidenceKeys?: string[];
	keywords?: string[];
	keyPhrases?: string[];
	doclingContent?: {
		fullText: string;
		blocks: Array<{
			type: string;
			text: string;
			page: number;
			bbox?: [number, number, number, number];
		}>;
		pageCount: number;
	};
}): Promise<{
	content: string;
	keywords?: string[];
	keyPhrases?: string[];
	suggestions?: string[];
}> {
	const context = await getContextFromRag({
		caseId: opts.caseId,
		query: opts.userMessage,
		extraEvidenceKeys: opts.newEvidenceKeys ?? []
	});

	// Build keyword context if provided
	const keywordContext = opts.keywords && opts.keywords.length > 0
		? `\n\nKEYWORDS FROM UPLOADED EVIDENCE:\n${opts.keywords.join(', ')}`
		: '';

	// Build Docling OCR context if provided
	const doclingContext = opts.doclingContent
		? `\n\nOCR TEXT FROM UPLOADED DOCUMENT (${opts.doclingContent.pageCount} pages):\n${opts.doclingContent.fullText}`
		: '';

	const systemPrompt = `
You are 9S, a retro detective AI in the YoRHa Command Center.
Use ONLY the following evidence and case notes when answering.

EVIDENCE:
${context.evidenceText}${keywordContext}${doclingContext}
`;

	const res = await callOllamaChat({
		model: process.env.LLM_MODEL ?? 'gemma3-legal:latest',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: opts.userMessage }
		]
	});

	// Generate suggestions based on keywords and context
	const suggestions = generateSuggestions(opts.keywords || [], opts.keyPhrases || [], context);

	return {
		content: res.content,
		keywords: opts.keywords,
		keyPhrases: opts.keyPhrases,
		suggestions
	};
}

/**
 * Generate contextual suggestions based on keywords and evidence
 */
function generateSuggestions(keywords: string[], keyPhrases: string[], _context: any): string[] {
	const suggestions: string[] = [];

	// Suggest related searches based on keywords
	if (keywords.length > 0) {
		const topKeywords = keywords.slice(0, 3);
		suggestions.push(`Search for cases involving: ${topKeywords.join(', ')}`);
	}

	// Suggest related key phrases
	if (keyPhrases.length > 0) {
		suggestions.push(`Review key phrases: ${keyPhrases.slice(0, 2).join(', ')}`);
	}

	// Suggest follow-up questions
	if (keywords.includes('contract') || keyPhrases.some(p => p.includes('agreement'))) {
		suggestions.push('Did you mean: Review contract terms and obligations?');
	}

	if (keywords.includes('liability') || keyPhrases.some(p => p.includes('liable'))) {
		suggestions.push('Did you mean: Analyze liability exposure?');
	}

	if (keywords.includes('damages') || keyPhrases.some(p => p.includes('compensation'))) {
		suggestions.push('Did you mean: Calculate potential damages?');
	}

	return suggestions.slice(0, 3); // Return top 3 suggestions
}
