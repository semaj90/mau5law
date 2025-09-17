import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import path from 'path';
import type { RequestHandler } from './$types';

export interface EmbeddingRequest {
	text: string;
	model?: 'embeddinggemma:latest' | 'nomic-embed-text:latest';
}

export interface EmbeddingResponse {
	embedding: number[];
	dimensions: number;
	model: string;
	processing_time_ms: number;
}

export interface SimilaritySearchRequest {
	query: string;
	top_k?: number;
	model?: string;
}

export interface SimilarityResult {
	text: string;
	similarity: number;
	clause_type: string;
	risk_level: string;
	id: number;
}

export interface SimilaritySearchResponse {
	results: SimilarityResult[];
	query_embedding: number[];
	processing_time_ms: number;
}

// Generate 512-dimension embedding using the adapter
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as EmbeddingRequest;
		const { text, model = 'embeddinggemma:latest' } = body;

		if (!text || text.trim().length === 0) {
			return json({ error: 'Text is required' }, { status: 400 });
		}

		const startTime = Date.now();

		// Call the Python embedding adapter
		const pythonScript = path.join(process.cwd(), 'embedding_adapter_512.py');

		const result = await new Promise<EmbeddingResponse>((resolve, reject) => {
			const python = spawn('python', ['-c', `
import sys
sys.path.append('${process.cwd().replace(/\\/g, '\\\\')}')
from embedding_adapter_512 import EmbeddingAdapter512
import json

adapter = EmbeddingAdapter512()
embedding = adapter.get_legal_embedding_512('${text.replace(/'/g, "\\'")}')
result = {
    "embedding": embedding.tolist(),
    "dimensions": len(embedding),
    "model": "${model}",
    "processing_time_ms": 0
}
print(json.dumps(result))
			`]);

			let output = '';
			let error = '';

			python.stdout.on('data', (data) => {
				output += data.toString();
			});

			python.stderr.on('data', (data) => {
				error += data.toString();
			});

			python.on('close', (code) => {
				if (code !== 0) {
					reject(new Error(`Python process failed: ${error}`));
					return;
				}

				try {
					// Extract JSON from output (last line)
					const lines = output.trim().split('\n');
					const jsonLine = lines[lines.length - 1];
					const result = JSON.parse(jsonLine);
					result.processing_time_ms = Date.now() - startTime;
					resolve(result);
				} catch (e) {
					reject(new Error(`Failed to parse result: ${e}`));
				}
			});
		});

		return json(result);

	} catch (error) {
		console.error('Embedding generation error:', error);
		return json(
			{ error: 'Failed to generate embedding', details: error.message },
			{ status: 500 }
		);
	}
};