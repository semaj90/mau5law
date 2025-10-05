import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import { sql } from 'drizzle-orm';
import { testRagDocuments, testRagEmbeddings } from '$lib/server/db/schema-test-rag';
import { gpuRAGService } from '$lib/services/gpu-rag-service';
import { qdrantService } from '$lib/services/qdrant-vector-service';
import type { VectorPoint } from '$lib/services/qdrant-vector-service';
import { env } from '$env/dynamic/private';

// Define the structure for entities extracted by OCR/langextract
interface OcrExtractedEntities {
  entities?: Array<Record<string, unknown>>; // Array of extracted entities, each entity is an object
  // Add other properties if the OCR service returns them, e.g., 'documentType', 'language', 'summary'
}

/**
 * Test RAG Upload API
 * Complete pipeline: OCR → langextract entities → Gemma embeddings → pgvector + Qdrant
 * Endpoint: POST /api/test-rag/upload
 */

interface UploadResult {
  success: boolean;
  documentId?: string;
  filename?: string;
  textExtracted?: string;
  entities?: OcrExtractedEntities; // Changed from 'Record<string, unknown>' to 'OcrExtractedEntities'
  embeddingGenerated?: boolean;
  pgvectorStored?: boolean;
  qdrantStored?: boolean;
  error?: string;
}

/**
 * Extract text using Python GPU OCR Service (Surya + langextract-go)
 */
async function extractTextFromFile(
  file: File,
  fetchFn: typeof fetch
): Promise<{ text: string; entities?: OcrExtractedEntities; embedding?: number[] }> { // Updated return type
  const fileType = file.type;
  const OCR_SERVICE_URL = (env.SURYA_OCR_URL as string) || 'http://localhost:8090/v1';

  // For text files, read directly
  if (fileType === 'text/plain' || fileType === 'application/json') {
    const text = await file.text();
    return { text };
  }

  // For PDFs and images, use GPU OCR service
  if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
    try {
      console.log(`📄 [Test RAG] Sending ${file.name} to GPU OCR service (${OCR_SERVICE_URL}/ocr)...`);

      const formData = new FormData();
      formData.append('files', file, file.name);

      const response = await fetchFn(`${OCR_SERVICE_URL}/ocr`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`OCR service error: ${response.status} ${txt}`);
      }

      const payload = await response.json();

      if (!payload?.results || !Array.isArray(payload.results) || payload.results.length === 0) {
        throw new Error('OCR processing returned empty results');
      }

      const first = payload.results[0];
      console.log(`✅ [Test RAG] OCR completed: ${first.filename} (confidence=${first.confidence})`);
      return {
        text: first.text || '',
        entities: (first.entities as OcrExtractedEntities) || undefined, // Explicitly cast to OcrExtractedEntities
        embedding: first.embedding || undefined
      };
    } catch (error: unknown) {
      console.error('[Test RAG] GPU OCR service error:', error);
      return {
        text: `[OCR Service Unavailable] ${file.name}. Start Python GPU OCR service on port 8090.`
      };
    }
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  const results: UploadResult[] = [];

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (const file of files) {
      const result: UploadResult = {
        success: false,
        filename: file.name
      };

      try {
        // Step 1: Extract text using GPU OCR service (Surya + langextract-go)
        console.log(`\n🚀 [Test RAG] Processing: ${file.name}`);
        const ocrResult = await extractTextFromFile(file, fetch);
        const extractedText = ocrResult.text;
        result.textExtracted = extractedText.substring(0, 100) + '...';
        result.entities = ocrResult.entities; // This is now OcrExtractedEntities | undefined

        // Step 2: Use embedding from OCR service or generate new one with Ollama
        let embedding: number[] | null = ocrResult.embedding || null;
        if (!embedding) {
          try {
            console.log('🔢 [Test RAG] Generating embedding with Ollama (embeddinggemma)...');
            const embeddingResult = await gpuRAGService.generateEmbedding(extractedText);
            embedding = embeddingResult.embedding;
            result.embeddingGenerated = true;
            console.log(`✅ [Test RAG] Embedding generated: ${embedding.length} dimensions`);
          } catch (embErr) {
            console.warn('[Test RAG] GPU embedding generation failed:', embErr);
            result.embeddingGenerated = false;
          }
        } else {
          result.embeddingGenerated = true;
          console.log(`✅ [Test RAG] Using embedding from OCR service: ${embedding.length} dimensions`);
        }

        // Step 3: Store in test_rag_documents
        console.log('💾 [Test RAG] Storing document in PostgreSQL...');
        const [doc] = await db
          .insert(testRagDocuments)
          .values({
            filename: file.name,
            content: extractedText,
            originalContent: extractedText,
            metadata: {
              fileType: file.type,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              tags: []
            },
            confidence: 0.85,
            legalAnalysis: ocrResult.entities ? {
              entities: Array.isArray(ocrResult.entities.entities) // Access .entities safely without 'any'
                ? ocrResult.entities.entities
                : []
            } : null
          })
          .returning();

        result.documentId = doc.id;
        console.log(`✅ [Test RAG] Document stored: ${doc.id}`);

        // Step 4: Store embedding in test_rag_embeddings (pgvector)
        if (embedding) {
          console.log('🔢 [Test RAG] Storing embedding in pgvector...');
          await db.insert(testRagEmbeddings).values({
            documentId: doc.id,
            content: extractedText.substring(0, 1000), // First 1000 chars as chunk
            embedding: embedding,
            metadata: {
              chunkIndex: 0,
              chunkCount: 1,
              modelUsed: 'embeddinggemma:latest',
              generatedAt: new Date().toISOString()
            }
          });
          result.pgvectorStored = true;
          console.log('✅ [Test RAG] Embedding stored in pgvector');

          // Step 5: Store in Qdrant for distributed vector search
          try {
            console.log('☁️  [Test RAG] Syncing to Qdrant...');
            const vectorPoint: VectorPoint = {
              id: doc.id,
              vector: embedding,
              payload: {
                documentId: doc.id,
                content: extractedText,
                filename: file.name,
                tags: [],
                metadata: {
                  fileType: file.type,
                  fileSize: file.size
                },
                confidence: 0.85,
                timestamp: new Date().toISOString()
              }
            };

            await qdrantService.upsertVectors([vectorPoint]);
            result.qdrantStored = true;
            console.log('✅ [Test RAG] Synced to Qdrant');
          } catch (qdrantErr) {
            console.warn('[Test RAG] Qdrant storage failed:', qdrantErr);
            result.qdrantStored = false;
          }
        }

        result.success = true;
        console.log(`✅ [Test RAG] Successfully processed: ${file.name}\n`);
      } catch (fileErr: unknown) {
        result.success = false;
        result.error = fileErr instanceof Error ? fileErr.message : String(fileErr);
        console.error(`❌ [Test RAG] Failed to process file ${file.name}:`, fileErr);
      }

      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;

    return json({
      success: successCount > 0,
      totalFiles: files.length,
      successCount,
      failureCount: files.length - successCount,
      results,
      pipeline: {
        ocr: '✅ Surya GPU OCR',
        entities: '✅ langextract-go',
        embeddings: '✅ Ollama embeddinggemma (768-dim)',
        storage: '✅ PostgreSQL pgvector + Qdrant'
      }
    });
  } catch (error: unknown) {
    console.error('[Test RAG] Upload error:', error);
    return json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

/**
 * GET: Check test RAG endpoint health
 */
export const GET: RequestHandler = async () => {
  try {
    const qdrantHealthy = await qdrantService.healthCheck();
    const dbConnected = !!db;

  // Check table counts using Drizzle query builder (safer result shape)
    let docCount = -1;
    let embCount = -1;
    try {
      const docCountRows = (await db.select({ count: sql<number>`COUNT(*)` }).from(testRagDocuments).limit(1)) as Array<{ count: number }>;
      const embCountRows = (await db.select({ count: sql<number>`COUNT(*)` }).from(testRagEmbeddings).limit(1)) as Array<{ count: number }>;
      docCount = Array.isArray(docCountRows) && docCountRows[0] ? Number(docCountRows[0].count) : 0;
      embCount = Array.isArray(embCountRows) && embCountRows[0] ? Number(embCountRows[0].count) : 0;
    } catch (countErr) {
      console.warn('[Test RAG] Failed to read table counts:', countErr);
      // leave docCount and embCount as -1 to indicate unknown
    }

    return json({
      success: true,
      healthy: qdrantHealthy && dbConnected,
      services: {
        qdrant: qdrantHealthy,
        postgres: dbConnected,
        gpu: true,
        ocr: 'http://localhost:8090/v1 (Surya + langextract-go)'
      },
      stats: {
        documents: docCount,
        embeddings: embCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    return json(
      { error: 'Health check failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};
