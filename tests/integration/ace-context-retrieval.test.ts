/**
 * ACE Context Retrieval Integration Tests
 * Tests for GET /api/ace/context endpoint
 */

import { describe, it, expect } from 'vitest';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5173';
const CONTEXT_ENDPOINT = `${API_BASE}/api/ace/context`;

describe('ACE Context Retrieval API', () => {
  describe('GET /api/ace/context', () => {
    it('should retrieve context for valid query', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=Svelte%205%20runes`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.query).toBe('Svelte 5 runes');
      expect(data.bundle).toBeDefined();
      expect(data.bundle.chunks).toBeInstanceOf(Array);
      expect(data.bundle.entities).toBeInstanceOf(Array);
      expect(data.bundle.edges).toBeInstanceOf(Array);
      expect(data.bundle.summary).toBeDefined();
      expect(data.bundle.totalResults).toBeGreaterThanOrEqual(0);
      expect(data.timestamp).toBeDefined();
    });

    it('should return empty bundle when no results found', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=extremely%20specific%20nonexistent%20query%20xyz123`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bundle.chunks).toHaveLength(0);
      expect(data.bundle.totalResults).toBe(0);
    });

    it('should support domain filter', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=documentation&domain=svelte.dev`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.domain).toBe('svelte.dev');
    });

    it('should support date range filter', async () => {
      const dateFrom = '2024-01-01T00:00:00Z';
      const dateTo = '2024-12-31T23:59:59Z';

      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=test&date_from=${dateFrom}&date_to=${dateTo}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.dateFrom).toBeDefined();
      expect(data.filters.dateTo).toBeDefined();
    });

    it('should support tags filter', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=tutorial&tags=svelte,typescript,beginner`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.tags).toEqual(['svelte', 'typescript', 'beginner']);
    });

    it('should support limit parameter', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=5`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bundle.chunks.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit of 10', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bundle.chunks.length).toBeLessThanOrEqual(10);
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await fetch(CONTEXT_ENDPOINT);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('query');
    });

    it('should return 400 for empty query parameter', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('query');
    });

    it('should return 400 for invalid limit (negative)', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=-1`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('limit');
    });

    it('should return 400 for invalid limit (zero)', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=0`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('limit');
    });

    it('should return 400 for invalid limit (too large)', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=100`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('limit');
      expect(data.message).toContain('50');
    });

    it('should return 400 for invalid limit (non-numeric)', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=abc`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('limit');
    });

    it('should return 400 for invalid date_from', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&date_from=invalid-date`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('date_from');
    });

    it('should return 400 for invalid date_to', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&date_to=invalid-date`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('date_to');
    });

    it('should return 400 for invalid date range (from > to)', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=test&date_from=2024-12-31&date_to=2024-01-01`
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('date range');
    });

    it('should support multiple filters simultaneously', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=tutorial&domain=svelte.dev&date_from=2024-01-01&tags=beginner,tutorial&limit=5`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.domain).toBe('svelte.dev');
      expect(data.filters.dateFrom).toBeDefined();
      expect(data.filters.tags).toEqual(['beginner', 'tutorial']);
      expect(data.bundle.chunks.length).toBeLessThanOrEqual(5);
    });

    it('should include scoring information in chunks', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test&limit=1`);

      expect(response.status).toBe(200);

      const data = await response.json();

      if (data.bundle.chunks.length > 0) {
        const chunk = data.bundle.chunks[0];
        expect(chunk.id).toBeDefined();
        expect(chunk.text).toBeDefined();
        expect(chunk.score).toBeGreaterThanOrEqual(0);
        expect(chunk.score).toBeLessThanOrEqual(1);
        expect(chunk.metadata).toBeDefined();
        expect(chunk.metadata.url).toBeDefined();
        expect(chunk.metadata.fetchedAt).toBeDefined();
        expect(chunk.metadata.domain).toBeDefined();
      }
    });

    it('should handle URL encoding in query', async () => {
      const query = 'How to use $state in Svelte 5?';
      const encoded = encodeURIComponent(query);

      const response = await fetch(`${CONTEXT_ENDPOINT}?query=${encoded}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.query).toBe(query);
    });

    it('should handle special characters in tags', async () => {
      const response = await fetch(
        `${CONTEXT_ENDPOINT}?query=test&tags=svelte-5,type%20script,web-dev`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters.tags).toBeDefined();
    });

    it('should return consistent response structure', async () => {
      const response = await fetch(`${CONTEXT_ENDPOINT}?query=test`);

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('query');
      expect(data).toHaveProperty('filters');
      expect(data).toHaveProperty('bundle');
      expect(data).toHaveProperty('timestamp');

      // Verify bundle structure
      expect(data.bundle).toHaveProperty('chunks');
      expect(data.bundle).toHaveProperty('entities');
      expect(data.bundle).toHaveProperty('edges');
      expect(data.bundle).toHaveProperty('summary');
      expect(data.bundle).toHaveProperty('totalResults');
    });
  });
});
