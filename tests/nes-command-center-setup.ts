/**
 * Test Setup for NES Command Center Integration Tests
 *
 * Provides utilities for:
 * - Database setup and teardown
 * - Test data generation
 * - Mock data helpers
 */

import { db } from '../backend/db/connection';
import { sql } from 'drizzle-orm';

/**
 * Clean all NES Command Center tables
 */
export async function cleanDatabase() {
  await db.execute(sql`TRUNCATE TABLE route_interaction_log CASCADE`);
  await db.execute(sql`TRUNCATE TABLE error_brain_patch CASCADE`);
  await db.execute(sql`TRUNCATE TABLE error_brain_analysis CASCADE`);
  await db.execute(sql`TRUNCATE TABLE route_health_event CASCADE`);
  await db.execute(sql`TRUNCATE TABLE error_cluster CASCADE`);
  await db.execute(sql`TRUNCATE TABLE route_metadata CASCADE`);
}

/**
 * Clean archive tables
 */
export async function cleanArchiveTables() {
  await db.execute(sql`TRUNCATE TABLE error_cluster_archive CASCADE`);
  await db.execute(sql`TRUNCATE TABLE route_interaction_log_archive CASCADE`);
}

/**
 * Generate test route data
 */
export function generateTestRoute(overrides: Partial<any> = {}) {
  return {
    routeId: `test-route-${Date.now()}`,
    path: '/test/route',
    kind: 'page',
    group: 'test',
    priority: 'medium',
    badges: ['test'],
    ...overrides
  };
}

/**
 * Generate test error cluster data
 */
export function generateTestError(routeId: string, overrides: Partial<any> = {}) {
  return {
    routeId,
    tool: 'typescript',
    code: 'TS2345',
    message: 'Test error message',
    severity: 'error',
    filePath: '/test/file.ts',
    rawLogSnippet: 'Error: Test error',
    ...overrides
  };
}

/**
 * Generate test interaction data
 */
export function generateTestInteraction(routeId: string, overrides: Partial<any> = {}) {
  return {
    routeId,
    interactionType: 'view',
    userId: 'test-user',
    metadata: {},
    ...overrides
  };
}

/**
 * Wait for SSE message
 */
export async function waitForSSEMessage(
  page: any,
  predicate: (message: any) => boolean,
  timeout = 5000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const messages = await page.evaluate(() => (window as any).sseMessages || []);
    const found = messages.find(predicate);
    if (found) return found;

    await page.waitForTimeout(100);
  }

  throw new Error('SSE message not received within timeout');
}

/**
 * Setup SSE listener on page
 */
export async function setupSSEListener(page: any) {
  await page.evaluate(() => {
    const eventSource = new EventSource('/api/routes/events');
    (window as any).sseMessages = [];
    (window as any).eventSource = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        (window as any).sseMessages.push(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
  });
}

/**
 * Cleanup SSE listener
 */
export async function cleanupSSEListener(page: any) {
  await page.evaluate(() => {
    if ((window as any).eventSource) {
      (window as any).eventSource.close();
      delete (window as any).eventSource;
      delete (window as any).sseMessages;
    }
  });
}

/**
 * Get archive statistics
 */
export async function getArchiveStatistics() {
  const result = await db.execute(sql`SELECT * FROM archive_statistics`);
  return result.rows;
}

/**
 * Create old data for archival testing
 */
export async function createOldData(routeId: string, daysOld: number) {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - daysOld);

  return {
    timestamp: oldDate,
    firstSeenAt: oldDate,
    lastSeenAt: oldDate
  };
}
