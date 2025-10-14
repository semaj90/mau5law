import { Client as MinioClient } from 'minio';
import { env } from '$env/dynamic/private';

// Parse MINIO_ENDPOINT which may be 'host', 'host:port', or 'http(s)://host:port'
const _raw = env.MINIO_ENDPOINT || 'localhost';
let _host = _raw;
let _port = Number(env.MINIO_PORT || 9000);
let _useSSL = (env.MINIO_USE_SSL || 'false') === 'true';

try {
  if (_raw.includes('://')) {
    const u = new URL(_raw);
    _host = u.hostname;
    if (u.port) _port = Number(u.port);
    _useSSL = u.protocol === 'https:';
  } else if (_raw.includes(':')) {
    const parts = _raw.split(':');
    if (parts.length >= 2) {
      _host = parts[0];
      const p = Number(parts[1]);
      if (!Number.isNaN(p)) _port = p;
    }
  }
} catch (e) {
  // ignore and use defaults
}

const MINIO_ENDPOINT = _host;
const MINIO_PORT = _port;
const MINIO_USE_SSL = _useSSL;
const MINIO_ACCESS_KEY = env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = env.MINIO_SECRET_KEY || 'minioadmin';

export const minio = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});
export async function ensureBucket(bucketName: string): Promise<boolean> {
  try {
    const exists = await minio.bucketExists(bucketName);
    if (!exists) {
      await minio.makeBucket(bucketName);
    }
    return true;
  } catch (err: unknown) {
    // Safe logging for unknown error shapes
    if (err instanceof Error) {
      console.error('MinIO ensureBucket error:', err.message, err);
    } else {
      console.error('MinIO ensureBucket error (non-Error):', err);
    }
    throw err;
  }
}
export async function putObject(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  meta?: Record<string, string>
): Promise<string | undefined> {
  await ensureBucket(bucketName);
  // minio.putObject returns a Promise that resolves to a string (object etag) in most SDK versions.
  return minio.putObject(bucketName, objectName, buffer, meta || {}) as Promise<string | undefined>;
}
