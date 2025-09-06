import type { RequestHandler } from './$types';
import { minioService } from '$lib/server/storage/minio-service';

// Lightweight MinIO direct upload endpoint
// Accepts multipart/form-data with field name "file". Optional ?bucket= override.

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }
    const bucket = url.searchParams.get('bucket') || undefined;
    const ok = await minioService.initialize(); // idempotent ensure client ready
    if (!ok) {
      return new Response(JSON.stringify({ error: 'MinIO unavailable' }), { status: 503 });
    }
    const result = await minioService.uploadFile(file, file.name, { bucket });
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || 'Upload failed' }), { status: 500 });
    }
    return new Response(JSON.stringify({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      bucket: result.bucket,
      size: result.size,
      url: result.url,
      metadata: result.metadata
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
};
