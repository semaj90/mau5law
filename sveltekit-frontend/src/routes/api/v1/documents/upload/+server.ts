import { json } from '@sveltejs/kit';
import { minioStorage } from '$lib/server/storage/minio';
import { createId } from '@paralleldrive/cuid2';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { queueVectorEmbedding } from '$lib/server/services/background-job-queue';

const execAsync = promisify(exec);

/**
 * 🚀 Unified Document Upload API
 *
 * POST /api/v1/documents/upload
 *
 * Complete workflow:
 * 1. Validate auth (Lucia v3 or dev bypass)
 * 2. Upload to MinIO storage
 * 3. Extract text with langextract-go
 * 4. Chunk text (3000 chars, 500 overlap)
 * 5. Generate embeddings
 * 6. Store in PostgreSQL (documents + document_chunks)
 * 7. Index in Qdrant for vector search
 * 8. Return document ID for immediate RAG queries
 */

interface UploadResponse {
  success: boolean;
  documentId: string;
  filename: string;
  size: number;
  chunks: number;
  processingTime: number;
  minioUrl?: string;
  metadata: {
    bucket: string;
    objectName: string;
    contentType: string;
    extractedText?: number; // character count
    embedded?: boolean;
    indexed?: boolean;
  };
  error?: string;
}

export const POST = async ({ request, locals }) => {
  const startTime = Date.now();

  // 1. Auth check (Lucia v3 session or dev bypass)
  let user = locals.user;
  const devBypass = process.env.DEV_BYPASS_AUTH === 'true';
  if (!user && devBypass) {
    // Inject a mock user for development/testing
    user = {
      id: 'dev-user',
      email: 'dev@localhost',
      name: 'Dev User',
      role: 'user', // changed from 'developer' to permitted role 'user'
    };
  }
  if (!user) {
    return json(
      {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  let formData: FormData;
  let file: File;
  let caseId: string | undefined;
  let description: string | undefined;

  try {
    formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return json(
        {
          message: 'File is required',
          code: 'MISSING_FILE',
        },
        { status: 400 }
      );
    }

    file = fileEntry;
    caseId = formData.get('caseId')?.toString();
    description = formData.get('description')?.toString();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json(
      {
        message: 'Invalid form data',
        error: message,
        code: 'INVALID_FORM_DATA',
      },
      { status: 400 }
    );
  }

  const documentId = createId();
  const filename = file.name;
  const fileSize = file.size;
  const contentType = file.type || 'application/octet-stream';

  console.log(`📄 [Upload] Starting: ${filename} (${fileSize} bytes) for user: ${user.id}`);

  try {
    // 2. Upload to MinIO
    console.log('📦 [Upload] Step 1/6: Uploading to MinIO...');
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const minioResult = await minioStorage.uploadDocument(fileBuffer, filename, {
      contentType,
      documentType: 'legal',
      userId: user.id,
      caseId,
      documentId,
    });

    console.log(`✅ [Upload] MinIO upload complete: ${minioResult.bucket}/${minioResult.objectName}`);

    // 3. Extract text with langextract-go
    console.log('🔍 [Upload] Step 2/6: Extracting text with langextract-go...');
    let extractedText = '';
    let extractionMethod = 'fallback';

    try {
      // Save file temporarily for langextract
      const tempDir = join(tmpdir(), 'legal-uploads');
      await mkdir(tempDir, { recursive: true });
      const tempFilePath = join(tempDir, `${documentId}_${filename}`);
      await writeFile(tempFilePath, fileBuffer);

      // Call langextract-go CLI
      const langextractPath = process.env.LANGEXTRACT_PATH || '../langextract-go/langextract';
      const { stdout, stderr } = await execAsync(
        `${langextractPath} extract "${tempFilePath}"`,
        { timeout: 30000 } // 30s timeout
      );

      if (stdout) {
        extractedText = stdout.trim();
        extractionMethod = 'langextract-go';
        console.log(`✅ [Upload] Text extracted: ${extractedText.length} characters`);
      } else if (stderr) {
        console.warn('⚠️ [Upload] LangExtract stderr:', stderr);
        throw new Error('LangExtract failed');
      }

      // Cleanup temp file
      await unlink(tempFilePath).catch(() => {});
    } catch (extractError: unknown) {
      const msg = extractError instanceof Error ? extractError.message : String(extractError);
      console.warn('⚠️ [Upload] LangExtract failed, using fallback:', msg);

      // Fallback: naive text extraction for .txt files
      if (contentType.includes('text') || filename.endsWith('.txt')) {
        extractedText = fileBuffer.toString('utf-8');
        extractionMethod = 'utf8-fallback';
      } else {
        extractedText = `[Binary file: ${filename}]`;
        extractionMethod = 'binary-placeholder';
      }
    }

    // 4. Chunk text (3000 chars, 500 overlap)
    const chunks = chunkText(extractedText, { maxChunkChars: 3000, overlapChars: 500 });

    // 5. Generate embeddings using embeddinggemma:latest from Ollama (primary)
    console.log('🧠 [Upload] Step 4/6: Generating embeddings...');
    let embeddings: number[][] = [];
    let embeddingModel = 'none';

    try {
      // Primary: Try Ollama embeddinggemma:latest first
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      console.log(`🔍 [Upload] Trying embeddinggemma:latest from Ollama (${ollamaUrl})...`);

      // Generate embeddings for each chunk using Ollama
      for (const chunk of chunks) {
        const ollamaResp = await fetch(`${ollamaUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'embeddinggemma:latest',
            prompt: chunk,
          }),
          signal: AbortSignal.timeout(30000), // 30s per chunk
        });

        if (ollamaResp.ok) {
          const ollamaData = await ollamaResp.json();
          if (ollamaData.embedding) {
            embeddings.push(ollamaData.embedding);
          }
        } else {
          throw new Error(`Ollama returned status ${ollamaResp.status}`);
        }
      }

      if (embeddings.length === chunks.length) {
        embeddingModel = 'embeddinggemma:latest';
        console.log(`✅ [Upload] Generated ${embeddings.length} embeddings using embeddinggemma:latest from Ollama`);
      } else {
        throw new Error('Incomplete embeddings from Ollama');
      }
    } catch (ollamaError: unknown) {
      const msg = ollamaError instanceof Error ? ollamaError.message : String(ollamaError);
      console.warn(`⚠️ [Upload] embeddinggemma:latest failed: ${msg}. Trying fallback...`);
      embeddings = []; // Reset

      // Fallback: Try embedding service (nomic-embed-text)
      try {
        const embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8094/api/embed';
        console.log(`🔍 [Upload] Trying fallback embedding service (${embeddingServiceUrl})...`);

        const fallbackResp = await fetch(embeddingServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: chunks }),
          signal: AbortSignal.timeout(60000),
        });

        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          embeddings = fallbackData.embeddings || [];
          embeddingModel = fallbackData.model || 'nomic-embed-text';
          console.log(`✅ [Upload] Generated ${embeddings.length} embeddings using ${embeddingModel} (fallback)`);
        } else {
          console.warn(`⚠️ [Upload] Fallback embedding service returned status: ${fallbackResp.status}`);
        }
      } catch (fallbackError: unknown) {
        const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.warn('⚠️ [Upload] All embedding services failed:', msg);
        // Continue without embeddings - document will still be stored
      }
    }

    // 6. Store in PostgreSQL (documents + document_chunks)
    console.log('💾 [Upload] Step 5/6: Storing in PostgreSQL...');

    // Insert document
    await db.execute(sql`
			INSERT INTO documents (id, filename, created_at, metadata, storage_path)
			VALUES (
				${documentId},
				${filename},
				NOW(),
				${JSON.stringify({
          userId: user.id,
          caseId,
          description,
          contentType,
          size: fileSize,
          extractionMethod,
          embeddingModel,
          minioUrl: minioResult.url,
          bucket: minioResult.bucket,
          objectName: minioResult.objectName,
        })},
				${'minio://' + minioResult.bucket + '/' + minioResult.objectName}
			)
		`);

    // Insert chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = createId();
      const embedding = embeddings[i] || null;

      await db.execute(sql`
				INSERT INTO document_chunks (id, document_id, chunk_index, text_snippet, embedding)
				VALUES (
					${chunkId},
					${documentId},
					${i},
					${chunks[i]},
					${embedding ? sql`${JSON.stringify(embedding)}::vector` : null}
				)
			`);
    }

    console.log(`✅ [Upload] Stored document and ${chunks.length} chunks in PostgreSQL`);

    // Enqueue vector embedding job for background processing
    try {
      await queueVectorEmbedding('document', documentId, user.id);
      console.log(`[Upload] Enqueued vector embedding job for document ${documentId}`);
    } catch (qErr: unknown) {
      const msg = qErr instanceof Error ? qErr.message : String(qErr);
      console.warn('[Upload] Failed to enqueue embedding job:', msg);
    }

    // 7. Index in Qdrant (fire-and-forget)
    console.log('🔍 [Upload] Step 6/6: Indexing in Qdrant...');
    if (embeddings.length > 0) {
      indexInQdrant(documentId, chunks, embeddings, {
        filename,
        userId: user.id,
        caseId,
        bucket: minioResult.bucket,
        objectName: minioResult.objectName,
      }).catch(err => {
        console.error('⚠️ [Upload] Qdrant indexing failed (non-blocking):', err);
      });
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ [Upload] Complete: ${documentId} (${processingTime}ms)`);

    // 8. Return success response
    const response: UploadResponse = {
      success: true,
      documentId,
      filename,
      size: fileSize,
      chunks: chunks.length,
      processingTime,
      minioUrl: minioResult.url,
      metadata: {
        bucket: minioResult.bucket,
        objectName: minioResult.objectName,
        contentType,
        extractedText: extractedText.length,
        embedded: embeddings.length > 0,
        indexed: embeddings.length > 0,
      },
    };

    return json(response, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ [Upload] Failed:', message);

    const response: UploadResponse = {
      success: false,
      documentId: '',
      filename,
      size: fileSize,
      chunks: 0,
      processingTime: Date.now() - startTime,
      error: message || 'Upload failed',
      metadata: {
        bucket: '',
        objectName: '',
        contentType,
      },
    };

    return json(response, { status: 500 });
  }
};

/**
 * Chunk text into overlapping segments
 */
function chunkText(text: string, options: { maxChunkChars: number; overlapChars: number }): string[] {
  const { maxChunkChars, overlapChars } = options;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChunkChars, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += maxChunkChars - overlapChars;
  }

  return chunks;
}

/**
 * Index chunks in Qdrant vector database (fire-and-forget)
 */
async function indexInQdrant(
  documentId: string,
  chunks: string[],
  embeddings: number[][],
  metadata: {
    filename: string;
    userId: string;
    caseId?: string;
    bucket: string;
    objectName: string;
  }
): Promise<void> {
  try {
    const collectionName = process.env.QDRANT_COLLECTION || 'legal-documents';
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';

    // Create collection if not exists
    await fetch(`${qdrantUrl}/collections/${collectionName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: embeddings[0]?.length || 384,
          distance: 'Cosine',
        },
      }),
    }).catch(() => {}); // Ignore if already exists

    // Upsert points
    const points = chunks.map((chunk, i) => ({
      id: `${documentId}_chunk_${i}`,
      vector: embeddings[i],
      payload: {
        document_id: documentId,
        chunk_index: i,
        text: chunk,
        filename: metadata.filename,
        user_id: metadata.userId,
        case_id: metadata.caseId,
        source: `minio://${metadata.bucket}/${metadata.objectName}`,
      },
    }));

    await fetch(`${qdrantUrl}/collections/${collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });

    console.log(`✅ [Qdrant] Indexed ${points.length} points for document: ${documentId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ [Qdrant] Indexing failed:', msg);
    throw err;
  }
}

/**
 * GET /api/v1/documents/upload - Info endpoint
 */
export const GET = async () => {
  return json({
    endpoint: 'POST /api/v1/documents/upload',
    description: 'Unified document upload with automatic processing',
    workflow: [
      '1. Upload to MinIO storage',
      '2. Extract text with langextract-go',
      '3. Chunk text (3000 chars, 500 overlap)',
      '4. Generate embeddings',
      '5. Store in PostgreSQL',
      '6. Index in Qdrant vector DB',
    ],
    authentication: 'Required (Lucia v3 session or DEV_BYPASS_AUTH)',
    fields: {
      file: 'File (required)',
      caseId: 'string (optional)',
      description: 'string (optional)',
    },
    example: {
      curl: `curl -X POST http://localhost:5173/api/v1/documents/upload \\
  -H "Cookie: legal_ai_session=..." \\
  -F "file=@contract.pdf" \\
  -F "caseId=case_123" \\
  -F "description=Employment contract"`,
    },
    timestamp: new Date().toISOString(),
  });
};
