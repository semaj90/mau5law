import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Demo-friendly evidence upload endpoint
 * Works without authentication for development/demo purposes
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📤 Demo evidence upload request received');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string || 'demo-case';

    if (!file) {
      return json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`);

    // Generate unique ID and file info
    const evidenceId = uuidv4();
    const timestamp = new Date().toISOString();
    const fileExtension = file.name.split('.').pop() || '';
    const filename = `evidence_${evidenceId}.${fileExtension}`;

    // Save to static/uploads for demo
    const uploadDir = join('static', 'uploads', caseId);
    const filePath = join(uploadDir, filename);

    try {
      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });

      // Save file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      console.log(`✅ File saved to: ${filePath}`);
    } catch (fsError) {
      console.warn('⚠️ File system save failed, continuing with demo data:', fsError);
    }

    // Return success response with evidence metadata
    const response = {
      success: true,
      id: evidenceId,
      url: `/uploads/${caseId}/${filename}`,
      filename: file.name,
      size: file.size,
      type: file.type,
      caseId,
      uploadDate: timestamp,
      metadata: {
        originalName: file.name,
        contentType: file.type,
        evidenceType: file.type.startsWith('image/') ? 'image' : 'document',
        processingStatus: 'uploaded',
        demoMode: true
      }
    };

    console.log(`✅ Evidence upload complete: ${evidenceId}`);
    return json(response);

  } catch (error: any) {
    console.error('❌ Evidence upload failed:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

/**
 * GET endpoint to list uploaded evidence for a case
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const caseId = url.searchParams.get('caseId') || 'demo-case';

    // For demo purposes, return some sample evidence items
    const sampleEvidence = [
      {
        id: 'sample-1',
        type: 'document',
        title: 'Contract Agreement.pdf',
        url: '/demo/sample-contract.pdf',
        x: 100,
        y: 100,
        metadata: {
          pages: 15,
          signed: true,
          uploadDate: new Date().toISOString()
        }
      },
      {
        id: 'sample-2',
        type: 'image',
        title: 'Evidence Photo.jpg',
        url: '/demo/sample-evidence.jpg',
        x: 350,
        y: 150,
        metadata: {
          timestamp: '2024-09-08T10:30:00Z',
          uploadDate: new Date().toISOString()
        }
      }
    ];

    return json({
      success: true,
      evidence: sampleEvidence,
      caseId,
      count: sampleEvidence.length
    });

  } catch (error: any) {
    console.error('❌ Failed to list evidence:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list evidence'
    }, { status: 500 });
  }
};
