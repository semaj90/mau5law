import type { Actions, PageServerLoad } from './$types';
import { Client as MinioClient } from 'minio';
import { db } from '$lib/server/db';
import { documents } from '$lib/server/db/enhanced-embedding-schema';
import { DocumentUploadSchema, type UploadData } from './schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	// Provide a minimal initial form object instead of calling superValidate with a Zod schema.
	// The action performs validation with Zod, so the load only needs to initialize shape for the client.
	const form = {
		valid: true,
		data: {
			title: '',
			tags: undefined,
			file: undefined
		} as UploadData,
		errors: {}
	};

	return { form };
};

function makeMinioClient() {
	return new MinioClient({
		endPoint: process.env.MINIO_ENDPOINT ?? '127.0.0.1',
		port: Number(process.env.MINIO_PORT ?? 9000),
		useSSL: false,
		accessKey: process.env.MINIO_ACCESS_KEY ?? '',
		secretKey: process.env.MINIO_SECRET_KEY ?? ''
	});
}

export const actions: Actions = {
	default: async ({ request }) => {
		// parse multipart/form-data manually and validate with Zod to avoid superValidate overload/type issues
		// destructure request from the action event to satisfy linter rules
		const fd = await request.formData();
		const title = (fd.get('title') as string) ?? '';
		const tags = (fd.get('tags') as string | null);
		const file = fd.get('file') as File | null;

		// validate using Zod schema
		const parsed = DocumentUploadSchema.safeParse({ title, tags, file });

		// minimal form-like object compatible with existing code paths
		const form = {
			valid: parsed.success,
			data: (parsed.success ? (parsed.data as UploadData) : { title, tags: tags ?? undefined, file: file ?? undefined }),
			errors: parsed.success ? {} : parsed.error.format()
		};

		if (!form.valid) return fail(400, { form });

		if (!file) {
			// mark form invalid and return 400
			return fail(400, { form: { ...form, valid: false, errors: { file: ['No file provided'] } } });
		}

		try {
			const minio = makeMinioClient();
			const bucket = 'legal-documents';
			await minio.makeBucket(bucket).catch(() => undefined);
			const objectName = `${Date.now()}-${file.name}`;
			const buffer = Buffer.from(await file.arrayBuffer());
			const uploadRes = await minio.putObject(bucket, objectName, buffer);

			const tagsArray: string[] = typeof tags === 'string'
				? tags.split(',').map((t) => t.trim()).filter(Boolean)
				: [];

			await db.insert(documents).values({
				title,
				tags: tagsArray,
				content: '',
				sourceUri: `minio://${bucket}/${objectName}`
			});

			let etag = 'ok';
			if (uploadRes && typeof uploadRes === 'object' && uploadRes !== null) {
				const rec = uploadRes as Record<string, unknown>;
				if ('etag' in rec && typeof rec.etag === 'string') etag = rec.etag;
			}

			return { form, result: { message: `File uploaded successfully (${etag})` } };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			return { form, result: { error: `Upload failed: ${msg}` } };
		}
	}
};
