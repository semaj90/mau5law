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
import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Define a type for the S3 client configuration specific to MinIO
interface MinioS3ClientConfig {
  endpoint: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle: boolean;
}

/**
 * Helper function to get the S3Client instance, encapsulating configuration logic.
 * Handles local MinIO endpoints and ensures robust environment variable usage.
 */
export function getMinioS3Client(): S3Client {
  const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
  const region = process.env.MINIO_REGION || "us-east-1";
  const accessKeyId = process.env.MINIO_KEY || "minioadmin";
  const secretAccessKey = process.env.MINIO_SECRET || "minioadmin";
  return new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
}

// S3 client for ingestion pipeline (separate from main MinIO service)
export const S3 = getMinioS3Client();

/**
 * Convert stream to buffer for processing
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
/**
 * Parse MinIO URL format: minio://bucket/key
 */
export function parseMinioUrl(url: string): { bucket: string; key: string } {
  const match = url.match(/^minio:\/\/([^\/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid MinIO URL: ${url}`);
  }
  const [, bucket, key] = match;
  return { bucket, key };
}
/**
 * Fetch object from MinIO using minio:// URL
 */
export async function fetchMinioObject(url: string) {
  const { bucket, key } = parseMinioUrl(url);
  try {
    const res = await S3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buffer = await streamToBuffer(res.Body as Readable);
    return { buffer, contentType: res.ContentType, metadata: res.Metadata, size: res.ContentLength };
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error}`);
  }
}

export async function uploadMinioObject(bucket: string, key: string, file: File, userId: string) {
	const buffer = Buffer.from(await file.arrayBuffer());
	await S3.send(new PutObjectCommand({ Bucket: bucket, Key: `${userId}/${key}`, Body: buffer, ContentType: file.type }));
	return `minio://${bucket}/${userId}/${key}`;
}
