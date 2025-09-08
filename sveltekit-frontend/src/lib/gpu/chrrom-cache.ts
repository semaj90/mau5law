// Client-side CHR-ROM cache and SSE subscriber
import { nesGPUBridge } from './nes-gpu-memory-bridge';

export type CHRPatternType = 'text' | 'svg' | 'state';
export interface CHRPatternBase { key: string; type: CHRPatternType; ttlMs?: number; createdAt: string; meta?: Record<string, any>; }
export interface CHRTextPattern extends CHRPatternBase { type: 'text'; payload: { text: string; style?: 'mono'|'body'|'small'|'title' } }
export interface CHRSVGPattern extends CHRPatternBase { type: 'svg'; payload: { svg: string; viewBox?: string } }
export interface CHRStatePattern extends CHRPatternBase { type: 'state'; payload: Record<string, any> }
export type CHRPattern = CHRTextPattern | CHRSVGPattern | CHRStatePattern;

class CHRCache {
  private map = new Map<string, { pattern: CHRPattern; expiresAt?: number }>();
  private connected = false;
  private es: EventSource | null = null;

  connect(endpoint = '/api/chrrom/push') {
    if (this.connected || typeof window === 'undefined') return;
    this.es = new EventSource(endpoint);
    this.es.addEventListener('chrrom', (ev: MessageEvent) => {
      try {
        const patterns: CHRPattern[] = JSON.parse(ev.data);
        for (const p of patterns) this.set(p);
      } catch (e) {
        console.warn('CHR-ROM event parse failed', e);
      }
    });
    this.connected = true;
  }

  set(p: CHRPattern) {
    const ttl = p.ttlMs ?? 60_000;
    const expiresAt = Date.now() + ttl;
    this.map.set(p.key, { pattern: p, expiresAt });

    // Optionally pre-prepare GPU assets for CHR patterns
    if (p.type === 'state' && p.payload?.items?.length) {
      // Future: build small textures for instant rendering of lists/cards
    }
  }

  get(key: string): CHRPattern | null {
    const slot = this.map.get(key);
    if (!slot) return null;
    if (slot.expiresAt && slot.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return slot.pattern;
  }
}

export const chrCache = new CHRCache();
