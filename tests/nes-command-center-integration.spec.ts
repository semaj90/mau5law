/**
 * NES Command Center Integration Tests
 *
 * End-to-end tests for the complete NES Command Center system:
 * - Route creation and metadata persistence
 * - Error cluster creation and health calculation
 * - Error brain analysis persistence
 * - Interaction logging
 * - Real-time health updates via SSE
 * - Data archival
 */

import { test, expect } from '@playwright/test';
import { db } from '../backend/db/connection';
import {
  routeMetadata,
  errorCluster,
  routeHealthEvent,
  errorBrainAnalysis,
  errorBrainPatch,
  routeInteractionLog
} from '../sveltekit-frontend/src/lib/db/schema/nes-command-center';
import { eq, and, desc } from 'drizzle-orm';

// Test data
const TEST_ROUTE_ID = 'test-integration-route';
const TEST_USER_ID = 'test-user-123';

test.describe('NES Command Center Integration Tests', () => {

  // Clean up test data before each test
  test.beforeEach(async () => {
    await db.delete(routeInteractionLog).where(eq(routeInteractionLog.routeId, TEST_ROUTE_ID));
    await db.delete(errorBrainPatch).where(eq(errorBrainPatch.routeId, TEST_ROUTE_ID));
    await db.delete(errorBrainAnalysis).where(eq(errorBrainAnalysis.routeId, TEST_ROUTE_ID));
    await db.delete(routeHealthEvent).where(eq(routeHealthEvent.routeId, TEST_ROUTE_ID));
    await db.delete(errorCluster).where(eq(errorCluster.routeId, TEST_ROUTE_ID));
    await db.delete(routeMetadata).where(eq(routeMetadata.routeId, TEST_ROUTE_ID));
  });

  test.describe('Phase 12.1: Route Creation and Metadata Persistence', () => {

    test('should create route via API and persist to database', async ({ request }) => {
      // Create route via API
      const response = await request.post('/api/routes/metadata', {
        data: {
          route_id: TEST_ROUTE_ID,
          path: '/test/integration',
          kind: 'page',
          group: 'test',
          priority: 'medium',
          badges: ['test', 'integration']
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.route_id).toBe(TEST_ROUTE_ID);
      expect(data.path).toBe('/test/integration');

      // Verify in database
      const dbRoute = await db.query.routeMetadata.findFirst({
        where: eq(routeMetadata.routeId, TEST_ROUTE_ID)
      });

      expect(dbRoute).toBeDefined();
      expect(dbRoute?.routeId).toBe(TEST_ROUTE_ID);
      expect(dbRoute?.path).toBe('/test/integration');
      expect(dbRoute?.kind).toBe('page');
      expect(dbRoute?.group).toBe('test');
    });

    test('should display route on all-routes page', async ({ page }) => {
      // Create route first
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium',
        badges: ['test']
      });

      // Navigate to all-routes page
      await page.goto('/all-routes');
      await page.waitForLoadState('networkidle');

      // Search for test route
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('test-integration');
      await page.waitForTimeout(500);

      // Verify route appears
      const routeCard = page.locator(`[data-route-id="${TEST_ROUTE_ID}"]`);
      await expect(routeCard).toBeVisible();
      await expect(routeCard).toContainText('/test/integration');
    });
  });

  test.describe('Phase 12.2: Error Cluster Creation and Health Calculation', () => {

    test('should create error cluster and update health status', async ({ request }) => {
      // Create route first
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Create error cluster via API
      const response = await request.post(`/api/routes/${TEST_ROUTE_ID}/errors`, {
        data: {
          tool: 'typescript',
          code: 'TS2345',
          message: 'Type error in test route',
          severity: 'error',
          file_path: '/test/integration/+page.svelte',
          raw_log_snippet: 'Error: Type mismatch'
        }
      });

      expect(response.ok()).toBeTruthy();
      const errorData = await response.json();
      expect(errorData.route_id).toBe(TEST_ROUTE_ID);
      expect(errorData.severity).toBe('error');

      // Verify error in database
      const dbError = await db.query.errorCluster.findFirst({
        where: eq(errorCluster.routeId, TEST_ROUTE_ID)
      });

      expect(dbError).toBeDefined();
      expect(dbError?.tool).toBe('typescript');
      expect(dbError?.code).toBe('TS2345');

      // Verify health event created
      const healthEvent = await db.query.routeHealthEvent.findFirst({
        where: eq(routeHealthEvent.routeId, TEST_ROUTE_ID),
        orderBy: desc(routeHealthEvent.timestamp)
      });

      expect(healthEvent).toBeDefined();
      expect(healthEvent?.newStatus).toBe('broken');
    });

    test('should display error count on UI', async ({ page }) => {
      // Create route with errors
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      await db.insert(errorCluster).values([
        {
          routeId: TEST_ROUTE_ID,
          tool: 'typescript',
          code: 'TS2345',
          message: 'Error 1',
          severity: 'error',
          filePath: '/test/file1.ts'
        },
        {
          routeId: TEST_ROUTE_ID,
          tool: 'typescript',
          code: 'TS2322',
          message: 'Error 2',
          severity: 'error',
          filePath: '/test/file2.ts'
        }
      ]);

      // Navigate to all-routes page
      await page.goto('/all-routes');
      await page.waitForLoadState('networkidle');

      // Find route card
      const routeCard = page.locator(`[data-route-id="${TEST_ROUTE_ID}"]`);
      await expect(routeCard).toBeVisible();

      // Verify error count displayed
      await expect(routeCard).toContainText('2');

      // Verify health indicator (broken status)
      const healthIndicator = routeCard.locator('[data-health-status]');
      await expect(healthIndicator).toHaveAttribute('data-health-status', 'broken');
    });

    test('should transition from healthy to broken status', async ({ request }) => {
      // Create route (healthy initially)
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Verify initial healthy status
      let metadata = await db.query.routeMetadata.findFirst({
        where: eq(routeMetadata.routeId, TEST_ROUTE_ID)
      });
      expect(metadata?.status).toBeUndefined(); // No status yet

      // Add error (should trigger broken status)
      await request.post(`/api/routes/${TEST_ROUTE_ID}/errors`, {
        data: {
          tool: 'typescript',
          code: 'TS2345',
          message: 'Critical error',
          severity: 'error',
          file_path: '/test/file.ts'
        }
      });

      // Verify status changed to broken
      const healthEvent = await db.query.routeHealthEvent.findFirst({
        where: eq(routeHealthEvent.routeId, TEST_ROUTE_ID),
        orderBy: desc(routeHealthEvent.timestamp)
      });

      expect(healthEvent?.newStatus).toBe('broken');
      expect(healthEvent?.reason).toContain('error');
    });
  });

  test.describe('Phase 12.3: Error Brain Analysis Persistence', () => {

    test('should save error brain analysis to database', async ({ request }) => {
      // Create route and error
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      const [error] = await db.insert(errorCluster).values({
        routeId: TEST_ROUTE_ID,
        tool: 'typescript',
        code: 'TS2345',
        message: 'Type error',
        severity: 'error',
        filePath: '/test/file.ts'
      }).returning();

      // Create error brain analysis via API
      const response = await request.post(`/api/routes/${TEST_ROUTE_ID}/error-brain-analysis`, {
        data: {
          error_cluster_id: error.id,
          suggestions: [
            { title: 'Fix type annotation', description: 'Add proper type' },
            { title: 'Use type assertion', description: 'Assert the type' }
          ],
          selected_suggestion_index: 0,
          phase: 'analysis'
        }
      });

      expect(response.ok()).toBeTruthy();
      const analysisData = await response.json();
      expect(analysisData.route_id).toBe(TEST_ROUTE_ID);

      // Verify in database
      const dbAnalysis = await db.query.errorBrainAnalysis.findFirst({
        where: eq(errorBrainAnalysis.routeId, TEST_ROUTE_ID)
      });

      expect(dbAnalysis).toBeDefined();
      expect(dbAnalysis?.suggestions).toHaveLength(2);
      expect(dbAnalysis?.selectedSuggestionIndex).toBe(0);
    });

    test('should save patch when applied', async ({ request }) => {
      // Create route, error, and analysis
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      const [error] = await db.insert(errorCluster).values({
        routeId: TEST_ROUTE_ID,
        tool: 'typescript',
        code: 'TS2345',
        message: 'Type error',
        severity: 'error',
        filePath: '/test/file.ts'
      }).returning();

      const [analysis] = await db.insert(errorBrainAnalysis).values({
        routeId: TEST_ROUTE_ID,
        errorClusterId: error.id,
        suggestions: [{ title: 'Fix', description: 'Fix it' }],
        selectedSuggestionIndex: 0,
        phase: 'analysis'
      }).returning();

      // Apply patch via API
      const response = await request.post(`/api/routes/${TEST_ROUTE_ID}/error-brain-patch`, {
        data: {
          analysis_id: analysis.id,
          patch_content: 'const x: string = "fixed";',
          applied_timestamp: new Date().toISOString()
        }
      });

      expect(response.ok()).toBeTruthy();
      const patchData = await response.json();
      expect(patchData.route_id).toBe(TEST_ROUTE_ID);

      // Verify in database
      const dbPatch = await db.query.errorBrainPatch.findFirst({
        where: eq(errorBrainPatch.routeId, TEST_ROUTE_ID)
      });

      expect(dbPatch).toBeDefined();
      expect(dbPatch?.patchContent).toContain('fixed');
      expect(dbPatch?.verificationStatus).toBe('pending');
    });
  });

  test.describe('Phase 12.4: Interaction Logging', () => {

    test('should log view interaction', async ({ request }) => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Log view interaction
      const response = await request.post(`/api/routes/${TEST_ROUTE_ID}/interactions`, {
        data: {
          interaction_type: 'view',
          user_id: TEST_USER_ID,
          metadata: { source: 'test' }
        }
      });

      expect(response.ok()).toBeTruthy();

      // Verify in database
      const interaction = await db.query.routeInteractionLog.findFirst({
        where: and(
          eq(routeInteractionLog.routeId, TEST_ROUTE_ID),
          eq(routeInteractionLog.interactionType, 'view')
        )
      });

      expect(interaction).toBeDefined();
      expect(interaction?.userId).toBe(TEST_USER_ID);
    });

    test('should log all interaction types', async ({ request }) => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      const interactionTypes = ['view', 'navigate', 'analyze', 'patch_apply'];

      // Log each interaction type
      for (const type of interactionTypes) {
        const response = await request.post(`/api/routes/${TEST_ROUTE_ID}/interactions`, {
          data: {
            interaction_type: type,
            user_id: TEST_USER_ID,
            metadata: { test: true }
          }
        });

        expect(response.ok()).toBeTruthy();
      }

      // Verify all logged
      const interactions = await db.query.routeInteractionLog.findMany({
        where: eq(routeInteractionLog.routeId, TEST_ROUTE_ID)
      });

      expect(interactions).toHaveLength(4);

      const types = interactions.map(i => i.interactionType);
      expect(types).toContain('view');
      expect(types).toContain('navigate');
      expect(types).toContain('analyze');
      expect(types).toContain('patch_apply');
    });

    test('should retrieve interaction history', async ({ request }) => {
      // Create route and interactions
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      await db.insert(routeInteractionLog).values([
        {
          routeId: TEST_ROUTE_ID,
          interactionType: 'view',
          userId: TEST_USER_ID,
          metadata: {}
        },
        {
          routeId: TEST_ROUTE_ID,
          interactionType: 'navigate',
          userId: TEST_USER_ID,
          metadata: {}
        }
      ]);

      // Retrieve via API
      const response = await request.get(`/api/routes/${TEST_ROUTE_ID}/interactions?limit=10`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.interactions).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });
  });

  test.describe('Phase 12.5: Real-Time Health Updates via SSE', () => {

    test('should broadcast health change via SSE', async ({ page, request }) => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Navigate to all-routes page
      await page.goto('/all-routes');
      await page.waitForLoadState('networkidle');

      // Set up SSE message listener
      const sseMessages: any[] = [];
      await page.evaluate(() => {
        const eventSource = new EventSource('/api/routes/events');
        (window as any).sseMessages = [];
        eventSource.onmessage = (event) => {
          (window as any).sseMessages.push(JSON.parse(event.data));
        };
      });

      // Create error (triggers health change)
      await request.post(`/api/routes/${TEST_ROUTE_ID}/errors`, {
        data: {
          tool: 'typescript',
          code: 'TS2345',
          message: 'Test error',
          severity: 'error',
          file_path: '/test/file.ts'
        }
      });

      // Wait for SSE message
      await page.waitForTimeout(1000);

      // Check SSE messages
      const messages = await page.evaluate(() => (window as any).sseMessages);
      expect(messages.length).toBeGreaterThan(0);

      const healthChange = messages.find(m =>
        m.type === 'health_change' && m.routeId === TEST_ROUTE_ID
      );
      expect(healthChange).toBeDefined();
      expect(healthChange.newStatus).toBe('broken');
    });

    test('should update UI without page reload', async ({ page, request }) => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Navigate to all-routes page
      await page.goto('/all-routes');
      await page.waitForLoadState('networkidle');

      // Get initial route card state
      const routeCard = page.locator(`[data-route-id="${TEST_ROUTE_ID}"]`);
      await expect(routeCard).toBeVisible();

      // Create error (triggers health change and SSE broadcast)
      await request.post(`/api/routes/${TEST_ROUTE_ID}/errors`, {
        data: {
          tool: 'typescript',
          code: 'TS2345',
          message: 'Test error',
          severity: 'error',
          file_path: '/test/file.ts'
        }
      });

      // Wait for UI update (SSE should trigger update)
      await page.waitForTimeout(2000);

      // Verify health indicator updated
      const healthIndicator = routeCard.locator('[data-health-status]');
      await expect(healthIndicator).toHaveAttribute('data-health-status', 'broken');

      // Verify error count updated
      await expect(routeCard).toContainText('1');
    });
  });

  test.describe('Phase 12.6: Data Archival', () => {

    test('should archive old error clusters', async () => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Create old error (91 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      await db.insert(errorCluster).values({
        routeId: TEST_ROUTE_ID,
        tool: 'typescript',
        code: 'TS2345',
        message: 'Old error',
        severity: 'error',
        filePath: '/test/file.ts',
        firstSeenAt: oldDate,
        lastSeenAt: oldDate
      });

      // Run archival job
      const { archiveOldData } = await import('../backend/jobs/archiveOldData');
      const result = await archiveOldData();

      expect(result.errorClustersArchived).toBeGreaterThan(0);
    });

    test('should query archived data via API', async ({ request }) => {
      // Create route
      await db.insert(routeMetadata).values({
        routeId: TEST_ROUTE_ID,
        path: '/test/integration',
        kind: 'page',
        group: 'test',
        priority: 'medium'
      });

      // Create and archive interaction
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 181);

      await db.insert(routeInteractionLog).values({
        routeId: TEST_ROUTE_ID,
        interactionType: 'view',
        userId: TEST_USER_ID,
        metadata: {},
        timestamp: oldDate
      });

      // Archive it
      const { archiveOldData } = await import('../backend/jobs/archiveOldData');
      await archiveOldData();

      // Query with archived=true
      const response = await request.get(
        `/api/routes/${TEST_ROUTE_ID}/interactions?archived=true&limit=10`
      );
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.includesArchived).toBe(true);
      expect(data.interactions.length).toBeGreaterThan(0);
    });
  });
});
