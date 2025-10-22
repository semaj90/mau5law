import { browser } from '$app/environment';
import Loki from 'lokijs'; // Import Loki.js
import type { Collection } from 'lokijs'; // Import Collection type
import type { Candidate, RerankRequest } from '$lib/types';
import { webgpuRerank } from '$lib/client/ai/webgpu-reranker';

let db: Loki | null = null;
let candidatesCollection: Collection<Candidate> | null = null;

if (browser) {
  db = new Loki('rerank_cache.db'); // Use a distinct database name
  candidatesCollection = db.addCollection<Candidate>('rerank_candidates', { unique: ['id', 'rerankedScore'] }); // Ensure unique by id and score for reranked results
  // Load database from IndexedDB if available
  db.loadDatabase({}, err => {
    if (err) console.error('Error loading Loki.js database:', err);
    else console.log('Loki.js database loaded.');
  });
}

export async function rerank(
  query: string,
  candidates: Candidate[],
  options?: RerankRequest['options']
): Promise<Candidate[]> {
  // filepath: c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\src\lib\client\rerank-client.ts
  let cacheKey: string | undefined;

  if (browser && candidatesCollection) {
    // Check if all candidates for this query are already cached
    // This is a simplified cache check. A more robust one would involve hashing the query and candidate IDs.
    cacheKey = `rerank:${query}:${candidates.map(c => c.id).join(',')}`;
    const cachedResult = candidatesCollection.findOne({ 'metadata.cacheKey': cacheKey });
    if (cachedResult) {
      console.log('Cache hit for rerank:', cacheKey);
      return candidatesCollection
        .find({ 'metadata.cacheKey': cacheKey })
        .sort((a, b) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0));
    }
  }

  const res = await fetch('/api/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, candidates, options }),
  });

  let reranked: Candidate[] = [];
  if (!res.ok) {
    console.error('Rerank API call failed:', res.statusText);
    try {
      // Use WebGPU fallback to locally rerank
      const fallback = await webgpuRerank(query, candidates as any[]);
      reranked = fallback as Candidate[];
    } catch (err) {
      console.warn('WebGPU rerank fallback failed:', err);
      throw new Error('Failed to rerank candidates');
    }
  } else {
    reranked = await res.json();
  }

  if (browser) {
    try {
      const locallyReranked = await webgpuRerank(query, reranked as unknown as Array<Record<string, unknown>>);
      reranked = locallyReranked as Candidate[];
    } catch (err) {
      console.warn('Local WebGPU rerank refinement failed:', err);
    }
  }

  if (browser && candidatesCollection && cacheKey) {
    // Cache the reranked results
    reranked.forEach(candidate => {
      const existing = candidatesCollection.findOne({ id: candidate.id, 'metadata.cacheKey': cacheKey });
      const metadata = { ...(candidate.metadata ?? {}), cacheKey };
      if (existing) {
        candidatesCollection.update({ ...existing, ...candidate, metadata });
      } else {
        candidatesCollection.insert({ ...candidate, metadata });
      }
    });
    db?.saveDatabase(err => {
      if (err) console.error('Error saving Loki.js database:', err);
    });
    console.log('Cache set for rerank:', cacheKey);
  }

  return reranked;
}
