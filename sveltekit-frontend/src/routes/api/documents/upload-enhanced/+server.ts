import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalRAG } from '$lib/ai/langchain-rag';

/**
 * Enhanced document upload endpoint with LangChain RAG integration
 * Provides immediate text extraction and semantic indexing
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string;
    const documentType = formData.get('documentType') as string;
    const title = formData.get('title') as string;

    if (!file) {
      return json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return json({
        success: false,
        error: 'File size exceeds 50MB limit'
      }, { status: 400 });
    }

    // Enhanced file type validation with support for legal document formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/rtf'
    ];

    const allowedExtensions = /\.(pdf|doc|docx|txt|md|html|htm|rtf)$/i;

    if (!allowedTypes.includes(file.type) && !file.name.match(allowedExtensions)) {
      return json({
        success: false,
        error: 'Unsupported file type. Supported formats: PDF, DOC, DOCX, TXT, MD, HTML, RTF'
      }, { status: 400 });
    }

    console.log(`📄 Processing document upload: ${file.name} (${file.size} bytes)`);

    // Process the document upload with enhanced LangChain RAG
    const result = await legalRAG.uploadDocument(file.name, {
      file,
      caseId,
      documentType,
      title,
      metadata: {
        uploadedVia: 'enhanced-api',
        userAgent: request.headers.get('user-agent'),
        uploadedAt: new Date().toISOString(),
        apiVersion: '2.0',
        enhancedProcessing: true
      }
    });

    if (result.success) {
      console.log(`✅ Document processed successfully: ${result.documentId} (${result.chunks} chunks)`);

      return json({
        success: true,
        documentId: result.documentId,
        chunks: result.chunks,
        processingDetails: result.processingDetails,
        message: `Document uploaded and indexed successfully with ${result.chunks} semantic chunks`,
        features: {
          textExtraction: true,
          semanticIndexing: true,
          legalClassification: true,
          enhancedSearch: true
        }
      });
    } else {
      console.error(`❌ Document processing failed: ${result.error}`);

      return json({
        success: false,
        error: result.error || 'Upload processing failed',
        processingDetails: result.processingDetails
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Enhanced document upload error:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
      details: 'An error occurred during document processing'
    }, { status: 500 });
  }
};

/**
 * Get upload configuration and capabilities
 */
export const GET: RequestHandler = async () => {
  return json({
    maxFileSize: '50MB',
    supportedFormats: [
      { extension: 'pdf', mimeType: 'application/pdf', description: 'PDF Document', aiProcessing: true },
      { extension: 'doc', mimeType: 'application/msword', description: 'Microsoft Word Document', aiProcessing: true },
      { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Microsoft Word Document (Modern)', aiProcessing: true },
      { extension: 'txt', mimeType: 'text/plain', description: 'Plain Text', aiProcessing: true },
      { extension: 'md', mimeType: 'text/markdown', description: 'Markdown Document', aiProcessing: true },
      { extension: 'html', mimeType: 'text/html', description: 'HTML Document', aiProcessing: true },
      { extension: 'rtf', mimeType: 'application/rtf', description: 'Rich Text Format', aiProcessing: true }
    ],
    enhancedFeatures: [
      'Automatic text extraction from multiple formats',
      'Legal document type inference and classification',
      'Practice area detection (IP, Contract Law, Litigation, etc.)',
      'Jurisdiction detection (Federal, State-specific)',
      'Intelligent semantic chunking for legal context',
      'Integration with enhanced semantic search API',
      'Real-time confidence scoring for extraction quality',
      'Automatic title generation from document content'
    ],
    aiCapabilities: {
      textExtraction: 'Advanced multi-format extraction',
      documentClassification: 'Legal-specific ML classification',
      semanticIndexing: 'Vector-based semantic chunking',
      searchIntegration: 'Real-time enhanced search integration',
      confidenceScoring: 'AI-powered quality assessment'
    },
    apiVersion: '2.0',
    processingEngine: 'LangChain RAG + Enhanced Semantic Search'
  });
};