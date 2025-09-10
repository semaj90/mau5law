import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SearchRequest {
  query: string;
  mode: 'semantic' | 'boolean' | 'phrase';
  filters: {
    jurisdiction?: string;
    court?: string;
    documentType?: string;
    dateRange?: string;
    precedentialValue?: string;
  };
  sort: string;
  page: number;
  limit: number;
}

interface LegalDocument {
  id: string;
  title: string;
  citation: string;
  fullCitation: string;
  court: string;
  jurisdiction: string;
  dateDecided: string;
  documentType: string;
  precedentialValue: string;
  summary: string;
  keyTopics: string[];
  relevanceScore: number;
  citedBy: number;
  url: string;
  content?: string;
  embedding?: number[];
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const searchRequest: SearchRequest = await request.json();
    const { query, mode, filters, sort, page, limit } = searchRequest;

    // Vector search for semantic mode
    if (mode === 'semantic') {
      const results = await performSemanticSearch(query, filters, sort, page, limit);
      return json({
        success: true,
        results: results.documents,
        total: results.total,
        relatedTopics: results.relatedTopics,
        searchMode: mode,
        processingTime: results.processingTime
      });
    }

    // Boolean/phrase search
    const results = await performKeywordSearch(query, mode, filters, sort, page, limit);
    
    return json({
      success: true,
      results: results.documents,
      total: results.total,
      relatedTopics: results.relatedTopics,
      searchMode: mode,
      processingTime: results.processingTime
    });

  } catch (error) {
    console.error('Legal research search error:', error);
    return json(
      { success: false, error: 'Search failed', results: [], total: 0 },
      { status: 500 }
    );
  }
};

async function performSemanticSearch(
  query: string,
  filters: any,
  sort: string,
  page: number,
  limit: number
) {
  const startTime = Date.now();

  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query);
  
  // Build the vector similarity query
  let sql = `
    SELECT 
      ld.*,
      1 - (ld.embedding <=> $1::vector) AS relevance_score,
      array_agg(DISTINCT kw.keyword) FILTER (WHERE kw.keyword IS NOT NULL) as key_topics
    FROM legal_documents ld
    LEFT JOIN LATERAL unnest(ld.keywords) as kw(keyword) ON true
    WHERE ld.embedding IS NOT NULL
  `;

  const params: any[] = [JSON.stringify(queryEmbedding)];
  let paramIndex = 2;

  // Apply filters
  if (filters.jurisdiction) {
    sql += ` AND ld.jurisdiction = $${paramIndex}`;
    params.push(filters.jurisdiction);
    paramIndex++;
  }

  if (filters.court) {
    sql += ` AND ld.court = $${paramIndex}`;
    params.push(filters.court);
    paramIndex++;
  }

  if (filters.documentType) {
    sql += ` AND ld.document_type = $${paramIndex}`;
    params.push(filters.documentType);
    paramIndex++;
  }

  if (filters.precedentialValue) {
    sql += ` AND ld.precedential_value = $${paramIndex}`;
    params.push(filters.precedentialValue);
    paramIndex++;
  }

  // Group by for aggregation
  sql += ` GROUP BY ld.id, ld.embedding`;

  // Apply sorting
  switch (sort) {
    case 'relevance':
      sql += ` ORDER BY relevance_score DESC`;
      break;
    case 'date':
      sql += ` ORDER BY ld.date_decided DESC`;
      break;
    case 'citations':
      sql += ` ORDER BY (
        SELECT COUNT(*) FROM citations c WHERE c.document_id = ld.id
      ) DESC`;
      break;
    case 'court':
      sql += ` ORDER BY ld.court, relevance_score DESC`;
      break;
    default:
      sql += ` ORDER BY relevance_score DESC`;
  }

  // Apply pagination
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, (page - 1) * limit);

  try {
    // Mock database query for demo - in production, use actual database connection
    const mockResults = generateMockSemanticResults(query, filters, page, limit);
    
    const relatedTopics = generateRelatedTopics(query);
    const processingTime = Date.now() - startTime;

    return {
      documents: mockResults.documents,
      total: mockResults.total,
      relatedTopics,
      processingTime
    };

  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function performKeywordSearch(
  query: string,
  mode: 'boolean' | 'phrase',
  filters: any,
  sort: string,
  page: number,
  limit: number
) {
  const startTime = Date.now();

  let sql: string;
  const params: any[] = [];
  let paramIndex = 1;

  if (mode === 'phrase') {
    // Exact phrase search using full-text search
    sql = `
      SELECT 
        ld.*,
        ts_rank(to_tsvector('english', coalesce(ld.content, ld.full_text, '')), 
                 phraseto_tsquery('english', $1)) as relevance_score,
        array_agg(DISTINCT kw.keyword) FILTER (WHERE kw.keyword IS NOT NULL) as key_topics
      FROM legal_documents ld
      LEFT JOIN LATERAL unnest(ld.keywords) as kw(keyword) ON true
      WHERE to_tsvector('english', coalesce(ld.content, ld.full_text, '')) 
            @@ phraseto_tsquery('english', $1)
    `;
    params.push(query);
    paramIndex++;
  } else {
    // Boolean search
    sql = `
      SELECT 
        ld.*,
        ts_rank(to_tsvector('english', coalesce(ld.content, ld.full_text, '')), 
                 to_tsquery('english', $1)) as relevance_score,
        array_agg(DISTINCT kw.keyword) FILTER (WHERE kw.keyword IS NOT NULL) as key_topics
      FROM legal_documents ld
      LEFT JOIN LATERAL unnest(ld.keywords) as kw(keyword) ON true
      WHERE to_tsvector('english', coalesce(ld.content, ld.full_text, '')) 
            @@ to_tsquery('english', $1)
    `;
    params.push(query.replace(/\s+/g, ' & ')); // Convert to boolean query
    paramIndex++;
  }

  // Apply filters (same as semantic search)
  if (filters.jurisdiction) {
    sql += ` AND ld.jurisdiction = $${paramIndex}`;
    params.push(filters.jurisdiction);
    paramIndex++;
  }

  if (filters.court) {
    sql += ` AND ld.court = $${paramIndex}`;
    params.push(filters.court);
    paramIndex++;
  }

  if (filters.documentType) {
    sql += ` AND ld.document_type = $${paramIndex}`;
    params.push(filters.documentType);
    paramIndex++;
  }

  if (filters.precedentialValue) {
    sql += ` AND ld.precedential_value = $${paramIndex}`;
    params.push(filters.precedentialValue);
    paramIndex++;
  }

  sql += ` GROUP BY ld.id`;

  // Apply sorting
  switch (sort) {
    case 'relevance':
      sql += ` ORDER BY relevance_score DESC`;
      break;
    case 'date':
      sql += ` ORDER BY ld.date_decided DESC`;
      break;
    default:
      sql += ` ORDER BY relevance_score DESC`;
  }

  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, (page - 1) * limit);

  try {
    // Mock implementation for demo
    const mockResults = generateMockKeywordResults(query, mode, filters, page, limit);
    const relatedTopics = generateRelatedTopics(query);
    const processingTime = Date.now() - startTime;

    return {
      documents: mockResults.documents,
      total: mockResults.total,
      relatedTopics,
      processingTime
    };

  } catch (error) {
    console.error('Keyword search error:', error);
    throw error;
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    // In production, call your embedding service (OpenAI, local model, etc.)
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: query
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.embedding;
    }
  } catch (error) {
    console.error('Embedding generation failed:', error);
  }

  // Fallback: return mock embedding
  return Array.from({ length: 768 }, () => Math.random() - 0.5);
}

function generateMockSemanticResults(query: string, filters: any, page: number, limit: number) {
  const allResults: LegalDocument[] = [
    {
      id: '1',
      title: `${query} - Supreme Court Decision`,
      citation: '567 U.S. 123 (2023)',
      fullCitation: `Legal Case on ${query}, 567 U.S. 123 (2023)`,
      court: 'Supreme Court of the United States',
      jurisdiction: 'Federal',
      dateDecided: '2023-06-15',
      documentType: 'case',
      precedentialValue: 'High',
      summary: `Landmark Supreme Court decision regarding ${query} that establishes new precedent for constitutional interpretation...`,
      keyTopics: [query.split(' ')[0], 'Constitutional Law', 'Supreme Court'],
      relevanceScore: 0.95,
      citedBy: 156,
      url: `/legal/documents/supreme-court-${query.toLowerCase().replace(/\s+/g, '-')}`
    },
    {
      id: '2',
      title: `Federal Statute - ${query} Regulations`,
      citation: '15 U.S.C. § 1601',
      fullCitation: `Federal Regulations on ${query}, 15 U.S.C. § 1601 (2022)`,
      court: 'Federal Register',
      jurisdiction: 'Federal',
      dateDecided: '2022-12-01',
      documentType: 'statute',
      precedentialValue: 'High',
      summary: `Federal statutory provisions governing ${query} with comprehensive regulatory framework...`,
      keyTopics: [query.split(' ')[0], 'Federal Law', 'Regulations'],
      relevanceScore: 0.89,
      citedBy: 89,
      url: `/legal/documents/federal-statute-${query.toLowerCase().replace(/\s+/g, '-')}`
    },
    {
      id: '3',
      title: `Circuit Court Analysis of ${query}`,
      citation: '789 F.3d 456 (9th Cir. 2021)',
      fullCitation: `Circuit Court Case on ${query}, 789 F.3d 456 (9th Cir. 2021)`,
      court: '9th Circuit Court of Appeals',
      jurisdiction: 'Federal',
      dateDecided: '2021-08-30',
      documentType: 'case',
      precedentialValue: 'Medium',
      summary: `Detailed circuit court analysis of ${query} providing guidance on application and interpretation...`,
      keyTopics: [query.split(' ')[0], 'Circuit Court', 'Appeals'],
      relevanceScore: 0.82,
      citedBy: 43,
      url: `/legal/documents/circuit-court-${query.toLowerCase().replace(/\s+/g, '-')}`
    }
  ];

  // Apply filters
  let filteredResults = allResults;
  
  if (filters.jurisdiction) {
    filteredResults = filteredResults.filter(r => r.jurisdiction === filters.jurisdiction);
  }
  
  if (filters.documentType) {
    filteredResults = filteredResults.filter(r => r.documentType === filters.documentType);
  }
  
  if (filters.precedentialValue) {
    filteredResults = filteredResults.filter(r => r.precedentialValue === filters.precedentialValue);
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);

  return {
    documents: paginatedResults,
    total: filteredResults.length
  };
}

function generateMockKeywordResults(query: string, mode: string, filters: any, page: number, limit: number) {
  // Similar to semantic results but with different relevance scoring
  const results = generateMockSemanticResults(query, filters, page, limit);
  
  // Adjust relevance scores for keyword matching
  results.documents.forEach(doc => {
    doc.relevanceScore = Math.max(0.6, doc.relevanceScore - 0.1);
  });

  return results;
}

function generateRelatedTopics(query: string): string[] {
  const baseTopics = [
    'Constitutional interpretation',
    'Federal jurisdiction',
    'Precedent analysis',
    'Statutory construction',
    'Civil procedure',
    'Evidence standards'
  ];

  // Generate query-specific related topics
  const queryWords = query.toLowerCase().split(' ');
  const relatedTopics = [];

  queryWords.forEach(word => {
    if (word.length > 3) {
      relatedTopics.push(`${word} precedents`);
      relatedTopics.push(`${word} regulations`);
    }
  });

  return [...relatedTopics.slice(0, 3), ...baseTopics.slice(0, 3)];
}