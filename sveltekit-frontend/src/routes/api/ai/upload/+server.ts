import type { RequestHandler } from '@sveltejs/kit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CONFIG } from '$lib/config/env.server';
import { db } from '$lib/server/db/drizzle';
import { documents } from '$lib/server/db/schema';
import { redis } from '$lib/server/redis';

const s3 = new S3Client({
	endpoint: CONFIG.MINIO_URL || process.env.MINIO_ENDPOINT || 'http://minio:9000',
	region: 'us-east-1',
	credentials: {
		accessKeyId: CONFIG.MINIO_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'minioadmin',
		secretAccessKey: CONFIG.MINIO_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'minioadmin'
	},
	forcePathStyle: true
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const form = await request.formData();
		const file = form.get('file') as File | null;
		if (!file) {
			return new Response(JSON.stringify({ success: false, error: 'No file provided' }), { status: 400 });
		}

		const fileId = crypto.randomUUID();
		const key = `uploads/${fileId}_${file.name}`;
		const buffer = Buffer.from(await file.arrayBuffer());

		await s3.send(
			new PutObjectCommand({
				Bucket: CONFIG.MINIO_BUCKET || process.env.MINIO_BUCKET || 'legal-documents',
				Key: key,
				Body: buffer,
				ContentType: file.type || 'application/octet-stream'
			})
		);

		// Persist metadata in Postgres via Drizzle (adjust column names to your schema)
		await db.insert(documents).values({
			id: fileId,
			title: file.name,
			size: file.size,
			content_type: file.type || null,
			minio_path: key,
			uploaded_at: new Date()
		});

		// Cache minimal record for quick retrieval
		await redis.set(`doc:${fileId}`, JSON.stringify({ id: fileId, name: file.name, key }), { EX: 3600 });

		return new Response(JSON.stringify({ success: true, id: fileId, name: file.name }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Upload failed:', err);
		return new Response(JSON.stringify({ success: false, error: 'Upload failed' }), { status: 500 });
	}
};
