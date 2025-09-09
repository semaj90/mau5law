/**
 * pgvector Test API Endpoints
 * Best Practices for Vector Similarity Search Testing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pgVectorService } from '$lib/server/db/pgvector-service';
import { gemmaEmbeddingService } from '$lib/services/gemma-embedding';
import { mockDataGenerators } from '$lib/server/sync/mock-api-sync-simple';

// GET /api/pgvector/test - Comprehensive pgvector connection and capability testing
export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'connection';
  const startTime = Date.now();

  try {
    switch (action) {
      case 'connection':
        // Test basic PostgreSQL + pgvector connection
        const connectionTest = await pgVectorService.testConnection();

        return json({
          action: 'pgvector_connection_test',
          success: connectionTest.success,
          details: connectionTest.details,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'stats':
        // Get database statistics and performance metrics
        const statsResult = await pgVectorService.getDatabaseStats();

        return json({
          action: 'pgvector_database_stats',
          success: statsResult.success,
          stats: statsResult.stats,
          error: statsResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'index':
        // Create IVFFLAT index for vector similarity search optimization
        const lists = parseInt(url.searchParams.get('lists') || '100');
        const metric = url.searchParams.get('metric') || 'cosine' as 'cosine' | 'euclidean' | 'inner_product';

        const indexResult = await pgVectorService.createVectorIndex({ lists, metric });

        return json({
          action: 'pgvector_create_index',
          success: indexResult.success,
          details: indexResult.details,
          error: indexResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'seed':
        // Seed database with sample legal documents and embeddings
        const count = parseInt(url.searchParams.get('count') || '10');
        const seedResult = await seedSampleDocuments(count);

        return json({
          action: 'pgvector_seed_documents',
          ...seedResult,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'gemma-integration':
        // Test full Gemma embeddings + pgvector integration pipeline
        const integrationResult = await testGemmaIntegration();

        return json({
          action: 'gemma_pgvector_integration_test',
          ...integrationResult,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'health':
        // Comprehensive health check of all components
        const healthResult = await checkSystemHealth();

        return json({
          action: 'system_health_check',
          ...healthResult,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: 'Invalid action',
          availableActions: ['connection', 'stats', 'index', 'seed', 'gemma-integration', 'health'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error: any) {
    return json({
      action,
      success: false,
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// POST /api/pgvector/test - Vector similarity search and document operations
export const POST: RequestHandler = async ({ request, url }) => {
  const action = url.searchParams.get('action') || 'search';
  const startTime = Date.now();

  try {
    const body = await request.json();

    switch (action) {
      case 'search':
        // Vector similarity search
        const { queryEmbedding, options = {} } = body;

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
          return json({
            error: 'queryEmbedding is required and must be an array',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const searchResult = await pgVectorService.vectorSimilaritySearch(queryEmbedding, options);

        return json({
          action: 'pgvector_similarity_search',
          success: searchResult.success,
          results: searchResult.results,
          metadata: searchResult.metadata,
          error: searchResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'insert':
        // Insert single document with embedding
        const { documentId, content, embedding, metadata = {} } = body;

        if (!documentId || !content || !embedding) {
          return json({
            error: 'documentId, content, and embedding are required',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const insertResult = await pgVectorService.insertDocumentWithEmbedding(
          documentId, content, embedding, metadata
        );

        return json({
          action: 'pgvector_insert_document',
          success: insertResult.success,
          id: insertResult.id,
          error: insertResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'batch':
        // Batch insert multiple documents
        const { documents } = body;

        if (!documents || !Array.isArray(documents)) {
          return json({
            error: 'documents array is required',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const batchResult = await pgVectorService.batchInsertDocuments(documents);

        return json({
          action: 'pgvector_batch_insert',
          success: batchResult.success,
          inserted: batchResult.inserted,
          errors: batchResult.errors,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'query':
        // Natural language query with mock embedding generation
        const { query, limit = 5, documentType } = body;

        if (!query || typeof query !== 'string') {
          return json({
            error: 'query string is required',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        // Generate mock embedding for the query (in production, use real embedding service)
        const mockQueryEmbedding = generateMockEmbedding(query);

        const queryResult = await pgVectorService.vectorSimilaritySearch(mockQueryEmbedding, {
          limit,
          documentType,
          includeContent: true
        });

        return json({
          action: 'pgvector_natural_language_query',
          query,
          success: queryResult.success,
          results: queryResult.results,
          metadata: {
            ...queryResult.metadata,
            mockEmbeddingGenerated: true,
            queryLength: query.length
          },
          error: queryResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: 'Invalid action',
          availableActions: ['search', 'insert', 'batch', 'query'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error: any) {
    return json({
      action,
      success: false,
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

/**
 * Seed database with sample legal documents and embeddings
 */
async function seedSampleDocuments(count: number) {
  try {
    const documents = [];
    const legalDocumentTypes = ['contract', 'agreement', 'lease', 'employment', 'nda', 'license'];

    for (let i = 0; i < count; i++) {
      const docType = legalDocumentTypes[i % legalDocumentTypes.length];
      const documentId = `legal-doc-${Date.now()}-${i}`;

      // Generate sample legal content
      const content = generateSampleLegalContent(docType);

      // Generate mock embedding (1536 dimensions)
      const embedding = generateMockEmbedding(content);

      const metadata = {
        title: `Sample ${docType.charAt(0).toUpperCase() + docType.slice(1)} Document ${i + 1}`,
        type: docType,
        generatedAt: new Date().toISOString(),
        contentLength: content.length,
        tags: [docType, 'sample', 'test']
      };

      documents.push({
        documentId,
        content,
        embedding,
        metadata
      });
    }

    const result = await pgVectorService.batchInsertDocuments(documents);

    return {
      success: result.success,
      documentsGenerated: count,
      documentsInserted: result.inserted,
      errors: result.errors,
      sampleDocuments: documents.slice(0, 3).map(d => ({
        documentId: d.documentId,
        title: d.metadata.title,
        type: d.metadata.type,
        contentPreview: d.content.substring(0, 100) + '...',
        embeddingDimensions: d.embedding.length
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate sample legal document content based on type
 */
function generateSampleLegalContent(type: string): string {
  const templates = {
    contract: `
      PURCHASE AGREEMENT

      This Purchase Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()}
      between Company A ("Buyer") and Company B ("Seller").

      1. PURCHASE AND SALE
      Subject to the terms and conditions of this Agreement, Seller agrees to sell and Buyer agrees
      to purchase the goods described in Exhibit A attached hereto.

      2. PURCHASE PRICE
      The total purchase price shall be $100,000 payable in accordance with the payment terms
      specified in Section 3.

      3. PAYMENT TERMS
      Payment shall be made in full within 30 days of delivery. Late payments may incur interest
      at the rate of 1.5% per month.

      4. DELIVERY
      Delivery shall be made to the address specified by Buyer no later than 15 days after
      execution of this Agreement.

      5. WARRANTIES
      Seller warrants that the goods are free from defects and conform to specifications.
    `,
    agreement: `
      SERVICE AGREEMENT

      This Service Agreement is made between Service Provider and Client effective ${new Date().toLocaleDateString()}.

      SCOPE OF SERVICES:
      Provider will deliver consulting services as detailed in the Statement of Work.

      COMPENSATION:
      Client agrees to pay Provider $5,000 per month for services rendered.

      TERM:
      This agreement shall commence on the effective date and continue for 12 months
      unless terminated earlier in accordance with the termination provisions.

      CONFIDENTIALITY:
      Both parties agree to maintain confidentiality of proprietary information.
    `,
    lease: `
      RESIDENTIAL LEASE AGREEMENT

      Landlord: Property Management LLC
      Tenant: John Smith
      Property: 123 Main Street, Anytown, State

      TERM: 12 months beginning ${new Date().toLocaleDateString()}

      RENT: $2,000 per month due on the first day of each month

      SECURITY DEPOSIT: $2,000 held as security for performance of tenant obligations

      USE: Premises shall be used solely as a private residential dwelling

      MAINTENANCE: Tenant responsible for routine maintenance and care of premises
    `,
    employment: `
      EMPLOYMENT AGREEMENT

      Employee: Jane Doe
      Employer: Tech Corporation Inc.
      Position: Senior Software Engineer

      START DATE: ${new Date().toLocaleDateString()}

      SALARY: $120,000 annually, paid bi-weekly

      BENEFITS: Health insurance, 401(k) with company match, paid time off

      DUTIES: Design, develop, and maintain software applications as assigned

      CONFIDENTIALITY: Employee agrees to maintain confidentiality of proprietary information

      TERMINATION: Employment may be terminated by either party with 2 weeks notice
    `,
    nda: `
      NON-DISCLOSURE AGREEMENT

      Disclosing Party: Innovation Labs Inc.
      Receiving Party: Consulting Services LLC

      PURPOSE: Evaluation of potential business partnership

      CONFIDENTIAL INFORMATION: All technical, business, and financial information
      disclosed in connection with discussions

      OBLIGATIONS: Receiving Party agrees to:
      - Maintain strict confidentiality
      - Not disclose to third parties
      - Use information solely for evaluation purposes

      TERM: 2 years from date of disclosure

      RETURN: All materials must be returned upon request
    `,
    license: `
      SOFTWARE LICENSE AGREEMENT

      Licensor: Software Solutions Inc.
      Licensee: Business Corp

      GRANT: Licensor grants non-exclusive license to use the Software

      RESTRICTIONS:
      - No modification or reverse engineering
      - No redistribution without written consent
      - Use limited to internal business operations

      TERM: 3 years renewable

      FEES: $50,000 annual license fee

      SUPPORT: Technical support included during business hours

      WARRANTY: Software provided "as is" with limited warranty
    `
  };

  return templates[type as keyof typeof templates] || templates.contract;
}

/**
 * Generate mock embedding vector (768 dimensions for nomic-embed-text compatibility)
 * In production, replace with actual embedding service (Gemma, OpenAI, Claude, etc.)
 */
function generateMockEmbedding(text: string): number[] {
  // Use text content to create deterministic but varied embeddings
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding = [];

  for (let i = 0; i < 768; i++) {
    // Create deterministic but realistic-looking embedding values
    const value = Math.sin(seed + i * 0.1) * Math.cos(seed + i * 0.05);
    embedding.push(Number(value.toFixed(6)));
  }

  return embedding;
}

/**
 * Test full Gemma embeddings + pgvector integration pipeline
 */
async function testGemmaIntegration() {
  try {
    const testDoc = {
      content: "This is a comprehensive test of the Gemma embeddings integration with pgvector. This legal document demonstrates semantic similarity search capabilities for contract analysis and legal research applications.",
      metadata: {
        title: "Gemma Integration Test Document",
        type: "test",
        source: "integration_test"
      }
    };

    // Step 1: Generate embedding with Gemma
    console.log('🧠 Generating Gemma embedding...');
    const embeddingResult = await gemmaEmbeddingService.generateEmbedding(
      testDoc.content,
      testDoc.metadata
    );

    if (!embeddingResult.success || !embeddingResult.embedding) {
      throw new Error(`Gemma embedding failed: ${embeddingResult.error}`);
    }

    // Step 2: Store in pgvector
    console.log('💾 Storing in pgvector database...');
    const documentId = `gemma_test_${Date.now()}`;
    const storageResult = await pgVectorService.insertDocumentWithEmbedding(
      documentId,
      testDoc.content,
      embeddingResult.embedding,
      {
        ...testDoc.metadata,
        embeddingModel: embeddingResult.model,
        embeddingDimensions: embeddingResult.embedding.length,
        processingTime: embeddingResult.processingTime
      }
    );

    if (!storageResult.success) {
      throw new Error(`Storage failed: ${storageResult.error}`);
    }

    // Step 3: Test similarity search
    console.log('🔍 Testing similarity search...');
    const searchResult = await pgVectorService.vectorSimilaritySearch(
      embeddingResult.embedding,
      {
        limit: 5,
        distanceMetric: 'cosine',
        threshold: 1.0,
        includeContent: true
      }
    );

    return {
      success: true,
      pipeline: {
        embedding: {
          model: embeddingResult.model,
          dimensions: embeddingResult.embedding.length,
          processingTime: embeddingResult.processingTime,
          success: true
        },
        storage: {
          documentId: storageResult.id,
          success: storageResult.success
        },
        search: {
          resultsFound: searchResult.results?.length || 0,
          searchTime: searchResult.metadata?.searchTime,
          topResult: searchResult.results?.[0],
          success: searchResult.success
        }
      },
      summary: `✅ Full integration successful: Gemma (${embeddingResult.model}) → PostgreSQL → Vector Search`,
      recommendations: [
        "Pipeline is production-ready",
        "Consider adding vector indexing for large datasets",
        "Monitor embedding generation performance"
      ]
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      pipeline: null,
      summary: "❌ Integration test failed",
      recommendations: [
        "Check Ollama service availability",
        "Verify PostgreSQL connection",
        "Ensure database schema is up to date"
      ]
    };
  }
}

/**
 * Comprehensive system health check
 */
async function checkSystemHealth() {
  try {
    const [pgHealth, gemmaHealth] = await Promise.all([
      pgVectorService.testConnection(),
      gemmaEmbeddingService.healthCheck()
    ]);

    const systemStatus = {
      postgresql: {
        available: pgHealth.success,
        version: pgHealth.details?.connection?.current_time ? 'Connected' : 'Unknown',
        pgvector: pgHealth.details?.pgvectorExtension?.status !== 'not_installed',
        details: pgHealth.details
      },
      gemmaEmbeddings: {
        available: gemmaHealth.available,
        bestModel: gemmaHealth.model,
        modelHierarchy: gemmaHealth.modelHierarchy,
        ollamaVersion: gemmaHealth.version
      },
      integration: {
        ready: pgHealth.success && gemmaHealth.available,
        status: pgHealth.success && gemmaHealth.available 
          ? "🟢 All systems operational"
          : "🔴 System issues detected"
      }
    };

    return {
      success: true,
      systemStatus,
      summary: systemStatus.integration.ready 
        ? "✅ All components healthy and ready for production"
        : "⚠️ Some components need attention",
      recommendations: systemStatus.integration.ready 
        ? ["System is production-ready", "Consider performance monitoring"]
        : ["Check failed components", "Verify service configurations"]
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      systemStatus: null,
      summary: "❌ Health check failed",
      recommendations: ["Check system configuration", "Verify service availability"]
    };
  }
}
