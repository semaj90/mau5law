import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import path from 'path';
import type { RequestHandler } from './$types';

const PYTHON_PATH = process.env.PHASE72_PYTHON || 'C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action } = await request.json();

		if (action !== 'cluster') {
			return json({ success: false, error: 'Invalid action' }, { status: 400 });
		}

		// Run clustering pipeline asynchronously
		const scriptPath = path.join(process.cwd(), 'scripts', 'phase89-gpu-streaming-cluster.py');

		const promise = new Promise((resolve, reject) => {
			const proc = spawn(PYTHON_PATH, [scriptPath, '--batch-size', '5000'], {
				cwd: process.cwd(),
				env: { ...process.env }
			});

			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			proc.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('close', (code) => {
				if (code !== 0) {
					reject(new Error(`Pipeline failed: ${stderr}`));
				} else {
					resolve({ stdout, stderr });
				}
			});

			proc.on('error', (err) => {
				reject(err);
			});
		});

		// Don't await - return immediately with job ID
		const jobId = Date.now().toString();

		promise
			.then(() => {
				console.log(`✅ Clustering job ${jobId} completed`);
			})
			.catch((err) => {
				console.error(`❌ Clustering job ${jobId} failed:`, err);
			});

		return json({
			success: true,
			job_id: jobId,
			message: 'Clustering pipeline started in background',
			status_url: `/api/phase89/status`
		});
	} catch (error) {
		console.error('Pipeline start failed:', error);
		return json({ success: false, error: String(error) }, { status: 500 });
	}
};
