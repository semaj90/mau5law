/**
 * Gallery Upload API - File Upload Handler
 * Handles file uploads for all media types in the gallery system
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '$lib/server/database';
import { evidence, cases } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { URL } from "url";

const UPLOAD_DIR = 'uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain', 'text/csv', 'application/json', 'application/xml',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  // Video
  'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

export interface UploadResponse {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    type: string;
    url: string;
    uploadPath: string;
    thumbnailUrl?: string;
  };
  error?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string || null;
    const category = formData.get('category') as string || 'general';
    const title = formData.get('title') as string || '';
    const description = formData.get('description') as string || '';
    const isPublic = formData.get('isPublic') === 'true';
    const tags = formData.get('tags') as string || '';

    // Validate file
    if (!file || file.size === 0) {
      throw error(400, 'No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw error(400, `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw error(400, `File type not allowed: ${file.type}`);
    }

    // Validate case ID if provided
    if (caseId) {
      const caseExists = await db
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1)
        .execute();

      if (caseExists.length === 0) {
        throw error(400, 'Case not found');
      }
    }

    // Create upload directory structure
    const uploadDir = path.join(process.cwd(), 'static', UPLOAD_DIR);
    const categoryDir = path.join(uploadDir, category);
    const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dateDir = path.join(categoryDir, yearMonth);

    if (!existsSync(dateDir)) {
      await mkdir(dateDir, { recursive: true });
    }

    // Generate unique filename
    const fileId = randomUUID();
    const fileExtension = path.extname(file.name);
    const filename = `${fileId}${fileExtension}`;
    const filePath = path.join(dateDir, filename);
    const relativePath = path.join(UPLOAD_DIR, category, yearMonth, filename).replace(/\\/g, '/');

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Generate metadata
    const metadata = {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      category,
      fileExtension,
      dimensions: await getImageDimensions(buffer, file.type),
      checksum: generateChecksum(buffer)
    };

    // Save to database as evidence
    const evidenceData = {
      id: fileId,
      title: title || file.name,
      description: description || null,
      fileName: filename,
      originalFileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath: relativePath,
      caseId: caseId || null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      metadata,
      isPublic,
      uploadedAt: new Date(),
      processedAt: null,
      ocrText: null,
      contentText: null,
      embedding: null
    };

    await db.insert(evidence).values(evidenceData).execute();

    // Generate thumbnail if it's an image
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = await generateThumbnail(filePath, fileId, category, yearMonth);
    }

    // Trigger background processing
    await triggerBackgroundProcessing(fileId, {
      type: 'file_upload',
      category,
      fileType: file.type,
      caseId,
      needsOCR: needsOCR(file.type),
      needsEmbedding: true,
      needsThumbnail: !thumbnailUrl
    });

    const response: UploadResponse = {
      success: true,
      file: {
        id: fileId,
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: `/uploads/${relativePath}`,
        uploadPath: relativePath,
        thumbnailUrl
      }
    };

    return json(response, {
      headers: {
        'X-Upload-ID': fileId,
        'X-File-Size': file.size.toString(),
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err) {
    console.error('Upload error:', err);

    if (err instanceof Error && err.message.includes('400')) {
      throw error(400, err.message);
    }

    throw error(500, `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

async function getImageDimensions(buffer: Buffer, mimeType: string): Promise<{ width?: number; height?: number } | null> {
  try {
    // Simple image dimension detection for common formats
    if (mimeType === 'image/jpeg') {
      return getJPEGDimensions(buffer);
    }
    if (mimeType === 'image/png') {
      return getPNGDimensions(buffer);
    }
    // Add more formats as needed
    return null;
  } catch (error) {
    return null;
  }
}

function getJPEGDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    let i = 2; // Skip SOI marker
    while (i < buffer.length) {
      if (buffer[i] === 0xFF) {
        const marker = buffer[i + 1];
        if (marker >= 0xC0 && marker <= 0xC3) { // SOF markers
          return {
            height: buffer.readUInt16BE(i + 5),
            width: buffer.readUInt16BE(i + 7)
          };
        }
        i += 2 + buffer.readUInt16BE(i + 2);
      } else {
        i++;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getPNGDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // PNG signature is 8 bytes, IHDR chunk starts at byte 8
    if (buffer.length < 24) return null;

    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  } catch (error) {
    return null;
  }
}

function generateChecksum(buffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function generateThumbnail(filePath: string, fileId: string, category: string, yearMonth: string): Promise<string | undefined> {
  try {
    // TODO: Implement thumbnail generation using sharp or similar library
    // For now, return the original image URL for images
    return `/uploads/${category}/${yearMonth}/thumb_${fileId}.jpg`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return undefined;
  }
}

function needsOCR(fileType: string): boolean {
  return fileType === 'application/pdf' ||
         fileType.startsWith('image/') ||
         fileType.includes('document');
}

async function triggerBackgroundProcessing(fileId: string, options: {
  type: string;
  category: string;
  fileType: string;
  caseId?: string | null;
  needsOCR: boolean;
  needsEmbedding: boolean;
  needsThumbnail: boolean;
}) {
  try {
    // TODO: Integrate with Redis or NATS for background job processing
    // For now, we'll just log the processing request
    console.log(`Background processing triggered for file ${fileId}:`, options);

    // Could send to Redis queue like this:
    // await redis.xAdd('file_processing:requests', '*', {
    //   fileId,
    //   type: options.type,
    //   timestamp: Date.now().toString(),
    //   ...options
    // });

  } catch (error) {
    console.error('Failed to trigger background processing:', error);
    // Don't throw here as upload was successful
  }
}

// GET endpoint for upload status and history
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const fileId = url.searchParams.get('fileId');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (fileId) {
      // Get specific file status
      const fileData = await db
        .select()
        .from(evidence)
        .where(eq(evidence.id, fileId))
        .limit(1)
        .execute();

      if (fileData.length === 0) {
        throw error(404, 'File not found');
      }

      return json({
        file: fileData[0],
        processingStatus: {
          uploaded: true,
          ocrComplete: !!fileData[0].ocrText,
          embeddingComplete: !!fileData[0].embedding,
          processed: !!fileData[0].processedAt
        }
      });
    }

    // Get recent uploads
    const query = db
      .select({
        id: evidence.id,
        title: evidence.title,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        uploadedAt: evidence.uploadedAt,
        processedAt: evidence.processedAt,
        caseId: evidence.caseId
      })
      .from(evidence)
      .orderBy(evidence.uploadedAt)
      .limit(limit);

    if (category && category !== 'all') {
      // TODO: Add category filtering when metadata structure is confirmed
    }

    const recentUploads = await query.execute();

    return json({
      uploads: recentUploads,
      total: recentUploads.length
    });

  } catch (err) {
    console.error('Upload status error:', err);
    throw error(500, `Failed to get upload status: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};