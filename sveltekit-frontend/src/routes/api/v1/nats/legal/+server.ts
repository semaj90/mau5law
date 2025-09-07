import type { RequestHandler } from './$types';

// Legal AI Specific NATS Endpoints
// High-level API for legal AI event publishing and management

import { EnhancedNATSMessagingService } from '$lib/services/enhanced-nats-messaging';
import type { 
	CaseEventData,
	DocumentEventData, 
	AIAnalysisEventData,
	ChatEventData,
	SearchEventData 
} from '$lib/types/nats-messaging';

let natsService: EnhancedNATSMessagingService | null = null;

function getNATSService(): EnhancedNATSMessagingService {
	if (!natsService) {
		natsService = new EnhancedNATSMessagingService();
		natsService.connect().catch(console.error);
	}
	return natsService;
}

/* POST /api/v1/nats/legal - Publish legal AI events */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const nats = getNATSService();

		switch (body.event_type) {
			case 'case':
				return await handleCaseEvent(nats, body);
			case 'document':
				return await handleDocumentEvent(nats, body);
			case 'ai_analysis':
				return await handleAIAnalysisEvent(nats, body);
			case 'chat':
				return await handleChatEvent(nats, body);
			case 'search':
				return await handleSearchEvent(nats, body);
			case 'system':
				return await handleSystemEvent(nats, body);
			default:
				return json({ 
					success: false, 
					error: `Unsupported event type: ${body.event_type}` 
				}, { status: 400 });
		}
	} catch (error: any) {
		console.error('Legal NATS API Error:', error);
		return json({
			success: false,
			error: 'Legal AI event processing failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
};

/* GET /api/v1/nats/legal - Get legal AI event schemas and capabilities */
export const GET: RequestHandler = async () => {
	return json({
		service: 'Legal AI NATS Events',
		version: '2.0.0',
		supported_events: {
			case: {
				actions: ['created', 'updated', 'closed'],
				subject_pattern: 'legal.case.*',
				required_fields: ['case_id', 'case_number', 'title', 'status'],
				schema: getCaseEventSchema(),
			},
			document: {
				actions: ['uploaded', 'processed', 'analyzed', 'indexed'],
				subject_pattern: 'legal.document.*',
				required_fields: ['document_id', 'filename', 'file_type', 'processing_status'],
				schema: getDocumentEventSchema(),
			},
			ai_analysis: {
				actions: ['started', 'completed', 'failed'],
				subject_pattern: 'legal.ai.analysis.*',
				required_fields: ['analysis_id', 'analysis_type', 'model_used'],
				schema: getAIAnalysisEventSchema(),
			},
			chat: {
				actions: ['message', 'response', 'streaming'],
				subject_pattern: 'legal.chat.*',
				required_fields: ['message_id', 'session_id', 'user_id', 'content'],
				schema: getChatEventSchema(),
			},
			search: {
				actions: ['query', 'results'],
				subject_pattern: 'legal.search.*',
				required_fields: ['query_id', 'user_id', 'query_text', 'search_type'],
				schema: getSearchEventSchema(),
			},
			system: {
				actions: ['health', 'metrics'],
				subject_pattern: 'system.*',
				required_fields: ['component', 'status'],
				schema: getSystemEventSchema(),
			},
		},
		examples: {
			case_created: {
				event_type: 'case',
				action: 'created',
				data: {
					case_id: 'case-12345',
					case_number: 'LEGAL-2024-001',
					title: 'Contract Dispute Analysis',
					status: 'open',
					priority: 'high',
					assigned_to: ['lawyer1@firm.com'],
					created_by: 'paralegal@firm.com',
				}
			},
			document_uploaded: {
				event_type: 'document',
				action: 'uploaded',
				data: {
					document_id: 'doc-67890',
					case_id: 'case-12345',
					filename: 'contract.pdf',
					file_type: 'application/pdf',
					file_size: 2048576,
					processing_status: 'uploaded',
				}
			},
			ai_analysis_completed: {
				event_type: 'ai_analysis',
				action: 'completed',
				data: {
					analysis_id: 'analysis-abc123',
					case_id: 'case-12345',
					document_id: 'doc-67890',
					analysis_type: 'summary',
					model_used: 'gemma3-legal',
					confidence_score: 0.89,
					processing_time_ms: 1500,
					results: {
						summary: 'Contract analysis complete...',
						key_terms: ['liability', 'indemnification', 'termination'],
					}
				}
			}
		},
		timestamp: new Date().toISOString(),
	});
};

// Event Handlers

async function handleCaseEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['created', 'updated', 'closed'].includes(action)) {
		throw new Error(`Invalid case action: ${action}`);
	}
	
	validateCaseData(data);
	
	await nats.publishCaseEvent(action, data);
	
	return json({
		success: true,
		event_type: 'case',
		action,
		case_id: data.case_id,
		case_number: data.case_number,
		subject: `legal.case.${action}`,
		timestamp: new Date().toISOString(),
	});
}

async function handleDocumentEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['uploaded', 'processed', 'analyzed', 'indexed'].includes(action)) {
		throw new Error(`Invalid document action: ${action}`);
	}
	
	validateDocumentData(data);
	
	await nats.publishDocumentEvent(action, data);
	
	return json({
		success: true,
		event_type: 'document',
		action,
		document_id: data.document_id,
		filename: data.filename,
		subject: `legal.document.${action}`,
		timestamp: new Date().toISOString(),
	});
}

async function handleAIAnalysisEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['started', 'completed', 'failed'].includes(action)) {
		throw new Error(`Invalid AI analysis action: ${action}`);
	}
	
	validateAIAnalysisData(data);
	
	await nats.publishAIAnalysisEvent(action, data);
	
	return json({
		success: true,
		event_type: 'ai_analysis',
		action,
		analysis_id: data.analysis_id,
		analysis_type: data.analysis_type,
		subject: `legal.ai.analysis.${action}`,
		timestamp: new Date().toISOString(),
	});
}

async function handleChatEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['message', 'response', 'streaming'].includes(action)) {
		throw new Error(`Invalid chat action: ${action}`);
	}
	
	validateChatData(data);
	
	const isStreaming = action === 'streaming';
	await nats.publishChatMessage(data, isStreaming);
	
	return json({
		success: true,
		event_type: 'chat',
		action,
		message_id: data.message_id,
		session_id: data.session_id,
		subject: `legal.chat.${action}`,
		timestamp: new Date().toISOString(),
	});
}

async function handleSearchEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['query', 'results'].includes(action)) {
		throw new Error(`Invalid search action: ${action}`);
	}
	
	validateSearchData(data);
	
	if (action === 'query') {
		await nats.publishSearchQuery(data);
	} else {
		// For search results, use generic publish
		await nats.publish('legal.search.results', data);
	}
	
	return json({
		success: true,
		event_type: 'search',
		action,
		query_id: data.query_id,
		subject: `legal.search.${action}`,
		timestamp: new Date().toISOString(),
	});
}

async function handleSystemEvent(nats: EnhancedNATSMessagingService, body: any): Promise<any> {
	const { action, data } = body;
	
	if (!['health', 'metrics'].includes(action)) {
		throw new Error(`Invalid system action: ${action}`);
	}
	
	validateSystemData(data);
	
	if (action === 'health') {
		await nats.publishSystemHealth(data);
	} else {
		await nats.publish('system.metrics', data);
	}
	
	return json({
		success: true,
		event_type: 'system',
		action,
		component: data.component,
		subject: `system.${action}`,
		timestamp: new Date().toISOString(),
	});
}

// Validation Functions

function validateCaseData(data: any): void {
	const required = ['case_id', 'case_number', 'title', 'status'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	const validStatuses = ['open', 'in_progress', 'closed', 'archived'];
	if (!validStatuses.includes(data.status)) {
		throw new Error(`Invalid status: ${data.status}. Must be one of: ${validStatuses.join(', ')}`);
	}
}

function validateDocumentData(data: any): void {
	const required = ['document_id', 'filename', 'file_type', 'processing_status'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	const validStatuses = ['uploaded', 'processing', 'processed', 'indexed', 'failed'];
	if (!validStatuses.includes(data.processing_status)) {
		throw new Error(`Invalid processing_status: ${data.processing_status}`);
	}
}

function validateAIAnalysisData(data: any): void {
	const required = ['analysis_id', 'analysis_type', 'model_used'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	const validTypes = ['summary', 'classification', 'entity_extraction', 'sentiment', 'risk_assessment'];
	if (!validTypes.includes(data.analysis_type)) {
		throw new Error(`Invalid analysis_type: ${data.analysis_type}`);
	}
}

function validateChatData(data: any): void {
	const required = ['message_id', 'session_id', 'user_id', 'content'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	if (data.message_type) {
		const validTypes = ['user', 'assistant', 'system'];
		if (!validTypes.includes(data.message_type)) {
			throw new Error(`Invalid message_type: ${data.message_type}`);
		}
	}
}

function validateSearchData(data: any): void {
	const required = ['query_id', 'user_id', 'query_text', 'search_type'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	const validTypes = ['cases', 'documents', 'legal_precedents', 'full_text', 'semantic'];
	if (!validTypes.includes(data.search_type)) {
		throw new Error(`Invalid search_type: ${data.search_type}`);
	}
}

function validateSystemData(data: any): void {
	const required = ['component', 'status'];
	for (const field of required) {
		if (!data[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}
	
	const validStatuses = ['healthy', 'degraded', 'critical'];
	if (!validStatuses.includes(data.status)) {
		throw new Error(`Invalid status: ${data.status}`);
	}
}

// Schema Functions

function getCaseEventSchema() {
	return {
		type: 'object',
		properties: {
			case_id: { type: 'string' },
			case_number: { type: 'string' },
			title: { type: 'string' },
			status: { type: 'string', enum: ['open', 'in_progress', 'closed', 'archived'] },
			priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
			assigned_to: { type: 'array', items: { type: 'string' } },
			created_by: { type: 'string' },
			metadata: { type: 'object' },
		},
		required: ['case_id', 'case_number', 'title', 'status'],
	};
}

function getDocumentEventSchema() {
	return {
		type: 'object',
		properties: {
			document_id: { type: 'string' },
			case_id: { type: 'string' },
			filename: { type: 'string' },
			file_type: { type: 'string' },
			file_size: { type: 'number' },
			processing_status: { type: 'string', enum: ['uploaded', 'processing', 'processed', 'indexed', 'failed'] },
			checksum: { type: 'string' },
			metadata: { type: 'object' },
		},
		required: ['document_id', 'filename', 'file_type', 'processing_status'],
	};
}

function getAIAnalysisEventSchema() {
	return {
		type: 'object',
		properties: {
			analysis_id: { type: 'string' },
			analysis_type: { type: 'string', enum: ['summary', 'classification', 'entity_extraction', 'sentiment', 'risk_assessment'] },
			model_used: { type: 'string' },
			confidence_score: { type: 'number', minimum: 0, maximum: 1 },
			processing_time_ms: { type: 'number' },
			results: { type: 'object' },
		},
		required: ['analysis_id', 'analysis_type', 'model_used'],
	};
}

function getChatEventSchema() {
	return {
		type: 'object',
		properties: {
			message_id: { type: 'string' },
			session_id: { type: 'string' },
			user_id: { type: 'string' },
			message_type: { type: 'string', enum: ['user', 'assistant', 'system'] },
			content: { type: 'string' },
			is_streaming: { type: 'boolean' },
		},
		required: ['message_id', 'session_id', 'user_id', 'content'],
	};
}

function getSearchEventSchema() {
	return {
		type: 'object',
		properties: {
			query_id: { type: 'string' },
			user_id: { type: 'string' },
			query_text: { type: 'string' },
			search_type: { type: 'string', enum: ['cases', 'documents', 'legal_precedents', 'full_text', 'semantic'] },
			filters: { type: 'object' },
			results: { type: 'array' },
		},
		required: ['query_id', 'user_id', 'query_text', 'search_type'],
	};
}

function getSystemEventSchema() {
	return {
		type: 'object',
		properties: {
			component: { type: 'string' },
			status: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
			metrics: { type: 'object' },
			uptime_seconds: { type: 'number' },
		},
		required: ['component', 'status'],
	};
}