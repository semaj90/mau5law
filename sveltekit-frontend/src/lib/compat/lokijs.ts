// Lightweight LokiJS compatibility shim to avoid runtime issues in browsers/SSR.
// This stub provides a minimal API surface used across the app without importing
// the actual 'lokijs' UMD bundle (which can break under ESM/HMR).

type Doc = Record<string, any> & { $loki?: number };

class MemoryCollection<T extends Doc = Doc> {
	name: string;
	private data: T[] = [];
	constructor(name: string) {
		this.name = name;
	}
	insert(doc: T | T[]): T | T[] {
		if (Array.isArray(doc)) {
			doc.forEach((d) => this.insert(d));
			return doc;
		}
		const clone = { ...(doc as any) } as T;
		clone.$loki = this.data.length + 1;
		this.data.push(clone);
		return clone;
	}
	find(query: Partial<T> = {} as Partial<T>): T[] {
		const keys = Object.keys(query) as (keyof T)[];
		if (keys.length === 0) return [...this.data];
		return this.data.filter((item) => keys.every((k) => (item as any)[k] === (query as any)[k]));
	}
	findOne(query: Partial<T>): T | null {
		return this.find(query)[0] || null;
	}
	update(doc: T) {
		if (!doc.$loki) return;
		const idx = this.data.findIndex((d) => d.$loki === doc.$loki);
		if (idx >= 0) this.data[idx] = doc;
	}
	remove(doc: T) {
		if (!doc.$loki) return;
		const idx = this.data.findIndex((d) => d.$loki === doc.$loki);
		if (idx >= 0) this.data.splice(idx, 1);
	}
}

class LokiMemoryAdapter {
	// Placeholder for API compatibility
}

class Loki {
	filename: string;
	options: any;
	private collections = new Map<string, MemoryCollection<any>>();
	static LokiMemoryAdapter = LokiMemoryAdapter;

	constructor(filename: string, options?: any) {
		this.filename = filename;
		this.options = options || {};
		if (typeof this.options?.autoloadCallback === 'function') {
			// Defer to simulate async load
			setTimeout(() => this.options.autoloadCallback?.(), 0);
		}
	}
	addCollection<T extends Doc = Doc>(name: string): MemoryCollection<T> {
		const existing = this.collections.get(name);
		if (existing) return existing as MemoryCollection<T>;
		const col = new MemoryCollection<T>(name);
		this.collections.set(name, col);
		return col as MemoryCollection<T>;
	}
	getCollection<T extends Doc = Doc>(name: string): MemoryCollection<T> | null {
		return (this.collections.get(name) as MemoryCollection<T>) || null;
	}
	getCollections(): MemoryCollection<any>[] {
		return Array.from(this.collections.values());
	}
	removeCollection(name: string) {
		this.collections.delete(name);
	}
	saveDatabase(cb?: (err?: any) => void) {
		cb?.();
	}
	close(cb?: () => void) {
		cb?.();
	}
}

export default Loki;
export type Collection<T = any> = MemoryCollection<T>;
