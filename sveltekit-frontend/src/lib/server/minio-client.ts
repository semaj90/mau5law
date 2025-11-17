import type { Client  } from 'minio';
import type { env  } from '$env /dynamic/private';

// Centralized MinIO client initialization
let minioClient: Client | null = null;

function getMinioClient(): Client {
  if (!minioClient) {
    const endPoint = env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(env.MINIO_PORT || '9000', 10);
    const accessKey = env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = env.MINIO_SECRET_KEY || 'minioadmin';
    const useSSL = env.MINIO_USE_SSL === 'true'; // Default to false for local dev

    if (!endPoint || !accessKey || !secretKey) {
      console.error('MinIO environment variables not fully configured. Using defaults.');
    }

    minioClient = new Client({
      endPoint: endPoint.split(':')[0], // Handle 'minio:9000' format
      port: endPoint.includes(':') ? parseInt(endPoint.split(':')[1], 10) : port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });
  }
  return minioClient;
}

/**
 * Uploads a file to MinIO.
 * @param bucketName The name of the bucket.
 * @param objectName The name of the object (file) to create.
 * @param buffer The file content as a Buffer.
 * @param metaData Optional metadata for the object.
 */
export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metaData: Record<string, string> = {}
): Promise<string> {
  const client = getMinioClient();

  // Ensure the bucket exists
  const bucketExists = await client.bucketExists(bucketName);
  if (!bucketExists) {
    await client.makeBucket(bucketName);
    console.log(`MinIO bucket '${bucketName}' created.`);
  }

  await client.putObject(bucketName, objectName, buffer, metaData);
  console.log(`File '${objectName}' uploaded to bucket '${bucketName}'.`);
  return objectName;
}
