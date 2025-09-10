// Database Integration API for Legal Documents
// Handles storage with Drizzle ORM and PostgreSQL

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { documents, cases, users, userSessions } from '$lib/server/database/schema';
import { validateAuthSession } from '$lib/server/auth';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const session = await validateAuthSession(request);
    if (!session) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documents: uploadResults, caseId, userId, legalContext, metadata } = await request.json();

    if (!uploadResults || !Array.isArray(uploadResults)) {
      return json({ error: 'Invalid documents data' }, { status: 400 });
    }

    // Begin transaction for atomic operations
    const dbOperations = [];
    const documentIds = [];

    for (const result of uploadResults) {
      if (!result.success) continue; // Skip failed uploads

      const documentId = result.documentId || nanoid();
      documentIds.push(documentId);

      // Prepare document data for database insertion
      const documentData = {
        id: documentId,
        fileName: result.fileName,
        fileSize: result.metadata?.fileSize || 0,
        fileType: result.metadata?.fileType || 'unknown',
        hash: result.metadata?.hash || '',
        caseId: caseId || null,
        userId: session.userId,
        textContent: result.metadata?.textContent || '',
        aiAnalysis: {
          summary: result.aiInsights?.summary || '',
          entities: result.aiInsights?.keyEntities || [],
          suggestedTags: result.aiInsights?.suggestedTags || [],
          confidenceScore: result.aiInsights?.confidenceScore || 0,
          privileged: result.aiInsights?.privileged || false,
          evidenceType: result.aiInsights?.evidenceType || 'unknown',
          citations: result.aiInsights?.citations || [],
          riskFactors: result.aiInsights?.riskFactors || []
        },
        uploadedAt: new Date(),
        metadata: {
          legalContext,
          uploadMetadata: metadata,
          chainOfCustody: result.metadata?.chain_of_custody || [{
            timestamp: new Date().toISOString(),
            actor: session.userId,
            action: 'uploaded',
            details: 'Document uploaded via legal AI system'
          }],
          analysisResults: result.aiInsights || {}
        }
      };

      dbOperations.push(
        db.insert(documents).values(documentData)
      );
    }

    // Execute all database operations
    await Promise.all(dbOperations);

    // Update case document count if case is specified
    if (caseId) {
      try {
        // This would update case metadata with new document count
        // Implement based on your cases table structure
        await db.update(cases)
          .set({
            lastUpdated: new Date(),
            documentCount: db.select().from(documents).where(eq(documents.caseId, caseId)).then(docs => docs.length)
          })
          .where(eq(cases.id, caseId));
      } catch (error) {
        console.warn('Failed to update case metadata:', error);
      }
    }

    // Update user analytics
    try {
      const userUploadStats = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, session.userId));

      const totalUploads = userUploadStats.length;
      const successfulUploads = uploadResults.filter(r => r.success).length;
      const successRate = totalUploads > 0 ? successfulUploads / totalUploads : 1.0;

      // Update user session with analytics
      await db.update(userSessions)
        .set({
          lastActivity: new Date(),
          metadata: {
            uploadStats: {
              totalUploads,
              successRate,
              lastUploadDate: new Date().toISOString(),
              recentDocuments: documentIds.slice(-5) // Keep last 5 document IDs
            }
          }
        })
        .where(eq(userSessions.userId, session.userId));

    } catch (error) {
      console.warn('Failed to update user analytics:', error);
    }

    // Generate search embeddings for successful documents (background task)
    if (documentIds.length > 0) {
      // This would typically be handled by a background job queue
      generateSearchEmbeddings(documentIds).catch(error => {
        console.warn('Failed to generate search embeddings:', error);
      });
    }

    return json({
      success: true,
      documentsStored: documentIds.length,
      documentIds: documentIds,
      caseId: caseId,
      message: `Successfully stored ${documentIds.length} documents`
    });

  } catch (error) {
    console.error('Database storage error:', error);
    return json({
      error: 'Failed to store documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Background task to generate search embeddings
async function generateSearchEmbeddings(documentIds: string[]) {
  try {
    for (const documentId of documentIds) {
      // Retrieve document content
      const document = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (document.length === 0) continue;

      const docData = document[0];
      const textContent = docData.textContent || docData.aiAnalysis?.summary || '';

      if (textContent.length < 10) continue; // Skip documents with minimal content

      // Generate embeddings using Ollama
      const embeddingResponse = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mxbai-embed-large',
          prompt: textContent.slice(0, 2000) // Limit content for embedding
        })
      });

      if (embeddingResponse.ok) {
        const embeddingResult = await embeddingResponse.json();

        // Store embedding in pgvector table
        await db.insert(embeddings).values({
          id: nanoid(),
          documentId: documentId,
          embedding: embeddingResult.embedding,
          content: textContent.slice(0, 2000),
          metadata: {
            model: 'mxbai-embed-large',
            createdAt: new Date().toISOString(),
            documentType: docData.fileType,
            caseId: docData.caseId
          }
        });
      }
    }
  } catch (error) {
    console.error('Embedding generation failed:', error);
  }
}

// Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    // Test database connection
    await db.select().from(users).limit(1);

    return json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
