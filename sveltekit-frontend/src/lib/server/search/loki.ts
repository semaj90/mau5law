import Loki from 'lokijs';

export interface LokiSearchOptions {
  collection: string;
  indices?: string[];
  unique?: string[];
  autoupdate?: boolean;
}

export interface SearchQuery {
  [key: string]: any;
  $and?: SearchQuery[];
  $or?: SearchQuery[];
  $regex?: RegExp;
  $contains?: any;
  $in?: any[];
  $gt?: number | string | Date;
  $gte?: number | string | Date;
  $lt?: number | string | Date;
  $lte?: number | string | Date;
  $ne?: any;
  $exists?: boolean;
}

export interface SearchResult<T = any> {
  data: T[];
  count: number;
  total: number;
  page?: number;
  limit?: number;
}

export class LokiSearchService {
  private db: Loki;
  private collections: Map<string, Collection<any>> = new Map();

  constructor(filename?: string) {
    this.db = new Loki(filename || 'legal-search.db', {
      autoload: true,
      autosave: true,
      autosaveInterval: 4000,
    });
  }

  /**
   * Create or get a collection
   */
  getCollection<T = any>(name: string, options: LokiSearchOptions = {}): Collection<T> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    const collection = this.db.addCollection<T>(name, {
      indices: options.indices,
      unique: options.unique,
      autoupdate: options.autoupdate ?? true,
    });

    this.collections.set(name, collection);
    return collection;
  }

  /**
   * Insert a document into a collection
   */
  insert<T = any>(collectionName: string, doc: T): T & LokiObj {
    const collection = this.getCollection<T>(collectionName);
    return collection.insert(doc);
  }

  /**
   * Insert multiple documents into a collection
   */
  insertMany<T = any>(collectionName: string, docs: T[]): (T & LokiObj)[] {
    const collection = this.getCollection<T>(collectionName);
    return docs.map(doc => collection.insert(doc));
  }

  /**
   * Find documents matching a query
   */
  find<T = any>(collectionName: string, query: SearchQuery = {}): (T & LokiObj)[] {
    const collection = this.getCollection<T>(collectionName);
    return collection.find(query);
  }

  /**
   * Find one document matching a query
   */
  findOne<T = any>(collectionName: string, query: SearchQuery = {}): (T & LokiObj) | null {
    const collection = this.getCollection<T>(collectionName);
    return collection.findOne(query);
  }

  /**
   * Find documents with pagination
   */
  findPaginated<T = any>(
    collectionName: string,
    query: SearchQuery = {},
    page: number = 1,
    limit: number = 10
  ): SearchResult<T & LokiObj> {
    const collection = this.getCollection<T>(collectionName);
    const results = collection.chain().find(query);
    const total = results.count();

    const data = results
      .offset((page - 1) * limit)
      .limit(limit)
      .data();

    return {
      data,
      count: data.length,
      total,
      page,
      limit,
    };
  }

  /**
   * Update documents matching a query
   */
  update<T = any>(
    collectionName: string,
    query: SearchQuery,
    updateFn: (doc: T & LokiObj) => void
  ): number {
    const collection = this.getCollection<T>(collectionName);
    return collection.updateWhere(updateFn, query);
  }

  /**
   * Remove documents matching a query
   */
  remove(collectionName: string, query: SearchQuery): number {
    const collection = this.getCollection(collectionName);
    return collection.removeWhere(query);
  }

  /**
   * Get document by ID
   */
  getById<T = any>(collectionName: string, id: string): (T & LokiObj) | null {
    const collection = this.getCollection<T>(collectionName);
    return collection.get(id);
  }

  /**
   * Update document by ID
   */
  updateById<T = any>(collectionName: string, id: string, updates: Partial<T>): boolean {
    const collection = this.getCollection<T>(collectionName);
    const doc = collection.get(id);
    if (!doc) return false;

    Object.assign(doc, updates);
    collection.update(doc);
    return true;
  }

  /**
   * Remove document by ID
   */
  removeById(collectionName: string, id: string): boolean {
    const collection = this.getCollection(collectionName);
    return collection.remove(id);
  }

  /**
   * Get collection statistics
   */
  getStats(collectionName: string): {
    count: number;
    indices: string[];
    unique: string[];
  } {
    const collection = this.getCollection(collectionName);
    return {
      count: collection.count(),
      indices: collection.binaryIndices ? Object.keys(collection.binaryIndices) : [],
      unique: collection.uniqueNames || [],
    };
  }

  /**
   * Clear all documents from a collection
   */
  clearCollection(collectionName: string): void {
    const collection = this.getCollection(collectionName);
    collection.clear();
  }

  /**
   * Delete a collection
   */
  deleteCollection(collectionName: string): boolean {
    if (this.collections.has(collectionName)) {
      this.db.removeCollection(collectionName);
      this.collections.delete(collectionName);
      return true;
    }
    return false;
  }

  /**
   * List all collections
   */
  listCollections(): string[] {
    return this.db.listCollections().map(col => col.name);
  }

  /**
   * Save database to disk
   */
  saveDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.saveDatabase((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Load database from disk
   */
  loadDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.loadDatabase({}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Legal-specific search configurations
export const LEGAL_LOKI_CONFIGS = {
  cases: {
    collection: 'cases',
    indices: ['caseNumber', 'title', 'status', 'createdAt'],
    unique: ['caseNumber'],
  },
  evidence: {
    collection: 'evidence',
    indices: ['caseId', 'title', 'evidenceType', 'createdAt', 'tags'],
  },
  documents: {
    collection: 'documents',
    indices: ['caseId', 'title', 'documentType', 'createdAt', 'author'],
  },
  persons: {
    collection: 'persons',
    indices: ['name', 'aliases', 'caseIds', 'createdAt'],
    unique: ['name'],
  },
  annotations: {
    collection: 'annotations',
    indices: ['evidenceId', 'userId', 'createdAt', 'type'],
  },
} as const;

// Pre-configured search manager for legal entities
export class LegalLokiManager {
  private static instance: LegalLokiManager;
  private loki: LokiSearchService;

  private constructor() {
    this.loki = new LokiSearchService('legal-loki.db');
  }

  static getInstance(): LegalLokiManager {
    if (!LegalLokiManager.instance) {
      LegalLokiManager.instance = new LegalLokiManager();
    }
    return LegalLokiManager.instance;
  }

  // Cases
  getCasesCollection() {
    return this.loki.getCollection('cases', LEGAL_LOKI_CONFIGS.cases);
  }

  // Evidence
  getEvidenceCollection() {
    return this.loki.getCollection('evidence', LEGAL_LOKI_CONFIGS.evidence);
  }

  // Documents
  getDocumentsCollection() {
    return this.loki.getCollection('documents', LEGAL_LOKI_CONFIGS.documents);
  }

  // Persons
  getPersonsCollection() {
    return this.loki.getCollection('persons', LEGAL_LOKI_CONFIGS.persons);
  }

  // Annotations
  getAnnotationsCollection() {
    return this.loki.getCollection('annotations', LEGAL_LOKI_CONFIGS.annotations);
  }

  // Search across all collections
  async searchAll(query: SearchQuery, collections: string[] = ['cases', 'evidence', 'documents', 'persons']): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const collectionName of collections) {
      try {
        const collectionResults = this.loki.findPaginated(collectionName, query, 1, 50);
        if (collectionResults.data.length > 0) {
          results.push({
            ...collectionResults,
            collection: collectionName,
          });
        }
      } catch (error) {
        console.warn(`Search failed for collection ${collectionName}:`, error);
      }
    }

    return results;
  }

  // Get database statistics
  getDatabaseStats() {
    const collections = this.loki.listCollections();
    const stats: Record<string, any> = {};

    for (const collectionName of collections) {
      stats[collectionName] = this.loki.getStats(collectionName);
    }

    return stats;
  }

  // Backup database
  async backup(): Promise<string> {
    await this.loki.saveDatabase();
    return 'Database backed up successfully';
  }

  // Close database
  close() {
    this.loki.close();
  }
}