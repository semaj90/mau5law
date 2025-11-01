import { aiReports } from '$lib/server/db/schema-postgres';
import db from '$lib/server/db/index';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { caseId, reportType, title, content, richTextContent, metadata, canvasElements } = await request.json();

    if (!caseId || !title || !content) {
      return json({ error: 'Case ID, title, and content are required' }, { status: 400 });
    }

    const reportData = {
      id: randomUUID(),
      caseId,
      reportType: reportType || 'case_notes',
      title,
      content,
      richTextContent: richTextContent || null,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: 'gemma3-legal:latest',
        confidence: metadata?.confidence ?? 0.85,
        keyPoints: metadata?.keyPoints ?? [],
        recommendations: metadata?.recommendations ?? [],
        riskFactors: metadata?.riskFactors ?? [],
        ...(metadata || {}),
      },
      canvasElements: canvasElements || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [savedReport] = await db.insert(aiReports).values(reportData).returning();
    return json(
      {
        success: true,
        report: savedReport,
        message: 'Report saved successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Report save error:', error);
    return json(
      {
        error: 'Failed to save report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const caseId = url.searchParams.get('caseId');
    const reportType = url.searchParams.get('reportType');

    if (!caseId) {
      return json({ error: 'Case ID is required' }, { status: 400 });
    }

    const query = db.select().from(aiReports);
    const conditions = [eq(aiReports.caseId, caseId)];

    if (reportType) {
      conditions.push(eq(aiReports.reportType, reportType));
    }

    const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

    const reports = await finalQuery.orderBy(aiReports.createdAt);
    return json({ reports }, { status: 200 });
  } catch (error: any) {
    console.error('Reports load error:', error);
    return json(
      {
        error: 'Failed to load reports',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/drizzle';
import { reports } from '$lib/server/db/schema';
import { CONFIG } from '$lib/config/env.server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { QdrantClient } from '@qdrant/js-client-rest';
import { eq } from '$lib/server/db/utils';
import { embeddingFunction } from '$lib/server/ai/embedder'; // from LangChain.js

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { id, title, content } = body;

  try {
    // 🧠 Step 1 — Generate embeddings and tags
    const { embedding, keywords } = await embeddingFunction(content);

    // 🧩 Step 2 — Upsert in Postgres
    const existing = await db.select().from(reports).where(eq(reports.id, id)).execute();

    let updatedReport;
    if (existing.length) {
      [updatedReport] = await db
        .update(reports)
        .set({
          title,
          content,
          updatedAt: new Date(),
          embedding,
          autoKeywords: keywords,
        })
        .where(eq(reports.id, id))
        .returning();
    } else {
      [updatedReport] = await db
        .insert(reports)
        .values({
          userId: user.id,
          title,
          content,
          embedding,
          autoKeywords: keywords,
        })
        .returning();
    }

    // 🪣 Step 3 — Store full backup in MinIO
    const minio = new S3Client({
      endpoint: CONFIG.MINIO_URL,
      region: CONFIG.MINIO_REGION ?? 'us-east-1', // Default region if not set
      credentials: {
        accessKeyId: CONFIG.MINIO_ACCESS_KEY,
        secretAccessKey: CONFIG.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    await minio.send(
      new PutObjectCommand({
        Bucket: CONFIG.MINIO_BUCKET,
        Key: `reports/${user.id}/${updatedReport.id}.json`,
        Body: JSON.stringify(updatedReport),
        ContentType: 'application/json',
      })
    );

    // ⚡ Step 4 — Upsert embedding in Qdrant
    const qdrant = new QdrantClient({ url: CONFIG.QDRANT_URL });
    await qdrant.upsert('reports', {
      points: [
        {
          id: updatedReport.id,
          vector: embedding,
          payload: {
            userId: user.id,
            title,
            keywords,
          },
        },
      ],
    });

    return new Response(JSON.stringify(updatedReport), { status: 200 });
  } catch (err) {
    console.error('Report save error:', err);
    return new Response('Error saving report', { status: 500 });
  }
};
