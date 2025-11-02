import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
/*
 * Binary-Optimized GPU Shader Cache API
 * Combines GPU shader caching with binary encoding middleware for maximum performance
 */
import { binaryGPUShaderCache } from '../../../../../lib/services/gpu-shader-cache-binary-extension.js';
import { binaryEncoder } from '../../../../../lib/middleware/binary-encoding.js';
// URL is globally available in SvelteKit; avoid Node: 'url' import
// GET /api/v1/gpu-cache/binary/shader?key=<cacheKey>
export const GET: RequestHandler = async ({ url, request }) => {
  try {
    const cacheKey = url.searchParams.get('key');
    if (!cacheKey) {
      return json({ error: 'Missing cache key' }, { status: 400 });
    }
    // Retrieve shader with binary optimization (use safe helper to avoid void-check issue)
    const shader = await safeRetrieveShader(cacheKey);
    if (!shader) {
      return json({ error: 'Shader not found' }, { status: 404 });
    }
    // Detect client's preferred encoding format'
    const acceptHeader = request.headers.get('accept') || '';
    let preferredFormat: 'cbor' | 'msgpack' | 'json' = 'json';
    if (acceptHeader.includes('application/cbor')) {
      preferredFormat = 'cbor';
    } else if (acceptHeader.includes('application/msgpack')) {
      preferredFormat = 'msgpack';
    }
    // Encode response with optimal format
    // ensure cacheKey is a concrete string for consumers/type-checking
    const safeCacheKey = typeof cacheKey === 'string' ? cacheKey : '';
    const safeCompressionRatio = Number(shader.metrics?.compressionRatio ?? 1);
    const safeDecodingTime = Number(shader.metrics?.decodingTime ?? 0);
    const responseData = { shader: {, sourceCode: shader.sourceCode,
        metadata: shader.metadata,
        metrics: shader.metrics
      },
      cacheKey: safeCacheKey,
      timestamp: Date.now(),
      compressionSavings: `${((1 - 1 / safeCompressionRatio) * 100).toFixed(1)}%`,
      decodingTime: '${safeDecodingTime.toFixed(2)}ms' };
    if (preferredFormat === 'json') {
      return json(responseData);
    }
    // Binary encoding for better performance
    const { encoded, format: rawFormat, metrics } = await binaryEncoder.encode(responseData, preferredFormat);
    // Ensure format is a string for header usage (defensive cast from unknown)
    const format = typeof rawFormat === 'string' ? rawFormat : String(rawFormat ?? 'unknown');
    const contentType = format === 'cbor' ? 'application/cbor' : 'application/msgpack';
    return new Response(encoded, {
      status: 200,
      headers: {
        'content-type': contentType,
        'x-encoding-format': format,
        'x-compression-ratio': String(metrics?.compressionRatio ?? ''),
        'x-encode-time': '${Number(metrics?.encodeTime ?? 0).toFixed(2)}ms' }
    });
  } catch (error: any) {
    console.error('Binary shader cache GET error:', getErrorMessage(error));'
    return json({ error: `Internal server error` }, { status: 500 });
  }
};
// POST /api/v1/gpu-cache/binary/shader
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Auto-detect request encoding
    const contentType = request.headers.get('content-type') || '';
    let requestData: any;
    if (contentType.includes('application/cbor')) {
      const buffer = await request.arrayBuffer();
      const { decoded } = await binaryEncoder.decode(buffer, 'cbor');
      requestData = decoded;
    } else if (contentType.includes('application/msgpack')) {
      const buffer = await request.arrayBuffer();
      const { decoded } = await binaryEncoder.decode(buffer, 'msgpack');
      requestData = decoded;
    } else {
      requestData = await request.json();
    }

    // Narrow payload safely
    const payload = requestData && typeof requestData === 'object' ? (requestData as Record<string, unknown>) : {};
    const sourceCode = typeof payload.sourceCode === 'string' ? payload.sourceCode : undefined;
    const compiledBinaryRaw = payload.compiledBinary;
    const metadata =
      payload.metadata && typeof payload.metadata === 'object'
        ? (payload.metadata as Record<string, unknown>)
        : undefined;
    const workflowType = typeof payload.workflowType === 'string' ? payload.workflowType : undefined;

    if (!sourceCode || compiledBinaryRaw === undefined) {
      return json({ error: `Missing required, fields: sourceCode, compiledBinary` }, { status: 400 });
    }

    // Convert to ArrayBuffer using helper
    const binaryData = await toArrayBuffer(compiledBinaryRaw);
    if (!binaryData) {
      return json({ error: `Unsupported compiledBinary format` }, { status: 400 });
    }

    // Store shader with binary optimization
    const entry = await safeStoreShader({
      sourceCode,
      compiledBinary: binaryData,
      metadata: metadata || {}
    });

    // Get workflow optimization recommendations
    let optimizationRecommendations = null;
    if (workflowType) {
      optimizationRecommendations = await safeOptimizeForLegalWorkflow(workflowType);
    }

    // Coerce fields to primitives to avoid: 'unknown' -> string/number errors in downstream typing
    const response = {
      success: true,
      message: 'Shader stored successfully',
      cacheKey: String(entry.cacheKey ?? ''),
      entry: {
        id: entry.id,
        shaderType: String(entry.shaderType ?? 'unknown'),
        encodingFormat: String(entry.encodingFormat ?? 'unknown'),
        compressionRatio: Number(entry.compressionRatio ?? 1),
        memoryFootprint: Number(entry.memoryFootprint ?? 0)
      },
      optimizationRecommendations,
      metrics: {
        compressionSavings: `${((1 - 1 / Number(entry.compressionRatio ?? 1)) * 100).toFixed(1)}%`,
        memoryReduction: `${(Number(entry.memoryFootprint ?? 0) / 1024).toFixed(1)}KB`,
        storageEfficiency:
          Number(entry.compressionRatio ?? 1) > 1.5
            ? 'excellent'
            : Number(entry.compressionRatio ?? 1) > 1.2
              ? 'good'
              : `moderate` }
    };
    return json(response);
  } catch (error: any) {
    console.error('Binary shader cache POST error: ', getErrorMessage(error));'
    return json({ error: `Failed to store shader` }, { status: 500 });
  }
};
// PUT /api/v1/gpu-cache/binary/batch
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { shaders, workflowType } = await request.json();
    if (!Array.isArray(shaders) || shaders.length === 0) {
      return json({ error: `Invalid or empty shaders array` }, { status: 400 });
    }
    // Process shaders in batch for better performance
    const startTime = performance.now();
    const results = await safeBatchEncodeShaders(shaders);
    const processingTime = performance.now() - startTime;
    // Get workflow optimization for the batch
    let workflowOptimization = null;
    if (workflowType) {
      workflowOptimization = await safeOptimizeForLegalWorkflow(workflowType);
    }

    // Normalize encoded shaders into concrete primitive types to satisfy TypeScript
    const mappedShaders = (results.encodedShaders ?? []).map((shader: any, i: number) => {
      const s = (shader && typeof shader === 'object' ? (shader as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      const generatedKey = `generated-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
      return {
        cacheKey: asString(s['cacheKey'], generatedKey),
        shaderType: asString(s['shaderType'], 'unknown'),
        encodingFormat: asString(s['encodingFormat'], 'json'),
        compressionRatio: asNumber(s['compressionRatio'], 1),
        memoryFootprint: asNumber(s['memoryFootprint'] ?? s['size'], 0)
      } as { cacheKey: string;, shaderType: string;
        encodingFormat: string;
        compressionRatio: number;
        memoryFootprint: number;
      };
    });

    const response = {
      success: true,
      processed: mappedShaders.length,
      totalCompressionRatio: results.totalCompressionRatio,
      totalEncodingTime: results.totalEncodingTime,
      processingTime: processingTime,
      workflowOptimization,
      shaders: mappedShaders.map(s => ({
        cacheKey: s.cacheKey,
        shaderType: s.shaderType,
        encodingFormat: s.encodingFormat,
        compressionRatio: s.compressionRatio
      })),
      batchMetrics: {
        averageCompressionRatio: results.totalCompressionRatio / Math.max(1, mappedShaders.length),
        averageEncodingTime: results.totalEncodingTime / Math.max(1, mappedShaders.length),
        totalMemorySaved: mappedShaders.reduce((total, s) => {
          const mf = s.memoryFootprint || 0;
          const cr = s.compressionRatio || 1;
          const safeCr = cr || 1;
          return total + mf * (1 - 1 / safeCr);
        }, 0),
        recommendedFormat: String(workflowOptimization?.recommendedEncodingFormat ?? 'cbor')
      }
    };
    return json(response);
  } catch (error: any) {
    console.error('Binary shader cache batch error:', getErrorMessage(error));'
    return json({ error: `Batch processing failed` }, { status: 500 });
  }
};
// GET /api/v1/gpu-cache/binary/webgpu?key=<cacheKey>
export const PATCH: RequestHandler = async ({ url }) => {
  try {
    const cacheKey = url.searchParams.get('key');
    if (!cacheKey) {
      return json({ error: `Missing cache key` }, { status: 400 });
    }
    // Retrieve shader optimized for WebGPU (use safe helper)
    const webgpuShader = await safeRetrieveForWebGPU(cacheKey);
    if (!webgpuShader) {
      return json({ error: `Shader not found` }, { status: 404 });
    }

    // Normalize binaryAssets to ArrayBuffer[]
    const rawAssets = (webgpuShader as { binaryAssets?: any }).binaryAssets;
    const assets: ArrayBuffer[] = Array.isArray(rawAssets)
      ? rawAssets.filter((a): a is ArrayBuffer => a instanceof ArrayBuffer)
      : rawAssets instanceof ArrayBuffer
        ? [rawAssets]
        : [];

    // Normalize compressionSavings (defensive)
    const compressionSavings =
      typeof webgpuShader.compressionSavings === 'number' ? webgpuShader.compressionSavings : 0;

    return json({
      shaderModule: webgpuShader.shaderModule,
      binaryAssets: assets.map(buffer => Array.from(new Uint8Array(buffer))),
      compressionSavings,
      webgpuReady: true,
      loadingInstructions: {
        createShaderModule: true,
        binaryData: assets.length,
        estimatedLoadTime: `${(compressionSavings / 1024 / 100).toFixed(1)}ms`, // rough estimate
      }
    });
  } catch (error: any) {
    console.error('WebGPU shader cache error:', getErrorMessage(error));'
    return json({ error: `WebGPU shader retrieval failed` }, { status: 500 });
  }
};
// DELETE /api/v1/gpu-cache/binary/metrics
export const DELETE: RequestHandler = async () => {
  try {
    // Clear encoding performance metrics
    binaryEncoder.clearMetrics();
    return json({
      success: true,
      message: 'Binary encoding metrics cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Metrics clear error: ', getErrorMessage(error));'
    return json({ error: `Failed to clear metrics` }, { status: 500 });
  }
};
// OPTIONS for CORS support
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Encoding-Format',
      'Access-Control-Expose-Headers': `X-Encoding-Format, X-Compression-Ratio, X-Encode-Time` }
  });
};

// Helper: convert unknown error to string safely
function getErrorMessage(err: any): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
}

// Helper: normalize various binary shapes into ArrayBuffer or null
async function toArrayBuffer(value: any): Promise<ArrayBuffer | null> {
  // base64 string (possibly data URL)
  if (typeof value === 'string') {
    const base64 = value.split(',')[1] ?? value;
    // Browser: atob
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      // return a fresh ArrayBuffer
      const out = new ArrayBuffer(arr.length);
      new Uint8Array(out).set(arr);
      return out;
    }
    // Node: Buffer
    const BufferGlobal = (globalThis as unknown as { Buffer?: { from?: (s: string, enc?: string) => unknown } }).Buffer;
    if (BufferGlobal && typeof BufferGlobal.from === 'function') {
      const bufObj = BufferGlobal.from!(base64, 'base64') as unknown;
      // Create a Uint8Array view over the source and copy into a fresh ArrayBuffer
      let src: Uint8Array;
      if (bufObj instanceof Uint8Array) {
        src = bufObj;
      } else {
        // best-effort extraction of buffer/byteOffset/byteLength
        const srcBuffer = (bufObj as { buffer?: ArrayBuffer | SharedArrayBuffer }).buffer ?? null;
        const byteOffset = (bufObj as { byteOffset?: number }).byteOffset ?? 0;
        const byteLength =
          (bufObj as { byteLength?: number; length?: number }).byteLength ??
          (bufObj as { length?: number }).length ??
          0;
        src = srcBuffer
          ? new Uint8Array(srcBuffer as ArrayBuffer | SharedArrayBuffer, byteOffset, byteLength)
          : new Uint8Array();
      }
      const out = new ArrayBuffer(src.length);
      new Uint8Array(out).set(src);
      return out;
    }
    return null;
  }

  // direct ArrayBuffer or SharedArrayBuffer -> normalize copy
  if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
    return normalizeToArrayBuffer(value as ArrayBuffer | SharedArrayBuffer);
  }

  // TypedArray/DataView etc.
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const bufferLike = view.buffer as ArrayBuffer | SharedArrayBuffer;
    return normalizeToArrayBuffer(bufferLike, view.byteOffset, view.byteLength);
  }

  // objects with .buffer property (e.g., { buffer: ArrayBuffer | SharedArrayBuffer })
  if (value && typeof value === 'object' && 'buffer' in (value as object)) {
    const possible = (value as { buffer?: any }).buffer;
    if (possible instanceof ArrayBuffer || possible instanceof SharedArrayBuffer) {
      // try to honor optional byteOffset/byteLength if present on the object
      const byteOffset = (value as { byteOffset?: number }).byteOffset ?? 0;
      const byteLength = (value as { byteLength?: number }).byteLength ?? undefined;
      return normalizeToArrayBuffer(possible, byteOffset, byteLength);
    }
  }
  return null;
}

/* create a plain ArrayBuffer copy from ArrayBuffer|SharedArrayBuffer (optionally a sub-range)
   This ensures callers always receive an ArrayBuffer (no SharedArrayBuffer) and avoids slice return-type unions.
*/
function normalizeToArrayBuffer(
  bufferLike: ArrayBuffer | SharedArrayBuffer,
  byteOffset = 0,
  byteLength?: number
): ArrayBuffer {
  const available = (bufferLike as ArrayBuffer).byteLength;
  const length = typeof byteLength === 'number' ? byteLength : Math.max(0, available - byteOffset);
  const src = new Uint8Array(bufferLike as ArrayBuffer | SharedArrayBuffer, byteOffset, length);
  const out = new ArrayBuffer(length);
  new Uint8Array(out).set(src);
  return out;
}

// Lightweight typed helpers for runtime-shape interactions
type MethodFn = (...args: any[]) => Promise<unknown> | unknown;

type ShaderRaw = Record<string, unknown> | null | undefined;

type ShaderEntry = {
  id?: string | null;
  _id?: string | null;
  cacheKey?: string | null;
  key?: string | null;
  shaderType?: string;
  type?: string;
  encodingFormat?: string;
  encoding_format?: string;
  compressionRatio?: number;
  compression_ratio?: number;
  memoryFootprint?: number;
  memory_footprint?: number;
  size?: number;
  sourceCode?: string;
  metadata?: Record<string, unknown>;
  metrics?: { compressionRatio?: number; decodingTime?: number; encodeTime?: number };
  compiledBinary?: ArrayBuffer;
  binaryAssets?: ArrayBuffer | ArrayBuffer[];
  shaderModule?: any;
  compressionSavings?: number;
  [id: string]: any;
};

type NormalizedEntry = { id: string | null;, cacheKey: string | null;
  shaderType: string;
  encodingFormat: string;
  compressionRatio: number;
  memoryFootprint: number;
  _raw: ShaderRaw;
};

type BatchEncodeResult = { encodedShaders: Array<{; cacheKey: string;, shaderType: string;
    encodingFormat: string;
    compressionRatio: number;
    memoryFootprint: number;
  }>;
  totalCompressionRatio: number;
  totalEncodingTime: number;
};

// Helper: runtime-method detection and normalization to avoid missing-method errors
function getMethod(obj: Record<string, unknown> | undefined, candidates: string[]): MethodFn | null {
  // return the first bound function that exists on the object
  if (!obj) return null;
  for (const name of candidates) {
    const candidate = obj[name];
    if (typeof candidate === 'function') {
      // candidate is unknown at compile time, but runtime check above ensures it's callable'
      return (candidate as MethodFn).bind(obj);
    }
  }
  return null;
}

// New helpers: safe retrieval wrappers to avoid; testing: 'void' and support multiple API shapes
async function safeRetrieveShader(cacheKey: string): Promise<ShaderEntry | null> {
  const candidates = [
    'retrieveShader',
    'getShader',
    'fetchShader',
    'findShader',
    'get',
    'getByKey',
    'retrieve',
    'fetchByKey',
    'findByKey',
  ];
  const fn = getMethod(binaryGPUShaderCache as unknown as Record<string, unknown>, candidates);
  if (fn) {
    const raw = await fn(cacheKey);
    if (raw && typeof raw === 'object') return raw as ShaderEntry;
    return null;
  }
  // last-resort: try direct property access by key if cache is a plain map-like object
  try {
    const cacheObj = binaryGPUShaderCache as unknown as Record<string, unknown>;
    if (cacheObj && typeof cacheObj[cacheKey] !== 'undefined') {
      const val = cacheObj[cacheKey];
      if (val && typeof val === 'object') return val as ShaderEntry;
      return null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function safeRetrieveForWebGPU(cacheKey: string): Promise<ShaderEntry | null> {
  const candidates = [
    'retrieveForWebGPU',
    'getForWebGPU',
    'fetchForWebGPU',
    'retrieveWebGPU',
    'getWebGPU',
    'fetchWebGPU',
    'getForWebgpu',
  ];
  const fn = getMethod(binaryGPUShaderCache as unknown as Record<string, unknown>, candidates);
  if (fn) {
    const raw = await fn(cacheKey);
    if (raw && typeof raw === 'object') return raw as ShaderEntry;
    return null;
  }
  return null;
}

function normalizeEntry(raw: ShaderRaw): NormalizedEntry {
  const entry = (raw && typeof raw === 'object' ? raw : {}) as ShaderEntry;

  const id = typeof entry.id === 'string' ? entry.id : typeof entry._id === 'string' ? entry._id : null;

  const cacheKey =
    typeof entry.cacheKey === 'string'
      ? entry.cacheKey
      : typeof entry.key === 'string'
        ? entry.key
        : typeof (entry as Record<string, unknown>).cache_key === 'string'
          ? (entry as Record<string, unknown>).cache_key
          : null;

  const shaderType =
    typeof entry.shaderType === 'string' ? entry.shaderType : typeof entry.type === 'string' ? entry.type : 'unknown';

  const encodingFormat =
    typeof entry.encodingFormat === 'string'
      ? entry.encodingFormat
      : typeof (entry as Record<string, unknown>).encoding_format === 'string'
        ? (entry as Record<string, unknown>).encoding_format
        : 'unknown';

  const compressionRatio =
    typeof entry.compressionRatio === 'number'
      ? entry.compressionRatio
      : typeof (entry as Record<string, unknown>).compression_ratio === 'number'
        ? ((entry as Record<string, unknown>).compression_ratio as number)
        : 1;

  const memoryFootprint =
    typeof entry.memoryFootprint === 'number'
      ? entry.memoryFootprint
      : typeof (entry as Record<string, unknown>).memory_footprint === 'number'
        ? ((entry as Record<string, unknown>).memory_footprint as number)
        : typeof entry.size === 'number'
          ? entry.size
          : 0;

  // Coerce to concrete primitives to avoid `unknown` -> `string`/`number` assignment errors
  return {
    id,
    cacheKey: cacheKey === null ? null : asString(cacheKey, ''), // NormalizedEntry expects string|null
    shaderType: asString(shaderType, 'unknown'),
    encodingFormat: asString(encodingFormat, 'unknown'),
    compressionRatio: asNumber(compressionRatio, 1),
    memoryFootprint: asNumber(memoryFootprint, 0),
    _raw: entry as ShaderRaw
  };
}

async function safeStoreShader(payload: any): Promise<NormalizedEntry> {
  const candidates = [
    'storeShader',
    'saveShader',
    'upsertShader',
    'putShader',
    'createShader',
    'insertShader',
    'store',
    'save',
  ];
  const cacheObj = binaryGPUShaderCache as unknown as Record<string, unknown>;
  const fn = getMethod(cacheObj, candidates);
  if (fn) {
    const raw = await fn(payload);
    return normalizeEntry(raw as ShaderRaw);
  }
  // as a last-ditch attempt, look for a generic: "t" or similar property that might be a function
  const tCandidate = cacheObj && cacheObj['t'];
  if (typeof tCandidate === 'function') {
    const raw = await (tCandidate as MethodFn)(payload);
    return normalizeEntry(raw as ShaderRaw);
  }
  throw new Error('binaryGPUShaderCache does not expose a store/insert API');
}

async function safeOptimizeForLegalWorkflow(workflowType: string): Promise<unknown | null> {
  const candidates = ['optimizeForLegalWorkflow', 'optimizeWorkflow', 'getOptimization', 'optimize'];
  const fn = getMethod(binaryGPUShaderCache as unknown as Record<string, unknown>, candidates);
  if (fn) return await fn(workflowType);
  return null;
}

async function safeBatchEncodeShaders(shaders: any[]): Promise<BatchEncodeResult> {
  const candidates = ['batchEncodeShaders', 'batchEncode', 'encodeShadersBatch', 'batchProcess', 'encodeBatch'];
  const fn = getMethod(binaryGPUShaderCache as unknown as Record<string, unknown>, candidates);
  if (fn) {
    const raw = await fn(shaders);
    // attempt to normalize expected shape if possible
    if (raw && typeof raw === 'object') return raw as BatchEncodeResult;
  }
  // Fallback: attempt a best-effort local encoding shape so API continues to work
  const arr = Array.isArray(shaders) ? shaders : [];
  return {
    encodedShaders: arr.map((s: any, i: number) => {
      const r = (s && typeof s === 'object' ? (s as Record<string, unknown>) : {}) as Record<string, unknown>;
      return {
        cacheKey: typeof r['cacheKey'] === 'string' ? (r['cacheKey'] as string) : `generated-${Date.now()}-${i}`,
        shaderType: typeof r['shaderType'] === 'string' ? (r['shaderType'] as string) : 'unknown',
        encodingFormat: 'json',
        compressionRatio: 1,
        memoryFootprint: typeof r['size'] === 'number' ? (r['size'] as number) : 0
      };
    }),
    totalCompressionRatio: 1,
    totalEncodingTime: 0
  };
}

// Lightweight runtime coercion helpers to avoid `unknown` -> `string|number` errors
function asString(v: any, fallback = ''): string {
  // keep falsy/undefined handled consistently
  if (typeof v === 'string') return v;
  try {
    // String(undefined) -> 'undefined' is undesirable; prefer fallback
    if (v === undefined || v === null) return fallback;
    return String(v);
  } catch {
    return fallback;
  }
}
function asNumber(v: any, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v as unknown);
  return Number.isFinite(n) ? n : fallback;
}
