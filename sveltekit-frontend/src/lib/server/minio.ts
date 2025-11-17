import type { Client  } from 'minio';
import type { env  } from '$env /dynamic/private';

export class MinIOService {
  client = new Client({
    endPoint: env.MINIO_HOST ?? 'localhost',
    port: parseInt(env.MINIO_PORT ?? '9000'),
    useSSL: env.MINIO_USE_SSL === 'true',
    accessKey: env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: env.MINIO_SECRET_KEY ?? 'minioadmin',
  });
  bucket = env.MINIO_BUCKET ?? 'legal-docs';

  async uploadFile(file: File, userId: string) {
    try {
      if (!(await this.client.bucketExists(this.bucket))) {
        await this.client.makeBucket(this.bucket);
      }

      const key = `${userId}/${Date.now()}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await this.client.putObject(this.bucket, key, buffer);

      const url =
        process.env.MINIO_USE_SSL === 'true'
          ? `https://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/${this.bucket}/${key}`
          : `http://${process.env.MINIO_HOST}:${process.env.MINIO_PORT}/${this.bucket}/${key}`;

      return { bucket: this.bucket, key, url };
    } catch (error) {
      console.error('MinIO upload error:', error);
      throw error;
    }
  }
}
