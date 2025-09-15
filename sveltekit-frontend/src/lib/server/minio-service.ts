/**
 * MinIO S3-Compatible Object Storage Configuration and Utilitiasync function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  // Handle Node.js Readable stream
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}
 * - S3-compatible client setup for MinIO
 * - Text extraction from various file formats
 * - Stream handling for large files
 * - Error handling and retry logic
 * - File type detection and parsing
 */

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

// Types for MinIO operations
interface MinIOConfig {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  bucket: string;
}

interface TextExtractionResult {
  content: string;
  metadata: {
    originalSize: number;
    extractedSize: number;
    contentType: string;
    processingTime: number;
  };
}

// MinIO client configuration
const createMinIOClient = (): InstanceType<typeof S3Client> => {
  const config: MinIOConfig = {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    forcePathStyle: true, // Required for MinIO
  };

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
};

// Global MinIO client instance
const minioClient = createMinIOClient();

// Helper function to stream S3 object to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  // Handle Node.js Readable stream
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to detect file type from key/content
function detectFileType(key: string, contentType?: string): string {
  const extension = key.split('.').pop()?.toLowerCase() || '';

  if (contentType) {
    if (contentType.includes('json')) return 'json';
    if (contentType.includes('text')) return 'text';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('html')) return 'html';
  }

  // Fallback to extension
  switch (extension) {
    case 'json': return 'json';
    case 'txt': case 'text': case 'md': case 'markdown': return 'text';
    case 'pdf': return 'pdf';
    case 'xml': return 'xml';
    case 'html': case 'htm': return 'html';
    case 'csv': return 'csv';
    case 'log': return 'log';
    default: return 'unknown';
  }
}

// Main MinIO utility class
export class MinIOService {
  private static client = minioClient;

  /**
   * Parse MinIO URL and extract bucket and key
   */
  static parseMinIOUrl(minioUrl: string): { bucket: string; key: string } {
    const match = minioUrl.match(/^minio:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid MinIO URL format: ${minioUrl}. Expected: minio://bucket/key`);
    }

    const [, bucket, key] = match;
    return { bucket, key };
  }

  /**
   * Load and extract text content from MinIO object
   */
  static async getTextContent(
    minioUrl: string,
    options: {
      maxSize?: number;
      timeout?: number;
      extractPlainText?: boolean
    } = {}
  ): Promise<TextExtractionResult> {
    const startTime = Date.now();
    const { maxSize = 10 * 1024 * 1024, timeout = 30000, extractPlainText = true } = options;

    try {
      const { bucket, key } = this.parseMinIOUrl(minioUrl);

      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from MinIO');
      }

      // Check file size
      const contentLength = response.ContentLength || 0;
      if (contentLength > maxSize) {
        throw new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`);
      }

      const body = response.Body as Readable;
      const rawContent = await streamToString(body);
      const fileType = detectFileType(key, response.ContentType);

      let extractedContent = rawContent;

      // Apply content extraction based on file type
      if (extractPlainText) {
        extractedContent = await this.extractPlainText(rawContent, fileType);
      }

      const processingTime = Date.now() - startTime;

      return {
        content: extractedContent,
        metadata: {
          originalSize: rawContent.length,
          extractedSize: extractedContent.length,
          contentType: response.ContentType || 'application/octet-stream',
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`MinIO text extraction failed for ${minioUrl}:`, error);
      throw new Error(`MinIO extraction failed (${processingTime}ms): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract plain text from various file formats
   */
  private static async extractPlainText(content: string, fileType: string): Promise<string> {
    switch (fileType) {
      case 'json':
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return content; // Return as-is if parsing fails
        }

      case 'xml':
        // Simple XML to text extraction (remove tags)
        return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      case 'html':
        // Simple HTML to text extraction (remove tags)
        return content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      case 'csv':
        // Convert CSV to readable format
        const lines = content.split('\n');
        return lines.map(line => line.split(',').join(' | ')).join('\n');

      case 'log':
        // Extract log entries, remove timestamps if needed
        return content
          .split('\n')
          .map(line => line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '').trim())
          .filter(line => line.length > 0)
          .join('\n');

      case 'text':
      default:
        return content;
    }
  }

  /**
   * Store text content in MinIO
   */
  static async storeTextContent(
    bucket: string,
    key: string,
    content: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
        Metadata: metadata,
      });

      await this.client.send(command);
      return `minio://${bucket}/${key}`;

    } catch (error) {
      console.error(`Failed to store content in MinIO:`, error);
      throw error;
    }
  }

  /**
   * Upload large file using multipart upload
   */
  static async uploadLargeFile(
    bucket: string,
    key: string,
    content: Buffer | Uint8Array | string,
    contentType?: string
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: content,
          ContentType: contentType || 'application/octet-stream',
        },
      });

      await upload.done();
      return `minio://${bucket}/${key}`;

    } catch (error) {
      console.error(`Failed to upload large file to MinIO:`, error);
      throw error;
    }
  }

  /**
   * List objects in bucket with optional prefix filter
   */
  static async listObjects(
    bucket: string,
    prefix?: string,
    maxKeys: number = 1000
  ): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);

      return (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        bucket,
      }));

    } catch (error) {
      console.error(`Failed to list MinIO objects:`, error);
      throw error;
    }
  }

  /**
   * Check if object exists in MinIO
   */
  static async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata without downloading content
   */
  static async getObjectMetadata(bucket: string, key: string): Promise<FileMetadata | null> {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        bucket,
      };
    } catch {
      return null;
    }
  }

  /**
   * Batch process multiple MinIO URLs for text extraction
   */
  static async batchExtractText(
    minioUrls: string[],
    options: { concurrency?: number; maxSize?: number } = {}
  ): Promise<Array<any> {
    const { concurrency = 5, maxSize = 10 * 1024 * 1024 } = options;
    const results: Array<any> = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < minioUrls.length; i += concurrency) {
      const batch = minioUrls.slice(i, i + concurrency);

      const batchPromises = batch.map(async (url) => {
        try {
          const result = await this.getTextContent(url, { maxSize });
          return { url, result };
        } catch (error) {
          return {
            url,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}

// Export default instance for convenience
export default MinIOService;