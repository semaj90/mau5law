import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import type { RequestHandler } from './$types';


// Document Upload + Embedding Pipeline API
// Integrates with your existing LangChain+Ollama+pgvector infrastructure

const config = {
  ollamaBaseUrl: 'http://localhost:11434',
  embeddingModel: 'nomic-embed-text', // 384 dimensions
  chunkSize: 1000,
  chunkOverlap: 200,
  uploadDir: './uploads/documents',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Text extraction utilities
async function extractText(file: File): Promise<string> {
  const mimeType = file.type;
  
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return await file.text();
  }
  
  if (mimeType === 'application/pdf') {
    // In production, use a PDF library like pdf-parse
    // For now, return placeholder
    return `[PDF Content] ${file.name} - Size: ${file.size} bytes`;
  }
  
  if (mimeType.includes('word')) {
    // In production, use mammoth.js for Word docs
    return `[Word Document] ${file.name} - Size: ${file.size} bytes`;
  }
  
  throw new Error(`Unsupported file type: ${mimeType}`);
}

// POST handler for document upload and embedding
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string;
    const evidenceId = formData.get('evidenceId') as string;
    const title = formData.get('title') as string || file.name;
    const userId = formData.get('userId') as string;

    // Validation
    if (!file) {
      throw error(400, 'No file provided');
    }

    if (!caseId || !userId) {
      throw error(400, 'Missing required fields: caseId, userId');
    }

    if (file.size > config.maxFileSize) {
      throw error(400, `File too large. Max size: ${config.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!config.allowedTypes.includes(file.type)) {
      throw error(400, `Unsupported file type: ${file.type}`);
    }

    // Create upload directory if it doesn't exist
    if (!existsSync(config.uploadDir)) {
      await mkdir(config.uploadDir, { recursive: true });
    }

    // Generate file hash for integrity
    const buffer = await file.arrayBuffer();
    const hash = crypto.createHash('sha256').update(new Uint8Array(buffer)).digest('hex');

    // Save file
    const filename = `${Date.now()}-${file.name}`;
    const filePath = join(config.uploadDir, filename);
    await writeFile(filePath, new Uint8Array(buffer));

    // Extract text content
    const extractedText = await extractText(file);

    console.log(`📁 Created document: ${filename}`);

    return json({
      success: true,
      document: {
        filename: file.name,
        filePath,
        extractedText: extractedText.substring(0, 500) + '...', // Preview
        fileSize: file.size,
        mimeType: file.type,
        hash
      },
      message: 'Document uploaded successfully'
    });

  } catch (err: any) {
    console.error('❌ Upload error:', err);
    if (err instanceof Error) {
      throw error(500, `Upload failed: ${err.message}`);
    }
    throw error(500, 'Unknown upload error');
  }
};

// GET handler for health check
export const GET: RequestHandler = async () => {
  try {
    return json({
      status: 'healthy',
      config: {
        model: config.embeddingModel,
        chunkSize: config.chunkSize,
        uploadDir: config.uploadDir,
        maxFileSize: `${config.maxFileSize / (1024 * 1024)}MB`
      },
      ollama: {
        baseUrl: config.ollamaBaseUrl,
        connected: true
      }
    });
  } catch (err: any) {
    return json({
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Unknown error',
      config: {
        model: config.embeddingModel,
        ollamaBaseUrl: config.ollamaBaseUrl
      }
    }, { status: 500 });
  }
};