import type { DocumentItem, VisionItem } from '$lib/types/sharedTypes';
// Lightweight GPU inference stub (replace with real Gemma3/Triton adapter)
export async function runGPUInference(text: string): Promise<number[]> {
  // deterministic pseudo-embedding for tests: hash chars
  const vec: number[] = [];
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) % 100000;
  for (let i = 0; i < 64; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    vec.push((seed % 1000) / 1000);
  }
  return vec;
}
export function autoTagger(text: string): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean)
    .slice(0, 5);
  return Array.from(new Set(tokens));
}
export async function embedDocument(doc: DocumentItem): Promise<DocumentItem> {
  const vector = await runGPUInference(doc.text || '');
  const tags = autoTagger(doc.text || '');
  return { ...doc, embeddings: vector, tags };
}
export async function embedVision(item: VisionItem): Promise<VisionItem> {
  const vector = await runGPUInference(item.labels.join(' '));
  const tags = autoTagger(item.labels.join(' '));
  return { ...item, embeddings: vector, tags };
}
