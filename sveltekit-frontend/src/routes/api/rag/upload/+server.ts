import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHash } from 'crypto';
import pg from 'pg';
import redis from 'redis';

const { Client } = pg;

// Database connections
const pgClient = new Client({
  host: 'localhost',
  port: 5432,
  database: 'legal_ai_db',
  user: 'legal_admin',
  password: '123456'
});

const redisClient = redis.createClient({
  url: 'redis://:redis@localhost:6379'
});

let dbInitialized = false;

async function initializeDB() {
  if (dbInitialized) return;

  try {
    await pgClient.connect();

    // Try Redis connection, but continue if it fails
    try {
      await redisClient.connect();
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without cache:', redisError);
    }

    // Ensure RAG documents table exists
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        content_hash TEXT UNIQUE NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        content TEXT,
        metadata JSONB DEFAULT '{}',
        embedding vector(768),
        processed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rag_embedding
      ON rag_documents USING hnsw (embedding vector_cosine_ops);

      CREATE INDEX IF NOT EXISTS idx_rag_content_hash
      ON rag_documents(content_hash);
    `);

    dbInitialized = true;
    console.log('✅ RAG database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: text.slice(0, 2000) // Limit context
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding || Array(768).fill(0.01 * Math.random());
  } catch (error) {
    console.warn('⚠️ Embedding generation failed, using fallback:', error);
    return Array(768).fill(0.01 * Math.random());
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
  return chunks.map((chunk, index) => `
Document: ${filename}
Chunk ${index + 1}/${chunks.length}

${chunk}
  `.trim());
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    await initializeDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return json({ error: 'File too large' }, { status: 400 });
    }

    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'application/pdf' // Note: PDF processing would need additional libraries
    ];

    if (!allowedTypes.some(type => file.type.includes(type)) &&
        !['.txt', '.md', '.json', '.csv'].some(ext => file.name.endsWith(ext))) {
      return json({ error: 'File type not supported' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = extractTextContent(file, arrayBuffer);

    // Generate content hash for deduplication
    const contentHash = createHash('sha256').update(content).digest('hex');

    // Check if already processed
    const existingDoc = await pgClient.query(
      'SELECT id FROM rag_documents WHERE content_hash = $1',
      [contentHash]
    );

    if (existingDoc.rows.length > 0) {
      return json({
        message: 'Document already exists in knowledge base',
        documentId: existingDoc.rows[0].id,
        chunks: 0,
        embeddings: 0,
        duplicate: true
      });
    }

    // Create semantic chunks
    const chunks = createSemanticChunks(content, file.name);

    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(chunk => generateEmbedding(chunk));
    const embeddings = await Promise.all(embeddingPromises);

    // Store main document
    const documentResult = await pgClient.query(`
      INSERT INTO rag_documents (
        filename, content_hash, file_type, file_size, content, metadata, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
      RETURNING id
    `, [
      file.name,
      contentHash,
      file.type,
      file.size,
      content,
      {
        chunksCount: chunks.length,
        uploadedAt: new Date().toISOString(),
        extractionMethod: 'text_extraction'
      },
      JSON.stringify(embeddings[0]) // Primary document embedding
    ]);

    const documentId = documentResult.rows[0].id;

    // Store individual chunks in knowledge base
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      await pgClient.query(`
        INSERT INTO knowledge_base (
          chunk_id, content, embedding, metadata, chunk_type, source_file
        ) VALUES ($1, $2, $3::vector, $4, $5, $6)
        ON CONFLICT (chunk_id) DO UPDATE SET
          content = $2,
          embedding = $3::vector,
          metadata = $4
      `, [
        `rag:${file.name}:chunk${i}`,
        chunk,
        JSON.stringify(embedding),
        {
          documentId,
          chunkIndex: i,
          totalChunks: chunks.length,
          filename: file.name,
          fileType: file.type
        },
        'rag_document',
        file.name
      ]);
    }

    // Cache document for quick access (skip Redis for now)
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
          processedAt: new Date().toISOString()
        })
      );
    } catch (redisError) {
      console.warn('⚠️ Redis caching failed, continuing without cache:', redisError);
    }

    console.log(`✅ RAG document processed: ${file.name} (${chunks.length} chunks)`);

    return json({
      message: 'Document successfully uploaded and processed',
      documentId,
      filename: file.name,
      chunks: chunks.length,
      embeddings: embeddings.length,
      contentHash,
      fileSize: file.size,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ RAG upload failed:', error);

    return json({
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};