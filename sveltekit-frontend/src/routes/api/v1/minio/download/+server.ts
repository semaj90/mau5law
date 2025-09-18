import type { RequestHandler } from './$types.js';
import { minioService } from '$lib/server/storage/minio-service';

/**
 * MinIO File Download API
 * GET: Download file by bucket and filename
 * Query parameters: bucket, file
 */

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Initialize MinIO service
    const initialized = await minioService.initialize();
    if (!initialized) {
      return new Response(JSON.stringify({
        error: 'MinIO service unavailable'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract query parameters
    const bucket = url.searchParams.get('bucket');
    const fileName = url.searchParams.get('file');

    if (!bucket || !fileName) {
      return new Response(JSON.stringify({
        error: 'bucket and file parameters are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get file from MinIO
    const fileData = await minioService.getFile(bucket, fileName);

    if (!fileData) {
      return new Response(JSON.stringify({
        error: 'File not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return file with proper headers
    const headers = new Headers();
    headers.set('Content-Type', fileData.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${fileData.originalName || fileName}"`);
    headers.set('Content-Length', fileData.size.toString());
    headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    return new Response(fileData.buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('File download error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message: 'Failed to download file',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * POST: Get signed URL for client-side download (for large files)
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { bucket, fileName, expirySeconds = 3600 } = await request.json();

    if (!bucket || !fileName) {
      return new Response(JSON.stringify({
        error: 'bucket and fileName are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize MinIO service
    const initialized = await minioService.initialize();
    if (!initialized) {
      return new Response(JSON.stringify({
        error: 'MinIO service unavailable'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate presigned URL for download
    const downloadUrl = await minioService.getPresignedDownloadUrl(bucket, fileName, expirySeconds);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl,
      expiresIn: expirySeconds,
      bucket,
      fileName,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message: 'Failed to generate download URL',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};