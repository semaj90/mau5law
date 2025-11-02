/**
 * Unified llama.cpp Bridge
 * Intelligently routes inference across 3 execution paths:
 * 1. Browser WASM (llama-cpp-engine.ts) - Offline, private, ~20-35 tok/s
 * 2. Node Native (@llama-node/llama-cpp) - Local dev, ~80-120 tok/s
 * 3. Remote gRPC/QUIC (TensorRT) - Heavy inference, ~250-500 tok/s
 */

import { browser } from '$app/environment';
import type { InferenceRequest, InferenceResponse } from '$lib/webgpu/unified-runtime-abstraction';

// Lazy imports for tree-shaking
let llamaWasmEngine: any = null;
let clientWasmLlama: any = null;

export type LlamaMode = 'auto' | 'wasm' | 'native' | 'remote';

export interface UnifiedLlamaConfig {
	mode?: LlamaMode;
	model?: 'gemma3:270m' | 'gemma3-legal:latest' | string;
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
	/** Prompt length threshold for remote fallback (chars) */
	remoteFallbackLength?: number;
	/** Enable GPU acceleration */
	useGPU?: boolean;
}

export interface GenerateOptions extends UnifiedLlamaConfig {
	onToken?: (token: string) => void;
	signal?: AbortSignal;
}

export interface GenerateResult {
	text: string;
	tokensGenerated: number;
	processingTime: number;
	method: 'wasm' | 'native' | 'remote';
	modelUsed: string;
	tokensPerSecond: number;
}

/**
 * Unified generation API - automatically selects best execution path
 */
export async function generate(
	prompt: string,
	options: GenerateOptions = {}
): Promise<GenerateResult> {
	const config: Required<UnifiedLlamaConfig> = {
		mode: options.mode ?? 'auto',
		model: options.model ?? 'gemma3:270m',
		maxTokens: options.maxTokens ?? 512,
		temperature: options.temperature ?? 0.7,
		stream: options.stream ?? false,
		remoteFallbackLength: options.remoteFallbackLength ?? 2000,
		useGPU: options.useGPU ?? true,
	};

	const startTime = performance.now();
	let method: 'wasm' | 'native' | 'remote';

	// Auto mode: intelligently select execution path
	if (config.mode === 'auto') {
		method = await selectExecutionPath(prompt, config);
	} else if (config.mode === 'wasm') {
		method = 'wasm';
	} else if (config.mode === 'native') {
		method = 'native';
	} else {
		method = 'remote';
	}

	console.log(`[Unified Llama] Using ${method} for prompt length ${prompt.length}`);

	try {
		let result: GenerateResult;

		switch (method) {
			case 'wasm':
				result = await generateWithWasm(prompt, config, options.onToken, options.signal);
				break;
			case 'native':
				result = await generateWithNative(prompt, config, options.onToken, options.signal);
				break;
			case 'remote':
				result = await generateWithRemote(prompt, config, options.onToken, options.signal);
				break;
			default:
				throw new Error(`Unknown method: ${method}`);
		}

		const totalTime = performance.now() - startTime;
		result.processingTime = totalTime;
		result.tokensPerSecond = result.tokensGenerated / (totalTime / 1000);

		console.log(`[Unified Llama] Generated ${result.tokensGenerated} tokens in ${totalTime.toFixed(0)}ms (${result.tokensPerSecond.toFixed(1)} tok/s)`);

		return result;
	} catch (error: any) {
		console.error(`[Unified Llama] ${method} failed:`, error);

		// Fallback strategy
		if (method === 'wasm' && !browser) {
			console.log('[Unified Llama] Falling back to native');
			return generate(prompt, { ...options, mode: 'native' });
		} else if (method === 'native') {
			console.log('[Unified Llama] Falling back to remote');
			return generate(prompt, { ...options, mode: 'remote' });
		}

		throw error;
	}
}

/**
 * Stream tokens progressively
 */
export async function* generateStream(
	prompt: string,
	options: GenerateOptions = {}
): AsyncGenerator<string, void, unknown> {
	const tokens: string[] = [];

	await generate(prompt, {
		...options,
		stream: true,
		onToken: (token) => {
			tokens.push(token);
		},
	});

	for (const token of tokens) {
		yield token;
	}
}

/**
 * Intelligent execution path selection
 */
async function selectExecutionPath(
	prompt: string,
	config: Required<UnifiedLlamaConfig>
): Promise<'wasm' | 'native' | 'remote'> {
	const promptLength = prompt.length;

	// Long prompts always go remote for TensorRT acceleration
	if (promptLength > config.remoteFallbackLength) {
		return 'remote';
	}

	// Check environment
	if (browser) {
		// Browser: check WebGPU availability
		const hasWebGPU = await checkWebGPU();
		return hasWebGPU ? 'wasm' : 'remote';
	} else {
		// Node: check CUDA availability
		const hasCUDA = await checkCUDA();
		return hasCUDA ? 'native' : 'remote';
	}
}

/**
 * Browser WASM inference (llama-cpp-engine.ts)
 */
async function generateWithWasm(
	prompt: string,
	config: Required<UnifiedLlamaConfig>,
	onToken?: (token: string) => void,
	signal?: AbortSignal
): Promise<GenerateResult> {
	if (!browser) {
		throw new Error('WASM execution requires browser environment');
	}

	// Lazy load WASM engine
	if (!llamaWasmEngine) {
		const module = await import('$lib/webasm/llama-cpp-engine');
		llamaWasmEngine = module.WebASMLlamaCppEngine;
	}

	const engine = new llamaWasmEngine();

	await engine.loadModel({
		modelPath: `/models/${config.model}.gguf`,
		contextSize: 4096,
		gpuLayers: config.useGPU ? 32 : 0,
		threadCount: navigator.hardwareConcurrency || 4,
		batchSize: 512,
		useGPU: config.useGPU,
		quantization: 'q4_0',
	});

	const result = await engine.generateText({
		prompt,
		maxTokens: config.maxTokens,
		temperature: config.temperature,
		onToken: onToken,
	});

	return {
		text: result.text,
		tokensGenerated: result.tokens,
		processingTime: result.processingTime,
		method: 'wasm',
		modelUsed: config.model,
		tokensPerSecond: result.tokensPerSecond,
	};
}

/**
 * Node Native inference (@llama-node/llama-cpp)
 */
async function generateWithNative(
	prompt: string,
	config: Required<UnifiedLlamaConfig>,
	onToken?: (token: string) => void,
	signal?: AbortSignal
): Promise<GenerateResult> {
	if (browser) {
		throw new Error('Native execution requires Node.js environment');
	}

	// Lazy load client WASM llama
	if (!clientWasmLlama) {
		const module = await import('$lib/ai/client-wasm-llama');
		clientWasmLlama = module.clientAI;
	}

	await clientWasmLlama.initialize();

	const result = await clientWasmLlama.generateResponse(prompt, {
		maxTokens: config.maxTokens,
		temperature: config.temperature,
		onToken: onToken,
	});

	return {
		text: result.text,
		tokensGenerated: result.tokensGenerated || 0,
		processingTime: result.processingTime || 0,
		method: 'native',
		modelUsed: config.model,
		tokensPerSecond: 0,
	};
}

/**
 * Remote gRPC/QUIC inference (TensorRT)
 */
async function generateWithRemote(
	prompt: string,
	config: Required<UnifiedLlamaConfig>,
	onToken?: (token: string) => void,
	signal?: AbortSignal
): Promise<GenerateResult> {
	const endpoint = browser ? '/api/ai/inference' : 'http://localhost:8094/api/inference';

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: config.model,
			prompt,
			maxTokens: config.maxTokens,
			temperature: config.temperature,
			stream: config.stream,
		}),
		signal,
	});

	if (!response.ok) {
		throw new Error(`Remote inference failed: ${response.statusText}`);
	}

	const data = await response.json();

	// Handle streaming if requested
	if (config.stream && onToken) {
		const tokens = data.text.split(' ');
		for (const token of tokens) {
			onToken(token + ' ');
		}
	}

	return {
		text: data.text || data.response || '',
		tokensGenerated: data.tokensGenerated || 0,
		processingTime: data.processingTime || 0,
		method: 'remote',
		modelUsed: config.model,
		tokensPerSecond: data.tokensPerSecond || 0,
	};
}

/**
 * Check WebGPU availability (browser)
 */
async function checkWebGPU(): Promise<boolean> {
	if (!browser || !navigator.gpu) {
		return false;
	}

	try {
		const adapter = await navigator.gpu.requestAdapter();
		return !!adapter;
	} catch {
		return false;
	}
}

/**
 * Check CUDA availability (Node)
 */
async function checkCUDA(): Promise<boolean> {
	if (browser) {
		return false;
	}

	try {
		// Simple heuristic: check if TensorRT service is available
		const response = await fetch('http://localhost:8095/health', {
			signal: AbortSignal.timeout(1000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Get current capabilities
 */
export async function getCapabilities(): Promise<{
	wasm: boolean;
	native: boolean;
	remote: boolean;
	webgpu: boolean;
	cuda: boolean;
}> {
	const [webgpu, cuda, remote] = await Promise.all([
		checkWebGPU(),
		checkCUDA(),
		(async () => {
			try {
				const response = await fetch('/api/ai/health', { signal: AbortSignal.timeout(1000) });
				return response.ok;
			} catch {
				return false;
			}
		})(),
	]);

	return {
		wasm: browser && webgpu,
		native: !browser && cuda,
		remote,
		webgpu,
		cuda,
	};
}

/**
 * Legal-specific helper for report generation
 */
export async function analyzeLegalDocument(
	title: string,
	content: string,
	options: GenerateOptions = {}
): Promise<{
	summary: string;
	keyTerms: string[];
	riskFactors: string[];
	recommendations: string[];
}> {
	const prompt = `<|system|>You are a specialized legal AI assistant. Analyze the following legal document and provide:
1. A concise summary
2. Key legal terms identified
3. Risk factors or concerns
4. Recommendations for the prosecutor

Be precise and thorough.<|end|>

<|user|>Document Title: ${title}

Content:
${content}

Please analyze this document.<|end|>

<|assistant|>`;

	const result = await generate(prompt, {
		...options,
		model: 'gemma3-legal:latest',
		maxTokens: 1024,
		temperature: 0.3, // Lower temperature for factual analysis
	});

	// Parse structured response (simplified - could use regex or JSON parsing)
	const lines = result.text.split('\n').filter(Boolean);

	return {
		summary: lines.slice(0, 3).join(' '),
		keyTerms: lines.filter(l => l.includes('term') || l.includes('clause')).slice(0, 5),
		riskFactors: lines.filter(l => l.includes('risk') || l.includes('concern')).slice(0, 3),
		recommendations: lines.filter(l => l.includes('recommend') || l.includes('suggest')).slice(0, 3),
	};
}
