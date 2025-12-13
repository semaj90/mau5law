// src/routes/api/ai/contextual-chat/+server.test.ts

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { POST } from './+server';

describe('Contextual Chat API', () => {
  /**
   * **Feature: rag-enhancement-system, Property 7: Chat Citation Structure**
   * For any chat response with retrieved sources, the citations should include document names,
   * page numbers, relevance scores, and extracted legal tags
   * **Validates: Requirements 4.1, 4.3, 4.5**
   */
  it('should return properly structured citations', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 500 }),
          jurisdiction: fc.oneof(fc.constant(null), fc.constantFrom('CA', 'US-FED', 'Other')),
          caseId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          tagIds: fc.oneof(fc.constant(undefined), fc.array(fc.string(), { maxLength: 5 }))
        }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            score: fc.float({ min: 0, max: 1 }),
            finalScore: fc.float({ min: 0, max: 1 }),
            payload: fc.record({
              evidence_id: fc.string({ minLength: 1, maxLength: 50 }),
              case_id: fc.string({ minLength: 1, maxLength: 50 }),
              file_name: fc.string({ minLength: 1, maxLength: 100 }),
              page_number: fc.integer({ min: 1, max: 1000 }),
              text: fc.string({ minLength: 10, maxLength: 500 }),
              url: fc.oneof(fc.constant(null), fc.string()),
              tags_resolved: fc.array(
                fc.record({
                  namespace: fc.constantFrom('statute', 'case'),
                  name: fc.string({ minLength: 5, maxLength: 100 }),
                  jurisdiction: fc.oneof(fc.constant(null), fc.constantFrom('CA', 'US-FED'))
                }),
                { maxLength: 3 }
              )
            })
          }),
          { minLength: 0, maxLength: 12 }
        ),
        async (requestBody, mockSearchResults) => {
          // Mock the fetch function to simulate RAG search
          const mockFetch = vi.fn();
          mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ results: mockSearchResults })
          });

          // Create mock request
          const request = {
            json: () => Promise.resolve(requestBody)
          } as any;

          // Call the API with mocked fetch
          const response = await POST({ request, fetch: mockFetch });
          const responseData = await response.json();

          if (response.status === 200) {
            // Should have the expected structure
            expect(responseData).toHaveProperty('answer');
            expect(responseData).toHaveProperty('citations');
            expect(typeof responseData.answer).toBe('string');
            expect(Array.isArray(responseData.citations)).toBe(true);

            // Each citation should have the required structure
            responseData.citations.forEach((citation: any, index: number) => {
              expect(citation).toHaveProperty('n');
              expect(citation).toHaveProperty('chunk_id');
              expect(citation).toHaveProperty('evidence_id');
              expect(citation).toHaveProperty('case_id');
              expect(citation).toHaveProperty('file_name');
              expect(citation).toHaveProperty('page_number');
              expect(citation).toHaveProperty('url');
              expect(citation).toHaveProperty('score');
              expect(citation).toHaveProperty('tags');

              // Citation number should be sequential
              expect(citation.n).toBe(index + 1);

              // Score should be a number
              expect(typeof citation.score).toBe('number');

              // Tags should be an array with proper structure
              expect(Array.isArray(citation.tags)).toBe(true);
              citation.tags.forEach((tag: any) => {
                expect(tag).toHaveProperty('namespace');
                expect(tag).toHaveProperty('name');
                expect(tag).toHaveProperty('jurisdiction');
                expect(['statute', 'case']).toContain(tag.namespace);
              });
            });

            // Number of citations should match search results
            expect(responseData.citations.length).toBe(mockSearchResults.length);

            // Verify RAG search was called with correct parameters
            expect(mockFetch).toHaveBeenCalledWith('/api/rag/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: requestBody.message,
                limit: 12,
                scoreThreshold: 0.2,
                jurisdiction: requestBody.jurisdiction,
                caseId: requestBody.caseId,
                tagIds: requestBody.tagIds ?? []
              })
            });
          } else {
            // Should have error structure
            expect(responseData).toHaveProperty('error');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject empty messages', async () => {
    const request = {
      json: () => Promise.resolve({ message: '' })
    } as any;

    const response = await POST({ request, fetch: vi.fn() });
    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe('Missing message');
  });

  it('should reject messages with only whitespace', async () => {
    const request = {
      json: () => Promise.resolve({ message: '   \n\t  ' })
    } as any;

    const response = await POST({ request, fetch: vi.fn() });
    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe('Missing message');
  });

  it('should handle RAG search failures', async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('RAG service unavailable')
    });

    const request = {
      json: () => Promise.resolve({ message: 'test message' })
    } as any;

    const response = await POST({ request, fetch: mockFetch });
    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData.error).toContain('RAG search failed');
  });

  it('should handle empty search results', async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] })
    });

    const request = {
      json: () => Promise.resolve({ message: 'test message' })
    } as any;

    const response = await POST({ request, fetch: mockFetch });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.citations).toEqual([]);
    expect(responseData.answer).toContain('LLM Integration Placeholder');
  });

  it('should build proper sources block for LLM', async () => {
    const mockSearchResults = [
      {
        id: 'chunk1',
        score: 0.9,
        finalScore: 0.95,
        payload: {
          file_name: 'test-document.pdf',
          page_number: 5,
          text: 'This is the content of chunk 1 with legal information.',
          tags_resolved: [
            { namespace: 'statute', name: '18 U.S.C. § 1512', jurisdiction: 'US-FED' }
          ]
        }
      },
      {
        id: 'chunk2',
        score: 0.8,
        finalScore: 0.85,
        payload: {
          file_name: 'another-doc.pdf',
          page_number: 12,
          text: 'This is chunk 2 content with different legal references.',
          tags_resolved: [
            { namespace: 'case', name: 'People v. Smith', jurisdiction: 'CA' }
          ]
        }
      }
    ];

    const mockFetch = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults })
    });

    const request = {
      json: () => Promise.resolve({ message: 'What is witness tampering?' })
    } as any;

    const response = await POST({ request, fetch: mockFetch });
    const responseData = await response.json();

    expect(response.status).toBe(200);

    // Should have 2 citations
    expect(responseData.citations).toHaveLength(2);

    // First citation should have correct structure
    expect(responseData.citations[0]).toEqual({
      n: 1,
      chunk_id: 'chunk1',
      evidence_id: mockSearchResults[0].payload.evidence_id,
      case_id: mockSearchResults[0].payload.case_id,
      file_name: 'test-document.pdf',
      page_number: 5,
      url: null,
      score: 0.95,
      tags: [
        { namespace: 'statute', name: '18 U.S.C. § 1512', jurisdiction: 'US-FED' }
      ]
    });

    // Answer should contain the sources preview
    expect(responseData.answer).toContain('[#1] test-document.pdf (page 5)');
    expect(responseData.answer).toContain('[#2] another-doc.pdf (page 12)');
    expect(responseData.answer).toContain('What is witness tampering?');
  });

  it('should handle missing payload fields gracefully', async () => {
    const mockSearchResults = [
      {
        id: 'chunk1',
        score: 0.9,
        payload: {
          // Missing some fields
          text: 'Content without complete metadata'
        }
      }
    ];

    const mockFetch = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults })
    });

    const request = {
      json: () => Promise.resolve({ message: 'test message' })
    } as any;

    const response = await POST({ request, fetch: mockFetch });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.citations).toHaveLength(1);

    const citation = responseData.citations[0];
    expect(citation.file_name).toBeUndefined();
    expect(citation.page_number).toBeUndefined();
    expect(citation.tags).toEqual([]);
  });
});