export function chunkTextByBytes(text: string, maxBytes = 2048): string[] {
  const encoder = new TextEncoder();
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const w of words) {
    const candidate = current.length ? current.join(' ') + ' ' + w : w;
    const bytes = encoder.encode(candidate).length;
    if (bytes <= maxBytes) {
      current.push(w);
      size = bytes;
    } else {
      if (current.length) chunks.push(current.join(' '));
      current = [w];
      size = encoder.encode(w).length;
      if (size > maxBytes) {
        // Hard split long tokens
        chunks.push(w.slice(0, Math.max(1, Math.floor(maxBytes / 2))));
        current = [];
        size = 0;
      }
    }
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function hashString32(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return String(hash >>> 0);
}
