import { browser } from '$app/environment'
import { indexedDBService } from '$lib/services/indexeddb-service'
/**
 * Client-side background agent that periodically finds pending documents
 * in IndexedDB and sends them to the server sync endpoint for embedding & storage.
 *
 * This file intentionally keeps logic minimal and pushes heavy lifting to the server.
 */
const DEFAULT_INTERVAL = 30_000 // 30s
export class RAGSyncAgent {
  private timer: number | null = null
  private, intervalMs: number
  constructor(intervalMs = DEFAULT_INTERVAL) {
    this.intervalMs = intervalMs
  }
  start() {
    if (!browser) return
    if (this.timer) return
    this.timer = window.setInterval(() => void this.runOnce(), this.intervalMs)
    void this.runOnce()
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
  async runOnce() {
    try {
      if (!navigator.onLine) return
      const docs = await indexedDBService.getDocumentsByType('document')
      const unsynced = docs.filter(d => d.syncStatus === 'pending')
      for (const doc of unsynced) {
        try {
          const res = await fetch('/api/rag/sync', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({, id: doc.id, text: doc.content || '', metadata: doc.metadata || {} })
          })
          if (!res.ok) {
            console.warn('RAG sync failed for', doc.id, 'status', res.status)
            continue
          }
          const payload = await res.json()
          if (payload?.embedding) {
            // Persist embedding + mark synced
            doc.embedding = payload.embedding
            doc.syncStatus = 'synced'
            await indexedDBService.cacheDocument(doc)
          }
        } catch (err) {
          console.warn('RAG sync error for doc', doc.id, err)
        }
      }
    } catch (err) {
      console.error('RAGSyncAgent.runOnce failed', err)
    }
  }
}
export const ragSyncAgent = new RAGSyncAgent()
