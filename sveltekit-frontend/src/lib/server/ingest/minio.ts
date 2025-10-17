/**
 * MinIO S3 Service for production-grade ingestion and file handling.
 *
 * This service provides a hardened interface for interacting with a MinIO
 * object storage backend, tailored for the authenticated upload/ingestion pipeline.
 *
 * - Securely connects to MinIO using environment variables.
 * - Provides utilities for parsing MinIO-specific URLs.
 * - Handles file uploads with user-scoping (e.g., `bucket/userId/filename`).
 * - Fetches objects and their metadata.
 * - Converts S3 object streams to buffers for processing.
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Initialize S3 client for MinIO
function getMinioS3Client(): S3Client {
  const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const region = process.env.MINIO_REGION || 'us-east-1';
  const accessKeyId = process.env.MINIO_KEY || 'minioadmin';
  const secretAccessKey = process.env.MINIO_SECRET || 'minioadmin';
  return new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
}

export const S3 = getMinioS3Client();

/**
 * Converts a Readable stream into a Buffer.
 * More robustly handles chunks that may or may not be buffers.
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * Parses a MinIO-specific URL format (minio://bucket/key) into its components.
 */
export function parseMinioUrl(url: string): { bucket: string; key: string } {
  const match = url.match(/^minio:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid MinIO URL: ${url}`);
  return { bucket: match[1], key: match[2] };
}

/**
 * Fetches an object from MinIO using its URL and returns its contents and metadata.
 */
export async function fetchMinioObject(url: string) {
  const { bucket, key } = parseMinioUrl(url);
  const res = await S3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = await streamToBuffer(res.Body as Readable);
  return { buffer, contentType: res.ContentType, metadata: res.Metadata, size: res.ContentLength };
}

/**
 * Uploads a file to a specific bucket in MinIO, scoping it under a user's ID.
 * @returns The MinIO URL of the uploaded object.
 */
export async function uploadMinioObject(bucket: string, key: string, file: File, userId: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const objectKey = `${userId}/${key}`;
  await S3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
    })
  );
  return `minio://${bucket}/${objectKey}`;
}