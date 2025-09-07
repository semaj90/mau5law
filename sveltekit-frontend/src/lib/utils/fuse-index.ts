import Fuse from 'fuse.js';

export function createFuseIndex<T extends Record<string, any>>(items: T[], keys: (keyof T | string)[]) {
  const fuse = new Fuse(items, {
    includeScore: true,
    threshold: 0.35,
    keys: keys as any
  });
  return {
    search: (q: string, limit = 10) => fuse.search(q).slice(0, limit),
    update: (next: T[]) => fuse.setCollection(next)
  };
}
