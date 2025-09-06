import { randomUUID } from "crypto";

// Loki.js based local memory and sync service for enhanced performance
// Browser environment check
const browser = typeof window !== "undefined";
import Loki, { type Collection } from "lokijs";
import type { Evidence } from '$lib/stores/evidenceStore.js';

export interface LokiEvidence extends Evidence {
  $loki?: number;
  meta?: unknown;
}
export interface SyncOperation {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  collectionName: string;
  recordId: string;
  data?: unknown;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}
class LokiEvidenceService {
  private db: Loki | null = null;
  private evidenceCollection: Collection<LokiEvidence> | null = null;
  private syncQueue: Collection<SyncOperation> | null = null;
  private isInitialized = false;
  private syncInProgress = false;

  constructor() {
    if (browser) {
      this.initializeDatabase();
    }
  }
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.db = new Loki("evidence_db.json", {
          adapter: new LokiIndexedAdapter("evidence_db"),
          autoload: true,
          autoloadCallback: () => {
            this.setupCollections();
            this.isInitialized = true;
            console.log("✅ Loki database initialized");
            resolve();
          },
          autosave: true,
          autosaveInterval: 4000,
        });
      } catch (error: any) {
        console.error("❌ Loki database initialization failed:", error);
        reject(error);
      }
    });
  }
  private setupCollections() {
    if (!this.db) return;

    // Evidence collection with indices for fast queries
    this.evidenceCollection =
      (this.db.getCollection("evidence") as Collection<LokiEvidence>) ||
      (this.db.addCollection("evidence", {
        indices: ["id", "caseId", "type"],
        unique: ["id"],
      }) as Collection<LokiEvidence>);

    // Sync queue for offline operations
    this.syncQueue =
      (this.db.getCollection("syncQueue") as Collection<SyncOperation>) ||
      (this.db.addCollection("syncQueue", {
        indices: ["timestamp", "synced", "type"],
      }) as Collection<SyncOperation>);

    // Clean up old synced operations (keep last 1000)
    const syncedOps = this.syncQueue.find({ synced: true });
    if (syncedOps.length > 1000) {
      const toDelete = syncedOps
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .slice(0, syncedOps.length - 1000);

      toDelete.forEach((op) => this.syncQueue?.remove(op));
    }
  }
  // Evidence CRUD operations with local caching
  public async createEvidence(evidence: Evidence): Promise<void> {
    if (!this.evidenceCollection) {
      throw new Error("Database not initialized");
    }
    try {
      // Insert into local collection
      this.evidenceCollection.insert({ ...evidence });

      // Add to sync queue
      await this.addToSyncQueue({
        id: crypto.randomUUID(),
        type: "CREATE",
        collectionName: "evidence",
        recordId: evidence.id,
        data: evidence,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      });

      // Trigger sync if online
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    } catch (error: any) {
      console.error("Failed to create evidence locally:", error);
      throw error;
    }
  }
  public async updateEvidence(
    evidenceId: string,
    changes: Partial<Evidence>
  ): Promise<void> {
    if (!this.evidenceCollection) {
      throw new Error("Database not initialized");
    }
    try {
      const existing = this.evidenceCollection.findOne({
        id: evidenceId,
      } as any);
      if (!existing) {
        throw new Error(`Evidence ${evidenceId} not found in local storage`);
      }
      // Update local record
      const updated = {
        ...existing,
        ...changes,
        timeline: {
          createdAt: existing.timeline.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      this.evidenceCollection.update(updated);

      // Add to sync queue
      await this.addToSyncQueue({
        id: crypto.randomUUID(),
        type: "UPDATE",
        collectionName: "evidence",
        recordId: evidenceId,
        data: changes,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      });

      // Trigger sync if online
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    } catch (error: any) {
      console.error("Failed to update evidence locally:", error);
      throw error;
    }
  }
  public async deleteEvidence(evidenceId: string): Promise<void> {
    if (!this.evidenceCollection) {
      throw new Error("Database not initialized");
    }
    try {
      const existing = this.evidenceCollection.findOne({
        id: evidenceId,
      } as any);
      if (!existing) {
        throw new Error(`Evidence ${evidenceId} not found in local storage`);
      }
      // Remove from local collection
      this.evidenceCollection.remove(existing);

      // Add to sync queue
      await this.addToSyncQueue({
        id: crypto.randomUUID(),
        type: "DELETE",
        collectionName: "evidence",
        recordId: evidenceId,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      });

      // Trigger sync if online
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    } catch (error: any) {
      console.error("Failed to delete evidence locally:", error);
      throw error;
    }
  }
  // Query methods with advanced filtering
  public getAllEvidence(): LokiEvidence[] {
    if (!this.evidenceCollection) return [];
    return this.evidenceCollection.find({});
  }
  public getEvidenceById(id: string): LokiEvidence | null {
    if (!this.evidenceCollection) return null;
    return this.evidenceCollection.findOne({ id: id } as any);
  }
  public getEvidenceByCase(caseId: string): LokiEvidence[] {
    if (!this.evidenceCollection) return [];
    return this.evidenceCollection.find({ caseId: caseId } as any);
  }
  public searchEvidence(query: string): LokiEvidence[] {
    if (!this.evidenceCollection) return [];

    return this.evidenceCollection.where((obj: LokiEvidence) => {
      const searchFields = [
        (obj as any).title || "",
        (obj as any).description || "",
        (obj as any).type || "",
        ...((obj as any).tags || []),
        (obj as any).metadata ? JSON.stringify((obj as any).metadata) : "",
      ]
        .join(" ")
        .toLowerCase();

      return searchFields.includes(query.toLowerCase());
    });
  }
  public getEvidenceByType(type: string): LokiEvidence[] {
    if (!this.evidenceCollection) return [];
    return this.evidenceCollection.find({ type: type } as any);
  }
  public getEvidenceByDateRange(
    startDate: string,
    endDate: string
  ): LokiEvidence[] {
    if (!this.evidenceCollection) return [];

    return this.evidenceCollection.where((obj: LokiEvidence) => {
      const createdAt = new Date((obj as any).timeline?.createdAt || 0);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return createdAt >= start && createdAt <= end;
    });
  }
  // Advanced analytics queries
  public getEvidenceStats() {
    if (!this.evidenceCollection) {
      return { total: 0, byType: {}, byCase: {}, recentCount: 0 };
    }
    const all = this.evidenceCollection.find({});
    const byType: Record<string, number> = {};
    const byCase: Record<string, number> = {};
    let recentCount = 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    all.forEach((evidence) => {
      // Count by type
      const type = (evidence as any).type || "unknown";
      byType[type] = (byType[type] || 0) + 1;

      // Count by case
      const caseId = (evidence as any).caseId || "unknown";
      byCase[caseId] = (byCase[caseId] || 0) + 1;

      // Count recent evidence
      const timeline = (evidence as any).timeline;
      if (timeline?.createdAt && new Date(timeline.createdAt) > oneWeekAgo) {
        recentCount++;
      }
    });

    return {
      total: all.length,
      byType,
      byCase,
      recentCount,
    };
  }
  // Sync queue management
  private async addToSyncQueue(operation: SyncOperation): Promise<void> {
    if (!this.syncQueue) return;

    this.syncQueue.insert(operation);
  }
  public async processSyncQueue(): Promise<void> {
    if (!this.syncQueue || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const pendingOps = this.syncQueue.find({ synced: false });

      for (const operation of pendingOps) {
        try {
          await this.syncOperation(operation);

          // Mark as synced
          operation.synced = true;
          this.syncQueue.update(operation);
        } catch (error: any) {
          console.error(`Sync failed for operation ${operation.id}:`, error);

          // Increment retry count
          operation.retryCount++;

          // Remove operations that failed too many times
          if (operation.retryCount > 5) {
            this.syncQueue.remove(operation);
            console.warn(
              `Removing operation ${operation.id} after ${operation.retryCount} failed attempts`
            );
          } else {
            this.syncQueue.update(operation);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }
  private async syncOperation(operation: SyncOperation): Promise<void> {
    const { type, recordId, data } = operation;

    switch (type) {
      case "CREATE":
        await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        break;

      case "UPDATE":
        await fetch(`/api/evidence/${recordId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        break;

      case "DELETE":
        await fetch(`/api/evidence/${recordId}`, {
          method: "DELETE",
        });
        break;
    }
  }
  // Sync status and conflict resolution
  public getSyncStatus() {
    if (!this.syncQueue) {
      return { pending: 0, failed: 0, total: 0, inProgress: false };
    }
    const all = this.syncQueue.find({});
    const pending = all.filter((op) => !op.synced && op.retryCount < 5).length;
    const failed = all.filter((op) => !op.synced && op.retryCount >= 5).length;

    return {
      pending,
      failed,
      total: all.length,
      inProgress: this.syncInProgress,
    };
  }
  public async syncWithServer(serverEvidence: Evidence[]): Promise<void> {
    if (!this.evidenceCollection) return;

    // Get local evidence
    const localEvidence = this.evidenceCollection.find({});

    // Create maps for efficient lookup
    const localMap = new Map(localEvidence.map((e: any) => [(e as any).id, e]));
    const serverMap = new Map(serverEvidence.map((e: any) => [e.id, e]));

    // Find conflicts and resolve them
    for (const [id, serverItem] of Array.from(serverMap)) {
      const localItem = localMap.get(id);

      if (!localItem) {
        // Server has item that local doesn't have - add it
        this.evidenceCollection.insert(serverItem as LokiEvidence);
      } else {
        // Both have the item - check timestamps and resolve conflict
        const serverUpdated = new Date(serverItem.timeline?.updatedAt || 0);
        const localUpdated = new Date(
          (localItem as any).timeline?.updatedAt || 0
        );

        if (serverUpdated > localUpdated) {
          // Server is newer - update local
          this.evidenceCollection.update(
            Object.assign({}, localItem, serverItem)
          );
        }
        // If local is newer, keep local version (it will sync to server later)
      }
    }
    // Remove items that exist locally but not on server (unless they're in sync queue)
    const pendingIds = new Set(
      this.syncQueue?.find({ synced: false }).map((op) => op.recordId) || []
    );

    for (const [id, localItem] of Array.from(localMap)) {
      if (!serverMap.has(id as string) && !pendingIds.has(id as string)) {
        this.evidenceCollection?.remove(localItem);
      }
    }
  }
  // Database maintenance
  public async compactDatabase(): Promise<void> {
    if (!this.db) return;

    // This is a placeholder - Loki.js doesn't have a direct compact method
    // In a real implementation, you might recreate the database with current data
    console.log(
      "Database compaction requested - implement based on Loki.js version"
    );
  }
  public async clearLocalData(): Promise<void> {
    if (!this.evidenceCollection || !this.syncQueue) return;

    this.evidenceCollection.clear();
    this.syncQueue.clear();
  }
  public isReady(): boolean {
    return this.isInitialized;
  }
}
// LokiIndexedAdapter for better browser persistence
class LokiIndexedAdapter {
  constructor(private dbname: string) {}

  loadDatabase(dbname: string, callback: (data: any) => void): void {
    // Load from IndexedDB
    const request = indexedDB.open(this.dbname, 1);

    request.onerror = () => callback(null);

    request.onsuccess = (event: any) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["data"], "readonly");
      const store = transaction.objectStore("data");
      const getRequest = store.get(dbname);

      getRequest.onsuccess = () => {
        callback(getRequest.result ? getRequest.result.data : null);
      };

      getRequest.onerror = () => callback(null);
    };

    request.onupgradeneeded = (event: any) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("data")) {
        db.createObjectStore("data", { keyPath: "id" });
      }
    };
  }
  saveDatabase(dbname: string, dbstring: string, callback: () => void): void {
    // Save to IndexedDB
    const request = indexedDB.open(this.dbname, 1);

    request.onsuccess = (event: any) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(["data"], "readwrite");
      const store = transaction.objectStore("data");

      store.put({ id: dbname, data: dbstring });

      transaction.oncomplete = () => callback();
      transaction.onerror = () => callback();
    };

    request.onerror = () => callback();
  }
  deleteDatabase(dbname: string, callback: () => void): void {
    const deleteRequest = indexedDB.deleteDatabase(this.dbname);
    deleteRequest.onsuccess = () => callback();
    deleteRequest.onerror = () => callback();
  }
}
// Export singleton instance
export const lokiEvidenceService = new LokiEvidenceService();
;