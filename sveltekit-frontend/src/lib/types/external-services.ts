export interface OllamaClient {
		embed: (text: string, opts?: { model?: string }) => Promise<number[]>;
		// other methods can be added (chat, infer) as needed
}

export interface QdrantClient {
		indexCollection: (name: string, vectors: { id: string; vector: number[]; payload?: any }[]) => Promise<any>;
		search: (collection: string, vector: number[], limit?: number) => Promise<any>;
}

export interface UltraJSONParser {
		parse: (input: string) => any;
		stringify: (input: any) => string;
}

export interface WasmClusteringService {
		trainIncremental: (vector: number[], metadata: any) => Promise<void>;
		getClusters: () => Promise<any[]>;
}

export interface NesGPUBridge {
		uploadTensor: (tensor: Float32Array) => Promise<string>;
		executeCompute: (shaderSource: string, inputs: any) => Promise<any>;
}

export interface RedisCacheService {
		get: (key: string) => Promise<string | null>;
		setex: (key: string, seconds: number, value: string) => Promise<void>;
		hset: (key: string, data: Record<string, string>) => Promise<void>;
		call: (...args: any[]) => Promise<any>;
		disconnect: () => Promise<void>;
}
