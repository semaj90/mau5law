
// LangChain.js RAG Implementation for Legal AI Platform
// Advanced RAG with Ollama integration and legal domain specialization

import type { Document as LangChainDocumentType } from "@langchain/core/documents";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { RunnableMap, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Note: formatDocumentsAsString may need to be implemented locally
const formatDocumentsAsString = (documents: LangChainDocumentType[]) => {
  return documents.map((doc) => doc.pageContent).join('\n\n');
};

// Note: QdrantVectorStore and QdrantClient may need to be installed separately
// import { QdrantVectorStore } from "@langchain/community/vectorstores/qdrant";
// import { QdrantClient } from "@qdrant/js-client-rest";

// Temporary type placeholders until proper imports are available
type QdrantVectorStore = any;
type QdrantClient = any;

import type { LegalDocumentMetadata } from './qdrant-service.js';

export interface LegalRAGConfig {
  qdrantUrl: string;
  ollamaGenerationUrl: string;
  ollamaEmbeddingUrl: string;
  apiKey: string;
  collectionName: string;
  embeddingDimensions: number;
}

export interface RAGQueryOptions {
  thinkingMode?: boolean;
  verbose?: boolean;
  documentType?: string;
  jurisdiction?: string;
  practiceArea?: string;
  maxRetrievedDocs?: number;
  useCompression?: boolean;
  includeMetadata?: boolean;
  confidenceThreshold?: number;
  useEnhancedSemanticSearch?: boolean; // New option for enhanced semantic search API
}

export interface RAGResult {
  answer: string;
  sourceDocuments: LangChainDocumentType[];
  confidence: number;
  reasoning?: string;
  metadata: {
    retrievedChunks: number;
    processingTime: number;
    usedThinkingMode: boolean;
    usedCompression: boolean;
    enhancedSemanticSearch?: boolean; // New field for tracking enhanced search usage
    semanticProcessingTime?: number; // Processing time from semantic search API
  };
}

/**
 * Advanced Legal RAG System with LangChain.js
 * Implements sophisticated retrieval and generation patterns for legal document analysis
 */
export class LegalRAGService {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: QdrantVectorStore | null = null;
  private qdrantClient: QdrantClient;
  private textSplitter: RecursiveCharacterTextSplitter;
  private config: LegalRAGConfig;
  private vectorStoreInitPromise: Promise<void> | null = null;

  // Legal-specific prompt templates
  private readonly LEGAL_PROMPTS = {
    STANDARD_RAG: ChatPromptTemplate.fromTemplate(`
You are a specialized legal AI assistant. Answer the user's question based solely on the provided legal document context.

Context from legal documents:
{context}

Question: {question}

Instructions:
- Provide accurate legal analysis based only on the provided context
- Cite specific document sections when making claims
- If the context is insufficient, clearly state this limitation
- Use appropriate legal terminology
- Identify key legal concepts, parties, and obligations
- If asked about jurisdiction-specific laws, note any applicable jurisdictions mentioned in the context

Answer:`),

    THINKING_MODE_RAG: ChatPromptTemplate.fromTemplate(`
You are a specialized legal AI assistant operating in "thinking mode." Provide comprehensive legal analysis based on the provided context.

Context from legal documents:
{context}

Question: {question}

Instructions for thinking mode:
- Provide step-by-step legal reasoning
- Consider multiple legal perspectives and interpretations
- Identify potential risks, opportunities, and implications
- Analyze relationships between different document sections
- Consider statutory requirements and regulatory compliance
- Suggest areas that may require additional research or legal counsel
- Provide detailed citations to specific document sections

Comprehensive Analysis:`),

    VERBOSE_RAG: ChatPromptTemplate.fromTemplate(`
You are a specialized legal AI assistant providing detailed legal analysis based on the provided context.

Context from legal documents:
{context}

Question: {question}

Instructions for verbose mode:
- Provide comprehensive explanations with legal background
- Include relevant legal principles and doctrines
- Explain implications and consequences in detail
- Discuss practical considerations for implementation
- Address potential compliance requirements
- Provide detailed document analysis with specific citations
- Include guidance on next steps or recommended actions

Detailed Legal Analysis:`),

    QUERY_GENERATION: PromptTemplate.fromTemplate(`
You are a legal research assistant. Generate diverse search queries to find relevant information for the following question.

Original question: {question}

Generate 3 different search queries that would help find relevant legal information:
1. A query focusing on legal concepts and principles
2. A query focusing on specific legal terms and definitions
3. A query focusing on practical applications and implications

Only return the queries, one per line.`),
  };

  constructor(config: LegalRAGConfig) {
    this.config = config;

    this.llm = new ChatOpenAI({
      model: 'gemma-3-legal',
      apiKey: config.apiKey,
      // Note: baseURL may not be supported in this version
      temperature: 0.1, // Low temperature for legal accuracy
      maxTokens: 4096,
      timeout: 120000,
    } as any);

    // Initialize embeddings
    this.embeddings = new OpenAIEmbeddings({
      model: 'nomic-embed-legal',
      apiKey: config.apiKey,
      // Note: baseURL may not be supported in this version
      dimensions: config.embeddingDimensions,
    } as any);

    // Initialize Qdrant client (mocked for now)
    this.qdrantClient = {
      url: config.qdrantUrl,
      // Mock Qdrant client implementation
    } as QdrantClient;

    // Initialize text splitter optimized for legal documents
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200, // Larger chunks for legal context
      chunkOverlap: 200, // Substantial overlap to preserve legal context
      separators: [
        '\n\n', // Paragraph breaks
        '\n', // Line breaks
        '. ', // Sentence endings
        ', ', // Clause separators
        ' ', // Word breaks
      ],
    });

    this.initializeVectorStore();
  }

  /**
   * Initialize Qdrant vector store
   */
  /**
   * Initialize Qdrant vector store
   */
  private async initializeVectorStore(): Promise<void> {
    if (this.vectorStore) return;
    try {
      // Mock vector store initialization
      this.vectorStore = {
        embeddings: this.embeddings,
        client: this.qdrantClient,
        collectionName: this.config.collectionName,
        contentPayloadKey: 'content',
        metadataPayloadKey: 'metadata',
        // Mock methods
        similaritySearch: async (query: string, k: number) => [],
        addDocuments: async (docs: LangChainDocumentType[]) => {},
      } as QdrantVectorStore;
      console.log('✅ Legal RAG vector store initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * Ensure vector store is initialized before use
   */
  private async ensureVectorStoreInitialized(): Promise<void> {
    if (!this.vectorStore) {
      await this.initializeVectorStore();
    }
  }

  /**
   * Main query method with enhanced legal RAG capabilities
   * Now includes integration with new semantic search API
   */
  async query(question: string, options: RAGQueryOptions = {}): Promise<RAGResult> {
    const startTime = Date.now();

    const {
      thinkingMode = false,
      verbose = false,
      maxRetrievedDocs = 5,
      useCompression = true,
      confidenceThreshold = 0.7,
      documentType,
      jurisdiction,
      practiceArea,
      useEnhancedSemanticSearch = true, // New option for enhanced search
    } = options;

    try {
      // NEW: Try enhanced semantic search first (preferred method)
      if (useEnhancedSemanticSearch && typeof fetch !== 'undefined') {
        try {
          const semanticResponse = await fetch('/api/rag/semantic-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: question,
              limit: thinkingMode ? maxRetrievedDocs * 2 : maxRetrievedDocs,
              threshold: confidenceThreshold,
              filters: {
                category: documentType,
                jurisdiction: jurisdiction,
                practice_area: practiceArea,
              },
            }),
          });

          if (semanticResponse.ok) {
            const semanticData = await semanticResponse.json();

            if (semanticData.success && semanticData.results?.length > 0) {
              // Convert semantic search results to LangChain document format
              const enhancedRetrievedDocs = semanticData.results.map((result: any) => ({
                pageContent:
                  result.content ||
                  `${result.title}\n\n${result.metadata?.summary || 'No content available'}`,
                metadata: {
                  ...result.metadata,
                  title: result.title,
                  score: result.semantic_score || 1 - result.distance,
                  document_type: result.document_type,
                  source: 'enhanced_semantic_search',
                },
              }));

              // Generate answer using enhanced RAG with semantic context
              const contextText = formatDocumentsAsString(enhancedRetrievedDocs);

              // Select appropriate prompt template
              let promptTemplate = this.LEGAL_PROMPTS.STANDARD_RAG;
              if (thinkingMode) {
                promptTemplate = this.LEGAL_PROMPTS.THINKING_MODE_RAG;
              } else if (verbose) {
                promptTemplate = this.LEGAL_PROMPTS.VERBOSE_RAG;
              }

              // Generate answer using LLM with semantic context
              const formattedPrompt = await promptTemplate.format({
                context: contextText,
                question: question,
              });

              const llmResponse = await this.llm.invoke(formattedPrompt);
              const enhancedAnswer =
                typeof llmResponse === 'string'
                  ? llmResponse
                  : typeof llmResponse === 'object' && llmResponse?.content
                    ? String(llmResponse.content)
                    : String(llmResponse);

              // Calculate confidence based on semantic scores
              const avgSemanticScore =
                semanticData.results.reduce(
                  (sum: number, result: any) =>
                    sum + (result.semantic_score || 1 - result.distance),
                  0
                ) / semanticData.results.length;

              const confidence = Math.min(avgSemanticScore, 1.0);
              const processingTime = Date.now() - startTime;

              return {
                answer: enhancedAnswer,
                sourceDocuments: enhancedRetrievedDocs,
                confidence,
                reasoning: thinkingMode
                  ? `Applied enhanced semantic search with ${semanticData.results.length} relevant documents. Average semantic score: ${avgSemanticScore.toFixed(3)}`
                  : undefined,
                metadata: {
                  retrievedChunks: enhancedRetrievedDocs.length,
                  processingTime,
                  usedThinkingMode: thinkingMode,
                  usedCompression: useCompression,
                  enhancedSemanticSearch: true,
                  semanticProcessingTime: semanticData.processingTime || 0,
                },
              };
            }
          }
        } catch (error) {
          console.warn('Enhanced semantic search failed, falling back to traditional RAG:', error);
        }
      }

      // Fallback to traditional LangChain RAG if enhanced semantic search fails
      await this.ensureVectorStoreInitialized();

      // Create retriever with legal-specific filtering
      let retriever: any = this.vectorStore.asRetriever({
        k: thinkingMode ? maxRetrievedDocs * 2 : maxRetrievedDocs,
        filter: this.buildMetadataFilter(documentType, jurisdiction, practiceArea),
      });

      // Use MultiQueryRetriever for thinking mode
      // TODO: Fix MultiQueryRetriever import issue
      // if (thinkingMode) {
      //   const multiQueryRetriever = MultiQueryRetriever.fromLLM({
      //     llm: this.llm,
      //     retriever,
      //     prompt: this.LEGAL_PROMPTS.QUERY_GENERATION,
      //     verbose: true,
      //   });
      //   // Use MultiQueryRetriever directly
      //   retriever = multiQueryRetriever;
      // }

      // Add contextual compression for better relevance
      // TODO: Fix LLMChainExtractor import issue
      // if (useCompression) {
      //   const compressor = LLMChainExtractor.fromLLM(this.llm);
      //   const compressionRetriever = new ContextualCompressionRetriever({
      //     baseCompressor: compressor,
      //     baseRetriever: retriever,
      //   });
      //   // Use ContextualCompressionRetriever directly
      //   retriever = compressionRetriever;
      // }

      // Select appropriate prompt template
      let promptTemplate = this.LEGAL_PROMPTS.STANDARD_RAG;
      if (thinkingMode) {
        promptTemplate = this.LEGAL_PROMPTS.THINKING_MODE_RAG;
      } else if (verbose) {
        promptTemplate = this.LEGAL_PROMPTS.VERBOSE_RAG;
      }

      // Build RAG chain with proper type handling
      const contextRetriever = RunnableSequence.from([
        (input: string) => retriever.getRelevantDocuments(input),
        formatDocumentsAsString,
      ]);

      const ragChain = RunnableSequence.from([
        RunnableMap.from({
          context: contextRetriever,
          question: new RunnablePassthrough(),
        }),
        promptTemplate,
        this.llm,
        new StringOutputParser(),
      ]);

      // Execute RAG query with proper error handling
      const [answer, retrievedDocs] = await Promise.all([
        ragChain.invoke(question).catch((error) => {
          console.warn('RAG chain error:', error);
          return 'Unable to generate response due to processing error.';
        }),
        retriever.getRelevantDocuments(question).catch((error: any) => {
          console.warn('Document retrieval error:', error);
          return [];
        }),
      ]);

      // Calculate confidence based on document relevance scores
      const confidence = this.calculateConfidence(retrievedDocs, confidenceThreshold);

      const processingTime = Date.now() - startTime;

      return {
        answer: typeof answer === 'string' ? answer : answer?.parse || String(answer),
        sourceDocuments: retrievedDocs,
        confidence,
        reasoning: thinkingMode
          ? 'Applied multi-query retrieval with comprehensive analysis'
          : undefined,
        metadata: {
          retrievedChunks: retrievedDocs.length,
          processingTime,
          usedThinkingMode: thinkingMode,
          usedCompression: useCompression,
        },
      };
    } catch (error: any) {
      console.error('Error in RAG query:', error);
      return {
        answer: 'I apologize, but I encountered an error processing your query. Please try again.',
        sourceDocuments: [],
        confidence: 0,
        metadata: {
          retrievedChunks: 0,
          processingTime: Date.now() - startTime,
          usedThinkingMode: thinkingMode,
          usedCompression: useCompression,
          // Note: error property not included in interface
        },
      };
    }
  }

  /**
   * Index a legal document into the vector store
   */
  async indexDocument(text: string, metadata: LegalDocumentMetadata): Promise<string[]> {
    await this.ensureVectorStoreInitialized();

    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Split document into chunks
      const chunks = await this.textSplitter.splitText(text);

      // Create documents with metadata
      const documents = chunks.map((chunk, index) => ({
        pageContent: chunk,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkSize: chunk.length,
        },
      }));

      // Add to vector store
      const ids = await this.vectorStore.addDocuments(documents);

      console.log(`✅ Indexed ${chunks.length} chunks for document ${metadata.documentId}`);
      return (ids as any as string[]) || [];
    } catch (error: any) {
      console.error('Error indexing document:', error);
      throw new Error(
        `Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Perform legal document summarization with RAG context
   */
  async summarizeWithContext(documentId: string, options: RAGQueryOptions = {}): Promise<string> {
    const summaryQuery = `Provide a comprehensive summary of the key legal points, parties, obligations, and risks in this document.`;

    const filter = { documentId };
    const result = await this.query(summaryQuery, {
      ...options,
      maxRetrievedDocs: 10, // Get more context for summarization
    });

    return result.answer;
  }

  /**
   * Compare multiple legal documents
   */
  async compareDocuments(
    documentIds: string[],
    comparisonFocus: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGResult> {
    const query = `Compare and contrast the following aspects across the provided documents: ${comparisonFocus}.
    Identify similarities, differences, and any potential conflicts or inconsistencies.`;

    // Note: Filter would be applied in the query method
    // const filter = {
    //   documentId: { $in: documentIds },
    // };

    return await this.query(query, {
      ...options,
      maxRetrievedDocs: 15, // Get more context for comparison
    });
  }

  /**
   * Extract specific legal information
   */
  async extractLegalEntities(
    query: string,
    documentType?: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGResult> {
    const entityQuery = `Extract and list all ${query} mentioned in the legal documents.
    Provide specific references to where each item is mentioned.`;

    return await this.query(entityQuery, {
      ...options,
      documentType,
    });
  }

  /**
   * Build metadata filter for Qdrant queries
   */
  private buildMetadataFilter(
    documentType?: string,
    jurisdiction?: string,
    practiceArea?: string
  ): Record<string, any> {
    const must: any[] = [];

    if (documentType) {
      must.push({ key: 'documentType', match: { value: documentType } });
    }

    if (jurisdiction) {
      must.push({ key: 'jurisdiction', match: { value: jurisdiction } });
    }

    if (practiceArea) {
      must.push({
        key: 'classification.practiceArea',
        match: { value: practiceArea },
      });
    }

    return must.length ? { must } : {};
  }

  /**
   * Calculate confidence score based on retrieved documents
   */
  private calculateConfidence(documents: LangChainDocumentType[], threshold: number): number {
    if (documents.length === 0) return 0;

    // Use metadata scores if available, otherwise use heuristics
    const scores = documents.map((doc) => {
      const score = doc.metadata?.score;
      if (typeof score === 'number') return score;

      // Fallback: estimate based on content length and overlap
      return Math.min(1.0, doc.pageContent.length / 1000);
    });

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.min(1.0, averageScore);
  }

  /**
   * Health check for the RAG service
   */
  async healthCheck(): Promise<{
    status: string;
    vectorStoreConnected: boolean;
    collectionExists: boolean;
    documentsCount?: number;
  }> {
    try {
      const info = await this.qdrantClient.getCollection(this.config.collectionName);

      const collectionExists = !!(info as any)?.result;

      return {
        status: 'healthy',
        vectorStoreConnected: !!this.vectorStore,
        collectionExists,
        documentsCount: (info as any)?.result?.points_count || 0,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        vectorStoreConnected: !!this.vectorStore,
        collectionExists: false,
      };
    }
  }

  /**
   * Upload and index a document file with real file processing
   */
  async uploadDocument(
    filePath: string,
    options?: {
      caseId?: string;
      documentType?: string;
      title?: string;
      metadata?: Record<string, any>;
      file?: File; // Browser File object for client-side uploads
      content?: string; // Direct content for server-side processing
    }
  ): Promise<{
    success: boolean;
    documentId?: string;
    chunks?: number;
    error?: string;
    processingDetails?: {
      fileSize: number;
      extractedLength: number;
      processingTime: number;
      chunksCreated: number;
    };
  }> {
    const startTime = Date.now();

    try {
      let documentContent: string;
      let fileSize = 0;
      let fileName = '';

      // Handle different input types
      if (options?.file) {
        // Browser File object processing
        fileName = options.file.name;
        fileSize = options.file.size;

        // Extract text based on file type
        documentContent = await this.extractTextFromFile(options.file);
      } else if (options?.content) {
        // Direct content provided
        documentContent = options.content;
        fileSize = new Blob([documentContent]).size;
        fileName = filePath.split('/').pop() || filePath;
      } else {
        // Server-side file processing
        const fs = await import('fs').catch(() => null);
        const path = await import('path').catch(() => null);

        if (!fs || !path) {
          throw new Error(
            'File system operations not available in browser environment. Use file or content options instead.'
          );
        }

        fileName = path.basename(filePath);

        try {
          const fileBuffer = await fs.promises.readFile(filePath);
          fileSize = fileBuffer.length;

          // Determine file type and extract text
          const fileExtension = path.extname(filePath).toLowerCase();
          documentContent = await this.extractTextFromBuffer(fileBuffer, fileExtension);
        } catch (error: any) {
          throw new Error(`Failed to read file: ${error.message}`);
        }
      }

      // Validate extracted content
      if (!documentContent || documentContent.trim().length === 0) {
        throw new Error('No readable content found in the document');
      }

      // Generate unique document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare comprehensive metadata
      const metadata: LegalDocumentMetadata = {
        documentId,
        filename: fileName,
        documentType: options?.documentType || this.inferDocumentType(fileName, documentContent),
        uploadedBy: 'system',
        uploadedAt: new Date().toISOString(),
        fileMetadata: {
          size: fileSize,
          mimeType: this.getMimeType(fileName),
          originalPath: filePath,
        },
        classification: {
          practiceArea: this.inferPracticeArea(documentContent),
          jurisdiction: this.inferJurisdiction(documentContent),
          documentClass: options?.documentType || 'general',
        },
        extraction: {
          extractedAt: new Date().toISOString(),
          extractedLength: documentContent.length,
          confidence: this.calculateExtractionConfidence(documentContent, fileName),
        },
        ...options?.metadata,
        filePath,
        caseId: options?.caseId,
        title: options?.title || this.generateDocumentTitle(documentContent, fileName),
      };

      // Index the document using enhanced processing
      const chunkIds = await this.indexDocument(documentContent, metadata);

      const processingTime = Date.now() - startTime;

      // Try to enhance with semantic search integration
      if (chunkIds.length > 0) {
        try {
          await this.notifySemanticSearchAPI(documentId, {
            title: metadata.title,
            content: documentContent.substring(0, 1000), // Preview for API
            metadata: metadata,
            chunks: chunkIds.length,
          });
        } catch (error) {
          console.warn('Failed to notify semantic search API:', error);
        }
      }

      return {
        success: true,
        documentId,
        chunks: chunkIds.length,
        processingDetails: {
          fileSize,
          extractedLength: documentContent.length,
          processingTime,
          chunksCreated: chunkIds.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during document processing',
        processingDetails: {
          fileSize: 0,
          extractedLength: 0,
          processingTime: Date.now() - startTime,
          chunksCreated: 0,
        },
      };
    }
  }

  /**
   * Extract text from a File object (browser environment)
   */
  private async extractTextFromFile(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    switch (fileExtension) {
      case 'txt':
      case 'md':
      case 'rtf':
        return await file.text();

      case 'pdf':
        return await this.extractTextFromPDF(file);

      case 'doc':
      case 'docx':
        return await this.extractTextFromWord(file);

      case 'html':
      case 'htm':
        return this.extractTextFromHTML(await file.text());

      default:
        // Try to read as plain text
        const text = await file.text();
        if (this.isValidText(text)) {
          return text;
        }
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  /**
   * Extract text from a buffer (server environment)
   */
  private async extractTextFromBuffer(buffer: Buffer, extension: string): Promise<string> {
    switch (extension) {
      case '.txt':
      case '.md':
      case '.rtf':
        return buffer.toString('utf-8');

      case '.pdf':
        return await this.extractTextFromPDFBuffer(buffer);

      case '.doc':
      case '.docx':
        return await this.extractTextFromWordBuffer(buffer);

      case '.html':
      case '.htm':
        return this.extractTextFromHTML(buffer.toString('utf-8'));

      default:
        // Try to read as plain text
        const text = buffer.toString('utf-8');
        if (this.isValidText(text)) {
          return text;
        }
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Extract text from PDF file (browser)
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Try to use PDF.js if available
      const pdfjsLib = await import('pdfjs-dist').catch(() => null);

      if (pdfjsLib) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }

        return fullText.trim();
      }

      // Fallback: notify that PDF processing requires additional setup
      throw new Error('PDF processing requires PDF.js library. Please install pdfjs-dist package.');
    } catch (error: any) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF buffer (server)
   */
  private async extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
    try {
      // Try to use pdf-parse if available
      const pdfParse = await import('pdf-parse').catch(() => null);

      if (pdfParse) {
        const data = await pdfParse.default(buffer);
        return data.text;
      }

      throw new Error(
        'PDF processing requires pdf-parse library. Please install pdf-parse package.'
      );
    } catch (error: any) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Word document (browser)
   */
  private async extractTextFromWord(file: File): Promise<string> {
    try {
      // Try to use mammoth.js if available
      const mammoth = await import('mammoth').catch(() => null);

      if (mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      throw new Error(
        'Word document processing requires mammoth library. Please install mammoth package.'
      );
    } catch (error: any) {
      throw new Error(`Word document extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Word document buffer (server)
   */
  private async extractTextFromWordBuffer(buffer: Buffer): Promise<string> {
    try {
      // Try to use mammoth.js if available
      const mammoth = await import('mammoth').catch(() => null);

      if (mammoth) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }

      throw new Error(
        'Word document processing requires mammoth library. Please install mammoth package.'
      );
    } catch (error: any) {
      throw new Error(`Word document extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from HTML content
   */
  private extractTextFromHTML(htmlContent: string): string {
    // Simple HTML tag removal - in production, use a proper HTML parser
    return htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if text content is valid and readable
   */
  private isValidText(text: string): boolean {
    if (!text || text.trim().length < 10) return false;

    // Check for reasonable ratio of printable characters
    const printableChars = text.match(/[a-zA-Z0-9\s\.,;:!?\-()]/g)?.length || 0;
    const ratio = printableChars / text.length;

    return ratio > 0.7; // At least 70% printable characters
  }

  /**
   * Infer document type from filename and content
   */
  private inferDocumentType(fileName: string, content: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Check filename patterns
    if (fileName.toLowerCase().includes('contract')) return 'contract';
    if (fileName.toLowerCase().includes('agreement')) return 'agreement';
    if (fileName.toLowerCase().includes('patent')) return 'patent';
    if (fileName.toLowerCase().includes('trademark')) return 'trademark';
    if (fileName.toLowerCase().includes('motion')) return 'motion';
    if (fileName.toLowerCase().includes('brief')) return 'brief';

    // Check content patterns
    const contentLower = content.toLowerCase();
    if (contentLower.includes('whereas') && contentLower.includes('therefore')) return 'contract';
    if (contentLower.includes('plaintiff') && contentLower.includes('defendant'))
      return 'litigation';
    if (contentLower.includes('patent') && contentLower.includes('claim')) return 'patent';
    if (contentLower.includes('trademark') || contentLower.includes('service mark'))
      return 'trademark';
    if (contentLower.includes('motion') && contentLower.includes('court')) return 'motion';

    // Fallback based on extension
    switch (extension) {
      case 'pdf':
        return 'legal-document';
      case 'doc':
      case 'docx':
        return 'legal-document';
      default:
        return 'general';
    }
  }

  /**
   * Infer practice area from content
   */
  private inferPracticeArea(content: string): string {
    const contentLower = content.toLowerCase();

    if (
      contentLower.includes('intellectual property') ||
      contentLower.includes('patent') ||
      contentLower.includes('trademark') ||
      contentLower.includes('copyright')
    ) {
      return 'intellectual-property';
    }

    if (
      contentLower.includes('contract') ||
      contentLower.includes('agreement') ||
      contentLower.includes('terms and conditions')
    ) {
      return 'contract-law';
    }

    if (
      contentLower.includes('litigation') ||
      contentLower.includes('plaintiff') ||
      contentLower.includes('defendant') ||
      contentLower.includes('motion')
    ) {
      return 'litigation';
    }

    if (
      contentLower.includes('employment') ||
      contentLower.includes('labor') ||
      contentLower.includes('workplace')
    ) {
      return 'employment-law';
    }

    if (
      contentLower.includes('real estate') ||
      contentLower.includes('property') ||
      contentLower.includes('lease') ||
      contentLower.includes('deed')
    ) {
      return 'real-estate';
    }

    return 'general';
  }

  /**
   * Infer jurisdiction from content
   */
  private inferJurisdiction(content: string): string {
    const contentLower = content.toLowerCase();

    // Federal indicators
    if (
      contentLower.includes('federal') ||
      contentLower.includes('united states') ||
      contentLower.includes('u.s.') ||
      contentLower.includes('supreme court')
    ) {
      return 'federal';
    }

    // State patterns - add more as needed
    const states = [
      'california',
      'new york',
      'texas',
      'florida',
      'illinois',
      'pennsylvania',
      'ohio',
      'georgia',
      'north carolina',
      'michigan',
    ];

    for (const state of states) {
      if (contentLower.includes(state)) {
        return state;
      }
    }

    return 'unknown';
  }

  /**
   * Calculate extraction confidence score
   */
  private calculateExtractionConfidence(content: string, fileName: string): number {
    let confidence = 0.5; // Base confidence

    // Content length bonus
    if (content.length > 1000) confidence += 0.2;
    if (content.length > 5000) confidence += 0.1;

    // Structure indicators
    if (content.includes('\n\n')) confidence += 0.1; // Paragraphs
    if (content.match(/\d+\./g)) confidence += 0.1; // Numbered lists
    if (content.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g)) confidence += 0.1; // Proper names

    // Legal document indicators
    if (content.toLowerCase().includes('whereas')) confidence += 0.1;
    if (content.toLowerCase().includes('therefore')) confidence += 0.1;

    // File type confidence
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(extension || '')) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate document title from content and filename
   */
  private generateDocumentTitle(content: string, fileName: string): string {
    // Try to extract title from content
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 10 && firstLine.length < 100) {
        return firstLine;
      }
    }

    // Fallback to cleaned filename
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    return baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      htm: 'text/html',
      rtf: 'application/rtf',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Notify semantic search API about new document
   */
  private async notifySemanticSearchAPI(documentId: string, documentInfo: any): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/documents/indexed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            action: 'indexed',
            ...documentInfo,
          }),
        });
      }
    } catch (error) {
      console.warn('Failed to notify semantic search API:', error);
    }
  }
  async getSystemStats(): Promise<{
    documentCount?: number;
    queryCount?: number;
    indexSize?: number;
    averageQueryTime?: number;
    averageResponseTime?: number;
    indexStatus?: string;
    uptime?: number;
  }> {
    try {
      const health = await this.healthCheck();

      // Mock statistics - in production, these would come from actual system metrics
      return {
        documentCount: 100, // Would query from vector store
        queryCount: 50, // Would track actual queries
        indexSize: 1024 * 1024, // Would get actual index size
        averageQueryTime: 150, // Would calculate from query logs
        averageResponseTime: 200, // Would track response times
        indexStatus: health.status === 'healthy' ? 'healthy' : 'degraded',
        uptime: Date.now() - process.uptime() * 1000,
      };
    } catch (error: any) {
      console.error('Failed to get system stats:', error);
      return {
        documentCount: 0,
        queryCount: 0,
        indexSize: 0,
        averageQueryTime: 0,
        averageResponseTime: 0,
        indexStatus: 'error',
        uptime: 0,
      };
    }
  }
}

// Export singleton instance with environment configuration
export const legalRAG = new LegalRAGService({
  qdrantUrl: import.meta.env.QDRANT_URL || "http://localhost:6333",
  ollamaGenerationUrl:
    import.meta.env.OLLAMA_GENERATION_URL || "http://localhost:11434/v1",
  ollamaEmbeddingUrl:
    import.meta.env.OLLAMA_EMBEDDING_URL || "http://localhost:11434/v1",
  apiKey: import.meta.env.OLLAMA_API_KEY || "EMPTY",
  collectionName: "legal_documents",
  embeddingDimensions: 768,
});
