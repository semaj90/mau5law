// src/routes/api/rag/search/+server.test.ts

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { POST } from './+server';

// Mock dependencies
vi.mock('$lib/server/embedding-service', () => ({
  embedText: vi.fn()
}));

vi.mock('$lib/server/rag/qdrant', () => ({
  qdrantSearch: vi.fn()
}));

vi.mock('$lib/server/rag/ranker', () => ({
  rerankLegalAware: vi.fn(),
  createQdrantFilter: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  sql: vi.fn()
}));

import { embedText } from '$lib/server/embedding-service';
import { qdrantSearch } from '$lib/server/rag/qdrant';
import { rerankLegalAware, createQdrantFilter } from '$lib/server/rag/ranker';
import { sql } from '$lib/server/db';

describe('RAG Search API', () => {
  /**
   * **Feature: rag-enhancement-system, Property 9: API Endpoint Consistency**
   * For any valid API request, the endpoints should provide the expected functionality
   * with proper filtering, search, and health monitoring
   * **Validates: Requirements 6.2**
   */
  it('should handle valid search requests consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          query: fc.string({ minLength: 1, maxLength: 200 }),
          limit: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 50 })),
          scoreThreshold: fc.oneof(fc.constant(undefined), fc.float({ min: 0, max: 1 })),
          jurisdiction: fc.oneof(fc.constant(null), fc.constantFrom('CA', 'US-FED', 'Other')),
          tagIds: fc.oneof(fc.constant(undefined), fc.array(fc.string(), { maxLength: 5 })),
          caseId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 }))
        }),
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 768, maxLength: 768 }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            score: fc.float({ min: 0, max: 1 }),
            payload: fc.record({
              tag_ids: fc.array(fc.string(), { maxLength: 5 }),
              jurisdiction: fc.constantFrom('CA', 'US-FED', 'Other'),
              file_name: fc.string({ minLength: 1, maxLength: 100 }),
              page_number: fc.integer({ min: 1, max: 1000 })
            })
          }),
          { maxLength: 10 }
        ),
        async (requestBody, mockEmbedding, mockQdrantResults) => {
          // Setup mocks
          const mockEmbedText = embedText as any;
          const mockQdrantSearch = qdrantSearch as any;
          const mockRerankLegalAware = rerankLegalAware as any;
          const mockCreateQdrantFilter = createQdrantFilter as any;
          const mockSql = sql as any;

          mockEmbedText.mockResolvedValue(mockEmbedding);
          mockQdrantSearch.mockResolvedValue(mockQdrantResults);
          mockRerankLegalAware.mockReturnValue(
            mockQdrantResults.map((r: any) => ({
              ...r,
              finalScore: r.score + 0.1,
              explain: {
                cosine: r.score,
                sharedTags: 0,
                sameJurisdiction: 0,
                finalScore: r.score + 0.1
              }
            }))
          );
          mockCreateQdrantFilter.mockReturnValue(undefined);
          mockSql.mockResolvedValue([]);

          // Create mock request
          const request = {
            json: () => Promise.resolve(requestBody)
          } as any;

          // Call the API
          const response = await POST({ request });
          const responseData = await response.json();

          if (response.status === 200) {
            // Should have results structure
            expect(responseData).toHaveProperty('results');
            expect(Array.isArray(responseData.results)).toBe(true);

            // Each result should have expected structure
            responseData.results.forEach((result: any) => {
              expect(result).toHaveProperty('id');
              expect(result).toHaveProperty('score');
              expect(result).toHaveProperty('finalScore');
              expect(result).toHaveProperty('explain');
              expect(result).toHaveProperty('payload');

              // Explain should have required fields
              expect(result.explain).toHaveProperty('cosine');
              expect(result.explain).toHaveProperty('sharedTags');
              expect(result.explain).toHaveProperty('sameJurisdiction');
              expect(result.explain).toHaveProperty('finalScore');
            });

            // Should respect limit parameter
            const expectedLimit = Math.min(Math.max(requestBody.limit ?? 20, 1), 50);
            expect(responseData.results.length).toBeLessThanOrEqual(expectedLimit);

            // Verify mocks were called correctly
            expect(mockEmbedText).toHaveBeenCalledWith(requestBody.query);
            expect(mockQdrantSearch).toHaveBeenCalled();
            expect(mockRerankLegalAware).toHaveBeenCalled();
          } else {
            // Should have error structure
            expect(responseData).toHaveProperty('error');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject empty queries', async () => {
    const request = {
      json: () => Promise.resolve({ query: '' })
    } as any;

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe('Missing query');
  });

  it('should reject queries with only whitespace', async () => {
    const request = {
      json: () => Promise.resolve({ query: '   \n\t  ' })
    } as any;

    const response = await POST({ request });
    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe('Missing query');
  });

  it('should handle embedding dimension mismatch', async () => {
    const mockEmbedText = embedText as any;
    mockEmbedText.mockResolvedValue(new Array(512).fill(0.1)); // Wrong dimension

    const request = {
      json: () => Promise.resolve({ query: 'test query' })
    } as any;

    const response = await POST({ request });
    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData.error).toContain('Embedding dim mismatch');
  });

  it('should handle Qdrant search failures', async () => {
    const mockEmbedText = embedText as any;
    const mockQdrantSearch = qdrantSearch as any;

    mockEmbedText.mockResolvedValue(new Array(768).fill(0.1));
    mockQdrantSearch.mockRejectedValue(new Error('Qdrant connection failed'));

    const request = {
      json: () => Promise.resolve({ query: 'test query' })
    } as any;

    const response = await POST({ request });
    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData.error).toBe('Internal server error');
  });

  it('should apply correct limit bounds', async () => {
    const testCases = [
      { input: -5, expected: 1 },
      { input: 0, expected: 1 },
      { input: 1, expected: 1 },
      { input: 25, expected: 25 },
      { input: 50, expected: 50 },
      { input: 100, expected: 50 },
      { input: undefined, expected: 20 }
    ];

    for (const testCase of testCases) {
      const mockEmbedText = embedText as any;
      const mockQdrantSearch = qdrantSearch as any;
      const mockRerankLegalAware = rerankLegalAware as any;
      const mockCreateQdrantFilter = createQdrantFilter as any;
      const mockSql = sql as any;

      mockEmbedText.mockResolvedValue(new Array(768).fill(0.1));
      mockQdrantSearch.mockResolvedValue([]);
      mockRerankLegalAware.mockReturnValue([]);
      mockCreateQdrantFilter.mockReturnValue(undefined);
      mockSql.mockResolvedValue([]);

      const requestBody: any = { query: 'test' };
      if (testCase.input !== undefined) {
        requestBody.limit = testCase.input;
      }

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      await POST({ request });

      // Check that qdrantSearch was called with the expected limit
      const qdrantCall = mockQdrantSearch.mock.calls[mockQdrantSearch.mock.calls.length - 1];
      expect(qdrantCall[0].limit).toBe(testCase.expected);
    }
  });

  it('should handle tag resolution correctly', async () => {
    const mockEmbedText = embedText as any;
    const mockQdrantSearch = qdrantSearch as any;
    const mockRerankLegalAware = rerankLegalAware as any;
    const mockCreateQdrantFilter = createQdrantFilter as any;
    const mockSql = sql as any;

    const mockResults = [
      {
        id: 'chunk1',
        score: 0.8,
        finalScore: 0.85,
        explain: { cosine: 0.8, sharedTags: 1, sameJurisdiction: 0, finalScore: 0.85 },
        payload: { tag_ids: ['tag1', 'tag2'] }
      }
    ];

    const mockTagData = [
      { id: 'tag1', namespace: 'statute', name: '18 U.S.C. § 1512', jurisdiction: 'US-FED' },
      { id: 'tag2', namespace: 'case', name: 'People v. Smith', jurisdiction: 'CA' }
    ];

    mockEmbedText.mockResolvedValue(new Array(768).fill(0.1));
    mockQdrantSearch.mockResolvedValue(mockResults);
    mockRerankLegalAware.mockReturnValue(mockResults);
    mockCreateQdrantFilter.mockReturnValue(undefined);
    mockSql.mockResolvedValue(mockTagData);

    const request = {
      json: () => Promise.resolve({ query: 'test query' })
    } as any;

    const response = await POST({ request });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.results[0].payload.tags_resolved).toHaveLength(2);
    expect(responseData.results[0].payload.tags_resolved[0].name).toBe('18 U.S.C. § 1512');
  });
});