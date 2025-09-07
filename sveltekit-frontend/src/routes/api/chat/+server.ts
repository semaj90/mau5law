// SvelteKit HTTP Streaming Chat Proxy for CUDA GPU Server Integration
// Bridges frontend to CUDA server with PostgreSQL persistence and vector embeddings
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/database';
import { chatSessions, chatMessages, type NewChatSession, type NewChatMessage } from '$lib/db/chat-schema';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '$lib/utils/id-generator';

const CUDA_SERVER_URL = 'http://localhost:8085';
const ENHANCED_GRPO_ENDPOINT = '/api/ai/enhanced-grpo';

interface ChatRequest {
	messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
	sessionId?: string;
	model?: string;
	stream?: boolean;
}

interface CudaStreamResponse {
	success: boolean;
	response: string;
	confidence: number;
	tokensPerSecond: number;
	vectorSimilarity?: number;
	grpoScore?: number;
	reasoning?: string;
	recommendations?: string[];
}

// GET: Retrieve chat session messages
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const sessionId = url.searchParams.get('sessionId');
		
		if (!sessionId) {
			return json({ error: 'Session ID required' }, { status: 400 });
		}

		// Get chat session
		const session = await db.query.chatSessions.findFirst({
			where: eq(chatSessions.id, sessionId)
		});

		if (!session) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		// Get messages for session
		const messages = await db.query.chatMessages.findMany({
			where: eq(chatMessages.sessionId, sessionId),
			orderBy: [desc(chatMessages.timestamp)]
		});

		return json({
			session,
			messages: messages.reverse() // Return in chronological order
		});

	} catch (error) {
		console.error('Error retrieving chat session:', error);
		return json({ error: 'Failed to retrieve chat session' }, { status: 500 });
	}
};

// POST: Handle streaming chat with CUDA server integration
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body: ChatRequest = await request.json();
		const { messages, sessionId, model = 'gemma3-legal', stream = true } = body;

		if (!messages || messages.length === 0) {
			return json({ error: 'Messages array required' }, { status: 400 });
		}

		const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
		if (!lastUserMessage) {
			return json({ error: 'No user message found' }, { status: 400 });
		}

		// Get or create chat session
		let currentSessionId = sessionId;
		if (!currentSessionId) {
			currentSessionId = generateId();
			const newSession: NewChatSession = {
				id: currentSessionId,
				model,
				metadata: { userAgent: request.headers.get('user-agent') },
				messageCount: 0
			};
			await db.insert(chatSessions).values(newSession);
		}

		// Store user message in database
		const userMessageId = generateId();
		const newUserMessage: NewChatMessage = {
			id: userMessageId,
			sessionId: currentSessionId,
			content: lastUserMessage.content,
			role: 'user',
			model
		};
		await db.insert(chatMessages).values(newUserMessage);

		// Update session message count
		await db.update(chatSessions)
			.set({ 
				messageCount: messages.length + 1,
				updatedAt: new Date()
			})
			.where(eq(chatSessions.id, currentSessionId));

		if (!stream) {
			// Non-streaming response
			const cudaResponse = await fetchCudaResponse(lastUserMessage.content, false);
			
			// Store AI response in database
			const aiMessageId = generateId();
			const newAiMessage: NewChatMessage = {
				id: aiMessageId,
				sessionId: currentSessionId,
				content: cudaResponse.response,
				role: 'assistant',
				model,
				confidence: cudaResponse.confidence,
				metadata: {
					tokensPerSecond: cudaResponse.tokensPerSecond,
					vectorSimilarity: cudaResponse.vectorSimilarity,
					grpoScore: cudaResponse.grpoScore,
					reasoning: cudaResponse.reasoning,
					recommendations: cudaResponse.recommendations
				}
			};
			await db.insert(chatMessages).values(newAiMessage);

			return json({
				sessionId: currentSessionId,
				message: cudaResponse.response,
				confidence: cudaResponse.confidence,
				tokensPerSecond: cudaResponse.tokensPerSecond,
				metadata: newAiMessage.metadata
			});
		}

		// HTTP Streaming response (preferred for AI chat)
		const readable = new ReadableStream({
			async start(controller) {
				try {
					let fullResponse = '';
					let confidence = 0;
					let tokensPerSecond = 0;
					let metadata: any = {};
					let aiMessageId = generateId();

					// Send initial session info
					const sessionInfo = {
						type: 'session',
						sessionId: currentSessionId,
						model,
						timestamp: new Date().toISOString()
					};
					controller.enqueue(`data: ${JSON.stringify(sessionInfo)}\n\n`);

					// Stream from CUDA server
					const response = await fetch(`${CUDA_SERVER_URL}${ENHANCED_GRPO_ENDPOINT}`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'text/event-stream'
						},
						body: JSON.stringify({
							query: lastUserMessage.content,
							sessionId: currentSessionId,
							includeReasoning: true,
							includeRecommendations: true,
							stream: true
						})
					});

					if (!response.ok) {
						throw new Error(`CUDA server error: ${response.status}`);
					}

					const reader = response.body?.getReader();
					if (!reader) {
						throw new Error('No response body from CUDA server');
					}

					const decoder = new TextDecoder();
					let buffer = '';

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6);
								if (data === '[DONE]') {
									continue;
								}

								try {
									const parsed = JSON.parse(data);
									
									if (parsed.type === 'token') {
										fullResponse += parsed.content;
										// Forward token to client
										controller.enqueue(`data: ${data}\n\n`);
									} else if (parsed.type === 'metrics') {
										confidence = parsed.confidence || confidence;
										tokensPerSecond = parsed.tokensPerSecond || tokensPerSecond;
										metadata = {
											...metadata,
											vectorSimilarity: parsed.vectorSimilarity,
											grpoScore: parsed.grpoScore,
											reasoning: parsed.reasoning,
											recommendations: parsed.recommendations
										};
										// Forward metrics to client
										controller.enqueue(`data: ${data}\n\n`);
									} else if (parsed.type === 'complete') {
										metadata = {
											...metadata,
											...parsed.metadata
										};
									}
								} catch (parseError) {
									console.warn('Failed to parse streaming data:', data);
								}
							}
						}
					}

					// Store complete AI response in database
					if (fullResponse) {
						const newAiMessage: NewChatMessage = {
							id: aiMessageId,
							sessionId: currentSessionId,
							content: fullResponse,
							role: 'assistant',
							model,
							confidence,
							metadata: {
								tokensPerSecond,
								...metadata
							}
						};
						await db.insert(chatMessages).values(newAiMessage);

						// Update session message count
						await db.update(chatSessions)
							.set({ 
								messageCount: messages.length + 2, // User + AI message
								updatedAt: new Date()
							})
							.where(eq(chatSessions.id, currentSessionId));
					}

					// Send completion signal
					const completion = {
						type: 'complete',
						sessionId: currentSessionId,
						messageId: aiMessageId,
						fullResponse,
						confidence,
						tokensPerSecond,
						metadata
					};
					controller.enqueue(`data: ${JSON.stringify(completion)}\n\n`);
					controller.enqueue(`data: [DONE]\n\n`);

				} catch (error) {
					console.error('Streaming error:', error);
					const errorMessage = {
						type: 'error',
						error: error instanceof Error ? error.message : 'Unknown streaming error'
					};
					controller.enqueue(`data: ${JSON.stringify(errorMessage)}\n\n`);
				} finally {
					controller.close();
				}
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
			}
		});

	} catch (error) {
		console.error('Chat API error:', error);
		return json({ 
			error: 'Failed to process chat request',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// Helper function for non-streaming CUDA requests
async function fetchCudaResponse(query: string, stream: boolean): Promise<CudaStreamResponse> {
	const response = await fetch(`${CUDA_SERVER_URL}${ENHANCED_GRPO_ENDPOINT}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			query,
			includeReasoning: true,
			includeRecommendations: true,
			stream
		})
	});

	if (!response.ok) {
		throw new Error(`CUDA server error: ${response.status}`);
	}

	const data = await response.json();
	return {
		success: data.success || true,
		response: data.response || data.message || '',
		confidence: data.confidence || 0,
		tokensPerSecond: data.tokensPerSecond || data.tokens_per_second || 0,
		vectorSimilarity: data.vectorSimilarity,
		grpoScore: data.grpoScore,
		reasoning: data.reasoning,
		recommendations: data.recommendations
	};
}

// OPTIONS: CORS preflight
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};

// DELETE: Delete chat session
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const sessionId = url.searchParams.get('sessionId');
		
		if (!sessionId) {
			return json({ error: 'Session ID required' }, { status: 400 });
		}

		// Delete all messages in session
		await db.delete(chatMessages)
			.where(eq(chatMessages.sessionId, sessionId));

		// Delete session
		await db.delete(chatSessions)
			.where(eq(chatSessions.id, sessionId));

		return json({ success: true, sessionId });

	} catch (error) {
		console.error('Error deleting chat session:', error);
		return json({ error: 'Failed to delete chat session' }, { status: 500 });
	}
};
