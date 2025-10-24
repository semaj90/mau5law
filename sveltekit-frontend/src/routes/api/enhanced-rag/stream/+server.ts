import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { enhancedRAGService } from '$lib/services/enhanced-rag-integration.js';
import { dev } from '$app/environment';

// Validate incoming request
const StreamQuerySchema = z.object({
	query: z.string().min(1).max(2000),
	options: z
		.object({
			maxResults: z.number().min(1).max(50).optional().default(10),
			includeGraph: z.boolean().optional().default(true),
			confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
		})
		.optional()
		.default({}),
});

// Minimal typed wrapper for the RAG service
type RagService = {
	processLegalQuery: (
		q: string,
		opts?: { maxResults?: number; includeGraph?: boolean; confidenceThreshold?: number }
	) => Promise<{
		response: string;
		confidence?: number;
		sources?: unknown[];
		mlClassification?: unknown;
		graphRelationships?: unknown;
		queryId?: string;
	}>;
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { query, options } = StreamQuerySchema.parse(body);

		if (dev) console.log(`🌊 Enhanced RAG Stream Query: "${query.substring(0, 100)}..."`);

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				// sendEvent is defined here so it's in scope for all sends within this start()
				const sendEvent = (payload: unknown) =>
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

				// initial event / handshake
				sendEvent({
					type: 'status',
					message: 'Processing query through Enhanced RAG pipeline',
					timestamp: new Date().toISOString(),
				});

				// small debounce so client can attach
				await new Promise((res) => setTimeout(res, 50));

				const startTime = Date.now();
				try {
					const ragService = enhancedRAGService as unknown as RagService;
					const ragResponse = await ragService.processLegalQuery(query, options);

					const processingTime = Date.now() - startTime;

					// response event
					sendEvent({
						type: 'response',
						response: ragResponse.response,
						confidence: ragResponse.confidence,
						sources: ragResponse.sources,
						mlClassification: ragResponse.mlClassification,
						graphRelationships: ragResponse.graphRelationships,
						processingTime,
						metadata: {
							timestamp: new Date().toISOString(),
							queryId: ragResponse.queryId,
							systemVersion: '2.0.0-enhanced-rag-stream',
						},
					});

					// completion event
					sendEvent({
						type: 'complete',
						message: 'Enhanced RAG processing complete',
						processingTime,
						timestamp: new Date().toISOString(),
					});

					controller.close();
				} catch (err: any) {
					console.error('Enhanced RAG Stream Error:', err);
					sendEvent({
						type: 'error',
						error: err?.message ?? String(err),
						timestamp: new Date().toISOString(),
					});
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (error: any) {
		console.error('Enhanced RAG Stream Setup Error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message ?? String(error),
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
		mlClassification?: unknown;
		graphRelationships?: unknown;
		queryId?: string;
	}>;
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { query, options } = StreamQuerySchema.parse(body);

		if (dev) {
			console.log(`🌊 Enhanced RAG Stream Query: "${query.substring(0, 100)}..."`);
		}

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const sendEvent = (payload: unknown) =>
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

				// Initial handshake
				sendEvent({
					type: 'processing',
					message: 'Processing query through Enhanced RAG pipeline',
					timestamp: new Date().toISOString(),
				});

				// small debounce so client can attach
				await new Promise((res) => setTimeout(res, 50));

				const startTime = Date.now();
				try {
					const ragService = enhancedRAGService as unknown as RagService;
					const ragResponse = await ragService.processLegalQuery(query, options);

					const processingTime = Date.now() - startTime;

					// Send response payload
					sendEvent({
						type: 'response',
						response: ragResponse.response,
						confidence: ragResponse.confidence,
						sources: ragResponse.sources,
						mlClassification: ragResponse.mlClassification,
						graphRelationships: ragResponse.graphRelationships,
						processingTime,
						metadata: {
							timestamp: new Date().toISOString(),
							queryId: ragResponse.queryId,
							systemVersion: '2.0.0-enhanced-rag-stream',
						},
					});

					// Completion event
					sendEvent({
						type: 'complete',
						message: 'Enhanced RAG processing complete',
						processingTime,
						timestamp: new Date().toISOString(),
					});

					controller.close();
				} catch (err: any) {
					console.error('❌ Enhanced RAG Stream Error:', err);
					sendEvent({
						type: 'error',
						error: err?.message ?? String(err),
						timestamp: new Date().toISOString(),
					});
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (error: any) {
		console.error('❌ Enhanced RAG Stream Setup Error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message ?? String(error),
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
				await new Promise((res) => setTimeout(res, 50));

				const startTime = Date.now();
				try {
					const ragService = enhancedRAGService as unknown as RagService;
					const ragResponse = await ragService.processLegalQuery(query, options);

					const processingTime = Date.now() - startTime;

					// response event
					sendEvent({
						type: 'response',
						response: ragResponse.response,
						confidence: ragResponse.confidence,
						sources: ragResponse.sources,
						mlClassification: ragResponse.mlClassification,
						graphRelationships: ragResponse.graphRelationships,
						processingTime,
						metadata: {
							timestamp: new Date().toISOString(),
							queryId: ragResponse.queryId,
							systemVersion: '2.0.0-enhanced-rag-stream',
						},
					});

					// completion event
					sendEvent({
						type: 'complete',
						message: 'Enhanced RAG processing complete',
						processingTime,
						timestamp: new Date().toISOString(),
					});

					controller.close();
				} catch (err: any) {
					console.error('❌ Enhanced RAG Stream Error:', err);
					sendEvent({
						type: 'error',
						error: err?.message ?? String(err),
						timestamp: new Date().toISOString(),
					});
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (error: any) {
		console.error('❌ Enhanced RAG Stream Setup Error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message ?? String(error),
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
};
			}),
			{			const ragService = enhancedRAGService as unknown as RagService;
				status: 500,= await ragService.processLegalQuery(query, options);
				headers: { 'Content-Type': 'application/json' },ime = Date.now() - startTime;
			}
		);am the final response
	}
};e: 'response',
						response: response.response,
						confidence: response.confidence,
						sources: response.sources,
						mlClassification: response.mlClassification,
						graphRelationships: response.graphRelationships,
						processingTime,
						metadata: {
							timestamp: new Date().toISOString(),
							queryId: response.queryId,
							systemVersion: '2.0.0-enhanced-rag-stream',
						},
					});

					// Send completion signal
					sendEvent({
						type: 'complete',
						message: 'Enhanced RAG processing complete',
						processingTime,
						timestamp: new Date().toISOString(),
					});

					controller.close();
				} catch (error: any) {
					console.error('❌ Enhanced RAG Stream Error:', error);
					sendEvent({
						type: 'error',
						error: error?.message || 'Enhanced RAG streaming failed',
						timestamp: new Date().toISOString(),
					});
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (error: any) {
		console.error('❌ Enhanced RAG Stream Setup Error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message || 'Enhanced RAG stream setup failed',
				timestamp: new Date().toISOString(),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
