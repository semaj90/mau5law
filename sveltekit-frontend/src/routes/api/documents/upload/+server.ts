import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { db } from '$lib/server/db';
import { documents, document_processing } from '$lib/server/db/schema-postgres';
import { rabbitMQService, createDocumentProcessingJob } from '$lib/services/rabbitmq-service';
import type { RequestHandler } from './$types.js';
import { URL } from "url";


const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_SERVICE_URL = 'http://localhost:8093';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ 
        error: 'Invalid file type. Only PDF, JPEG, PNG, and TXT files are allowed.' 
      }, { status: 400 });
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return json({ 
        error: 'File size too large. Maximum size is 50MB.' 
      }, { status: 400 });
    }
    
    // Generate document ID
    const documentId = uuidv4();
    
    // Create initial database record
    const [document] = await db.insert(documents).values({
      id: documentId,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      case_id: caseId || null,
      user_id: userId || null,
      status: 'uploading',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    // Forward to Go upload service
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('documentId', documentId);
    uploadFormData.append('caseId', caseId || '');
    uploadFormData.append('userId', userId || '');
    
    try {
      const uploadResponse = await fetch(`${UPLOAD_SERVICE_URL}/upload`, {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'X-Request-ID': documentId,
          'X-User-ID': userId || 'anonymous'
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload service error: ${uploadResponse.statusText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      
      // Update document record with upload result
      await db.update(documents)
        .set({
          s3_key: uploadResult.s3Key,
          s3_bucket: uploadResult.s3Bucket,
          status: 'uploaded',
          updated_at: new Date()
        })
        .where({ id: documentId });
      
      // Create processing record
      await db.insert(document_processing).values({
        id: uuidv4(),
        document_id: documentId,
        status: 'queued',
        processing_type: 'full_analysis',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Publish to RabbitMQ queue for background processing (Step 3)
      const processingJob = createDocumentProcessingJob(
        documentId,
        uploadResult.s3Key,
        uploadResult.s3Bucket,
        file.name,
        file.type,
        file.size,
        {
          caseId,
          userId,
          processingType: 'full_analysis',
          priority: 5
        }
      );
      
      const jobPublished = await rabbitMQService.publishDocumentProcessingJob(processingJob);
      
      if (!jobPublished) {
        console.warn(`Failed to publish job to RabbitMQ for document: ${documentId}`);
        // Continue anyway - document is uploaded and database record exists
      }
      
      return json({
        success: true,
        documentId,
        message: 'File uploaded successfully and queued for processing',
        s3Key: uploadResult.s3Key,
        processingStatus: 'queued',
        jobQueueStatus: jobPublished ? 'published' : 'failed'
      }, { status: 202 });
      
    } catch (uploadError) {
      console.error('Upload service error:', uploadError);
      
      // Update document status to failed
      await db.update(documents)
        .set({
          status: 'upload_failed',
          error_message: uploadError.message,
          updated_at: new Date()
        })
        .where({ id: documentId });
      
      return json({
        error: 'Upload failed',
        details: uploadError.message,
        documentId
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Document upload error:', error);
    
    return json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const documentId = url.searchParams.get('documentId');
    const caseId = url.searchParams.get('caseId');
    const userId = url.searchParams.get('userId');
    
    let query = db.select().from(documents);
    
    if (documentId) {
      const document = await db.select()
        .from(documents)
        .where({ id: documentId })
        .limit(1);
        
      return json({ document: document[0] || null });
    }
    
    if (caseId) {
      const caseDocuments = await db.select()
        .from(documents)
        .where({ case_id: caseId })
        .orderBy(documents.created_at.desc);
        
      return json({ documents: caseDocuments });
    }
    
    if (userId) {
      const userDocuments = await db.select()
        .from(documents)
        .where({ user_id: userId })
        .orderBy(documents.created_at.desc)
        .limit(100);
        
      return json({ documents: userDocuments });
    }
    
    return json({ error: 'Missing required parameters' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Document retrieval error:', error);
    
    return json({
      error: 'Failed to retrieve documents',
      details: error.message
    }, { status: 500 });
  }
};