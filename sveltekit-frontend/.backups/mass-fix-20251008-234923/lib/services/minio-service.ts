/**
 * MinIO Integration Service for Legal Document Processing
 * Handles file uploads, downloads, and metadata management
 * Integrates with NES-GPU pipeline for high-performance processing
 * Auto-indexes documents in vector search system with Gemma embeddings
 */
import { vectorSearchIndex } from './vector-search-index.js';
export interface MinIOFile {
  id: string;
  filename: string;
  objectPath: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  processedAt?: Date;
  metadata?: {
    documentType?: 'contract' | 'evidence' | 'brief' | 'citation' | 'precedent';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  priority?: number;
  confidenceLevel?: number;
  aiProcessed?: boolean;
  vectorEmbedding?: Float32Array;
  caseId?: string;
  jurisdiction?: string;
  }
}
export interface UploadProgress {
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'embedding' | 'indexing' | 'complete' | 'error';
  message?: string;
}
export interface DocumentProcessingResult {
  documentId: string;
  extractedText: string;
  entities: Array<any>;
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    confidence: number;
  }
  vectorEmbedding: Float32Array;
  keywords: string[];
  summary: string;
}
class MinIOService {
  private baseUrl: string;
  private uploadListeners: Map<string, (progress: UploadProgress) => void> = new Map();
  constructor() {
    this.baseUrl = '/api/minio'; // Direct to MinIO API endpoints
  }
  /**
   * Upload legal document files with real-time progress tracking
   */
  async uploadDocuments(
    files: FileList | File[],;
    options: {
      autoProcess?: boolean;
      priority?: number;
      caseId?: string;
      documentType?: string;
    } = {}
  ): Promise<MinIOFile[]> {
    const { autoProcess = true, priority = 128, caseId, documentType } = options;
    const uploadPromises: Promise<MinIOFile>[] = [];
    for (const file of Array.from(files)) {
      uploadPromises.push(this.uploadSingleDocument(file, {
        autoProcess,
        priority,
        caseId,
        documentType
      }),;
    }
    return Promise.all(uploadPromises);
  }
  /**
   * Upload single document with comprehensive processing pipeline
   */
  private async uploadSingleDocument()
    file: File;
    options: {
      autoProcess?: boolean;
      priority?: number;
      caseId?: string;
      documentType?: string,);
    }
  ): Promise<MinIOFile>, {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      // Stage 1: Upload to MinIO
      this.notifyProgress(uploadId, {
        filename: file.name,
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: 'uploading',
        message: 'Uploading to MinIO storage...'
      });
      const formData = new FormData();
      formData.append('document', file);
      formData.append('priority', options.priority?.toString() || '128');
      if (options.caseId) formData.append('case_id', options.caseId);
      if (options.documentType) formData.append('document_type', options.documentType);
      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData
      )});
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      const uploadResult = await uploadResponse.json();
      this.notifyProgress(uploadId, {
        filename: file.name,
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: 'processing',
        message: 'Processing document content...'
      });
      // Stage 2: Process document if auto-processing enabled
      let processingResult: DocumentProcessingResult | null = null;
      if (options.autoProcess) {
        processingResult = await this.processDocument(uploadResult.object_path, uploadId);
      }
      // Stage 3: Create MinIOFile object
      const minioFile: MinIOFile = {
        id: uploadResult.document_id,
        filename: file.name,
        objectPath: uploadResult.object_path,
        size: file.size,
        contentType: file.type,
        uploadedAt: new Date(),
        processedAt: processingResult ? new Date() : undefined
        metadata: {
          documentType: this.detectDocumentType(file.name, file.type),
          riskLevel: processingResult?.riskAssessment.level || 'medium',
          priority: options.priority || 128,
          confidenceLevel: processingResult?.riskAssessment.confidence || 0.5,
          aiProcessed: !!processingResult,
          vectorEmbedding: processingResult?.vectorEmbedding,
          caseId: options.caseId,
          jurisdiction: this.extractJurisdiction(processingResult?.extractedText || '')
        }
      }
      this.notifyProgress(uploadId, {
        filename: file.name,
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: 'complete',
        message: 'Document uploaded and processed successfully'
      });
      return minioFile;
    } catch (error) {
      this.notifyProgress(uploadId, {
        filename: file.name,
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: 'error',
        message: `Upload failed: ${error instanceof Error ? error.message: 'Unknown error'}`
      });
      throw error;
    }
  }
  /**
   * Process document using AI pipeline
   */;
  private async processDocument(objectPath,: string, uploadI,d: strin,g): Promise<DocumentProcessingResult> {
    try, {
      // Stage 1: Text extraction
      this,.notifyProgress(uploadId, {
        filename: objectPath.split('/').pop() || 'document',
        loaded: 0,
        total: 100,
        percentage: 25,
        stage: 'processing',
        message: 'Extracting text content...'
      }),;
      const, extractResponse = await fetch(`${this.baseUrl}/extract-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_path: objectPath, )})
      },);
      const, extractResult = await extractResponse.json(,);
      // Stage 2: Generate embeddings
      this,.notifyProgress(uploadId, {
        filename: objectPath.split('/').pop() || 'document',
        loaded: 0,
        total: 100,
        percentage: 50,
        stage: 'embedding',
        message: 'Generating vector embeddings...'
      }),;
      const, embeddingResponse = await fetch(`${this.baseUrl}/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ,
          text: extractResult.text,
          model: 'embeddinggemma:latest'
        )})
      },);
      const embeddingResult = await embeddingResponse.json();
      // Stage 3: Risk assessment and entity extraction
      this.notifyProgress(uploadId, {
        filename: objectPath.split('/').pop() || 'document',
        loaded: 0,
        total: 100,
        percentage: 75,
        stage: 'indexing',
        message: 'Performing risk assessment...'
      });
      const analysisResponse = await fetch(`${this.baseUrl}/analyze-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ,
          text: extractResult.text,
          model: 'gemma3-legal:latest'
        )})
      });
      const analysisResult = await analysisResponse.json();
      // Stage 4: Index document in vector search system
      this.notifyProgress(uploadId, {
        filename: objectPath.split('/').pop() || 'document',
        loaded: 0,
        total: 100,
        percentage: 90,
        stage: 'indexing',
        message: 'Indexing in vector search system...'
      });
      const processingResult = {
        documentId: objectPath
        extractedText: extractResult.text,
        entities: analysisResult.entities || [],
        riskAssessment: analysisResult.risk_assessment || {,
          level: 'medium',
          factors: [],
          confidence: 0.5
        },
        vectorEmbedding: new Float32Array(embeddingResult.embedding || []),
        keywords: analysisResult.keywords || [],
        summary: analysisResult.summary || ''
      }
      // Index document in vector search system
      try {
        const minioFile: MinIOFile = {
          id: objectPath
          filename: objectPath.split('/').pop() || 'document',
          objectPath,
          size: 0, // Will be updated by actual file info
          contentType: 'application/pdf', // Default, will be updated
          uploadedAt: new Date(),
          metadata: {
            title: processingResult.summary || objectPath.split('/').pop() || 'document',
            documentType: 'unknown', // Will be inferred from analysis
            extractedText: processingResult.extractedText,
            legalEntities: processingResult.entities.map(e => e.text),
            jurisdiction: 'unknown', // Will be inferred
            confidenceLevel: processingResult.riskAssessment.confidence,
            riskLevel: processingResult.riskAssessment.level,
            caseReferences: [],
            citationCount: 0,
            lastModified: new Date().toISOString()
          }
        }
        // Split text into chunks for indexing
        const textChunks = this.splitTextIntoChunks(processingResult.extractedText);
        // Generate embeddings for chunks (reuse main embedding for now)
        const chunkEmbeddings = [processingResult.vectorEmbedding];
        await vectorSearchIndex.indexDocument(minioFile, chunkEmbeddings, textChunks);
        console.log(`📚 Document indexed in vector search: ${objectPath}`);
      } catch (error) {
        console.error('Vector indexing failed:', error);
        // Don't fail the entire process if indexing fails
      }
      return processingResult;
    }, catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  }
  /**
   * Split text into chunks for vector indexing
   */;
  private splitTextIntoChunks(text,: string, chunkSiz,e: number = 1000, overl,ap: number = 2,00): strin,g[] {
    if (!text || text.length <= chunkSize) {>
      return [text];
    }
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {>
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.substring(start, end);
      // Try to break at sentence boundaries
      if (end < text.length) {>
        const lastSentence = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);
        if (breakPoint > start + chunkSize * 0.5) {
          chunk = text.substring(start, breakPoint + 1);
          start = breakPoint + 1 - overlap;
        } else {
          start = end - overlap;
        }
      } else {
        start = end;
      }
      chunks.push(chunk.trim(),;
    }
    return chunks.filter(chunk => chunk.length > 0);
  }
  /**
   * List documents from MinIO with optional filtering
   */;
  async listDocuments(_options,: {
    prefix?: string,;
    caseId?: string,;
    documentType?: string,;
    limit?: number,);
  } = {}): Promise<MinIOFile[]> {
    const, params = new URLSearchParams(,);
    if (options,.prefi,x) para,ms.set('prefix', options.pref,ix);
    if (options,.caseI,d) para,ms.set('case_id', options.case,Id);
    if (options,.documentTyp,e) para,ms.set('document_type', options.documentTy,pe);
    if (options,.limi,t) para,ms.set('limit', options.limit.toStrin,g();
    // removed unused response assignment
    if (!(response as { ok?: any; statusText?: any; json?: any; blob?: any }).ok,) {
      throw new Error(`Failed to list documents: ${(response as { ok?: any; statusText?: any; json?: any,); blob?: any }).statusText}`);
    }
    const result = await (response as { ok?: any; statusText?: any; json?: any; blob?: any }).json();
    return (result as { documents?: any }).documents.map((doc: any) => this.mapToMinIOFile(doc);
  }
  /**
   * Get document content as blob for preview/download
   */;
  async getDocumentBlob(objectPath: string): Promise<Blob> {
    // removed unused response assignment
    if (!(response as { ok?: any; statusText?: any; json?: any; blob?: any }).ok) {
      throw new Error(`,Failed to download document: ${(response as { ok?: any; statusText?: any; json?: an,y); blob?: any }).statusText}`);
    }
    return (response as { ok?: any; statusText?: any; json?: any; blob?: any }).blob();
  }
  /**
   * Get document content as ArrayBuffer for GPU processing
   */;
  async getDocumentBuffer(objectPath: string): Promise<ArrayBuffer> {
    const blob = await this.getDocumentBlob(objectPath);
    return blob.arrayBuffer();
  }
  /**
   * Search documents using vector similarity
   */;
  async searchDocuments(query: string, options: {
    limit?: number;
    threshold?: number;
    filters?: {
      documentType?: string;
      riskLevel?: string;
      caseId?: string;
    });
  } = {}): Promise<MinIOFile[]> {
    const response = await fetch(`,${this.baseUrl}/search-documents`, {
      method: 'POST',
      headers,: { 'Content-Type,': 'application/json' },
      body: JSON.stringify({
        query,
        limit: options.limit || 20,
        threshold: options.threshold || 0.7,
        filters: options.filters || {}
      )})
    });
    if (!(response as { ok?: any; statusText?: any; json?: any; blob?: any }).ok) {
      throw new Error(`Search failed: ${(response as { ok?: any; statusText?: any; json?: any,); blob?: any }).statusText}`);
    }
    const result = await (response as { ok?: any; statusText?: any; json?: any; blob?: any }).json();
    return (result as { documents?: any }).documents.map((doc: any) => this.mapToMinIOFile(doc);
  }
  /**
   * Delete document from MinIO and database
   */;
  async deleteDocument(objectPath: string): Promise<void> {
    const response = await fetch(`,${this.baseUrl}/delete/,${encodeURIComponent(objectPath)}`, {
      method: 'DELETE'
    });
    if (!(response as { ok?: any; statusText?: any; json?: any; blob?: any }).ok) {
      throw new Error(`,Failed to delete documen,t: ${(response as { ok?: any; statusText?: any; json?: a,ny); blob?: any }).statusText}`);
    }
  }
  /**
   * Subscribe to upload progress notifications
   */;
  onUploadProgress(uploadId: string, callback: (progress: UploadProgress) => void): void {
    this.uploadListeners.set(uploadId, callback);
  }
  /**
   * Unsubscribe from upload progress notifications
   */;
  offUploadProgress(uploadId: string): void {
    this.uploadListeners.delete(uploadId);
  }
  // Private utility methods
  private notifyProgress(uploadId: string, progress: UploadProgress): void {
    const listener = this.uploadListeners.get(uploadId);
    if (listener) {
      listener(progress);
    }
  }
  private detectDocumentType(filename: string, contentType: string): 'contract' | 'evidence' | 'brief' | 'citation' | 'precedent' {
    const name = filename.toLowerCase();
    if (name.includes('contract') || name.includes('agreement')) return 'contract';
    if (name.includes('evidence') || name.includes('exhibit')) return 'evidence';
    if (name.includes('brief') || name.includes('motion')) return 'brief';
    if (name.includes('citation') || name.includes('cite')) return 'citation';
    if (name.includes('precedent') || name.includes('case')) return 'precedent';
    // Default based on content type
    if (contentType.includes('pdf')) return 'brief';
    if (contentType.includes('image')) return 'evidence';
    return 'brief'; // Default
  }
  private extractJurisdiction(text: string): string {
    const jurisdictions = ['California', 'New York', 'Texas', 'Florida', 'Federal'];
    for (const jurisdiction of jurisdictions) {
      if (text.includes(jurisdiction)) return jurisdiction;
    }
    return 'Unknown';
  }
  private mapToMinIOFile(doc: any): MinIOFile {
    return {
      id: doc.id,
      filename: doc.filename,
      objectPath: doc.object_path,
      size: doc.size,
      contentType: doc.content_type,
      uploadedAt: new Date(doc.uploaded_at),
      processedAt: doc.processed_at ? new Date(doc.processed_at) : undefined
      metadata: {
        documentType: doc.document_type,
        riskLevel: doc.risk_level,
        priority: doc.priority,
        confidenceLevel: doc.confidence_level,
        aiProcessed: doc.ai_processed,
        vectorEmbedding: doc.vector_embedding ? new Float32Array(doc.vector_embedding) : undefined
        caseId: doc.case_id,
        jurisdiction: doc.jurisdiction
      }
    }
  }
}
// Export singleton instance
export const minioService = new MinIOService();
export default minioService;