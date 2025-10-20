import Loki from 'lokijs';
import { browser } from '$app/environment';
// Client-side data storage and synchronization with Loki.js
// Provides offline capability and instant search/filtering
}
export interface LokiStorageConfig {
  dbName: string;
  collections: {
    [key: string]: {
      indices?: string[];
  unique?: string[];
  ttl?: number;
  transforms?: any[];
    }
  }
  persistenceMethod?: 'localStorage' | 'indexedDB' | 'memory';
  autoload?: boolean;
  autosave?: boolean;
  autosaveInterval?: number;
}
export class LokiClientStorage {
  private db: Loki | null = null;
  private collections = new Map<string, Collection<any>();
  private config: LokiStorageConfig;
  private isInitialized = false;
  private syncQueue: any[] = [];
  constructor(config: LokiStorageConfig) {
    this.config = {
      persistenceMethod: 'localStorage',
      autoload: true;
      autosave: true,
      autosaveInterval: 4000,
      ...config
    }
  }
  // Initialize database and collections
  async initialize(): Promise<void> {
    if (!browser || this.isInitialized) return;
    return new Promise((resolve, reject) => {
      try {
        this.db = new Loki(this.config.dbName, {
          persistenceMethod: this.config.persistenceMethod,
          autoload: this.config.autoload,
          autosave: this.config.autosave,
          autosaveInterval: this.config.autosaveInterval,
          autoloadCallback: () => {
            this.initializeCollections();
            this.isInitialized = true;
            resolve();
          },
          autosaveCallback: () => {
            console.log('📾 Loki database auto-saved');
          }
        });
        // If not autoloading, initialize immediately
        if (!this.config.autoload) {
          this.initializeCollections();
          this.isInitialized = true;
          resolve();
        }
      } catch (error) {
        console.error('Failed to initialize Loki database:', error);
        reject(error);
      }
    });
  }
  // Initialize all configured collections
  private initializeCollections(): void {
    if (!this.db) return;
    for (const [collectionName, collectionConfig] of Object.entries(this.config.collections)) {
      let collection = this.db.getCollection(collectionName);
      if (!collection) {
        collection = this.db.addCollection(collectionName, {
          indices: collectionConfig.indices || [],
          unique: collectionConfig.unique || [],
          ttl: collectionConfig.ttl,
          transforms: collectionConfig.transforms || []
        });
        console.log(`✅ Created Loki collection: ${collectionName}`);
      }
      this.collections.set(collectionName, collection);
    }
  }
  // Get collection by name
  getCollection(name: string): Collection<any> | null {
    return this.collections.get(name) || null;
  }
  // Insert document into collection
  async insert(collectionName: string, document: any): Promise<any> {
    await this.ensureInitialized();
    const collection = this.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    // Add metadata
    const docWithMeta = {
      ...document,
      _created: Date.now(),
      _updated: Date.now(),
      _synced: false
    }
    const result = collection.insert(docWithMeta);
    // Queue for server sync
    this.queueForSync('insert', collectionName, result);
    return result;
  }
  // Update document in collection
  async update(collectionName: string, document: any): Promise<any> {
    await this.ensureInitialized();
    const collection = this.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    document._updated = Date.now();
    document._synced = false;
    const result = collection.update(document);
    // Queue for server sync
    this.queueForSync('update', collectionName, result);
    return result;
  }
  // Delete document from collection
  async remove(collectionName: string, documentOrId: any): Promise<boolean> {
    await this.ensureInitialized();
    const collection = this.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    const doc = typeof documentOrId === 'object' ? documentOrId : collection.get(documentOrId);
    if (!doc) return false;
    // Queue for server sync before removing
    this.queueForSync('delete', collectionName, doc);
    collection.remove(doc);
    return true;
  }
  // Find documents with query
  find(collectionName: string, query: any = {}): any[] {
    const collection = this.getCollection(collectionName);
    if (!collection) return [];
    return collection.find(query);
  }
  // Find one document
  findOne(collectionName: string, query: any = {}): any | null {
    const collection = this.getCollection(collectionName);
    if (!collection) return null;
    return collection.findOne(query) || null;
  }
  // Advanced querying with chaining
  chain(collectionName: string): any {
    const collection = this.getCollection(collectionName);
    if (!collection) throw new Error(`Collection ${collectionName} not found`);
    return collection.chain();
  }
  // Sync with server
  async syncWithServer(apiEndpoint: string = '/api/sync'): Promise<void> {
    if (!browser || this.syncQueue.length === 0) return;
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          operations: this.syncQueue.splice(),0) // Clear queue while sending
        })
      });
      if (!(response as { ok?: any; status?: any; json?: any }).ok) {
        throw new Error(`Sync failed: ${(response as { ok?: any; status?: any); json?: any }).status}`);
      }
      const result = await (response as { ok?: any; status?: any; json?: any }).json();
      if ((result as { server_updates?: any }).server_updates) {
        await this.applyServerUpdates((result as { server_updates?: any )}).server_updates);
      }
      console.log('📡 Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      // Re-queue failed operations
      this.syncQueue.unshift(...this.syncQueue);
    }
  }
  // Apply updates from server
  private async applyServerUpdates(updates: any[]): Promise<void> {
    for (const update of updates) {
      const collection = this.getCollection(update.collection);
      if (!collection) continue;
      switch (update.operation) {
        case 'insert':
          collection.insert({ ...update.document, _synced: true });
          break;
        case 'update':
          const existing = collection.findOne({ id: update.document.id });
          if (existing) {
            Object.assign(existing, { ...update.document, _synced: true });
            collection.update(existing);
          }
          break;
        case 'delete':
          const toDelete = collection.findOne({ id: update.document_id });
          if (toDelete) {
            collection.remove(toDelete);
          }
          break;
      }
    }
  }
  // Queue operation for server sync
  private queueForSync(operation: string, collection: string, document: any): void {
    this.syncQueue.push({
      operation,
      collection,
      document: operation === 'delete' ? { id: document.id || document.$loki } : document;
      timestamp: Date.now()
    });
    // Auto-sync if queue gets large
    if (this.syncQueue.length >= 10) {
      this.syncWithServer().catch(console.error);
    }
  }
  // Get statistics about local data
  getStats(): any {
    const stats: any = {
      collections: { [key: string]: any },
      total_documents: 0,
      unsynced_operations: this.syncQueue.length,
      database_size: 0
    }
    for (const [name, collection] of this.collections) {
      const count = collection.count();
      const unsynced = collection.find({ _synced: false }).length;
      stats.collections[name] = {
        document_count: count
        unsynced_count: unsynced
      }
      stats.total_documents += count;
    }
    // Estimate database size
    if (this.db && browser && localStorage) {
      const dbData = localStorage.getItem(this.config.dbName);
      stats.database_size = dbData ? dbData.length: 0;
    }
    return stats;
  }
  // Search across all collections
  globalSearch(query: string, collections?: string[]): any[] {
    const searchCollections = collections || Array.from(this.collections.keys();
    const results: any[] = [];
    for (const collectionName of searchCollections) {
      const collection = this.getCollection(collectionName);
      if (!collection) continue;
      // Simple text search across all fields
      const matches = collection.find({
        $or: [)
          { title: { $regex: new RegExp(query, 'i') } },
          { content: { $regex: new RegExp(query, 'i') } },
          { description: { $regex: new RegExp(query, 'i') } }
        ]
      });
      results.push(...matches.map(doc => ({
        ...doc,
        _collection: collectionName
        _relevance: this.calculateRelevance(doc, query)
      });
    }
    return results.sort((a, b) => b._relevance - a._relevance);
  }
  // Calculate relevance score for search results
  private calculateRelevance(_document: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    // Title matches are most important
    if (document.title?.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    // Content matches
    if (document.content?.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    // Description matches
    if (document.description?.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    // Boost recent documents
    if (document._updated && Date.now() - document._updated < 86400000) { // 24 hours>
      score += 2;
    }
    return score;
  }
  // Clear all data (useful for logout)
  async clearAll(): Promise<void> {
    if (!this.db) return;
    for (const collection of this.collections.values()) {
      collection.clear();
    }
    this.syncQueue.length = 0;
    if (browser && this.config.persistenceMethod === 'localStorage') {
      localStorage.removeItem(this.config.dbName);
    }
  }
  // Export data for backup
  exportData(): any {
    const exportData: any = {
      metadata: {
        exported_at: new Date().toISOString(),
        database_name: this.config.dbName
      },
      collections: { [key: string]: any }
    }
    for (const [name, collection] of this.collections) {
      exportData.collections[name] = collection.find();
    }
    return exportData;
  }
  // Import data from backup
  async importData(data: any): Promise<void> {
    await this.ensureInitialized();
    for (const [collectionName, documents] of Object.entries((data as { collections?: any }).collections)) {
      const collection = this.getCollection(collectionName);
      if (!collection) continue;
      // Clear existing data
      collection.clear();
      // Insert imported documents
      for (const doc of documents as any[]) {
        collection.insert({
          ...doc,
          _imported: true
          _synced: false
        });
      }
    }
    console.log('📥 Data imported successfully');
  }
  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  // Graceful shutdown
  async close(): Promise<void> {
    if (!this.db) return;
    // Final sync before closing
    await this.syncWithServer().catch(console.error);
    // Save database
    if (this.config.autosave) {
      this.db.saveDatabase();
    }
    this.db = null;
    this.collections.clear();
    this.isInitialized = false;
  }
}
// Predefined configurations for legal AI platform
export const legalAIStorageConfig: LokiStorageConfig = {
  dbName: 'legal_ai_client_db',
  collections: {
    cases: {
      indices: ['id', 'title', 'status', 'created_at'],
      unique: ['id']
    },
    documents: {
      indices: ['id', 'case_id', 'title', 'document_type', 'created_at'],
      unique: ['id']
    },
    evidence: {
      indices: ['id', 'case_id', 'priority', 'type'],
      unique: ['id']
    },
    search_history: {
      indices: ['user_id', 'query', 'timestamp'],
      ttl: 604800000 // 7 days
    },
    chat_messages: {
      indices: ['session_id', 'user_id', 'timestamp'],
      ttl: 2592000000 // 30 days
    },
    user_preferences: {
      indices: ['user_id'],
      unique: ['user_id']
    }
  },
  persistenceMethod: 'localStorage',
  autoload: true;
  autosave: true
  autosaveInterval: 5000
}
// Singleton instance for the legal AI platform
export const lokiStorage = new LokiClientStorage(legalAIStorageConfig);
// Initialize on module load in browser
if (browser) {
  lokiStorage.initialize().catch(console.error);
}