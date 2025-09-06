/**
 * A tiny, dependency-free "autoencoder" stub for small sprite-like vectors.
 *
 * This implementation is deterministic and simple: it compresses an input
 * numeric array into `latentSize` numbers by chunk-averaging and reconstructs
 * by expanding each latent value back into equally-sized slices. It's intended
 * to be a small, type-safe placeholder that compiles without errors; replace
 * with a real ML model when needed.
 */

export type Latent = number[];

/**
 * Simple, deterministic neural-sprite autoencoder stub.
 *
 * - Input: flat numeric array (e.g. pixels in RGBA/RGB sequence).
 * - encode -> Latent (length = latentSize)
 * - decode -> flat numeric array (length = requested outputLength)
 */
export default class NeuralSpriteAutoencoder {
  readonly latentSize: number;

  constructor(latentSize = 16) {
	if (!Number.isInteger(latentSize) || latentSize <= 0) {
	  throw new TypeError('latentSize must be a positive integer');
	}
	this.latentSize = latentSize;
  }

  /**
   * Encode a flat numeric array into a compact latent vector.
   * Empty inputs return an empty latent vector.
   */
  encode(input: number[]): Latent {
	if (!Array.isArray(input)) {
	  throw new TypeError('input must be a number[]');
	}
	const n = input.length;
	if (n === 0) return new Array(this.latentSize).fill(0);
	const chunkSize = Math.max(1, Math.floor(n / this.latentSize));
	const latent = new Array<number>(this.latentSize).fill(0);
	const counts = new Array<number>(this.latentSize).fill(0);

	for (let i = 0; i < n; i++) {
	  const idx = Math.min(Math.floor(i / chunkSize), this.latentSize - 1);
	  latent[idx] += input[i];
	  counts[idx] += 1;
	}
	for (let i = 0; i < this.latentSize; i++) {
	  latent[i] = counts[i] > 0 ? latent[i] / counts[i] : 0;
	}
	return latent;
  }

  /**
   * Decode a latent vector back into a flat numeric array of requested length.
   * If latent length differs from this.latentSize, values are resampled/truncated.
   */
  decode(latent: Latent, outputLength: number): number[] {
	if (!Array.isArray(latent)) {
	  throw new TypeError('latent must be a number[]');
	}
	if (!Number.isInteger(outputLength) || outputLength < 0) {
	  throw new TypeError('outputLength must be a non-negative integer');
	}
	if (outputLength === 0) return [];

	// If latent is empty, return zeros
	if (latent.length === 0) return new Array(outputLength).fill(0);

	// Map each output index to a latent index (simple nearest mapping)
	const out = new Array<number>(outputLength);
	for (let i = 0; i < outputLength; i++) {
	  const t = (i / outputLength) * latent.length;
	  const li = Math.min(latent.length - 1, Math.floor(t));
	  out[i] = latent[li];
	}
	return out;
  }

  /**
   * Convenience: encode then decode with a target length (round-trip).
   */
  reconstruct(input: number[], outputLength: number): number[] {
	const z = this.encode(input);
	return this.decode(z, outputLength);
  }

  /**
   * Serialize the model config (not weights — there are none here).
   */
  serialize(): string {
	return JSON.stringify({ latentSize: this.latentSize });
  }

  /**
   * Restore from a serialized string produced by serialize().
   */
  static deserialize(s: string): NeuralSpriteAutoencoder {
	const parsed = JSON.parse(s);
	const latentSize = typeof parsed?.latentSize === 'number' ? parsed.latentSize : 16;
	return new NeuralSpriteAutoencoder(latentSize);
  }
}
