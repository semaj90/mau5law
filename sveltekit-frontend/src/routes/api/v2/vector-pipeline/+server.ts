/*
 * Enhanced Vector Pipeline API Endpoint
 * Integrates MinIO law PDFs with FastEmbed for optimized vector search
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { minio } from '$lib/server/minio/client';
import { db } from '$lib/server/db';
import embeddingService from '$lib/services/embedding-service';

interface VectorPipelineRequest {
  bucket_name: string;
  object_key?: string;
  batch_objects?: string[];
  chunk_size?: number;
  overlap?: number;
  embed_model?: string;
  metadata?: Record<string, any>;
  force_reprocess?: boolean;
}

interface ProcessingResult {
  success: boolean;
  processed_count: number;
  failed_count: number;
  embeddings_generated: number;
  processing_time: number;
  results: EmbeddingResult[];
  errors?: string[];
}

interface EmbeddingResult {
  document_id: string;
  chunk_id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  processing_time: number;
  model_used: string;
}

class VectorPipelineService {
  private fastEmbedUrl: string;
  private cudaEnabled: boolean;

  constructor() {
    this.fastEmbedUrl = process.env.FASTEMBED_URL || 'http://localhost:8001';
    this.cudaEnabled = process.env.CUDA_ENABLED === 'true';
  }

  /*
   * Process documents from MinIO with FastEmbed integration
   */
  async processDocuments(request: VectorPipelineRequest): Promise<ProcessingResult> {
    const startTime = Date.now();
    const results: EmbeddingResult[] = [];
    const errors: string[] = [];

    try {
      // Determine which objects to process
      const objectsToProcess =
        request.batch_objects ||
        (request.object_key
          ? [request.object_key]
          : await this.listBucketObjects(request.bucket_name));

      if (objectsToProcess.length === 0) {
        throw new Error('No objects found to process');
      }

      console.log(
        `Processing ${objectsToProcess.length} objects from bucket: ${request.bucket_name}`
      );

      // Process each object
      for (const objectKey of objectsToProcess) {
        try {
          const objectResults = await this.processDocument(request.bucket_name, objectKey, request);
          results.push(...objectResults);
        } catch (err) {
          const errorMsg = `Failed to process ${objectKey}: ${err}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        processed_count: objectsToProcess.length - errors.length,
        failed_count: errors.length,
        embeddings_generated: results.length,
        processing_time: processingTime,
        results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err) {
      console.error('Vector pipeline processing failed:', err);
      throw err;
    }
  }

  /*
   * Process a single document
   */
  private async processDocument(
    bucketName: string,
    objectKey: string,
    request: VectorPipelineRequest
  ): Promise<EmbeddingResult[]> {
    // Check if already processed (unless force_reprocess is true)
    if (!request.force_reprocess) {
      const existingEmbeddings = await this.checkExistingEmbeddings(objectKey);
      if (existingEmbeddings.length > 0) {
        console.log(`Document ${objectKey} already processed, skipping`);
        return existingEmbeddings;
      }
    }

    // Download document from MinIO
    const documentContent = await this.downloadFromMinio(bucketName, objectKey);

    // Extract text content
    const textContent = await this.extractTextContent(documentContent, objectKey);

    // Split into chunks
    const chunks = this.chunkText(textContent, request.chunk_size || 512, request.overlap || 50);

    if (chunks.length === 0) {
      throw new Error(`No text chunks extracted from ${objectKey}`);
    }

    // Generate embeddings using FastEmbed
    const embeddings = await this.generateEmbeddings(
      chunks,
      request.embed_model || 'BAAI/bge-small-en-v1.5'
    );

    // Create results
    const results: EmbeddingResult[] = chunks.map((chunk, index) => ({
      document_id: objectKey,
      chunk_id: `${objectKey}_chunk_${index}`,
      text: chunk,
      embedding: embeddings[index],
      metadata: {
        source_bucket: bucketName,
        source_key: objectKey,
        chunk_index: index,
        chunk_size: chunk.length,
        processed_at: new Date().toISOString(),
        cuda_enabled: this.cudaEnabled,
        ...request.metadata,
      },
      processing_time: 0, // Will be set by caller
      model_used: request.embed_model || 'BAAI/bge-small-en-v1.5',
    }));

    // Store in database
    await this.storeEmbeddings(results);

    return results;
  }

  /*
   * Download document from MinIO
   */
  private async downloadFromMinio(bucketName: string, objectKey: string): Promise<Buffer> {
    try {
      const stream = await minio.getObject(bucketName, objectKey);
      const chunks: Buffer[] = [];

      return new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err: unknown) => reject(err));
      });
    } catch (err) {
      throw new Error(`Failed to download ${objectKey} from MinIO: ${err}`);
    }
  }

  /*
   * Extract text content from document
   */
  private async extractTextContent(content: Buffer, filename: string): Promise<string> {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        // TODO: Implement PDF text extraction
        // For now, return base64 or placeholder
        return content.toString('utf8');

      case 'txt':
      case 'md':
        return content.toString('utf8');

      case 'json':
        try {
          const jsonData = JSON.parse(content.toString('utf8'));
          return JSON.stringify(jsonData, null, 2);
        } catch {
          return content.toString('utf8');
        }

      default:
        // Try to parse as text
        return content.toString('utf8');
    }
  }

  /*
   * Split text into chunks with overlap
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(/\s+/).filter((word) => word.length > 0);

    if (words.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const end = Math.min(i + chunkSize, words.length);
      const chunk = words.slice(i, end).join(' ');
      chunks.push(chunk);

      if (end === words.length) break;
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  /*
   * Generate embeddings using FastEmbed service
   */
  private async generateEmbeddings(texts: string[], model: string): Promise<number[][]> {
    try {
      const response = await fetch(`${this.fastEmbedUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          model,
          normalize: true,
          device: this.cudaEnabled ? 'cuda' : 'cpu',
        }),
      });

      if (!response.ok) {
        throw new Error(`FastEmbed API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.embeddings;
    } catch (err) {
      throw new Error(`Failed to generate embeddings: ${err}`);
    }
  }

  /*
   * Store embeddings in PostgreSQL
   */
  private async storeEmbeddings(results: EmbeddingResult[]): Promise<void> {
    try {
      // Begin transaction
      await (db as any).execute('BEGIN');

      for (const result of results) {
        // Convert embedding to pgvector format
        const embeddingVector = `[${result.embedding.join(',')}]`;

        await (db as any).execute(
          `
					INSERT INTO document_embeddings
					(document_id, chunk_id, content, embedding, metadata, processed_at, model_used)
					VALUES ($1, $2, $3, $4::vector, $5, NOW(), $6)
					ON CONFLICT (chunk_id) DO UPDATE SET
					content = EXCLUDED.content,
					embedding = EXCLUDED.embedding,
					metadata = EXCLUDED.metadata,
					processed_at = EXCLUDED.processed_at,
					model_used = EXCLUDED.model_used
				`,
          [
            result.document_id,
            result.chunk_id,
            result.text,
            embeddingVector,
            JSON.stringify(result.metadata),
            result.model_used,
          ]
        );
      }

      await (db as any).execute('COMMIT');
      console.log(`Stored ${results.length} embeddings in PostgreSQL`);
    } catch (err) {
      await (db as any).execute('ROLLBACK');
      throw new Error(`Failed to store embeddings: ${err}`);
    }
  }

  /*
   * Check for existing embeddings
   */
  private async checkExistingEmbeddings(documentId: string): Promise<EmbeddingResult[]> {
    try {
      const rows = await (db as any).execute(
        `
				SELECT chunk_id, content, embedding, metadata, model_used, processed_at
				FROM document_embeddings
				WHERE document_id = $1
				ORDER BY chunk_id
			`,
        [documentId]
      );

      return rows.map((row: any) => ({
        document_id: documentId,
        chunk_id: row.chunk_id,
        text: row.content,
        embedding: JSON.parse(row.embedding), // Parse pgvector format
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        processing_time: 0,
        model_used: row.model_used,
      }));
    } catch (err) {
      console.error('Failed to check existing embeddings:', err);
      return [];
    }
  }

  /*
   * List objects in MinIO bucket
   */
  private async listBucketObjects(bucketName: string): Promise<string[]> {
    try {
      const objectsList: string[] = [];
      const stream = minio.listObjects(bucketName, '', true);

      return new Promise<string[]>((resolve, reject) => {
        stream.on('data', (obj: any) => {
          if (obj.name) {
            objectsList.push(obj.name);
          }
        });
        stream.on('end', () => resolve(objectsList));
        stream.on('error', (err: unknown) => reject(err));
      });
    } catch (err) {
      throw new Error(`Failed to list bucket objects: ${err}`);
    }
  }

  /*
   * Search similar documents using vector similarity
   */
  async searchSimilar(
    query: string,
    options: {
      model?: string;
      limit?: number;
      threshold?: number;
      filters?: Record<string, any>;
    } = {}
  ): Promise<any[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbeddings(
      [query],
      options.model || 'BAAI/bge-small-en-v1.5'
    );
    const queryVector = `[${queryEmbedding[0].join(',')}]`;

    // Build SQL query with filters
    let whereClause = '';
    const params: any[] = [queryVector, options.limit || 10];

    if (options.filters) {
      const filterConditions = Object.entries(options.filters).map(([key, value], index) => {
        params.push(value);
        return `metadata->>'${key}' = $${params.length}`;
      });

      if (filterConditions.length > 0) {
        whereClause = 'WHERE ' + filterConditions.join(' AND ');
      }
    }

    const similarityThreshold = options.threshold || 0.7;

    const query_sql = `
			SELECT
				document_id,
				chunk_id,
				content,
				metadata,
				model_used,
				processed_at,
				1 - (embedding <=> $1::vector) as similarity
			FROM document_embeddings
			${whereClause}
			${whereClause ? 'AND' : 'WHERE'} 1 - (embedding <=> $1::vector) > ${similarityThreshold}
			ORDER BY embedding <=> $1::vector
			LIMIT $2
		`;

    try {
      const results = await (db as any).execute(query_sql, params);

      return results.map((row: any) => ({
        document_id: row.document_id,
        chunk_id: row.chunk_id,
        content: row.content,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        model_used: row.model_used,
        processed_at: row.processed_at,
        similarity: parseFloat(row.similarity),
      }));
    } catch (err) {
      throw new Error(`Similarity search failed: ${err}`);
    }
  }

  /*
   * Get pipeline statistics
   */
  async getStats(): Promise<any> {
    try {
      const stats = await (db as any).execute(`
				SELECT
					COUNT(*) as total_embeddings,
					COUNT(DISTINCT document_id) as total_documents,
					AVG(array_length(string_to_array(embedding::text, ','), 1)) as avg_dimensions,
					string_agg(DISTINCT model_used, ', ') as models_used,
					MIN(processed_at) as first_processed,
					MAX(processed_at) as last_processed
				FROM document_embeddings
			`);

      // Get FastEmbed service health
      let fastEmbedHealth = null;
      try {
        const healthResponse = await fetch(`${this.fastEmbedUrl}/health`);
        if (healthResponse.ok) {
          fastEmbedHealth = await healthResponse.json();
        }
      } catch (err) {
        console.warn('FastEmbed health check failed:', err);
      }

      return {
        database_stats: stats[0],
        fastembed_service: fastEmbedHealth,
        pipeline_config: {
          fastembed_url: this.fastEmbedUrl,
          cuda_enabled: this.cudaEnabled,
        },
      };
    } catch (err) {
      throw new Error(`Failed to get stats: ${err}`);
    }
  }
}

const vectorPipelineService = new VectorPipelineService();

export const POST: RequestHandler = async ({ request }) => {
	try {
    const body = (await request.json()) as VectorPipelineRequest;

    // Validate required fields
    if (!body.bucket_name) {
      return error(400, 'bucket_name is required');
    }

    const result = await vectorPipelineService.processDocuments(body);

    return json({
      success: true,
      result,
    });
  } catch (err) {
		console.error('Vector pipeline processing error:', err);
		return error(500, `Processing failed: ${err}`);
	}
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const action = url.searchParams.get('action');
		const query = url.searchParams.get('q');

		switch (action) {
			case 'search':
				if (!query) {
					return error(400, 'Query parameter q is required for search');
				}

				const limit = parseInt(url.searchParams.get('limit') || '10');
				const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
				const model = url.searchParams.get('model') || 'BAAI/bge-small-en-v1.5';

				// Parse filters from URL parameters
				const filters: Record<string, any> = {};
				for (const [key, value] of url.searchParams) {
					if (key.startsWith('filter.')) {
						const filterKey = key.substring(7); // Remove 'filter.' prefix
						filters[filterKey] = value;
					}
				}

				const searchResults = await vectorPipelineService.searchSimilar(query, {
					limit,
					threshold,
					model,
					filters: Object.keys(filters).length > 0 ? filters : undefined
				});

				return json({
					query,
					results: searchResults,
					count: searchResults.length,
					options: { limit, threshold, model, filters }
				});

			case 'stats':
				const stats = await vectorPipelineService.getStats();
				return json(stats);

			default:
				return error(400, 'Invalid action. Use ?action=search&q=query or ?action=stats');
		}

	} catch (err) {
		console.error('Vector pipeline GET error:', err);
		return error(500, `Request failed: ${err}`);
	}
};