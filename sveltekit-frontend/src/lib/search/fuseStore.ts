import Fuse from 'fuse.js';
import { writable, derived, type Readable } from 'svelte/store';

export interface SearchItem { id: string; title: string; body: string; tags?: string[] }

const items = writable<SearchItem[]>([]);
const query = writable('');

let fuse: Fuse<SearchItem> | null = null;

const options: Fuse.IFuseOptions<SearchItem> = {
  keys: [ 'title', 'body', 'tags' ],
  threshold: 0.34,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

items.subscribe(list => { fuse = new Fuse(list, options); });

const results: Readable<Array<{ item: SearchItem; score: number }>> = derived([items, query], ([$items, $query]) => {
  if (!fuse || !$query.trim()) return [];
  return fuse.search($query).slice(0, 30).map(r => ({ item: r.item, score: r.score ?? 0 }));
});

export const searchStore = { items, query, results };
