import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import path from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	return new Promise((resolve) => {
		const scriptPath = path.join(process.cwd(), 'scripts', 'phase89-rag-kag-analyzer.mjs');

		const process = spawn('node', [scriptPath], {
			cwd: process.cwd(),
			stdio: 'inherit'
		});

		process.on('close', (code) => {
			if (code === 0) {
				resolve(json({ success: true, message: 'Analysis generated successfully' }));
			} else {
				resolve(json({ success: false, error: `Process exited with code ${code}` }, { status: 500 }));
			}
		});

		process.on('error', (err) => {
			resolve(json({ success: false, error: err.message }, { status: 500 }));
		});
	});
};
