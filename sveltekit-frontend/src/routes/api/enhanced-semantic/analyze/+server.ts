import { URL } from "url";
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async ({ url }) => {
	try {
		const text = url.searchParams.get('text');
		
		if (!text) {
			return json({
				success: false,
				error: 'Missing text parameter for semantic analysis'
			}, { status: 400 });
		}

		// Forward request to Enhanced Semantic Architecture service
		const response = await fetch(`http://localhost:8095/api/semantic-analysis?text=${encodeURIComponent(text)}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Enhanced Semantic Architecture API returned ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		
		return json({
			success: true,
			data: {
				embedding: data.data.embedding || [],
				som_cluster: data.data.som_cluster || { x: 0, y: 0 },
				analysis: data.data.analysis || 'Semantic analysis completed',
				metadata: {
					text_length: text.length,
					embedding_dimensions: data.data.embedding?.length || 384,
					som_grid_size: '20x20',
					processing_time: Date.now(),
					webgpu_accelerated: true
				}
			},
			timestamp: new Date().toISOString(),
			source: 'Enhanced Semantic Architecture'
		});
		
	} catch (error: any) {
		console.error('Semantic Analysis API Error:', error);
		
		// Fallback: Simple semantic analysis
		const text = url.searchParams.get('text') || '';
		const words = text.toLowerCase().split(/\s+/);
		
		// Mock embedding (384 dimensions like nomic-embed-text)
		const embedding = Array(384).fill(0).map((_, i) => {
			const wordIndex = i % words.length;
			const word = words[wordIndex] || '';
			return (word.charCodeAt(0) || 0) * Math.sin(i * 0.1) * 0.01;
		});
		
		// Mock SOM clustering
		const hash = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
		const som_x = hash % 20;
		const som_y = Math.floor(hash / 20) % 20;
		
		// Analysis categories
		let category = 'General';
		let priority = 1;
		
		if (words.some(w => ['error', 'failed', 'cannot'].includes(w))) {
			category = 'Error Analysis';
			priority = 4;
		} else if (words.some(w => ['typescript', 'type', 'interface'].includes(w))) {
			category = 'TypeScript';
			priority = 3;
		} else if (words.some(w => ['svelte', 'component', 'props'].includes(w))) {
			category = 'Svelte';
			priority = 3;
		} else if (words.some(w => ['import', 'export', 'module'].includes(w))) {
			category = 'Module System';
			priority = 2;
		}

		return json({
			success: true,
			data: {
				embedding,
				som_cluster: { x: som_x, y: som_y },
				analysis: `Fallback analysis: Text classified as ${category} (SOM region [${som_x},${som_y}]). ${text.length} characters analyzed with ${words.length} semantic tokens.`,
				metadata: {
					text_length: text.length,
					word_count: words.length,
					embedding_dimensions: 384,
					som_grid_size: '20x20',
					processing_time: Date.now(),
					webgpu_accelerated: false,
					category,
					priority
				}
			},
			timestamp: new Date().toISOString(),
			source: 'Fallback Analyzer',
			note: 'Using fallback semantic analysis. Start Enhanced Semantic Architecture service for full SOM clustering.'
		});
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { text, options } = await request.json();
		
		if (!text) {
			return json({
				success: false,
				error: 'Missing text for analysis'
			}, { status: 400 });
		}

		// Forward to Enhanced Semantic Architecture for deep analysis
		const response = await fetch('http://localhost:8095/api/semantic-analysis', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				options: {
					som_clustering: true,
					embedding_generation: true,
					pagerank_context: true,
					webgpu_acceleration: true,
					cache_results: true,
					...options
				}
			})
		});

		if (!response.ok) {
			throw new Error(`Enhanced Semantic Architecture API returned ${response.status}`);
		}

		const data = await response.json();
		return json(data);
		
	} catch (error: any) {
		console.error('Enhanced Semantic Analysis POST Error:', error);
		
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString()
		}, { status: 500 });
	}
};