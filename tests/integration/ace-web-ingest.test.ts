/**
 * ACE Web Ingestion Integration Tests
 * Tests for POST /api/ace/web/ingest endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/db';
import { aceSources } from '$lib/db/schema/ace-web';
import { eq } from 'drizzle-orm';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5173';
const INGEST_ENDPOINT = `${API_BASE}/api/ace/web/ingest`;

describe('ACE Web Ingestion API', () => {
  // Cleanup test data
  afterAll(async () => {
    try {
      await db
        .delete(aceSources)
        .where(eq(aceSources.canonicalUrl, 'https://example.com/test'));
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('POST /api/ace/web/ingest', () => {
    it('should enqueue valid URLs successfully', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://example.com/test'],
          tags: ['test', 'integration'],
          priority: 'high',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.jobIds).toHaveLength(1);
      expect(data.message).toContain('Enqueued 1');
    });

    it('should handle multiple URLs', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [
            'https://example.com/page1',
            'https://example.com/page2',
            'https://example.com/page3',
          ],
          priority: 'normal',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.jobIds).toHaveLength(3);
    });

    it('should create source records in database', async () => {
      const testUrl = 'https://example.com/test-db';

      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [testUrl],
        }),
      });

      expect(response.status).toBe(200);

      // Verify source was created
      const sources = await db
        .select()
        .from(aceSources)
        .where(eq(aceSources.canonicalUrl, testUrl))
        .limit(1);

      expect(sources).toHaveLength(1);
      expect(sources[0].canonicalUrl).toBe(testUrl);
      expect(sources[0].domain).toBe('example.com');
      expect(sources[0].crawlStatus).toBe('new');

      // Cleanup
      await db.delete(aceSources).where(eq(aceSources.id, sources[0].id));
    });

    it('should update existing source on re-ingestion', async () => {
      const testUrl = 'https://example.com/test-update';

      // First ingestion
      const response1 = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [testUrl],
        }),
      });

      expect(response1.status).toBe(200);

      // Get source ID
      const sources1 = await db
        .select()
        .from(aceSources)
        .where(eq(aceSources.canonicalUrl, testUrl))
        .limit(1);

      const sourceId = sources1[0].id;

      // Second ingestion (should update, not create new)
      const response2 = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [testUrl],
        }),
      });

      expect(response2.status).toBe(200);

      // Verify still only one source
      const sources2 = await db
        .select()
        .from(aceSources)
        .where(eq(aceSources.canonicalUrl, testUrl));

      expect(sources2).toHaveLength(1);
      expect(sources2[0].id).toBe(sourceId);

      // Cleanup
      await db.delete(aceSources).where(eq(aceSources.id, sourceId));
    });

    it('should return 400 for missing urls field', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: ['test'],
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('urls');
    });

    it('should return 400 for empty urls array', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [],
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('empty');
    });

    it('should return 400 for non-array urls', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: 'not-an-array',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('array');
    });

    it('should return 400 for invalid priority', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://example.com'],
          priority: 'invalid',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('priority');
    });

    it('should return 400 for too many URLs', async () => {
      const urls = Array.from({ length: 101 }, (_, i) => `https://example.com/page${i}`);

      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('100');
    });

    it('should handle invalid URLs gracefully', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://valid.com', 'not-a-url', 'https://also-valid.com'],
        }),
      });

      const data = await response.json();

      // Should succeed for valid URLs
      expect(data.jobIds.length).toBeGreaterThan(0);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should handle RabbitMQ unavailable gracefully', async () => {
      // This test requires RabbitMQ to be stopped
      // Skip if RabbitMQ is running
      const rabbitmqRunning = process.env.RABBITMQ_URL !== undefined;

      if (rabbitmqRunning) {
        console.log('Skipping RabbitMQ unavailable test (RabbitMQ is running)');
        return;
      }

      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://example.com'],
        }),
      });

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('queue');
    });

    it('should support different priority levels', async () => {
      const priorities: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low'];

      for (const priority of priorities) {
        const response = await fetch(INGEST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: [`https://example.com/${priority}`],
            priority,
          }),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.jobIds).toHaveLength(1);
      }
    });

    it('should support optional tags', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://example.com/tagged'],
          tags: ['svelte', 'typescript', 'tutorial'],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should work without optional fields', async () => {
      const response = await fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://example.com/minimal'],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.jobIds).toHaveLength(1);
    });
  });
});
