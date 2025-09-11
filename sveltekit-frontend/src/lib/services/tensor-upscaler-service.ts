export interface TensorCompressionOptions {
  ratio?: number;
}

export async function compressTensorToPNG(
  tensor: Float32Array | number[],
  opts: TensorCompressionOptions = {}
): Promise<string> {
  const ratio = opts.ratio ?? 1;
  const arr = new Uint8ClampedArray(tensor.length);
  for (let i = 0; i < tensor.length; i++) {
    const v = (tensor as any)[i] ?? 0;
    arr[i] = Math.max(0, Math.min(255, Math.round(v * ratio))) & 255;
  }
  const b64 = Buffer.from(arr).toString('base64');
  return `data:image/png;base64,${b64}`;
}

export async function decompressPNGtoTensor(dataUrl: string): Promise<Float32Array> {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) return new Float32Array();
  const b64 = dataUrl.slice(prefix.length);
  const buf = Buffer.from(b64, 'base64');
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] / 255;
  return out;
}
/**
 * Simple Tensor Upscaler service stub.
 *
 * This file provides a minimal, type-safe implementation so imports of the service
 * do not produce TypeScript errors; replace the internals with real model logic
 * or HTTP calls to a backend upscaler as needed.
 */

export type UpscaleQuality = 'low' | 'medium' | 'high';

export interface UpscaleOptions {
  scale?: number; // e.g. 2 for 2x
  model?: string; // optional model identifier
  quality?: UpscaleQuality;
}

/**
 * TensorUpscalerService
 *
 * - isAvailable(): indicates whether the service is ready (stubbed true).
 * - upscale(...): accepts a Blob / ArrayBuffer / Uint8Array and returns a Blob.
 *
 * Replace the stubbed implementation with real upscaling logic or an API call.
 */
export class TensorUpscalerService {
  async isAvailable(): Promise<boolean> {
    // In a real implementation check WebGPU/WebGL or worker readiness here.
    return true;
  }

  async upscale(
    input: Blob | ArrayBuffer | Uint8Array,
    options: UpscaleOptions = {}
  ): Promise<Blob> {
    // Normalize input to a Blob so callers always receive a Blob result.
    let blob: Blob;
    if (input instanceof Blob) {
      blob = input;
    } else if (input instanceof ArrayBuffer) {
      blob = new Blob([new Uint8Array(input)]);
    } else {
      // Uint8Array
      blob = new Blob([input.slice()]);
    }

    // TODO: perform actual upscaling using a model or remote service.
    // For now return the original blob as a safe, no-op fallback.
    return blob;
  }
}

const tensorUpscalerService = new TensorUpscalerService();
export default tensorUpscalerService;
