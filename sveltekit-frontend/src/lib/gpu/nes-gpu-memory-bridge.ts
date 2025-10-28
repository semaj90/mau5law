import type { LegalDocument } from '../memory/nes-memory-architecture';

// Minimal typed shim for nesGPUBridge used by ultra-json-parser.
// Replace with the real GPU/FlatBuffer implementation when available.
export const nesGPUBridge = {
  async createFlatBufferFromDocument(doc: LegalDocument): Promise<Uint8Array> {
    // lightweight fallback: serialize to JSON bytes
    try {
      const json = JSON.stringify(doc ?? {});
      const encoder = new TextEncoder();
      return encoder.encode(json);
    } catch {
      return new Uint8Array();
    }
  },

  parseFlatBufferToDocument(buffer: Uint8Array): LegalDocument {
    // lightweight fallback: parse JSON bytes back to object
    try {
      const decoder = new TextDecoder();
      const json = decoder.decode(buffer);
      return (JSON.parse(json) as unknown) as LegalDocument;
    } catch {
      // return a minimal empty document shape if parse fails
      return { id: '', type: 'evidence', metadata: {} } as unknown as LegalDocument;
    }
  },
};

// Export types if needed later
export type { LegalDocument };
