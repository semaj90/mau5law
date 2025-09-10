import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';


// Search result interface
interface SearchResult {
  id: string;
  title: string;
  type: string;
  content: string;
  score: number;
  similarity?: number;
  metadata?: any;
  highlights?: string[];
  createdAt?: string;
}

const unifiedSearchSchema = z.object({
  query: z.string().min(1).max(1000),
  categories: z.array(z.enum(['cases', 'evidence', 'precedents', 'statutes', 'criminals', 'documents', 'services', 'components'])).optional(),
  enableVectorSearch: z.boolean().default(true),
  aiSuggestions: z.boolean().default(true),
  maxResults: z.number().min(1).max(100).default(20),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  includeMetadata: z.boolean().default(true)
});

/*
 * Reusable handler for the unified search flow.
 * Accepts validated search params and returns a Response via json(...)
 */
async function handleUnifiedSearch(searchParams: z.infer<typeof unifiedSearchSchema>, locals: any) {
  const { query, categories, enableVectorSearch, maxResults, similarityThreshold } = searchParams;

  let results: SearchResult[] = [];
  const startTime = Date.now();

  // 1. Mock legal search results (since external dependencies are unavailable)
  const mockLegalResults: SearchResult[] = [
    {
      id: 'case-001',
      title: `Legal Case: ${query}`,
      type: 'case',
      content: `Legal case related to "${query}" with relevant precedents and statutes.`,
      score: 0.95,
      metadata: {
        source: 'legal_database',
        caseNumber: 'LGL-2024-001',
        jurisdiction: 'Federal',
        dateCreated: new Date().toISOString()
      }
    },
    {
      id: 'evidence-001',
      title: `Evidence: ${query}`,
      type: 'evidence',
      content: `Evidence documentation for "${query}" including forensic analysis and chain of custody.`,
      score: 0.87,
      metadata: {
        source: 'evidence_vault',
        evidenceType: 'documentary',
        secured: true
      }
    },
    {
      id: 'precedent-001',
      title: `Legal Precedent: ${query}`,
      type: 'precedent',
      content: `Legal precedent case similar to "${query}" with applicable rulings and citations.`,
      score: 0.82,
      metadata: {
        source: 'precedent_database',
        court: 'Supreme Court',
        year: '2023'
      }
    }
  ];

  // 2. Simulate vector search if enabled
  let vectorResults: SearchResult[] = [];
  if (enableVectorSearch) {
    vectorResults = [
      {
        id: 'vector-001',
        title: `Vector Match: ${query}`,
        type: 'document',
        content: `Document found through semantic vector search for "${query}".`,
        score: 0.78,
        similarity: 0.78,
        metadata: {
          source: 'vector_database',
          embedding_model: 'gemma-legal',
          similarity_threshold: similarityThreshold
        }
      }
    ];
  }

  // 3. Combine results
  results = [...mockLegalResults, ...vectorResults];

  // 4. Filter by categories if specified
  if (categories && categories.length > 0) {
    results = results.filter(result =>
      categories.includes(result.type as any) ||
      categories.some(cat => result.metadata?.category?.includes(cat))
    );
  }

  // 5. Sort by relevance score and limit results
  results = results
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxResults);

  // 6. Generate search metadata
  const processingTime = Date.now() - startTime;
  const searchMetadata = {
    query,
    categories: categories || ['all'],
    totalResults: results.length,
    processingTime,
    vectorSearchUsed: enableVectorSearch,
    aiEnhanced: searchParams.aiSuggestions,
    sourceBreakdown: {
      legal: mockLegalResults.length,
      vector: vectorResults.length
    }
  };

  return json({
    success: true,
    results,
    metadata: searchMetadata,
    suggestions: [
      `Try searching for "${query} case law"`,
      `Look up "${query} precedents"`,
      `Find "${query} statutes"`
    ]
  });
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const searchParams = unifiedSearchSchema.parse(body);
    return await handleUnifiedSearch(searchParams, locals);
  } catch (error: any) {
    console.error('Unified search API error:', error);

    if (error instanceof z.ZodError) {
      return json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return json(
      {
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const query = url.searchParams.get('q');
    const categories = url.searchParams.get('categories')?.split(',') || [];
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
    const vectorSearch = url.searchParams.get('vector') !== 'false';

    if (!query) {
      return json({ success: false, error: 'Query parameter (q) required' }, { status: 400 });
    }

    // Build body from GET parameters and validate using the same schema
    const body = {
      query,
      categories: categories.length > 0 ? categories : undefined,
      enableVectorSearch: vectorSearch,
      maxResults: limit,
      similarityThreshold: threshold,
      aiSuggestions: true,
      includeMetadata: true
    };

    const searchParams = unifiedSearchSchema.parse(body);
    return await handleUnifiedSearch(searchParams, locals);

  } catch (error: any) {
    console.error('Unified search GET API error:', error);

    if (error instanceof z.ZodError) {
      return json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
};