import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, evidence } from '$lib/server/db/client.js';
import { minioService } from '$lib/server/storage/minio-service.js';
import crypto from 'node:crypto';
import { sql, eq, desc } from 'drizzle-orm';

function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export const GET: RequestHandler = async ({ url }) => {
  // Presigned download
  const downloadId = url.searchParams.get('download');
  if (downloadId) {
    try {
      const results = await db
        .select({
          storageBucket: sql`'legal-documents'`, // Default bucket since not in schema
          objectName: evidence.fileName,
          mimeType: evidence.mimeType,
          title: evidence.title,
        })
        .from(evidence)
        .where(eq(evidence.id, downloadId))
        .limit(1);

      if (!results.length) return json({ success: false, error: 'Not found' }, { status: 404 });
      const rec = results[0];

      await minioService.initialize();
      const urlSigned = await minioService.getFileUrl(
        'legal-documents',
        rec.objectName || '',
        60 * 10
      ); // 10 min expiry
      return json({
        success: true,
        url: urlSigned,
        fileName: rec.objectName,
        title: rec.title,
      });
    } catch (error) {
      console.error('Download error:', error);
      return json({ success: false, error: 'Failed to generate download URL' }, { status: 500 });
    }
  }

  const id = url.searchParams.get('id');
  if (id) {
    try {
      const results = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);

      if (!results.length) return json({ success: false, error: 'Not found' }, { status: 404 });
      return json({ success: true, record: results[0] });
    } catch (error) {
      console.error('Get evidence error:', error);
      return json({ success: false, error: 'Failed to retrieve evidence' }, { status: 500 });
    }
  }

  // List evidence files
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const results = await db
      .select({
        id: evidence.id,
        title: evidence.title,
        evidenceType: evidence.evidenceType,
        fileSize: evidence.fileSize,
        mimeType: evidence.mimeType,
        uploadedAt: evidence.createdAt,
      })
      .from(evidence)
      .orderBy(desc(evidence.createdAt))
      .limit(limit);

    return json({ success: true, items: results });
  } catch (error) {
    console.error('List evidence error:', error);
    return json({ success: false, error: 'Failed to list evidence' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return json({ success: false, error: 'file missing' }, { status: 400 });

    const title = (formData.get('title') as string) || file.name;
    const caseId = formData.get('case_id') as string | null;
    const evidenceType = (formData.get('evidence_type') as string) || 'UNKNOWN';

    await minioService.initialize();
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const checksum = sha256(buffer);

    // Check for duplicate by checksum
    const existingEvidence = await db
      .select({ id: evidence.id })
      .from(evidence)
      .where(eq(evidence.hash, checksum))
      .limit(1);

    if (existingEvidence.length) {
      return json({ success: true, duplicate: true, id: existingEvidence[0].id });
    }

    const upload = await minioService.uploadFile(buffer, file.name, { bucket: 'legal-documents' });
    if (!upload.success) {
      return json({ success: false, error: upload.error || 'upload failed' }, { status: 500 });
    }

    const newEvidence = await db
      .insert(evidence)
      .values({
        caseId: caseId || null,
        title,
        description: null,
        evidenceType,
        fileType: upload.metadata.fileType || null,
        fileUrl: upload.metadata.url || null,
        fileName: upload.metadata.fileName,
        fileSize: upload.metadata.fileSize || null,
        mimeType: upload.metadata.mimeType || null,
        hash: checksum,
        tags: [],
        chainOfCustody: [],
        labAnalysis: {},
        aiAnalysis: {},
        aiTags: [],
        isAdmissible: true,
        confidentialityLevel: 'standard',
        canvasPosition: {},
        uploadedBy: null, // TODO: Get from session
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: evidence.id, createdAt: evidence.createdAt });

    return json({ success: true, record: newEvidence[0], upload });
  } catch (error) {
    console.error('Upload error:', error);
    return json({ success: false, error: 'Failed to upload evidence' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return json({ success: false, error: 'id required' }, { status: 400 });

    // Get file info before deletion
    const evidenceToDelete = await db
      .select({
        fileName: evidence.fileName,
        fileUrl: evidence.fileUrl,
      })
      .from(evidence)
      .where(eq(evidence.id, id))
      .limit(1);

    if (!evidenceToDelete.length) {
      return json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Delete from database
    const deletedEvidence = await db
      .delete(evidence)
      .where(eq(evidence.id, id))
      .returning({ id: evidence.id });

    if (!deletedEvidence.length) {
      return json({ success: false, error: 'Failed to delete from database' }, { status: 500 });
    }

    // Delete from storage
    const fileName = evidenceToDelete[0].fileName;
    if (fileName) {
      await minioService.initialize();
      await minioService.deleteFile('legal-documents', fileName);
    }

    return json({ success: true, id });
  } catch (error) {
    console.error('Delete error:', error);
    return json({ success: false, error: 'Failed to delete evidence' }, { status: 500 });
  }
};
