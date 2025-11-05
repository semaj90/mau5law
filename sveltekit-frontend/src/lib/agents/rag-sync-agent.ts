import { browser } from "$app/environment";
import { IndexedDBService } from "$lib/services/indexeddb-service"; // Corrected: Named import
import type { LegalDocumentJSON } from "$lib/wasm/simd-json-wrapper"; // New import

/**
 * Client-side background agent that periodically finds pending documents
 * in IndexedDB and sends them to the server sync endpoint for embedding & storage.
 *
 * This file intentionally keeps logic minimal and pushes heavy lifting to the server.
 */
const DEFAULT_INTERVAL = 30_000; // 30s

// Define a type for the document structure based on usage
interface Document {
  id: LegalDocumentJSON["id"];
  content?: LegalDocumentJSON["content"];
  metadata?: LegalDocumentJSON["metadata"];
  syncStatus: "pending" | "synced" | "failed";
  embedding?: number[];
}

export class RAGSyncAgent {
  private timer: number | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = DEFAULT_INTERVAL) {
    // Corrected: type annotation for intervalMs
    this.intervalMs = intervalMs;
  }

  start() {
    if (!browser) return;
    if (this.timer) return;
    this.timer = window.setInterval(() => void this.runOnce(), this.intervalMs);
    void this.runOnce();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce() {
    try {
      if (!navigator.onLine) return;
      const indexedDB = new IndexedDBService(); // Corrected: Instantiate the service
      const docs: Document[] = await indexedDB.getDocumentsByType("document"); // Corrected: Use instantiated service and type assertion
      const unsynced = docs.filter((d: Document) => d.syncStatus === "pending"); // Corrected: Explicit type for 'd'

      for (const doc of unsynced) {
        // Corrected: Explicit type for 'doc'
        try {
          const res = await fetch("/api/rag/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: doc.id,
              text: doc.content || "",
              metadata: doc.metadata || {},
            }),
          });

          if (!res.ok) {
            console.warn("RAG sync failed for doc:", doc.id, "status:", res.status);
            continue;
          }

          const payload = await res.json();
          if (payload?.embedding) {
            // Persist embedding + mark synced
            doc.embedding = payload.embedding;
            doc.syncStatus = "synced";
            await indexedDB.cacheDocument(doc);
          }
        } catch (err) {
          console.warn("RAG sync error for doc", doc.id, err);
        }
      }
    } catch (err) {
      console.error("RAGSyncAgent.runOnce failed", err);
    }
  }
}

export const ragSyncAgent = new RAGSyncAgent();
