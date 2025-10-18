import { browser } from '$app/environment';
import Loki from 'lokijs'; // Import Loki.js
import type { Collection } from 'lokijs'; // Import Collection type
import type { Candidate, RerankRequest } from '$lib/types';

let db: Loki | null = null;
let candidatesCollection: Collection<Candidate> | null = null;

if (browser) {
  db = new Loki('rerank_cache.db'); // Use a distinct database name
  candidatesCollection = db.addCollection<Candidate>('rerank_candidates', { unique: ['id', 'rerankedScore'] }); // Ensure unique by id and score for reranked results
  // Load database from IndexedDB if available
  db.loadDatabase({}, (err) => {
    if (err) console.error('Error loading Loki.js database:', err);
    else console.log('Loki.js database loaded.');
  });
}

export async function rerank(query: string, candidates: Candidate[], options?: RerankRequest['options']): Promise<Candidate[]> {
  // filepath: c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\src\lib\client\rerank-client.ts
  if (browser && candidatesCollection) {
    // Check if all candidates for this query are already cached
    // This is a simplified cache check. A more robust one would involve hashing the query and candidate IDs.
    const cacheKey = `rerank:${query}:${candidates.map(c => c.id).join(',')}`;
    const cachedResult = candidatesCollection.findOne({ 'metadata.cacheKey': cacheKey });
    if (cachedResult) {
      console.log('Cache hit for rerank:', cacheKey);
      return candidatesCollection.find({ 'metadata.cacheKey': cacheKey }).sort((a, b) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0));
    }
  }

  const res = await fetch('/api/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, candidates, options }),
  });

  if (!res.ok) {
    console.error('Rerank API call failed:', res.statusText);
    // Optionally, implement client-side WebGPU fallback here if the server fails
    // const fallbackResult = await webgpuRerankFallback(query, candidates);
    // return fallbackResult;
    throw new Error('Failed to rerank candidates');
  }

  const reranked: Candidate[] = await res.json();

  if (browser && candidatesCollection) {
    // Cache the reranked results
    reranked.forEach(c => {
      const existing = candidatesCollection?.findOne({ id: c.id, 'metadata.cacheKey': cacheKey });
      if (existing) {
        candidatesCollection?.update({ ...existing, ...c, metadata: { ...c.metadata, cacheKey } });
      } else {
        candidatesCollection?.insert({ ...c, metadata: { ...c.metadata, cacheKey } });
      }
    });
    db?.saveDatabase((err) => {
      if (err) console.error('Error saving Loki.js database:', err);
    });
    console.log('Cache set for rerank:', cacheKey);
  }

  return reranked;
}
