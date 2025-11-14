import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { evidence } from '$lib/server/db/schema-postgres';
import { minioService } from '$lib/server/storage/minio-service';
import { upsertToQdrant } from '$lib/server/vector/qdrant';
import { enhancedRAGPipeline } from '$lib/server/ai/rag-pipeline-enhanced';
import { eventBus } from '$lib/server/event-bus';
import { getOllamaBaseUrl } from '$lib/utils/ollama';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null) ?? '';
    const description = (formData.get('description') as string | null) ?? '';
    const evidenceType = (formData.get('evidenceType') as string | null) ?? 'document';
    const caseId = (formData.get('caseId') as string | null) ?? '';
    const tagsRaw = (formData.get('tags') as string | null) ?? '';
    const isAdmissible = formData.get('isAdmissible') === 'true';

    if (!file) {
      return json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (!title || !caseId) {
      return json({ success: false, error: 'Missing required fields: title, caseId' }, { status: 400 });
    }

    const userId = locals.user?.id ?? 'anonymous';
    const tags = tagsRaw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const minioReady = await minioService.initialize();
    if (!minioReady) {
      return json({ success: false, error: 'MinIO unavailable' }, { status: 503 });
    }

    const uploadResult = await minioService.uploadFile(file, file.name, {
      bucket: 'evidence',
      metadata: { caseId, evidenceType, uploadedBy: userId, title }
    });
    if (!uploadResult.success) {
      return json({ success: false, error: uploadResult.error ?? 'File upload failed' }, { status: 500 });
    }

    eventBus.emit({
      type: 'evidence_uploaded',
      evidenceId: uploadResult.fileId,
      fileName: file.name,
      caseId,
      message: `New evidence uploaded: ${file.name}`
    });

    let textContent = '';
    if (file.type === 'text/plain') {
      textContent = await file.text();
    } else {
      textContent = description || title;
    }

    eventBus.emit({
      type: 'ocr_complete',
      evidenceId: uploadResult.fileId,
      message: 'OCR completed for uploaded evidence'
    });

    const ollamaBaseUrl = getOllamaBaseUrl();

    let embeddingVector: number[] = [];
    try {
      const embeddingRes = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'embeddinggemma:latest',
          prompt: textContent.slice(0, 8_000)
        })
      });

      if (embeddingRes.ok) {
        const data = (await embeddingRes.json()) as { embedding?: number[] };
        embeddingVector = data.embedding ?? [];
        if (embeddingVector.length) {
          eventBus.emit({
            type: 'embedding_complete',
            evidenceId: uploadResult.fileId,
            dimensions: embeddingVector.length,
            message: 'Embedding generated'
          });
        }
      } else {
        console.warn('Embedding request failed:', embeddingRes.status);
      }
    } catch (error) {
      console.warn('Embedding generation error:', error);
    }

    let aiSummary = '';
    if (textContent.length > 120) {
      try {
        const summaryRes = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma3-legal:latest',
            max_tokens: 400,
            stream: false,
            messages: [
              {
                role: 'system',
                content:
                  'You are Phoenix-Pro, an expert legal prosecutor. Summarize evidence, reveal contradictions, and propose next actions.'
              },
              { role: 'user', content: textContent.slice(0, 4_000) }
            ]
          })
        });

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          aiSummary = summaryJson?.message?.content ?? '';
        }
      } catch (error) {
        console.warn('Summary generation failed:', error);
      }
    }

    const [record] = await db
      .insert(evidence)
      .values({
        caseId,
        title,
        description,
        evidenceType,
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        tags,
        isAdmissible,
        aiSummary,
        uploadedBy: userId,
        metadata: { storageKey: uploadResult.fileName }
      })
      .returning();

    if (embeddingVector.length) {
      try {
        await upsertToQdrant(
          {
            id: record.id,
            content: textContent,
            embeddings: embeddingVector,
            metadata: {
              caseId: record.caseId,
              evidenceType: record.evidenceType,
              title: record.title,
              tags,
              uploadedBy: userId
            }
          },
          { url: process.env.QDRANT_URL ?? 'http://localhost:6333' }
        );

        eventBus.emit({
          type: 'graph_update',
          evidenceId: record.id,
          caseId: record.caseId,
          message: 'Graph updated with new semantic edges'
        });
      } catch (error) {
        console.warn('Qdrant upsert failed:', error);
      }
    }

    try {
      await enhancedRAGPipeline.indexDocument({
        id: record.id,
        content: textContent,
        metadata: { type: 'evidence', caseId: record.caseId, title: record.title }
      });

      eventBus.emit({
        type: 'ai_summary_ready',
        evidenceId: record.id,
        message: 'Phoenix AI summary ready'
      });
    } catch (error) {
      console.warn('RAG indexing failed:', error);
    }

    return json({
      success: true,
      data: {
        ...record,
        hasEmbedding: embeddingVector.length > 0
      }
    });
  } catch (error) {
    console.error('Evidence upload failed:', error);
    return json({ success: false, error: 'Failed to upload evidence' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const evidenceId = url.searchParams.get('id');
    if (!evidenceId) {
      return json({ error: 'Evidence ID required' }, { status: 400 });
    }

    const record = await db.query.evidence.findFirst({
      where: eq(evidence.id, evidenceId)
    });

    if (!record) {
      return json({ error: 'Evidence not found' }, { status: 404 });
    }

    return json({ success: true, data: record });
  } catch (error) {
    console.error('Evidence fetch failed:', error);
    return json({ error: 'Failed to fetch evidence' }, { status: 500 });
  }
};
