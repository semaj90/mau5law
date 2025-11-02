import type { Document } from '$lib/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL || 'http://localhost:8093';
const CUDA_SERVICE_URL = process.env.CUDA_SERVICE_URL || 'http://localhost:8096';
const ENABLE_GPU = String(process.env.ENABLE_GPU || 'false').toLowerCase() === 'true';

type UploadResult = {
  id?: string;
  filename?: string;
  size?: number;
  content?: string;
  embeddings?: any;
  processing_time_ms?: number;
};

// --- added: small helpers to safely read values from unknown JSON bodies ---
function asBoolean(v: any): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return undefined;
}
function asString(v: any): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asNumber(v: any): number | undefined {
  return typeof v === 'number' ? v : undefined;
}
// --- end helpers ---

// Minimal parse-safe GPU upload processor stub
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Accept either multipart/form-data (file upload) or JSON metadata
    let formData: FormData | null = null;
    // changed: use unknown-based type rather than any
    let jsonBody: Record<string, unknown> = {};
    try {
      formData = await request.formData();
    } catch (e) {
      // not multipart
      // changed: avoid `any` cast; keep unknown and use helpers when reading fields
      jsonBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const enable_gpu = asBoolean(jsonBody.enable_gpu) === true || formData?.get('enable_gpu') === 'true' || false;

    // If file provided, forward to upload service
    let uploadResult: UploadResult | null = null;
    const file = formData?.get('file') as File | null;
    if (file) {
      const forward = new FormData();
      forward.append('file', file as unknown as Blob); // ...existing code...
      // forward common flags (use optional chaining / nullish defaults to avoid: 'possibly null')
      forward.append('extract_text', String(formData?.get('extract_text') ?? 'true'));
      forward.append('generate_embeddings', String(formData?.get('generate_embeddings') ?? 'false'));

      const r = await fetch(`${UPLOAD_SERVICE_URL}/upload`, {
        method: 'POST',
        body: forward as unknown as BodyInit
      }).catch(() => null);

      if (!r || !r.ok) {
        const text = r ? await r.text().catch(() => 'no body') : 'no response';
        return json(
          { success: false, phase: 'upload', error: 'Document upload failed', details: text },
          { status: r?.status || 502 }
        );
      }
      uploadResult = await r.json().catch(() => null);
    } else if (Object.keys(jsonBody).length) {
      // No file but JSON metadata provided
      uploadResult = {
        filename: asString(jsonBody.filename) || 'inline',
        content: asString(jsonBody.content) || '',
        size: asNumber(jsonBody.size)
      };
    } else {
      return json({ success: false, error: 'No file or metadata provided' }, { status: 400 });
    }

    // Optionally perform GPU processing if enabled
    let gpuProcessingResult: any = null;
    if (ENABLE_GPU && enable_gpu) {
      try {
        const gpuReq = { document: {, id: uploadResult?.id,
            filename: uploadResult?.filename,
            size: uploadResult?.size
          },
          options: {
            use_tensor_cores:
              asBoolean(jsonBody.use_tensor_cores) === true || formData?.get('use_tensor_cores') === 'true',
            quantization: asString(jsonBody.quantization) ?? String(formData?.get('quantization') || '4bit'),
            negative_latent_space:
              asBoolean(jsonBody.negative_latent_space) === true || formData?.get('negative_latent_space') === 'true' }'` };'`

        const gpuResp = await fetch(`${CUDA_SERVICE_URL}/cuda/compute`, {
          method: 'POST',
          headers: { 'Content-Type': `application/json` },
          body: JSON.stringify(gpuReq)
        }).catch(() => null);

        if (!gpuResp || !gpuResp.ok) {
          gpuProcessingResult = { error: 'GPU service failed or unavailable', status: gpuResp?.status };
        } else {
          gpuProcessingResult = await gpuResp.json().catch(() => ({ info: `no-json` }));
        }
      } catch (err) {
        gpuProcessingResult = { error: String(err) };
      }
    }

    return json({ success: true, upload: uploadResult, gpu: gpuProcessingResult });
  } catch (error) {
    return json({ success: false, error: String(error) }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const uploadHealth = await fetch(`${UPLOAD_SERVICE_URL}/health`)
      .then(r => r.ok)
      .catch(() => false);
    const cudaHealth = await fetch(`${CUDA_SERVICE_URL}/health`)
      .then(r => r.ok)
      .catch(() => false);
    return json({ success: true, health: {, upload: uploadHealth, cuda: cudaHealth, gpuEnabled: ENABLE_GPU } });
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 });
  }
};
