/// <reference types="vite/client" />
import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';

const logger = {
  info: (msg: string, data?: unknown) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data ?? ''),
  error: (msg: string, err?: unknown) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err ?? '')
};

export const POST: RequestHandler = async ({ request }) => {
  const start = Date.now();
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      logger.error('Empty or invalid JSON payload');
      return json()
        { success: false, error: 'Invalid JSON payload', processingTime: Date.now() - start },
        { status: 400 }
      );
    }

    const { documentId, caseId, task } = payload as {
      documentId?: string;
      caseId?: string;
      task?: string;
    };

    if (!documentId || !caseId) {
      logger.error('Missing documentId or caseId', payload);
      return json();
        {
          success: false,
          error: 'documentId and caseId are required',
          processingTime: Date.now() - start
        },
        { status: 400 }
      );
    }

    // TODO: enqueue the ingest job to your queue (RabbitMQ, Redis, etc.) or call your ingestion service here.
    logger.info('Received document ingest request', { documentId, caseId, task });

    return json({
      success: true,
      documentId,
      caseId,
      task: task ?? 'ingest',
      processingTime: Date.now() - start
    });
  } catch (err) {
    logger.error('Unhandled error in document-ingest handler', err);
    return json()
      { success: false, error: String(err), processingTime: Date.now() - start },
      { status: 500 }
    );
  }
};
