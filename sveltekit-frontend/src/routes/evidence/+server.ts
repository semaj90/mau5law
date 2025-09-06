import { json } from "@sveltejs/kit";

import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';


// A light wrapper that accepts multipart form uploads and stores the file in MinIO under 'evidence' bucket.
export const POST: RequestHandler = (async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get('file') as File;
    const caseId = form.get('caseId') as string || 'unknown';

    if (!file) return json({ success: false, error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = randomUUID();
    const objectName = `${id}_${file.name}`;

    await putObject('evidence', objectName, buffer, {
      'x-amz-meta-case-id': caseId,
      'x-amz-meta-original-name': file.name,
    });

    return json({ success: true, id, objectName });
  } catch (err: any) {
    console.error('Evidence upload error', err);
    return json({ success: false, error: (err as any)?.message || 'upload error' }, { status: 500 });
  }
});
