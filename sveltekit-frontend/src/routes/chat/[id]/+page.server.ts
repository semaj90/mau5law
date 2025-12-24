/**
 * Phase 76: Chat Route Server
 * Enhanced with error handling, validation, and caseId support
 */

import { fail } from '@sveltejs/kit';
import amqp from 'amqplib';
import { createClient } from 'redis';
import type { Actions, PageServerLoad } from './$types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE = 'ai_chat_queue';

export const load: PageServerLoad = async ({ params }) => {
	const redis = createClient({ url: REDIS_URL });
	await redis.connect();

	const chatId = params.id;
	const redisKey = `chat:${chatId}`;

	const rawHistory = await redis.get(redisKey);
	const history = rawHistory ? JSON.parse(rawHistory) : [];

	await redis.disconnect();

	return {
		chatId,
		history
	};
};

export const actions: Actions = {
	send: async ({ request, params }) => {
		const formData = await request.formData();
		const userMessage = formData.get('message') as string;
		const caseId = formData.get('caseId') as string | null;

		// Validation
		if (!userMessage || userMessage.trim().length === 0) {
			return fail(400, { error: 'Message cannot be empty' });
		}

		if (userMessage.length > 10000) {
			return fail(400, { error: 'Message too long (max 10,000 characters)' });
		}

		try {
			// Send job to RabbitMQ worker
			const conn = await amqp.connect(RABBITMQ_URL);
			const channel = await conn.createChannel();
			await channel.assertQueue(QUEUE, { durable: true });

			const job = {
				chatId: params.id,
				userMessage: userMessage.trim(),
				caseId,
				timestamp: new Date().toISOString()
			};

			channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(job)), {
				persistent: true
			});

			console.log(`📤 Sent message to RabbitMQ for chat:${params.id}`);

			await channel.close();
			await conn.close();

			// Optimistic response - SSE will deliver AI reply
			return { success: true };
		} catch (error: any) {
			console.error('Failed to send message to RabbitMQ:', error);
			return fail(500, { error: 'Failed to process message. Please try again.' });
		}
	}
};
