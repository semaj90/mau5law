/// <reference types="vite/client" />
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
// RAG Process API - Cleaned imports (previously corrupted)
import pdf from 'pdf-parse';
import { db, documents, embeddings } from '$lib/server/database';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { qdrantService } from '$lib/services/qdrantService';
import {
  generateEmbeddings as serverGenerateEmbeddings,
  generateEmbedding as serverGenerateEmbedding,
} from '$lib/server/services/embedding-service';
// NOTE: This route intentionally uses local filesystem instead of MinIO for native Windows pipeline.
// Local file storage setup
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'documents');
const OCR_DIR = path.join(process.cwd(), 'uploads', 'ocr-processed');
// Ensure upload directories exist
async function ensureDirectories(): Promise<any> {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
  if (!existsSync(OCR_DIR)) {
    await mkdir(OCR_DIR, { recursive: true });
  }
}
// Local file storage (replaces MinIO)
async function saveFileLocally(file: File, filename: string): Promise<string> {
  await ensureDirectories();
  const filePath = path.join(UPLOADS_DIR, filename);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);
  return filePath;
}
// Tesseract OCR helper (lazy import so project can run without the package installed)
async function ocrWithTesseract(filePath: string): Promise<string> {
  try {
    const mod: any = await import('tesseract.js');
    const createWorker: any = mod.createWorker;
    // createWorker may return a Promise or a worker directly depending on version
    const maybeWorker = createWorker();
    const worker: any = maybeWorker instanceof Promise ? await maybeWorker : maybeWorker;
    // If the worker supports a logger option, initialize with a logger
    if (worker && typeof worker.setLogger === 'function') {
      try {
        worker.setLogger((m: any) => {
          if (import.meta.env.MCP_DEBUG === 'true') console.log('TESSERACT:', m);
        });
      } catch {}
    }
    // Standard worker lifecycle
    if (worker && typeof worker.load === 'function') await worker.load();
    if (worker && typeof worker.loadLanguage === 'function') await worker.loadLanguage('eng');
    if (worker && typeof worker.initialize === 'function') await worker.initialize('eng');
    // Recognize - prefer worker.recognize(filePath) when available
    let result: any;
    if (worker && typeof worker.recognize === 'function') {
      result = await worker.recognize(filePath);
    } else {
      result = worker;
    }
    if (worker && typeof worker.terminate === 'function') await worker.terminate();
    // Extract text from OCR result with simplified access pattern
    if (result?.data?.text) {
      return result.data.text;
    } else if (result?.text) {
      return result.text;
    } else {
      return '';
    }
  } catch (err: any) {
    console.warn('Tesseract OCR failed or not installed:', err?.message || err);
    return `
      [OCR ERROR: Tesseract failed or not available. Install 'tesseract.js' and native tesseract binaries]
    `.trim();
  }
}
// OCR processing using native libraries and Tesseract.js for images
async function processWithOCR(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      // PDF text extraction via pdf-parse
      const buffer = await require('fs/promises').readFile(filePath);
      const data = await pdf(buffer);
      // If pdf-parse returns little or no text, fallback to running OCR on the first page image (not implemented here)
      if (
        data &&
        typeof (data as { text?: any }).text === 'string' &&
        (data as { text?: any }).text.trim().length > 50
      ) {
        return (data as { text?: any }).text;
      }
      // Fallback message when PDF appears scanned and pdf-parse didn't extract text
      return `[OCR NOTICE: PDF had limited extractable text. Consider running page-image OCR or installing a PDF->image converter to feed Tesseract.]`;
    } else if (mimeType.startsWith('image/')) {
      // Use Tesseract.js for images (lazy import)
      const text = await ocrWithTesseract(filePath);
      return text;
    } else if (mimeType === 'text/plain' || mimeType.includes('text')) {
      // Plain text files
      const content = await require('fs/promises').readFile(filePath, 'utf-8');
      return content;
    }
    return `[UNSUPPORTED FILE TYPE: ${mimeType}]`;
  } catch (error: any) {
    console.error('OCR processing failed:', error);
    return `[OCR ERROR: ${error.message}]`;
  }
}
// Save document to database with native processing
async function saveDocument(docData: {
  filename: string;
  content: string;
  metadata: any;
  confidence?: number;
  legalAnalysis?: unknown;
  filePath: string;
}): Promise<any> {
  try {
    const [result] = await db
      .insert(documents)
      .values({
        filename: docData.filename,
        content: docData.content,
        originalContent: docData.content,
        metadata: docData.metadata,
        confidence: docData.confidence,
        legalAnalysis: docData.legalAnalysis,
      })
      .returning();
    return result;
  } catch (error: any) {
    console.error('Failed to save document to database:', error);
    throw error;
  }
}
// Generate embeddings using the server embedding service (wrapper)
async function generateEmbeddings(content: string, documentId: string): Promise<any> {
  try {
    const trimmed = content.substring(0, 8000);
    const resp = await serverGenerateEmbeddings({ texts: [trimmed], model: 'nomic-embed-text' });
    const embeddingArray = resp.embeddings[0];
    if (!Array.isArray(embeddingArray)) throw new Error('Embedding response malformed');

    const TARGET_DB_DIM = parseInt(import.meta.env.EMBEDDING_DIM || '768', 10);
    const TARGET_QDRANT_DIM = parseInt(import.meta.env.VECTOR_DIM || import.meta.env.EMBEDDING_DIM || '768', 10);
    let adjusted = embeddingArray;
    if (adjusted.length !== TARGET_DB_DIM) {
      if (adjusted.length > TARGET_DB_DIM) adjusted = adjusted.slice(0, TARGET_DB_DIM);
      else if (adjusted.length < TARGET_DB_DIM)
        adjusted = adjusted.concat(Array(TARGET_DB_DIM - adjusted.length).fill(0));
      console.warn(`Adjusted embedding length to ${TARGET_DB_DIM}`);
    }

    // Store in PostgreSQL (pgvector)
    await db.insert(embeddings).values({
      documentId: documentId,
      content: content.substring(0, 1000),
      embedding: adjusted,
      metadata: {
        model: resp.source || 'server-embedding-service',
        contentLength: content.length,
        generatedAt: new Date().toISOString(),
        embeddingDim: TARGET_DB_DIM,
      },
      model: resp.source || 'server-embedding-service',
    });

    // Prepare vector for Qdrant (slice/pad if different dimension)
    let qdrantVector = adjusted;
    if (TARGET_QDRANT_DIM !== TARGET_DB_DIM) {
      if (qdrantVector.length > TARGET_QDRANT_DIM) qdrantVector = qdrantVector.slice(0, TARGET_QDRANT_DIM);
      else if (qdrantVector.length < TARGET_QDRANT_DIM)
        qdrantVector = qdrantVector.concat(Array(TARGET_QDRANT_DIM - qdrantVector.length).fill(0));
    }

    await qdrantService.upsert('legal-documents', [
      {
        id: documentId,
        vector: qdrantVector,
        payload: {
          content: content.substring(0, 1000),
          documentId: documentId,
          model: resp.source || 'server-embedding-service',
          dbEmbeddingDim: TARGET_DB_DIM,
          qdrantEmbeddingDim: TARGET_QDRANT_DIM,
        },
      },
    ]);
    return resp;
  } catch (error: any) {
    console.error('Failed to generate embeddings:', error);
    throw error;
  }
}
// Legal analysis using local Gemma3-legal model
async function performLegalAnalysis(content: string): Promise<any> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3-legal',
        prompt: `Analyze this legal document and provide:
1. Document type classification
2. Key parties and entities
3. Important dates and monetary amounts
4. Legal implications summary
5. Confidence score (0-1)
Document content:
${content.substring(0, 4000)}`,
        stream: false,
      }),
    });
    if (!(response as { ok?: any; statusText?: any; json?: any }).ok) {
      console.warn('Legal analysis unavailable, using basic analysis');
      return {
        documentType: 'Unknown',
        confidence: 0.5,
        analysis: 'Basic analysis - legal model not available',
      };
    }
    const result = await (response as { ok?: any; statusText?: any; json?: any }).json();
    return {
      analysis: (result as { data?: any; text?: any; embedding?: any; embeddings?: any; response?: any }).response,
      confidence: 0.8,
      model: 'gemma3-legal',
      analyzedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Legal analysis failed:', error);
    return {
      documentType: 'Unknown',
      confidence: 0.3,
      analysis: `Analysis failed: ${error.message}`,
    };
  }
}
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const enableOCR = formData.get('enableOCR') === 'true';
    const enableEmbedding = formData.get('enableEmbedding') === 'true';
    const enableRAG = formData.get('enableRAG') === 'true';
    if (!files.length) {
      return json({ error: 'No files provided' }, { status: 400 });
    }
    const results = [];
    for (const file of files) {
      const docId = uuidv4();
      const filename = `${docId}-${file.name}`;
      try {
        // Save file locally
        const filePath = await saveFileLocally(file, filename);
        console.log('File saved locally:', filePath);
        // Process with OCR if enabled
        let content = '';
        if (enableOCR) {
          content = await processWithOCR(filePath, file.type);
          console.log('OCR processing completed, content length:', content.length);
        } else {
          // Basic file reading for non-OCR processing
          if (file.type === 'text/plain' || file.type.includes('text')) {
            const arrayBuffer = await file.arrayBuffer();
            content = new TextDecoder().decode(arrayBuffer);
          } else {
            content = `[File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}]`;
          }
        }
        // Perform legal analysis if content available
        let legalAnalysis = null;
        if (content && content.length > 50) {
          legalAnalysis = await performLegalAnalysis(content);
          console.log('Legal analysis completed for document:', docId);
        }
        // Save document to database
        const documentRecord = await saveDocument({
          filename: file.name,
          content,
          metadata: {
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            enableOCR,
            enableEmbedding,
            enableRAG,
            localPath: filePath,
            ocrProcessed: enableOCR,
            contentLength: content.length,
          },
          confidence: legalAnalysis?.confidence || 0.7,
          legalAnalysis,
          filePath,
        });
        console.log('Document saved to database:', documentRecord.id);
        // Generate embeddings if enabled
        let embeddingResult = null;
        if (enableEmbedding && content && content.length > 10) {
          try {
            embeddingResult = await generateEmbeddings(content, documentRecord.id);
            console.log('Embeddings generated and stored for document:', documentRecord.id);
          } catch (embeddingError) {
            console.error('Embedding generation failed:', embeddingError);
          }
        }
        results.push({
          documentId: documentRecord.id,
          filename: file.name,
          status: 'processed',
          localPath: filePath,
          ocrProcessed: enableOCR,
          embeddingGenerated: !!embeddingResult,
          legalAnalysisComplete: !!legalAnalysis,
          contentLength: content.length,
          confidence: legalAnalysis?.confidence || 0.7,
          size: file.size,
          processedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error(`Failed to process file ${file.name}:`, error);
        results.push({
          filename: file.name,
          status: 'error',
          error: error.message,
          size: file.size,
        });
      }
    }
    return json({
      success: true,
      results,
      totalFiles: files.length,
      successfulUploads: results.filter(item => item.length),
      processingPipeline: {
        storage: 'Local file system',
        database: 'PostgreSQL with pgvector',
        vectorSearch: 'Qdrant',
        embeddings: 'Ollama (nomic-embed-text)',
        legalAnalysis: 'Gemma3-legal model',
        ocr: 'Native PDF parsing + image processing',
      },
    });
  } catch (error: any) {
    console.error('RAG process error:', error);
    return json({ error: 'Failed to process files', details: error.message }, { status: 500 });
  }
};
export const GET: RequestHandler = async () => {
  return json({
    service: 'Native Windows RAG Process API',
    status: 'healthy',
    pipeline: {
      storage: 'Local file system',
      database: 'PostgreSQL with pgvector',
      vectorSearch: 'Qdrant',
      embeddings: 'Ollama (nomic-embed-text)',
      legalAnalysis: 'Gemma3-legal model',
      ocr: 'Native PDF parsing + image processing'
    },
    endpoints: {
      process: 'POST /api/rag/process',
      status: 'GET /api/rag/status',
      search: 'POST /api/rag/search'
    },
    features: [
      'OCR text extraction (PDF, images)',
      'Embedding generation with Ollama',
      'Vector storage in Qdrant',
      'Legal document analysis',
      'PostgreSQL metadata storage',
      'Native Windows file handling'
    ]
  })
}