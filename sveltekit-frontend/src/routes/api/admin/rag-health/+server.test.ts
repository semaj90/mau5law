// src/routes/api/admin/rag-health/+server.test.ts

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GET } from './+server';

// Mock the database for testing
vi.mock('$lib/server/db', () => ({
  sql: vi.fn()
}));

import { sql } from '$lib/server/db';

describe('RAG Health Dashboard API', () => {
  /**
   * **Feature: rag-enhancement-system, Property 3: Health Dashboard Completeness**
   * For any database state, the health dashboard should include total chunks, indexed chunks,
   * missing indexes, and timestamp data in the response
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  it('should return complete health data structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          total_chunks: fc.integer({ min: 0, max: 10000 }),
          indexed_chunks: fc.integer({ min: 0, max: 10000 }),
          missing_index_rows: fc.integer({ min: 0, max: 10000 }),
          last_indexed_at: fc.oneof(
            fc.constant(null),
            fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
          )
        }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            chunk_count: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 1000 })),
            indexed_chunks: fc.integer({ min: 0, max: 1000 }),
            last_indexed_at: fc.oneof(
              fc.constant(null),
              fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
            )
          }),
          { maxLength: 10 }
        ),
        fc.array(
          fc.record({
            chunk_id: fc.string({ minLength: 1, maxLength: 50 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            page_number: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 }))
          }),
          { maxLength: 10 }
        ),
        async (globalData, perDocData, failedChunksData) => {
          // Mock the database responses
          const mockSql = sql as any;
          mockSql.mockImplementation((query: any) => {
            if (query.toString().includes('COUNT(*)::int AS total_chunks')) {
              return Promise.resolve([globalData]);
            } else if (query.toString().includes('ef.id, ef.filename')) {
              return Promise.resolve(perDocData);
            } else if (query.toString().includes('ec.id AS chunk_id')) {
              return Promise.resolve(failedChunksData);
            }
            return Promise.resolve([]);
          });

          // Call the API endpoint
          const response = await GET();
          const responseData = await response.json();

          // Should have the complete structure
          expect(responseData).toHaveProperty('global');
          expect(responseData).toHaveProperty('perDoc');
          expect(responseData).toHaveProperty('failedChunks');

          // Global data should match expected structure
          expect(responseData.global).toHaveProperty('total_chunks');
          expect(responseData.global).toHaveProperty('indexed_chunks');
          expect(responseData.global).toHaveProperty('missing_index_rows');
          expect(responseData.global).toHaveProperty('last_indexed_at');

          // Should be numbers
          expect(typeof responseData.global.total_chunks).toBe('number');
          expect(typeof responseData.global.indexed_chunks).toBe('number');
          expect(typeof responseData.global.missing_index_rows).toBe('number');

          // Per-document data should be an array
          expect(Array.isArray(responseData.perDoc)).toBe(true);
          responseData.perDoc.forEach((doc: any) => {
            expect(doc).toHaveProperty('id');
            expect(doc).toHaveProperty('filename');
            expect(doc).toHaveProperty('chunk_count');
            expect(doc).toHaveProperty('indexed_chunks');
            expect(doc).toHaveProperty('last_indexed_at');
          });

          // Failed chunks should be an array
          expect(Array.isArray(responseData.failedChunks)).toBe(true);
          responseData.failedChunks.forEach((chunk: any) => {
            expect(chunk).toHaveProperty('chunk_id');
            expect(chunk).toHaveProperty('filename');
            expect(chunk).toHaveProperty('page_number');
          });

          // Logical consistency checks
          expect(responseData.global.indexed_chunks).toBeLessThanOrEqual(responseData.global.total_chunks);
          expect(responseData.global.missing_index_rows).toBe(
            responseData.global.total_chunks - responseData.global.indexed_chunks
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle database errors gracefully', async () => {
    const mockSql = sql as any;
    mockSql.mockRejectedValue(new Error('Database connection failed'));

    const response = await GET();
    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toBe('Internal server error');
  });

  it('should return valid JSON structure for empty database', async () => {
    const mockSql = sql as any;
    mockSql.mockImplementation((query: any) => {
      if (query.toString().includes('COUNT(*)::int AS total_chunks')) {
        return Promise.resolve([{
          total_chunks: 0,
          indexed_chunks: 0,
          missing_index_rows: 0,
          last_indexed_at: null
        }]);
      }
      return Promise.resolve([]);
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.global.total_chunks).toBe(0);
    expect(responseData.global.indexed_chunks).toBe(0);
    expect(responseData.global.missing_index_rows).toBe(0);
    expect(responseData.global.last_indexed_at).toBeNull();
    expect(responseData.perDoc).toEqual([]);
    expect(responseData.failedChunks).toEqual([]);
  });

  it('should handle null timestamps correctly', async () => {
    const mockSql = sql as any;
    mockSql.mockImplementation((query: any) => {
      if (query.toString().includes('COUNT(*)::int AS total_chunks')) {
        return Promise.resolve([{
          total_chunks: 100,
          indexed_chunks: 50,
          missing_index_rows: 50,
          last_indexed_at: null
        }]);
      } else if (query.toString().includes('ef.id, ef.filename')) {
        return Promise.resolve([{
          id: 'doc1',
          filename: 'test.pdf',
          chunk_count: 10,
          indexed_chunks: 5,
          last_indexed_at: null
        }]);
      }
      return Promise.resolve([]);
    });

    const response = await GET();
    const responseData = await response.json();

    expect(responseData.global.last_indexed_at).toBeNull();
    expect(responseData.perDoc[0].last_indexed_at).toBeNull();
  });
});