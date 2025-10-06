import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import type { RequestHandler } from './$types.js';

// Ensure upload directory exists
const UPLOAD_DIR = './uploads';

// Basic upload handler
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    const fileId = randomUUID();
    const fileName = `${fileId}_${file.name}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return json({
      success: true,
      fileId,
      originalFilename: file.name,
      storedFilename: fileName,
      filePath,
      size: file.size,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Upload error:', error.message);
    } else {
      console.error('Upload error:', error);
    }
    return json({ error: 'Upload failed' }, { status: 500 });
  }
};
