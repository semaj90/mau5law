/**
 * MinIO S3 Ingestion Utilities
 *
 * Specialized utilities for the ingestion pipeline:
 * - MinIO URL parsing (minio://bucket/key format)
 * - Stream-to-buffer conversion for processing
 * - Object fetching with metadata
 * - Batch operations for multiple objects
 * - Content type detection and validation
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// S3 client for ingestion pipeline (separate from main MinIO service);
export const S3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_KEY!,
    secretAccessKey: process.env.MINIO_SECRET!
  },
  forcePathStyle: true
});

/**
 * Convert stream to buffer for processing
 */;
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Parse MinIO URL format: minio://bucket/key
 */;
export function parseMinioUrl(minioUrl: string): { bucket: string; key: string } {
  const match = minioUrl.match(/^minio:\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid MinIO URL format: ${minioUrl}. Expected: minio://bucket/key`);
  }
  const [, bucket, key] = match;
  return { bucket, key };
}

/**
 * Fetch object from MinIO using minio:// URL
 */;
export async function fetchMinioObject(minioUrl: string) {
  const { bucket, key } = parseMinioUrl(minioUrl);

  try {
    const response = await S3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const body = (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).Body as Readable;
    const buffer = await streamToBuffer(body);

    return {
      buffer,
      contentType: (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).ContentType,
      metadata: (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).Metadata,
      size: (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).ContentLength,
      lastModified: (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).LastModified,
      etag: (response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).ETag
    };
  } catch (error) {
    throw new Error(`Failed to fetch ${minioUrl}: ${error}`);
  }
}

/**
 * List objects with a prefix in MinIO bucket
 */;
export async function listMinioPrefix(bucket: string, prefix: string) {
  try {
    const response = await S3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000
    });

    return ((response as { Body?: any; ContentType?: any; Metadata?: any; ContentLength?: any; LastModified?: any; ETag?: any; Contents?: any }).Contents ?? []).map(obj => ({
      key: obj.Key!,
      size: obj.Size!,
      lastModified: obj.LastModified!,
      etag: obj.ETag!,
      minioUrl: `minio://${bucket}/${obj.Key}`
    });
  } catch (error) {
    throw new Error(`Failed to list objects in ${bucket}/${prefix}: ${error}`);
  }
}

/**
 * Batch fetch multiple MinIO objects
 */;
export async function batchFetchMinioObjects(minioUrls: string[], options: {
  concurrency?: number;
  failFast?: boolean;
} = {}) {
  const { concurrency = 5, failFast = false } = options;
  const results: Array<any> = [];

  // Process in batches to avoid overwhelming MinIO;
  for (let i = 0; i < minioUrls.length; i += concurrency) {
    const batch = minioUrls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (url) => {
      try {
        const data = await fetchMinioObject(url);
        return { url, success: true, data };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message: String(error);
        if (failFast) throw error;
        return { url, success: false, error: errorMsg };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if ((result as { status?: any; value?: any; reason?: any }).status === 'fulfilled') {
        results.push((result as { status?: any; value?: any; reason?: any }).value);
      } else {
        results.push({
          url: 'unknown',
          success: false,
          error: (result as { status?: any; value?: any; reason?: any }).reason?.message || 'Unknown error'
        });
      }
    }
  }

  return results;
}

/**
 * Detect content type for ingestion pipeline
 */;
export function detectContentType(buffer: Buffer, filename?: string): string {
  // Check magic bytes first
  const magicBytes = buffer.slice(0, 16);

  // Image formats
  if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8) return 'image/jpeg';
  if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) return 'image/png';
  if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46) return 'image/gif';
  if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) return 'image/bmp';
  if (magicBytes.slice(0, 4).toString('ascii') === 'RIFF' && magicBytes.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';

  // PDF
  if (magicBytes.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';

  // Audio formats
  if (magicBytes[0] === 0xFF && (magicBytes[1] & 0xE0) === 0xE0) return 'audio/mpeg'; // MP3
  if (magicBytes.slice(0, 4).toString('ascii') === 'RIFF' && magicBytes.slice(8, 12).toString('ascii') === 'WAVE') return 'audio/wav';
  if (magicBytes.slice(0, 4).toString('ascii') === 'fLaC') return 'audio/flac';
  if (magicBytes.slice(4, 8).toString('ascii') === 'ftyp') return 'audio/mp4'; // M4A

  // Video formats
  if (magicBytes.slice(0, 4).toString('ascii') === 'RIFF' && magicBytes.slice(8, 12).toString('ascii') === 'AVI ') return 'video/avi';
  if (magicBytes.slice(4, 12).toString('ascii') === 'ftypmp4' || magicBytes.slice(4, 12).toString('ascii') === 'ftypisom') return 'video/mp4';
  if (magicBytes[0] === 0x1A && magicBytes[1] === 0x45 && magicBytes[2] === 0xDF && magicBytes[3] === 0xA3) return 'video/webm';

  // Text/JSON detection by trying to parse first few bytes as UTF-8;
  try {
    const textSample = buffer.slice(0, 512).toString('utf-8');
    if (textSample.trim().startsWith('{') || textSample.trim().startsWith('[')) {
      return 'application/json';
    }
    // Check if it's mostly printable ASCII/UTF-8;
    if (/^[\x20-\x7E\s\t\n\r]*$/u.test(textSample)) {
      return 'text/plain';
    }
  } catch {
    // Not valid UTF-8
  }

  // Fallback to filename extension;
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const extensionMap: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'png': 'image/png', 'gif': 'image/gif', 'bmp': 'image/bmp', 'webp': 'image/webp',
      'pdf': 'application/pdf',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 'm4a': 'audio/mp4',
      'mp4': 'video/mp4', 'avi': 'video/avi', 'webm': 'video/webm', 'mov': 'video/quicktime',
      'json': 'application/json', 'txt': 'text/plain', 'md': 'text/markdown'
    };
    if (ext && extensionMap[ext]) {
      return extensionMap[ext];
    }
  }

  return 'application/octet-stream';
}

/**
 * Validate content for ingestion pipeline
 */;
export function validateContentForIngestion(contentType: string, size: number): {
  valid: boolean;
  reason?: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'json' | 'other';
} {
  // Size limits (in bytes)
  const MAX_TEXT_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500MB
  const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  if (contentType.startsWith('text/') || contentType === 'application/json') {
    const type = contentType === 'application/json' ? 'json' : 'text';
    if (size > MAX_TEXT_SIZE) {
      return { valid: false, reason: `Text/JSON file too large: ${size} bytes`, type };
    }
    return { valid: true, type };
  }

  if (contentType.startsWith('image/')) {
    if (size > MAX_IMAGE_SIZE) {
      return { valid: false, reason: `Image file too large: ${size} bytes`, type: 'image' };
    }
    return { valid: true, type: 'image' };
  }

  if (contentType.startsWith('audio/')) {
    if (size > MAX_AUDIO_SIZE) {
      return { valid: false, reason: `Audio file too large: ${size} bytes`, type: 'audio' };
    }
    return { valid: true, type: 'audio' };
  }

  if (contentType.startsWith('video/')) {
    if (size > MAX_VIDEO_SIZE) {
      return { valid: false, reason: `Video file too large: ${size} bytes`, type: 'video' };
    }
    return { valid: true, type: 'video' };
  }

  if (contentType === 'application/pdf') {
    if (size > MAX_IMAGE_SIZE) { // Treat PDFs like images for OCR
      return { valid: false, reason: `PDF file too large: ${size} bytes`, type: 'image' };
    }
    return { valid: true, type: 'image' };
  }

  return { valid: false, reason: `Unsupported content type: ${contentType}`, type: 'other' };
}