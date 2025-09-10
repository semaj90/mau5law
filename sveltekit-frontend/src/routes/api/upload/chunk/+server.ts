
import { error, json } from '@sveltejs/kit';
import { tmpdir } from "os";
import { join } from 'path';
import { appendFile, mkdir } from 'fs/promises';
import type { RequestHandler } from './$types';


const UPLOAD_DIR = join(tmpdir(), "chunked-uploads");

// Receives and appends a single chunk
export const POST: RequestHandler = async ({ request }) => {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const formData = await (request as any).formData();
    const chunk = formData.get('chunk') as File;
    const fileId = formData.get('fileId') as string;

    if (!chunk || !fileId) {
      throw error(400, 'Invalid chunk data.');
    }
    const tempFilePath = join(UPLOAD_DIR, fileId);
    await appendFile(tempFilePath, Buffer.from(await chunk.arrayBuffer()));

    return json({ success: true });
  } catch (err: any) {
    console.error(err);
    throw error(500, 'Failed to process chunk.');
  }
};
