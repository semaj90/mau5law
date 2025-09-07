/*
 * Gallery Item API - Individual Item Operations
 * Handles CRUD operations for specific gallery items
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { evidence, cases } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface GalleryItemDetail {
  id: string;
  type: 'evidence' | 'document' | 'image' | 'ai-generated';
  title: string;
  description?: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  processedAt?: string;
  caseId?: string;
  caseTitle?: string;
  tags: string[];
  metadata: Record<string, any>;
  isPublic: boolean;
  ocrText?: string;
  contentText?: string;
  embedding?: number[];
  processingStatus: {
    uploaded: boolean;
    ocrComplete: boolean;
    embeddingComplete: boolean;
    thumbnailComplete: boolean;
    processed: boolean;
  };
  downloadUrl: string;
  shareUrl: string;
}

export interface UpdateGalleryItemRequest {
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  caseId?: string;
  metadata?: Record<string, any>;
}

// GET - Retrieve specific gallery item
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const itemId = params.id;
    
    if (!itemId) {
      throw error(400, 'Item ID is required');
    }

    // Query evidence table first (most common case)
    const evidenceQuery = await db
      .select({
        id: evidence.id,
        title: evidence.title,
        description: evidence.description,
        fileName: evidence.fileName,
        originalFileName: evidence.originalFileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        filePath: evidence.filePath,
        uploadedAt: evidence.uploadedAt,
        processedAt: evidence.processedAt,
        caseId: evidence.caseId,
        tags: evidence.tags,
        metadata: evidence.metadata,
        isPublic: evidence.isPublic,
        ocrText: evidence.ocrText,
        contentText: evidence.contentText,
        embedding: evidence.embedding,
        caseTitle: cases.title
      })
      .from(evidence)
      .leftJoin(cases, eq(evidence.caseId, cases.id))
      .where(eq(evidence.id, itemId))
      .limit(1)
      .execute();

    if (evidenceQuery.length === 0) {
      throw error(404, 'Gallery item not found');
    }

    const item = evidenceQuery[0];

    // Determine item type based on file type
    let itemType: 'evidence' | 'document' | 'image' | 'ai-generated' = 'evidence';
    if (item.fileType?.startsWith('image/')) {
      itemType = 'image';
    } else if (item.fileType?.includes('document') || item.fileType?.includes('pdf') || item.fileType?.includes('text')) {
      itemType = 'document';
    }
    
    // Check if it's AI-generated based on metadata
    if (item.metadata && typeof item.metadata === 'object' && 'aiGenerated' in item.metadata) {
      itemType = 'ai-generated';
    }

    // Build response
    const response: GalleryItemDetail = {
      id: item.id,
      type: itemType,
      title: item.title || item.fileName || 'Untitled',
      description: item.description || undefined,
      fileName: item.fileName || '',
      originalFileName: item.originalFileName || item.fileName || '',
      fileType: item.fileType || 'unknown',
      fileSize: item.fileSize || 0,
      filePath: item.filePath || '',
      url: `/api/files/evidence/${item.id}`,
      thumbnailUrl: generateThumbnailUrl(item.filePath, item.fileType),
      uploadedAt: item.uploadedAt?.toISOString() || new Date().toISOString(),
      processedAt: item.processedAt?.toISOString(),
      caseId: item.caseId || undefined,
      caseTitle: item.caseTitle || undefined,
      tags: Array.isArray(item.tags) ? item.tags : [],
      metadata: (item.metadata as Record<string, any>) || {},
      isPublic: item.isPublic || false,
      ocrText: item.ocrText || undefined,
      contentText: item.contentText || undefined,
      embedding: item.embedding ? Array.from(item.embedding) : undefined,
      processingStatus: {
        uploaded: true,
        ocrComplete: !!item.ocrText,
        embeddingComplete: !!item.embedding,
        thumbnailComplete: !!generateThumbnailUrl(item.filePath, item.fileType),
        processed: !!item.processedAt
      },
      downloadUrl: `/api/gallery/${itemId}/download`,
      shareUrl: `/gallery/share/${itemId}`
    };

    return json(response, {
      headers: {
        'X-Item-Type': itemType,
        'X-File-Size': (item.fileSize || 0).toString(),
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (err) {
    console.error('Gallery item fetch error:', err);
    
    if (err instanceof Error && err.message.includes('404')) {
      throw error(404, 'Gallery item not found');
    }
    
    throw error(500, `Failed to fetch gallery item: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// PUT - Update gallery item
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const itemId = params.id;
    const updateData: UpdateGalleryItemRequest = await request.json();

    if (!itemId) {
      throw error(400, 'Item ID is required');
    }

    // Validate case ID if provided
    if (updateData.caseId) {
      const caseExists = await db
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, updateData.caseId))
        .limit(1)
        .execute();

      if (caseExists.length === 0) {
        throw error(400, 'Case not found');
      }
    }

    // Build update object with only provided fields
    const updateFields: Partial<typeof evidence.$inferInsert> = {};
    
    if (updateData.title !== undefined) {
      updateFields.title = updateData.title;
    }
    
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description;
    }
    
    if (updateData.tags !== undefined) {
      updateFields.tags = updateData.tags;
    }
    
    if (updateData.isPublic !== undefined) {
      updateFields.isPublic = updateData.isPublic;
    }
    
    if (updateData.caseId !== undefined) {
      updateFields.caseId = updateData.caseId;
    }
    
    if (updateData.metadata !== undefined) {
      // Merge with existing metadata
      const currentItem = await db
        .select({ metadata: evidence.metadata })
        .from(evidence)
        .where(eq(evidence.id, itemId))
        .limit(1)
        .execute();
      
      if (currentItem.length > 0) {
        const existingMetadata = (currentItem[0].metadata as Record<string, any>) || {};
        updateFields.metadata = { ...existingMetadata, ...updateData.metadata };
      } else {
        updateFields.metadata = updateData.metadata;
      }
    }

    // Perform update
    const result = await db
      .update(evidence)
      .set(updateFields)
      .where(eq(evidence.id, itemId))
      .execute();

    if (result.rowCount === 0) {
      throw error(404, 'Gallery item not found');
    }

    // Fetch updated item
    const updatedItem = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, itemId))
      .limit(1)
      .execute();

    return json({
      success: true,
      item: updatedItem[0],
      updated: Object.keys(updateFields)
    });

  } catch (err) {
    console.error('Gallery item update error:', err);
    
    if (err instanceof Error && (err.message.includes('400') || err.message.includes('404'))) {
      throw error(parseInt(err.message.split(' ')[0]) || 500, err.message);
    }
    
    throw error(500, `Failed to update gallery item: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// DELETE - Remove gallery item
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const itemId = params.id;
    
    if (!itemId) {
      throw error(400, 'Item ID is required');
    }

    // Get item details before deletion
    const itemToDelete = await db
      .select({
        id: evidence.id,
        filePath: evidence.filePath,
        fileName: evidence.fileName
      })
      .from(evidence)
      .where(eq(evidence.id, itemId))
      .limit(1)
      .execute();

    if (itemToDelete.length === 0) {
      throw error(404, 'Gallery item not found');
    }

    const item = itemToDelete[0];

    // Delete from database
    const deleteResult = await db
      .delete(evidence)
      .where(eq(evidence.id, itemId))
      .execute();

    if (deleteResult.rowCount === 0) {
      throw error(404, 'Gallery item not found');
    }

    // Delete physical file
    if (item.filePath) {
      try {
        const fullPath = path.join(process.cwd(), 'static', item.filePath);
        if (existsSync(fullPath)) {
          await unlink(fullPath);
        }

        // Also try to delete thumbnail if it exists
        const thumbnailPath = generateThumbnailPath(item.filePath);
        if (thumbnailPath) {
          const fullThumbnailPath = path.join(process.cwd(), 'static', thumbnailPath);
          if (existsSync(fullThumbnailPath)) {
            await unlink(fullThumbnailPath);
          }
        }
      } catch (fileError) {
        console.error('Failed to delete physical file:', fileError);
        // Continue with deletion even if file removal fails
      }
    }

    return json({
      success: true,
      deleted: {
        id: itemId,
        fileName: item.fileName,
        filePath: item.filePath
      }
    });

  } catch (err) {
    console.error('Gallery item deletion error:', err);
    
    if (err instanceof Error && (err.message.includes('400') || err.message.includes('404'))) {
      throw error(parseInt(err.message.split(' ')[0]) || 500, err.message);
    }
    
    throw error(500, `Failed to delete gallery item: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// Helper functions
function generateThumbnailUrl(filePath: string | null, fileType: string | null): string | undefined {
  if (!filePath || !fileType) return undefined;
  
  // For images, generate thumbnail path
  if (fileType.startsWith('image/')) {
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    const dir = pathParts.join('/');
    return `${dir}/thumb_${fileName}`;
  }
  
  // For other file types, return type-specific icons
  if (fileType.includes('pdf')) {
    return '/icons/pdf-thumbnail.svg';
  }
  
  if (fileType.includes('video')) {
    return '/icons/video-thumbnail.svg';
  }
  
  if (fileType.includes('audio')) {
    return '/icons/audio-thumbnail.svg';
  }
  
  if (fileType.includes('document') || fileType.includes('text')) {
    return '/icons/document-thumbnail.svg';
  }
  
  return '/icons/file-thumbnail.svg';
}

function generateThumbnailPath(filePath: string): string | null {
  try {
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    if (!fileName) return null;
    
    const dir = pathParts.join('/');
    return `${dir}/thumb_${fileName}`;
  } catch (error) {
    return null;
  }
}