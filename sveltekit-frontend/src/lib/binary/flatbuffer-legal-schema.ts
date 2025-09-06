/**
 * FlatBuffers Schema for Legal Documents
 * Ultra-fast binary serialization eliminating JSON bottlenecks
 * Designed for WebGPU texture streaming and NES memory banks
 */

// Legal Document Binary Schema
export enum DocumentType {
  CONTRACT = 0,
  EVIDENCE = 1,
  BRIEF = 2,
  CITATION = 3,
  PRECEDENT = 4
}

export enum RiskLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Binary layout for legal documents (fixed-size for GPU efficiency)
export const LEGAL_DOCUMENT_BINARY_SIZE = 2048; // 2KB per document;
;
export interface LegalDocumentBinaryLayout {
  // Header (32 bytes)
  magic: number;           // 4 bytes - magic number for validation
  version: number;         // 4 bytes - schema version
  documentId: number;      // 4 bytes - hashed document ID
  size: number;           // 4 bytes - total document size
  checksum: number;       // 4 bytes - CRC32 checksum
  flags: number;          // 4 bytes - bit flags for features
  timestamp: bigint;      // 8 bytes - creation timestamp
  
  // Core Fields (32 bytes)
  documentType: DocumentType;    // 1 byte
  riskLevel: RiskLevel;         // 1 byte  
  priority: number;             // 1 byte (0-255)
  confidenceLevel: number;      // 1 byte (0-255, scaled from 0.0-1.0)
  bankId: number;              // 1 byte - NES memory bank ID
  padding1: ArrayBuffer;       // 3 bytes padding
  lastAccessed: bigint;        // 8 bytes
  caseId: number;             // 4 bytes - hashed case ID
  userId: number;             // 4 bytes - hashed user ID
  jurisdictionCode: number;    // 4 bytes - jurisdiction hash
  padding2: ArrayBuffer;       // 4 bytes padding
  
  // Position & Matrix (80 bytes)
  position: Float32Array;      // 12 bytes - x,y,z position for graph layout
  rankingMatrix: Float32Array; // 64 bytes - 4x4 ranking matrix
  padding3: ArrayBuffer;       // 4 bytes padding
  
  // Embedding Vector (1536 bytes)
  embedding: Float32Array;     // 384 dimensions * 4 bytes = 1536 bytes
  
  // Content Hashes (32 bytes)
  titleHash: number;          // 4 bytes - title content hash
  contentHash: number;        // 4 bytes - main content hash  
  metadataHash: number;       // 4 bytes - metadata hash
  tagsHash: number;           // 4 bytes - tags hash
  summaryHash: number;        // 4 bytes - summary hash
  analysisHash: number;       // 4 bytes - AI analysis hash
  padding4: ArrayBuffer;      // 8 bytes padding
  
  // Variable Length Data Offsets (32 bytes)
  titleOffset: number;        // 4 bytes
  titleLength: number;        // 4 bytes
  contentOffset: number;      // 4 bytes
  contentLength: number;      // 4 bytes
  metadataOffset: number;     // 4 bytes
  metadataLength: number;     // 4 bytes
  tagsOffset: number;         // 4 bytes
  tagsLength: number;         // 4 bytes
  
  // Graph Adjacency (64 bytes) 
  adjacentNodes: Uint32Array; // 16 nodes * 4 bytes = 64 bytes
  
  // Performance Metrics (32 bytes)
  accessCount: number;        // 4 bytes
  cacheHits: number;         // 4 bytes
  lastQueryTime: number;     // 4 bytes - milliseconds
  avgProcessingTime: number; // 4 bytes - milliseconds
  gpuAccelerationUsed: number; // 1 byte boolean
  wasmAccelerationUsed: number; // 1 byte boolean
  compressionRatio: number;   // 2 bytes - fixed point (divide by 100)
  padding5: ArrayBuffer;      // 16 bytes padding
  
  // Legal Specific Fields (64 bytes)
  practiceArea: number;       // 4 bytes - practice area enum
  courtLevel: number;         // 4 bytes - court level enum
  partyCount: number;         // 4 bytes - number of parties
  citationCount: number;      // 4 bytes - number of citations
  evidenceType: number;       // 4 bytes - evidence type enum
  documentClass: number;      // 4 bytes - document classification
  riskFactors: number;        // 4 bytes - bit flags for risk factors
  complianceFlags: number;    // 4 bytes - compliance bit flags
  datesFiled: Float64Array;   // 16 bytes - 2 dates (filed, modified)
  confidentialityLevel: number; // 4 bytes - confidentiality enum
  retentionPeriod: number;    // 4 bytes - retention period in days
  padding6: ArrayBuffer;      // 12 bytes padding
  
  // Reserved for Future Use (128 bytes)
  reserved: ArrayBuffer;      // 128 bytes for schema evolution
}

// Binary serialization utilities
export class LegalDocumentBinarySerializer {
  private static MAGIC_NUMBER = 0x4C45474C; // "LEGL" in ASCII
  private static CURRENT_VERSION = 1;
  
  /**
   * Serialize legal document to binary format (eliminating JSON)
   */
  static serialize(document: any): ArrayBuffer {
    const buffer = new ArrayBuffer(LEGAL_DOCUMENT_BINARY_SIZE);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    const uint32View = new Uint32Array(buffer);
    const float32View = new Float32Array(buffer);
    
    let offset = 0;
    
    // Header
    view.setUint32(offset, this.MAGIC_NUMBER, true); offset += 4;
    view.setUint32(offset, this.CURRENT_VERSION, true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.id), true); offset += 4;
    view.setUint32(offset, LEGAL_DOCUMENT_BINARY_SIZE, true); offset += 4;
    view.setUint32(offset, this.calculateChecksum(document), true); offset += 4;
    view.setUint32(offset, this.generateFlags(document), true); offset += 4;
    view.setBigUint64(offset, BigInt(Date.now()), true); offset += 8;
    
    // Core Fields
    view.setUint8(offset, this.documentTypeToEnum(document.type)); offset += 1;
    view.setUint8(offset, this.riskLevelToEnum(document.riskLevel)); offset += 1;
    view.setUint8(offset, document.priority || 128); offset += 1;
    view.setUint8(offset, Math.round((document.confidenceLevel || 0.5) * 255)); offset += 1;
    view.setUint8(offset, document.bankId || 0); offset += 1;
    offset += 3; // padding
    view.setBigUint64(offset, BigInt(document.lastAccessed || Date.now()), true); offset += 8;
    view.setUint32(offset, this.stringToHash(document.metadata?.caseId || ''), true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.metadata?.userId || ''), true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.metadata?.jurisdiction || ''), true); offset += 4;
    offset += 4; // padding
    
    // Position & Matrix
    const position = document.metadata?.position || [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      view.setFloat32(offset, position[i] || 0, true);
      offset += 4;
    }
    
    // 4x4 Ranking Matrix
    const matrix = this.generateRankingMatrix(document);
    for (let i = 0; i < 16; i++) {
      view.setFloat32(offset, matrix[i], true);
      offset += 4;
    }
    offset += 4; // padding
    
    // Embedding Vector (384 dimensions)
    const embedding = document.metadata?.vectorEmbedding || new Array(384).fill(0);
    for (let i = 0; i < 384; i++) {
      view.setFloat32(offset, embedding[i] || 0, true);
      offset += 4;
    }
    
    // Content Hashes
    view.setUint32(offset, this.stringToHash(document.title || ''), true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.content || ''), true); offset += 4;
    view.setUint32(offset, this.stringToHash(JSON.stringify(document.metadata || {})), true); offset += 4;
    view.setUint32(offset, this.arrayToHash(document.tags || []), true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.summary || ''), true); offset += 4;
    view.setUint32(offset, this.stringToHash(document.aiAnalysis || ''), true); offset += 4;
    offset += 8; // padding
    
    // Variable Length Data Offsets (set to 0 for now - would implement full text storage)
    for (let i = 0; i < 8; i++) {
      view.setUint32(offset, 0, true);
      offset += 4;
    }
    
    // Graph Adjacency (16 adjacent nodes)
    const adjacent = document.metadata?.adjacentNodes || [];
    for (let i = 0; i < 16; i++) {
      view.setUint32(offset, adjacent[i] || 0, true);
      offset += 4;
    }
    
    // Performance Metrics
    view.setUint32(offset, document.metadata?.accessCount || 0, true); offset += 4;
    view.setUint32(offset, document.metadata?.cacheHits || 0, true); offset += 4;
    view.setUint32(offset, document.metadata?.lastQueryTime || 0, true); offset += 4;
    view.setUint32(offset, document.metadata?.avgProcessingTime || 0, true); offset += 4;
    view.setUint8(offset, document.metadata?.gpuAccelerationUsed ? 1 : 0); offset += 1;
    view.setUint8(offset, document.metadata?.wasmAccelerationUsed ? 1 : 0); offset += 1;
    view.setUint16(offset, Math.round((document.metadata?.compressionRatio || 1.0) * 100), true); offset += 2;
    offset += 16; // padding
    
    // Legal Specific Fields
    view.setUint32(offset, this.practiceAreaToEnum(document.metadata?.practiceArea), true); offset += 4;
    view.setUint32(offset, this.courtLevelToEnum(document.metadata?.courtLevel), true); offset += 4;
    view.setUint32(offset, document.metadata?.parties?.length || 0, true); offset += 4;
    view.setUint32(offset, document.metadata?.citations?.length || 0, true); offset += 4;
    view.setUint32(offset, this.evidenceTypeToEnum(document.evidence_type), true); offset += 4;
    view.setUint32(offset, this.documentClassToEnum(document.metadata?.documentClass), true); offset += 4;
    view.setUint32(offset, this.riskFactorsToFlags(document.metadata?.riskFactors), true); offset += 4;
    view.setUint32(offset, this.complianceToFlags(document.metadata?.compliance), true); offset += 4;
    
    // Dates
    const dateFiled = document.metadata?.dateFiled ? new Date(document.metadata.dateFiled).getTime() : 0;
    const dateModified = document.metadata?.dateModified ? new Date(document.metadata.dateModified).getTime() : 0;
    view.setFloat64(offset, dateFiled, true); offset += 8;
    view.setFloat64(offset, dateModified, true); offset += 8;
    
    view.setUint32(offset, this.confidentialityToEnum(document.metadata?.confidentiality), true); offset += 4;
    view.setUint32(offset, document.metadata?.retentionPeriod || 2555, true); offset += 4; // 7 years default
    offset += 12; // padding
    
    // Reserved space for future schema evolution
    offset += 128;
    
    return buffer;
  }
  
  /**
   * Deserialize binary data back to legal document (ultra-fast)
   */
  static deserialize(buffer: ArrayBuffer): any {
    const view = new DataView(buffer);
    let offset = 0;
    
    // Validate header
    const magic = view.getUint32(offset, true); offset += 4;
    if (magic !== this.MAGIC_NUMBER) {
      throw new Error('Invalid legal document binary format');
    }
    
    const version = view.getUint32(offset, true); offset += 4;
    const documentId = view.getUint32(offset, true); offset += 4;
    const size = view.getUint32(offset, true); offset += 4;
    const checksum = view.getUint32(offset, true); offset += 4;
    const flags = view.getUint32(offset, true); offset += 4;
    const timestamp = view.getBigUint64(offset, true); offset += 8;
    
    // Core Fields
    const documentType = view.getUint8(offset); offset += 1;
    const riskLevel = view.getUint8(offset); offset += 1;
    const priority = view.getUint8(offset); offset += 1;
    const confidenceLevel = view.getUint8(offset) / 255.0; offset += 1;
    const bankId = view.getUint8(offset); offset += 1;
    offset += 3; // padding
    const lastAccessed = view.getBigUint64(offset, true); offset += 8;
    const caseId = view.getUint32(offset, true); offset += 4;
    const userId = view.getUint32(offset, true); offset += 4;
    const jurisdictionCode = view.getUint32(offset, true); offset += 4;
    offset += 4; // padding
    
    // Position
    const position = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true)
    ];
    offset += 12;
    
    // Ranking Matrix
    const rankingMatrix = new Float32Array(16);
    for (let i = 0; i < 16; i++) {
      rankingMatrix[i] = view.getFloat32(offset, true);
      offset += 4;
    }
    offset += 4; // padding
    
    // Embedding
    const embedding = new Float32Array(384);
    for (let i = 0; i < 384; i++) {
      embedding[i] = view.getFloat32(offset, true);
      offset += 4;
    }
    
    // Skip remaining fields for brevity - full implementation would deserialize all fields
    
    return {
      id: documentId.toString(),
      type: this.enumToDocumentType(documentType),
      riskLevel: this.enumToRiskLevel(riskLevel),
      priority,
      confidenceLevel,
      bankId,
      lastAccessed: Number(lastAccessed),
      size,
      metadata: {
        caseId: caseId.toString(),
        userId: userId.toString(),
        position,
        vectorEmbedding: embedding,
        rankingMatrix,
        version,
        flags,
        timestamp: Number(timestamp)
      }
    };
  }
  
  /**
   * Ultra-fast batch serialization for multiple documents
   */
  static serializeBatch(documents: any[]): ArrayBuffer {
    const batchSize = documents.length * LEGAL_DOCUMENT_BINARY_SIZE + 16; // +16 for batch header
    const buffer = new ArrayBuffer(batchSize);
    const view = new DataView(buffer);
    
    // Batch header
    view.setUint32(0, this.MAGIC_NUMBER, true);
    view.setUint32(4, documents.length, true);
    view.setBigUint64(8, BigInt(Date.now()), true);
    
    // Serialize each document
    let offset = 16;
    for (const document of documents) {
      const docBuffer = this.serialize(document);
      new Uint8Array(buffer, offset).set(new Uint8Array(docBuffer));
      offset += LEGAL_DOCUMENT_BINARY_SIZE;
    }
    
    return buffer;
  }
  
  /**
   * Ultra-fast batch deserialization
   */
  static deserializeBatch(buffer: ArrayBuffer): any[] {
    const view = new DataView(buffer);
    
    // Read batch header
    const magic = view.getUint32(0, true);
    if (magic !== this.MAGIC_NUMBER) {
      throw new Error('Invalid batch format');
    }
    
    const count = view.getUint32(4, true);
    const timestamp = view.getBigUint64(8, true);
    
    // Deserialize documents
    const documents = [];
    let offset = 16;
    
    for (let i = 0; i < count; i++) {
      const docBuffer = buffer.slice(offset, offset + LEGAL_DOCUMENT_BINARY_SIZE);
      documents.push(this.deserialize(docBuffer));
      offset += LEGAL_DOCUMENT_BINARY_SIZE;
    }
    
    return documents;
  }
  
  // Utility methods
  private static stringToHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }
  
  private static arrayToHash(arr: any[]): number {
    return this.stringToHash(JSON.stringify(arr.sort()));
  }
  
  private static calculateChecksum(document: any): number {
    // Simple CRC32-like checksum
    return this.stringToHash(JSON.stringify(document));
  }
  
  private static generateFlags(document: any): number {
    let flags = 0;
    if (document.metadata?.hasEmbedding) flags |= 1;
    if (document.metadata?.isEncrypted) flags |= 2;
    if (document.metadata?.isCompressed) flags |= 4;
    if (document.metadata?.hasAttachments) flags |= 8;
    if (document.metadata?.isConfidential) flags |= 16;
    return flags;
  }
  
  private static generateRankingMatrix(document: any): Float32Array {
    const matrix = new Float32Array(16);
    
    // Generate legal importance-based ranking matrix
    const riskWeight = this.riskLevelToWeight(document.riskLevel);
    const typeWeight = this.documentTypeToWeight(document.type);
    const priorityWeight = (document.priority || 128) / 255.0;
    const confidenceWeight = document.confidenceLevel || 0.5;
    
    // 4x4 ranking matrix for legal document importance
    matrix.set([
      riskWeight,     typeWeight,     priorityWeight, confidenceWeight,
      typeWeight,     1.0,           0.0,            0.0,
      priorityWeight, 0.0,           1.0,            0.0,
      confidenceWeight, 0.0,         0.0,            1.0
    ]);
    
    return matrix;
  }
  
  private static documentTypeToEnum(type: string): DocumentType {
    const map: Record<string, DocumentType> = {
      'contract': DocumentType.CONTRACT,
      'evidence': DocumentType.EVIDENCE,
      'brief': DocumentType.BRIEF,
      'citation': DocumentType.CITATION,
      'precedent': DocumentType.PRECEDENT
    };
    return map[type] || DocumentType.EVIDENCE;
  }
  
  private static enumToDocumentType(enumValue: number): string {
    const map: Record<DocumentType, string> = {
      [DocumentType.CONTRACT]: 'contract',
      [DocumentType.EVIDENCE]: 'evidence',
      [DocumentType.BRIEF]: 'brief',
      [DocumentType.CITATION]: 'citation',
      [DocumentType.PRECEDENT]: 'precedent'
    };
    return map[enumValue] || 'evidence';
  }
  
  private static riskLevelToEnum(risk: string): RiskLevel {
    const map: Record<string, RiskLevel> = {
      'low': RiskLevel.LOW,
      'medium': RiskLevel.MEDIUM,
      'high': RiskLevel.HIGH,
      'critical': RiskLevel.CRITICAL
    };
    return map[risk] || RiskLevel.MEDIUM;
  }
  
  private static enumToRiskLevel(enumValue: number): string {
    const map: Record<RiskLevel, string> = {
      [RiskLevel.LOW]: 'low',
      [RiskLevel.MEDIUM]: 'medium',
      [RiskLevel.HIGH]: 'high',
      [RiskLevel.CRITICAL]: 'critical'
    };
    return map[enumValue] || 'medium';
  }
  
  private static riskLevelToWeight(risk: string): number {
    const map: Record<string, number> = {
      'low': 0.25, 'medium': 0.5, 'high': 0.75, 'critical': 1.0
    };
    return map[risk] || 0.5;
  }
  
  private static documentTypeToWeight(type: string): number {
    const map: Record<string, number> = {
      'evidence': 1.0, 'contract': 0.8, 'brief': 0.6, 'precedent': 0.7, 'citation': 0.4
    };
    return map[type] || 0.5;
  }
  
  private static practiceAreaToEnum(area: string): number {
    const areas = ['corporate', 'litigation', 'ip', 'employment', 'tax', 'real_estate', 'criminal'];
    return areas.indexOf(area) + 1 || 0;
  }
  
  private static courtLevelToEnum(level: string): number {
    const levels = ['district', 'appellate', 'supreme'];
    return levels.indexOf(level) + 1 || 0;
  }
  
  private static evidenceTypeToEnum(type: string): number {
    const types = ['document', 'testimony', 'physical', 'digital', 'expert'];
    return types.indexOf(type) + 1 || 0;
  }
  
  private static documentClassToEnum(classification: string): number {
    const classes = ['public', 'confidential', 'privileged', 'classified'];
    return classes.indexOf(classification) + 1 || 0;
  }
  
  private static riskFactorsToFlags(factors: string[]): number {
    if (!factors) return 0;
    let flags = 0;
    if (factors.includes('financial')) flags |= 1;
    if (factors.includes('regulatory')) flags |= 2;
    if (factors.includes('reputational')) flags |= 4;
    if (factors.includes('operational')) flags |= 8;
    return flags;
  }
  
  private static complianceToFlags(compliance: string[]): number {
    if (!compliance) return 0;
    let flags = 0;
    if (compliance.includes('gdpr')) flags |= 1;
    if (compliance.includes('sox')) flags |= 2;
    if (compliance.includes('hipaa')) flags |= 4;
    if (compliance.includes('pci')) flags |= 8;
    return flags;
  }
  
  private static confidentialityToEnum(level: string): number {
    const levels = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    return levels.indexOf(level) + 1 || 0;
  }
}

// Export for use in other modules
export { LegalDocumentBinarySerializer as BinarySerializer };