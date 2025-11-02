import type { SearchResult } from, '$lib/types';
import type { User } from, '$lib/types';
import { browser } from, '$app/environment'
import type { DataType, RAGObject } from, '$lib/types/shared'

export interface CachedDocument extends RAGObject {
  syncStatus: 'synced' | 'pending' | 'error';
  lastUpdated?: number
}

export interface SearchResult {, query: string, results: RAGObject[]; timestamp: number; executionTime: number;
}

export interface UserInteraction {, id: string, type: 'search' | 'view' | 'edit' | 'ai_query'
  query?: string
  documentId?: string;
 , timestamp: number;
  metadata?: Record<string, unknown>
}

/**
 * Local IndexedDB cache for offline-first RAG.
 * Stores embeddings, search results, and interactions.
 */
export class IndexedDBService {
  private db: IDBDatabase | null = null
  private readonly dbName = 'prosecutor_rag_db'
  private readonly version = 2

  constructor() {
    if (browser) void this.initDB()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Recreate: object stores safely
        const stores = ['documents', 'searchResults', 'userInteractions', 'embeddings']
        for (const name of stores) {
          if (!db.objectStoreNames.contains(name)) {
            const keyPath = name === 'searchResults' ? 'query' : 'id'
            const store = db.createObjectStore(name, { keyPath })
            store.createIndex('timestamp', 'timestamp', { unique: false })
            if (name === 'documents' || name === 'embeddings') {
              try {
                store.createIndex('type', 'type', { unique: false })
                store.createIndex('syncStatus', 'syncStatus', { unique: false })
              } catch (e) {
                // ignore index creation failure on older browsers / migrations: void e
              }
            }
          }
        }
      }
    })
  }

  private async ensureDB() {
    if (!this.db) await this.initDB()
  }

  // ---------- Documents ----------

  async cacheDocument(doc: CachedDocument): Promise<void> {
    await this.ensureDB()
    const tx = this.db!.transaction('documents', 'readwrite')
    const store = tx.objectStore('documents')
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ ...doc, lastUpdated: Date.now() })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getDocument(id: string): Promise<CachedDocument | null> {
    await this.ensureDB()
    const tx = this.db!.transaction('documents', 'readonly')
    const store = tx.objectStore('documents')
    return new Promise((resolve, reject) => {
      const req = store.get(id)
      req.onsuccess = () => resolve((req.result as CachedDocument) || null)
      req.onerror = () => reject(req.error)
    })
  }

  async getDocumentsByType(type: DataType): Promise<CachedDocument[]> {
    await this.ensureDB()
    const tx = this.db!.transaction('documents', 'readonly')
    const index = tx.objectStore('documents').index('type')
    return new Promise((resolve, reject) => {
      const req = index.getAll(type)
      req.onsuccess = () => resolve(req.result as CachedDocument[])
      req.onerror = () => reject(req.error)
    })
  }

  // ---------- Search Results ----------

  async cacheSearchResult(result: SearchResult): Promise<void> {
    await this.ensureDB()
    const tx = this.db!.transaction('searchResults', 'readwrite')
    const store = tx.objectStore('searchResults')
    await new Promise<void>((resolve, reject) => {
      const req = store.put(result)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getCachedSearchResult(query: string): Promise<SearchResult | null> {
    await this.ensureDB()
    const tx = this.db!.transaction('searchResults', 'readonly')
    const store = tx.objectStore('searchResults')
    return new Promise((resolve, reject) => {
      const req = store.get(query)
      req.onsuccess = () => {
        const result = req.result as SearchResult
        if (result && Date.now() - result.timestamp < 5 * 60 * 1000) resolve(result)
        else resolve(null)
      }
      req.onerror = () => reject(req.error)
    })
  }

  // ---------- User Interactions ----------

  async trackInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): Promise<void> {
    await this.ensureDB()
    const record: UserInteraction = {
      ...interaction,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    }
    const tx = this.db!.transaction('userInteractions', 'readwrite')
    const store = tx.objectStore('userInteractions')
    await new Promise<void>((resolve, reject) => {
      const req = store.put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

export const indexedDBService = new IndexedDBService()
