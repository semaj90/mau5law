/**
 * MinIO Service for file storage operations
 * Handles file uploads, downloads, and management in MinIO S3-compatible storage
 */
import { Client } from 'minio';

export class MinIOService {
  private client: Client;

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  async uploadFile(file: File, userId: string): Promise<{
    key: string;
    bucket: string;
    url: string;
  }> {
    const bucket = 'legal-documents';
    const key = `${userId}/${Date.now()}-${file.name}`;

    // Ensure bucket exists
    const bucketExists = await this.client.bucketExists(bucket);
    if (!bucketExists) {
      await this.client.makeBucket(bucket);
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file
    await this.client.putObject(bucket, key, buffer, {
      'Content-Type': file.type,
      'Content-Length': file.size,
    });

    const url = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucket}/${key}`;

    return { key, bucket, url };
  }

  async downloadFile(key: string, bucket: string = 'legal-documents'): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string, bucket: string = 'legal-documents'): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  async getFileUrl(key: string, bucket: string = 'legal-documents', expires: number = 3600): Promise<string> {
    return await this.client.presignedGetObject(bucket, key, expires);
  }
}