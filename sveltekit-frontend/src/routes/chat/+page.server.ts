import * as amqp from 'amqplib';
import type { Actions } from './$types';

export const actions: Actions = {
    send: async ({ request }) => {
        const data = await request.formData();
        const text = data.get('message') as string;
        const chatId = data.get('chatId') as string;

        if (!text || !chatId) {
            return { success: false, error: 'Missing message or chatId' };
        }

        // Push to RabbitMQ
        try {
            const conn = await (amqp as any).connect('amqp://localhost');
            const ch = await conn.createChannel();
            await ch.assertQueue('ai_jobs');
            await ch.sendToQueue('ai_jobs', Buffer.from(JSON.stringify({
                chatId,
                userText: text
            })));

            await ch.close();
            await conn.close();

            return { success: true };
        } catch (error) {
            console.error("Failed to send to queue:", error);
            return { success: false, error: 'Queue error' };
        }
    }
};
