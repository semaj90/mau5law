import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { ragSessions, ragMessages, userAiQueries } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'gemma3-legal:latest';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { message, sessionId } = body;

		if (!message) {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		// Get user from session or use test user
		const userId = locals.user?.id || 'test-user-id';
		const isTestMode = !locals.user;

		// Get or create RAG session
		let session;
		if (sessionId) {
			const sessions = await db
				.select()
				.from(ragSessions)
				.where(eq(ragSessions.sessionId, sessionId))
				.limit(1);
			session = sessions[0];
		}

		if (!session) {
			// Create new session
			const newSessionId = crypto.randomUUID();
			await db.insert(ragSessions).values({
				sessionId: newSessionId,
				userId: isTestMode ? null : userId,
				title: message.substring(0, 50),
				model: MODEL,
				isActive: true
			});
			session = { sessionId: newSessionId };
		}

		// Get message history for context
		const messageHistory = await db
			.select()
			.from(ragMessages)
			.where(eq(ragMessages.sessionId, session.sessionId))
			.orderBy(ragMessages.messageIndex);

		// Save user message to database
		const userMessageIndex = messageHistory.length;
		await db.insert(ragMessages).values({
			sessionId: session.sessionId,
			messageIndex: userMessageIndex,
			role: 'user',
			content: message,
			retrievedSources: [],
			sourceCount: 0,
			model: MODEL
		});

		// Build conversation context for Ollama
		const ollamaMessages = messageHistory.map(msg => ({
			role: msg.role,
			content: msg.content
		}));
		ollamaMessages.push({ role: 'user', content: message });

		// Stream response from Ollama
		const startTime = Date.now();
		const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: MODEL,
				messages: ollamaMessages,
				stream: true,
				options: {
					num_gpu: 30,
					temperature: 0.7
				}
			})
		});

		if (!ollamaResponse.ok) {
			throw new Error(`Ollama API error: ${ollamaResponse.status}`);
		}

		// Create SSE stream
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				let fullResponse = '';

				try {
					const reader = ollamaResponse.body?.getReader();
					if (!reader) throw new Error('No response body');

					// Send initial connection event
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'connection',
								sessionId: session.sessionId,
								isTestMode
							})}\n\n`
						)
					);

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = new TextDecoder().decode(value);
						const lines = chunk.split('\n').filter(line => line.trim());

						for (const line of lines) {
							try {
								const data = JSON.parse(line);

								if (data.message?.content) {
									const token = data.message.content;
									fullResponse += token;

									// Send token to client
									controller.enqueue(
										encoder.encode(
											`data: ${JSON.stringify({
												type: 'token',
												content: token,
												fullResponse
											})}\n\n`
										)
									);
								}

								if (data.done) {
									// Save assistant response to database
									const processingTime = Date.now() - startTime;
									const assistantMessageIndex = userMessageIndex + 1;

									await db.insert(ragMessages).values({
										sessionId: session.sessionId,
										messageIndex: assistantMessageIndex,
										role: 'assistant',
										content: fullResponse,
										retrievedSources: [],
										sourceCount: 0,
										processingTime,
										model: MODEL
									});

									// Log query for analytics
									if (!isTestMode) {
										await db.insert(userAiQueries).values({
											userId,
											query: message,
											response: fullResponse,
											model: MODEL,
											queryType: 'chat',
											tokensUsed: data.eval_count || 0,
											processingTime,
											contextUsed: ollamaMessages.map(m => m.content),
											isSuccessful: true
										});
									}

									// Send completion event
									controller.enqueue(
										encoder.encode(
											`data: ${JSON.stringify({
												type: 'complete',
												fullResponse,
												sessionId: session.sessionId,
												processingTime
											})}\n\n`
										)
									);
								}
							} catch (e) {
								console.warn('Failed to parse Ollama chunk:', line);
							}
						}
					}

					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (error) {
					console.error('Stream error:', error);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'error',
								error: error instanceof Error ? error.message : 'Stream error'
							})}\n\n`
						)
					);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Chat API error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
				isTestMode: !locals.user
			},
			{ status: 500 }
		);
	}
};
