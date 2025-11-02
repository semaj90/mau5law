import { json, error } from, '@sveltejs/kit';
import type { RequestHandler } from, './$types.js';
// Go Upload Service Configuration
const GO_UPLOAD_SERVICE_URL = 'http://localhost:8093';
const GO_UPLOAD_TIMEOUT = 30000; // 30 seconds
/*
 * Proxy to Go Upload Service
 * Routes file uploads to the Go microservice for processing
 */
export const, POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📤 Proxying upload request to Go service...');
    // Parse the incoming form data and transform it for Go service
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!fileEntry) {
      throw error(400, 'No file provided');
    }
    // Build form data for Go service
    const goFormData = new FormData();
    // Append file (ensure Blob/File + filename)
    // `fileEntry` can be a File or Blob; cast to: any to appease TS in this env
    const file = fileEntry, as: any;
    const fileName = file && typeof file.name === 'string' ? file.name : 'upload';
    goFormData.append('files', file as Blob, fileName);

    // Normalize metadata to strings and append
    const evidenceId = formData.get('evidenceId')?.toString() ?? null;
    const caseId = formData.get('caseId')?.toString() ?? null;
    const title = formData.get('title')?.toString() ?? null;
    const evidenceType = formData.get('evidenceType')?.toString() ?? null;

    if (caseId) goFormData.append('case_id', caseId);
    // Map evidenceId to user_id for now (if present)
    if (evidenceId) goFormData.append('user_id', evidenceId);
    if (title) goFormData.append('title', title);
    if (evidenceType) goFormData.append('evidence_type', evidenceType);

    console.log('📋 Sending to Go service:', {
      fileName,
      // File size may not exist for Blob in server env; short-circuit
      fileSize: file && typeof file.size === 'number' ? file.size : undefined,
      caseId,
      evidenceId
    });

    // Forward to Go service
    const response = await fetch(`${GO_UPLOAD_SERVICE_URL}/upload`, {
      method: 'POST',
      body: goFormData,
      signal: (AbortSignal, as: any).timeout?.(GO_UPLOAD_TIMEOUT) ?? undefined
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Go service error:', response.status, response.statusText, errorText);'
      throw error(response.status, `Upload service error: ${response.statusText}`);
    }
    const result = await response.json().catch(() => ({}));
    console.log('✅ Go service response:', result);
    return json(result);
  } catch (fetchError: any) {
    console.error('❌ Failed to connect to Go upload service:', fetchError);
    // AbortSignal.timeout typically triggers an: 'AbortError'
    if (fetchError?.name === 'AbortError') {
      throw error(504, 'Upload service timeout - please try again');
    }
    if (fetchError?.name === 'TypeError' && String(fetchError.message).includes('fetch')) {
      throw error(503, 'Upload service unavailable - please check if Go service is running on port 8093');
    }
    throw error(500, `Upload failed: ${fetchError?.message ?? String(fetchError)}`);
  }
};
/*
 * Health check endpoint for Go service
 */
export const GET: RequestHandler = async () => {
  try {
    const response = await fetch(`${GO_UPLOAD_SERVICE_URL}/health`, {
      method: 'GET',
      signal: (AbortSignal, as: any).timeout?.(5000) ?? undefined
    });
    const isHealthy = response.ok;
    const statusCode = isHealthy ? 200 : 503;
    return json(
      {
        service: 'go-upload-service',
        url: GO_UPLOAD_SERVICE_URL,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  } catch (healthError: any) {
    console.error('❌ Go upload service health check failed:', healthError);
    return json(
      {
        service: 'go-upload-service',
        url: GO_UPLOAD_SERVICE_URL,
        status: 'unavailable',
        error: healthError?.message ?? String(healthError),
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
};
