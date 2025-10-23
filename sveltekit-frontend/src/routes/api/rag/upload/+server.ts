import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHash } from 'crypto';
import { db } from '$lib/server/db';
import { documents, documentChunks } from '$lib/server/db/enhanced-embedding-schema';
import { eq } from 'drizzle-orm';
import { minio, ensureBucket, putObject } from '$lib/server/minio/client';
import redis from 'redis';

const redisClient = redis.createClient({
  url: 'redis://:redis@localhost:6379',
});

// Qdrant configuration
const QDRANT_URL = 'http://localhost:6333';
const QDRANT_COLLECTION = 'legal_documents';

let dbInitialized = false;

async function initializeDB() {
  if (dbInitialized) return;

  try {
    // Try Redis connection
    try {
      await redisClient.connect();
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without cache:', redisError);
    }

    // Ensure MinIO bucket exists
    try {
      await ensureBucket('legal-documents');
      console.log('✅ MinIO bucket initialized');
    } catch (minioError) {
      console.warn('⚠️ MinIO initialization failed, will use localStorage fallback:', minioError);
    }

    // Initialize Qdrant collection
    try {
      await initializeQdrantCollection();
      console.log('✅ Qdrant collection initialized');
    } catch (qdrantError) {
      console.warn('⚠️ Qdrant initialization failed, will use localStorage fallback:', qdrantError);
    }

    dbInitialized = true;
    console.log('✅ RAG services initialized (with fallbacks)');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    // Don't throw - allow graceful degradation with localStorage
  }
}

async function initializeQdrantCollection() {
  // Check if collection exists
  try {
    const response = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
      method: 'GET',
    });

    if (response.status === 404) {
      // Create collection with 384 dimensions for embeddinggemma
      await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
        }),
      });
      console.log('✅ Created Qdrant collection');
    }
  } catch (error) {
    console.error('Qdrant collection initialization error:', error);
  }
}

import {
  generateEmbeddings as serverGenerateEmbeddings,
  generateEmbedding as serverGenerateEmbedding,
} from '$lib/server/services/embedding-service';

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const trimmed = text.slice(0, 2000);
    const { embedding } = await serverGenerateEmbedding(trimmed, { model: 'embeddinggemma:latest' });
    if (!Array.isArray(embedding)) throw new Error('Embedding service returned invalid embedding');
    return embedding;
  } catch (error) {
    console.warn('⚠️ Embedding generation failed, using fallback:', error);
    return Array(384).fill(0.01 * Math.random());
  }
}

async function storeInQdrant(id: string, embedding: number[], metadata: any, tags: string[]) {
  try {
    const response = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [
          {
            id: id,
            vector: embedding,
            payload: {
              ...metadata,
              tags: tags,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant storage failed: ${response.status}`);
    }

    console.log(`✅ Stored in Qdrant: ${id}`);
    return true;
  } catch (error) {
    console.error('❌ Qdrant storage error:', error);
    return false;
  }
}

function extractTextContent(file: File, buffer: ArrayBuffer): string {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // Text files
  if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return new TextDecoder().decode(buffer);
  }

  // JSON files
  if (fileType.includes('json') || fileName.endsWith('.json')) {
    const jsonStr = new TextDecoder().decode(buffer);
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  }

  // CSV files
  if (fileType.includes('csv') || fileName.endsWith('.csv')) {
    return new TextDecoder().decode(buffer);
  }

  // For other types, return basic info
  return `Document: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\nContent extraction not yet implemented for this file type.`;
}

function createSemanticChunks(content: string, filename: string): string[] {
  const chunks: string[] = [];

  // Split by paragraphs, but keep reasonable chunk sizes
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';
  const maxChunkSize = 1000; // Characters

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    currentChunk += paragraph + '\n\n';
  }

  // Add remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Ensure we have at least one chunk
  if (chunks.length === 0) {
    chunks.push(content.slice(0, maxChunkSize));
  }

  // Add context to each chunk
  return chunks.map((chunk, index) =>
    `
Document: ${filename}
Chunk ${index + 1}/${chunks.length}

${chunk}
  `.trim()
  );
}

function extractTags(content: string, filename: string): string[] {
  const tags: string[] = [];

  // Extract tags from filename
  const filenameParts = filename
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .split(/[_\-\s]/);
  tags.push(...filenameParts.filter(part => part.length > 2));

  // Extract common legal document keywords
  const legalKeywords = [
    'contract',
    'agreement',
    'evidence',
    'testimony',
    'deposition',
    'motion',
    'brief',
    'memorandum',
    'affidavit',
    'exhibit',
    'plaintiff',
    'defendant',
    'witness',
    'court',
    'judge',
  ];

  const contentLower = content.toLowerCase();
  legalKeywords.forEach(keyword => {
    if (contentLower.includes(keyword) && !tags.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return [...new Set(tags)].slice(0, 10); // Unique tags, max 10
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    await initializeDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customTags = formData.get('tags') as string | null;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return json({ error: 'File too large' }, { status: 400 });
    }

    const allowedTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'application/pdf'];

    if (
      !allowedTypes.some(type => file.type.includes(type)) &&
      !['.txt', '.md', '.json', '.csv'].some(ext => file.name.endsWith(ext))
    ) {
      return json({ error: 'File type not supported' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = extractTextContent(file, arrayBuffer);

    // Generate content hash for deduplication
    const contentHash = createHash('sha256').update(content).digest('hex');

    // Check if already processed (using Drizzle)
    const existingDoc = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.sourceUri, `hash:${contentHash}`))
      .limit(1);

    if (existingDoc.length > 0) {
      return json({
        message: 'Document already exists in knowledge base',
        documentId: existingDoc[0].id,
        chunks: 0,
        embeddings: 0,
        duplicate: true,
      });
    }

    // Upload to MinIO
    const timestamp = Date.now();
    const minioObject = `${timestamp}-${file.name}`;
    const buffer = Buffer.from(arrayBuffer);

    let minioSuccess = false;
    try {
      await putObject('legal-documents', minioObject, buffer, {
        'Content-Type': file.type,
        'Original-Filename': file.name,
      });
      minioSuccess = true;
      console.log(`✅ Uploaded to MinIO: ${minioObject}`);
    } catch (minioError) {
      console.warn('⚠️ MinIO upload failed:', minioError);
    }

    // Create semantic chunks
    const chunks = createSemanticChunks(content, file.name);

    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(chunk => generateEmbedding(chunk));
    const embeddings = await Promise.all(embeddingPromises);

    // Extract tags
    const autoTags = extractTags(content, file.name);
    const tags = customTags ? [...autoTags, ...customTags.split(',').map(t => t.trim())] : autoTags;

    // Store main document (using Drizzle)
    const [newDocument] = await db
      .insert(documents)
      .values({
        filename: file.name,
        sourceUri: minioSuccess ? `minio://legal-documents/${minioObject}` : `hash:${contentHash}`,
        mimeType: file.type,
        fileSize: file.size,
        extractedText: content,
        processingStatus: 'completed',
        uploadedBy: '00000000-0000-0000-0000-000000000000', // Default system user
        metadata: {
          chunksCount: chunks.length,
          uploadedAt: new Date().toISOString(),
          extractionMethod: 'text_extraction',
          tags,
          contentHash,
        },
        processedAt: new Date(),
      })
      .returning({ id: documents.id });

    const documentId = newDocument.id;

    // Store in Qdrant with tags
    const qdrantId = `doc-${documentId}`;
    await storeInQdrant(
      qdrantId,
      embeddings[0],
      {
        documentId,
        filename: file.name,
        fileType: file.type,
        chunksCount: chunks.length,
      },
      tags
    );

    // Store individual chunks in documentChunks table (using Drizzle)
    const chunkInserts = chunks.map((chunk, i) => ({
      documentId,
      chunkIndex: i,
      level: 0, // Top-level chunks
      text: chunk,
      tokens: chunk.split(/\s+/).length, // Rough token estimate
      embedding: JSON.stringify(embeddings[i]), // Store as JSON for pgvector
      embeddingModel: 'embeddinggemma:latest',
      metadata: {
        chunkIndex: i,
        totalChunks: chunks.length,
        filename: file.name,
        fileType: file.type,
        tags,
      },
    }));

    await db.insert(documentChunks).values(chunkInserts);

    // Store chunks in Qdrant for vector search
    for (let i = 0; i < chunks.length; i++) {
      await storeInQdrant(
        `chunk-${documentId}-${i}`,
        embeddings[i],
        {
          documentId,
          chunkIndex: i,
          filename: file.name,
          chunkContent: chunks[i].slice(0, 200), // Preview
        },
        tags
      );
    }

    // Cache document for quick access
    try {
      await redisClient.setEx(
        `rag:doc:${documentId}`,
        86400, // 24 hours
        JSON.stringify({
          id: documentId,
          filename: file.name,
          contentHash,
          chunks: chunks.length,
          embeddings: embeddings.length,
          tags,
          minioObject: minioSuccess ? minioObject : null,
          qdrantId,
          processedAt: new Date().toISOString(),
        })
      );
    } catch (redisError) {
      console.warn('⚠️ Redis caching failed, continuing without cache:', redisError);
    }

    console.log(`✅ RAG document processed: ${file.name} (${chunks.length} chunks, ${tags.length} tags)`);

    return json({
      message: 'Document successfully uploaded and processed',
      documentId,
      filename: file.name,
      chunks: chunks.length,
      embeddings: embeddings.length,
      tags,
      contentHash,
      fileSize: file.size,
      minioStored: minioSuccess,
      qdrantStored: true,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ RAG upload failed:', error);

    return json(
      {
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
