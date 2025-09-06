import { ensureLocalIndex, addOrUpdateDocuments } from './localSearch';
import type { LocalLegalDoc } from './localSearch';

let lokiDb: any = null;
let lokiCollection: any = null;
let lastRefresh = 0;
let refreshing = false;

export interface HybridInitOptions {
  refreshIntervalMs?: number;
  maxDocs?: number;
}

export function getLastRefresh() { return lastRefresh; };
export function isRefreshing() { return refreshing; };
;
export async function initHybridLayer(opts: HybridInitOptions = {}): Promise<any> {
  if (typeof window === 'undefined') return;
  const { refreshIntervalMs = 5 * 60_000, maxDocs = 750 } = opts;
  await ensureLocalIndex();
  if (!lokiDb) {
    const { default: Loki } = await import('lokijs');
    lokiDb = new Loki('yorhaLocalDocs');
    lokiCollection = lokiDb.addCollection('documents', { unique: ['id'], indices: ['title', 'type'] });
  }
  await refreshRemote({ maxDocs });
  if (refreshIntervalMs > 0) {
    setInterval(() => { void refreshRemote({ maxDocs }); }, refreshIntervalMs);
  }
}

export interface RefreshOpts { maxDocs?: number; }
export async function refreshRemote(opts: RefreshOpts = {}): Promise<any> {
  if (refreshing) return;
  refreshing = true;
  const { maxDocs = 750 } = opts;
  try {
    const res = await fetch(`/api/yorha/legal-data?limit=${maxDocs}`);
    if (res.ok) {
      const data = await res.json();
      const raw = data.results || data.documents || [];
      const docs: LocalLegalDoc[] = raw.map((d: any, i: number) => ({
        id: d.id || d.uuid || i + 1,
        title: d.title || d.name || `Document ${i + 1}`,
        content: d.content || d.text || d.body || '',
        type: d.type || d.category || 'Legal Document',
        status: d.status || 'active',
        metadata: d
      }));
      addOrUpdateDocuments(docs);
      if (lokiCollection) {
        lokiCollection.clear();
        for (const d of docs) lokiCollection.insert(d);
      }
      lastRefresh = Date.now();
    }
  } catch (e: any) {
    console.warn('[HybridSearch] refresh failed', e);
  } finally {
    refreshing = false;
  }
}

export async function reRankWithPgVector(query: string, current: any[], endpoint = '/api/ai/vector-search'): Promise<any> {
  if (!query.trim() || current.length === 0) return current;
  try {
    const payload: any = { query, limit: current.length };
    if (current[0]?.id) payload.documentIds = current.map(r => r.id).slice(0, 64);
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return current;
    const data = await res.json();
    const scores: any[] = data.results || data.matches || [];
    if (!Array.isArray(scores) || scores.length === 0) return current;
    const scoreMap = new Map<any, number>();
    for (const s of scores) {
      const norm = typeof s.score === 'number' ? s.score : (s.relevance || 0);
      scoreMap.set(s.id ?? s.document_id ?? s.documentId, norm);
    }
    return current.map(item => {
      const raw = scoreMap.get(item.id);
      if (raw == null) return item;
      const scaled = raw <= 1 ? Math.round(raw * 100) : Math.round(Math.min(100, raw));
      return { ...item, relevance: scaled, source: item.source || 'hybrid' };
    }).sort((a, b) => b.relevance - a.relevance);
  } catch (e: any) {
    console.warn('[HybridSearch] re-rank failed', e);
    return current;
  }
}

export function getLokiCount() { return lokiCollection ? lokiCollection.count() : 0; };
export function queryLokiTitle(term: string, limit = 25) {
  if (!lokiCollection || !term.trim()) return [];
  const lower = term.toLowerCase();
  return lokiCollection.chain().find({ title: { '$contains': lower } }).limit(limit).data();
}
