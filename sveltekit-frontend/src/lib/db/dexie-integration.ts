/**
 * Dexie.js Integration - Modern IndexedDB Wrapper
 * 
 * Replaces raw IndexedDB with clean async/await syntax
 * Provides reactive Svelte stores for real-time UI updates
 */

import Dexie, { type Table, liveQuery } from 'dexie';

// ============================================================================
// DATABASE SCHEMA DEFINITIONS
// ============================================================================

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    legalContext?: {
      documentType?: string;
      jurisdiction?: string;
      practiceArea?: string;
    };
  };
}

export interface LegalDocument {
  id?: number;
  title: string;
  content: string;
  documentType: 'contract' | 'brief' | 'motion' | 'pleading' | 'evidence' | 'citation';
  jurisdiction?: string;
  practiceArea?: string;
  embedding?: number[]; // Vector embedding
  quantizedEmbedding?: Uint8Array; // Compressed embedding
  created: Date;
  modified: Date;
  tags: string[];
}

export interface GraphNode {
  id?: number;
  nodeId: string; // Neo4j node ID
  label: string;
  position: { x: number; y: number; z?: number }; // Layout coordinates
  embedding: number[]; // 384d vector from nomic-embed
  rankingMatrix: number[]; // 4x4 matrix flattened to 16 elements
  varianceMatrix: number[]; // 4x4 variance matrix
  metadata: {
    documentType?: string;
    jurisdiction?: string;
    practiceArea?: string;
    confidence: number;
    lastUpdated: Date;
  };
  connections: string[]; // Connected node IDs
}

export interface GraphEdge {
  id?: number;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  edgeType: 'citation' | 'reference' | 'similarity' | 'precedent';
  metadata?: Record<string, any>;
}

export interface UserSession {
  id?: number;
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  activities: Array<{
    type: 'search' | 'chat' | 'document_view' | 'graph_explore';
    timestamp: Date;
    data: Record<string, any>;
  }>;
}

export interface CacheEntry {
  id?: number;
  key: string;
  data: any;
  createdAt: Date;
  expiresAt: Date;
  size: number;
  hitCount: number;
}

// ============================================================================
// DEXIE DATABASE CLASS
// ============================================================================

export class LegalAIDatabase extends Dexie {
  // Tables with type safety
  chatHistory!: Table<ChatMessage>;
  legalDocuments!: Table<LegalDocument>;
  graphNodes!: Table<GraphNode>;
  graphEdges!: Table<GraphEdge>;
  userSessions!: Table<UserSession>;
  cache!: Table<CacheEntry>;

  constructor() {
    super('LegalAIDatabase');
    
    // Version 1: Initial schema
    this.version(1).stores({
      chatHistory: '++id, timestamp, role, [metadata.legalContext.documentType]',
      legalDocuments: '++id, title, documentType, jurisdiction, practiceArea, created, *tags',
      graphNodes: '++id, nodeId, [metadata.documentType], [metadata.jurisdiction], [metadata.practiceArea]',
      graphEdges: '++id, fromNodeId, toNodeId, edgeType, weight',
      userSessions: '++id, sessionId, userId, startTime',
      cache: '++id, key, createdAt, expiresAt, hitCount'
    });

    // Version 2: Add indexes for performance
    this.version(2).stores({
      chatHistory: '++id, timestamp, role, [metadata.legalContext.documentType], [metadata.legalContext.jurisdiction]',
      legalDocuments: '++id, title, documentType, jurisdiction, practiceArea, created, modified, *tags',
      graphNodes: '++id, nodeId, [metadata.documentType], [metadata.jurisdiction], [metadata.practiceArea], [metadata.confidence]',
      graphEdges: '++id, fromNodeId, toNodeId, edgeType, weight',
      userSessions: '++id, sessionId, userId, startTime, endTime',
      cache: '++id, key, createdAt, expiresAt, hitCount, size'
    });

    // Hooks for automatic cleanup and maintenance
    this.cache.hook('creating', (primKey, obj, trans) => {
      (obj as any).hitCount = 0;
      (obj as any).createdAt = new Date();
    });

    this.graphNodes.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).metadata = { ...(obj as any).metadata, lastUpdated: new Date() };
    });
  }

  // ========================================================================
  // CHAT HISTORY METHODS
  // ========================================================================

  async addChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<number> {
    return await this.chatHistory.add({
      ...message,
      timestamp: new Date()
    });
  }

  // Reactive query - automatically updates UI when data changes
  getChatHistory(limit = 100) {
    return liveQuery(() => 
      this.chatHistory
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray()
    );
  }

  getChatHistoryByContext(legalContext: { documentType?: string; jurisdiction?: string; practiceArea?: string }) {
    return liveQuery(() => {
      let query = this.chatHistory.toCollection();
      
      if (legalContext.documentType) {
        query = query.filter(msg => msg.metadata?.legalContext?.documentType === legalContext.documentType);
      }
      
      if (legalContext.jurisdiction) {
        query = query.filter(msg => msg.metadata?.legalContext?.jurisdiction === legalContext.jurisdiction);
      }
      
      if (legalContext.practiceArea) {
        query = query.filter(msg => msg.metadata?.legalContext?.practiceArea === legalContext.practiceArea);
      }
      
      return query.reverse().limit(50).toArray();
    });
  }

  async clearChatHistory(): Promise<void> {
    await this.chatHistory.clear();
  }

  // ========================================================================
  // LEGAL DOCUMENT METHODS  
  // ========================================================================

  async addLegalDocument(document: Omit<LegalDocument, 'id' | 'created' | 'modified'>): Promise<number> {
    return await this.legalDocuments.add({
      ...document,
      created: new Date(),
      modified: new Date()
    });
  }

  getLegalDocuments() {
    return liveQuery(() => 
      this.legalDocuments
        .orderBy('modified')
        .reverse()
        .toArray()
    );
  }

  getLegalDocumentsByType(documentType: LegalDocument['documentType']) {
    return liveQuery(() => 
      this.legalDocuments
        .where('documentType')
        .equals(documentType)
        .reverse()
        .toArray()
    );
  }

  async searchLegalDocuments(query: string): Promise<LegalDocument[]> {
    const searchTerm = query.toLowerCase();
    return await this.legalDocuments
      .filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
      .toArray();
  }

  // ========================================================================
  // GRAPH DATA METHODS
  // ========================================================================

  async addGraphNode(node: Omit<GraphNode, 'id'>): Promise<number> {
    return await this.graphNodes.add({
      ...node,
      metadata: {
        ...node.metadata,
        lastUpdated: new Date()
      }
    });
  }

  async addGraphEdge(edge: Omit<GraphEdge, 'id'>): Promise<number> {
    return await this.graphEdges.add(edge);
  }

  getGraphNodes() {
    return liveQuery(() => this.graphNodes.toArray());
  }

  getGraphNodesByRegion(bounds: { x: number; y: number; width: number; height: number }) {
    return liveQuery(() => 
      this.graphNodes
        .filter(node => 
          node.position.x >= bounds.x && 
          node.position.x <= bounds.x + bounds.width &&
          node.position.y >= bounds.y && 
          node.position.y <= bounds.y + bounds.height
        )
        .toArray()
    );
  }

  async getConnectedNodes(nodeId: string): Promise<GraphNode[]> {
    const edges = await this.graphEdges
      .where('fromNodeId')
      .equals(nodeId)
      .or('toNodeId')
      .equals(nodeId)
      .toArray();

    const connectedNodeIds = edges
      .map(edge => edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    return await this.graphNodes
      .where('nodeId')
      .anyOf(connectedNodeIds)
      .toArray();
  }

  async updateGraphNodePosition(nodeId: string, position: { x: number; y: number; z?: number }): Promise<void> {
    await this.graphNodes
      .where('nodeId')
      .equals(nodeId)
      .modify({ position });
  }

  // ========================================================================
  // CACHE METHODS
  // ========================================================================

  async setCache(key: string, data: any, ttlMs = 300000): Promise<number> {
    const expiresAt = new Date(Date.now() + ttlMs);
    const size = JSON.stringify(data).length;

    // Remove existing entry
    await this.cache.where('key').equals(key).delete();

    return await this.cache.add({
      key,
      data,
      createdAt: new Date(),
      expiresAt,
      size,
      hitCount: 0
    });
  }

  async getCache(key: string): Promise<any | null> {
    const entry = await this.cache.where('key').equals(key).first();
    
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt < new Date()) {
      await this.cache.where('key').equals(key).delete();
      return null;
    }

    // Increment hit count
    await this.cache.where('key').equals(key).modify({ hitCount: entry.hitCount + 1 });
    
    return entry.data;
  }

  async clearExpiredCache(): Promise<void> {
    await this.cache.where('expiresAt').below(new Date()).delete();
  }

  // ========================================================================
  // SESSION TRACKING
  // ========================================================================

  async startSession(sessionId: string, userId?: string): Promise<number> {
    return await this.userSessions.add({
      sessionId,
      userId,
      startTime: new Date(),
      activities: []
    });
  }

  async addSessionActivity(
    sessionId: string, 
    activity: { type: "search" | "chat" | "document_view" | "graph_explore"; data: Record<string, any> }
  ): Promise<void> {
    const session = await this.userSessions.where('sessionId').equals(sessionId).first();
    if (session) {
      const newActivity = {
        ...activity,
        timestamp: new Date()
      };
      
      session.activities.push(newActivity);
      await this.userSessions.where('sessionId').equals(sessionId).modify({
        activities: session.activities
      });
    }
  }

  async endSession(sessionId: string): Promise<void> {
    await this.userSessions.where('sessionId').equals(sessionId).modify({
      endTime: new Date()
    });
  }

  getActiveSession(sessionId: string) {
    return liveQuery(() => 
      this.userSessions.where('sessionId').equals(sessionId).first()
    );
  }

  // ========================================================================
  // MAINTENANCE & ANALYTICS
  // ========================================================================

  async getDatabaseStats() {
    const [
      chatCount,
      documentsCount, 
      nodesCount,
      edgesCount,
      sessionsCount,
      cacheCount
    ] = await Promise.all([
      this.chatHistory.count(),
      this.legalDocuments.count(),
      this.graphNodes.count(),
      this.graphEdges.count(),
      this.userSessions.count(),
      this.cache.count()
    ]);

    const cacheSize = await this.cache.toArray().then(entries => 
      entries.reduce((total, entry) => total + entry.size, 0)
    );

    return {
      chatHistory: chatCount,
      legalDocuments: documentsCount,
      graphNodes: nodesCount,
      graphEdges: edgesCount,
      userSessions: sessionsCount,
      cache: {
        entries: cacheCount,
        totalSize: cacheSize
      },
      estimatedSize: cacheSize + (chatCount * 1000) + (documentsCount * 5000) // Rough estimate
    };
  }

  async cleanupDatabase(): Promise<void> {
    // Clear expired cache
    await this.clearExpiredCache();
    
    // Remove old chat messages (keep last 1000)
    const oldMessages = await this.chatHistory
      .orderBy('timestamp')
      .reverse()
      .offset(1000)
      .primaryKeys();
    
    if (oldMessages.length > 0) {
      await this.chatHistory.bulkDelete(oldMessages);
    }

    // Remove old sessions (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.userSessions.where('startTime').below(thirtyDaysAgo).delete();
    
    console.log('✅ Database cleanup completed');
  }

  async exportData() {
    const data = {
      chatHistory: await this.chatHistory.toArray(),
      legalDocuments: await this.legalDocuments.toArray(),
      graphNodes: await this.graphNodes.toArray(),
      graphEdges: await this.graphEdges.toArray(),
      userSessions: await this.userSessions.toArray(),
      exportedAt: new Date().toISOString()
    };

    return data;
  }

  async importData(data: any): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      if (data.chatHistory) await this.chatHistory.bulkAdd(data.chatHistory);
      if (data.legalDocuments) await this.legalDocuments.bulkAdd(data.legalDocuments);
      if (data.graphNodes) await this.graphNodes.bulkAdd(data.graphNodes);
      if (data.graphEdges) await this.graphEdges.bulkAdd(data.graphEdges);
      if (data.userSessions) await this.userSessions.bulkAdd(data.userSessions);
    });
    
    console.log('✅ Data import completed');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const db = new LegalAIDatabase();
;
// ============================================================================
// REACTIVE STORES FOR SVELTE COMPONENTS
// ============================================================================

// Export commonly used reactive queries as stores
export const chatHistory = db.getChatHistory();
export const legalDocuments = db.getLegalDocuments();
export const graphNodes = db.getGraphNodes();
;
// Auto-cleanup on browser close
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    db.cleanupDatabase();
  });
  
  // Periodic cleanup every 10 minutes
  setInterval(() => {
    db.clearExpiredCache();
  }, 10 * 60 * 1000);
}