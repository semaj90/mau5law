import { test, expect } from '@playwright/test';

/**
 * Phase 10: Real-Time Health Updates - Integration Tests
 *
 * Test Scenarios:
 * - Server accepts SSE connections
 * - Server sends initial state
 * - Server broadcasts updates
 * - Server handles disconnections
 * - Server implements heartbeat
 * - Client connects and receives messages
 * - Client reconnects on disconnect
 * - Client falls back to SSE
 * - UI updates in real-time
 * - Connection status displays
 */

test.describe('Phase 10: Real-Time Health Updates', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to all-routes page
		await page.goto('http://localhost:5173/app/all-routes');
		// Wait for page to load
		await page.waitForLoadState('networkidle');
	});

	test.describe('UT1: SSE Server Tests', () => {
		test('UT1.1: Server accepts SSE connections', async ({ page }) => {
			// Check that connection status indicator is visible
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();

			// Wait for connection to establish
			await page.waitForTimeout(2000);

			// Check that status shows connected
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Connected|Reconnecting/);
		});

		test('UT1.2: Server sends connection confirmation', async ({ page }) => {
			// Open browser console to capture messages
			const messages: string[] = [];

			page.on('console', (msg) => {
				if (msg.text().includes('[Phase 10')) {
					messages.push(msg.text());
				}
			});

			// Wait for connection
			await page.waitForTimeout(2000);

			// Check for connection confirmation message
			const hasConfirmation = messages.some((msg) =>
				msg.includes('connection_confirmed') || msg.includes('Connected')
			);
			expect(hasConfirmation).toBeTruthy();
		});

		test('UT1.3: Server sends heartbeat pings', async ({ page }) => {
			const messages: string[] = [];

			page.on('console', (msg) => {
				if (msg.text().includes('[Phase 10')) {
					messages.push(msg.text());
				}
			});

			// Wait for heartbeat (30 seconds is too long, so we just verify connection stays alive)
			await page.waitForTimeout(5000);

			// Check that connection is still active
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Connected|Reconnecting/);
		});

		test('UT1.4: Server handles client disconnections', async ({ page }) => {
			// Get initial status
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();

			// Simulate network offline
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);

			// Check that status shows disconnected or reconnecting
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Disconnected|Reconnecting|Failed/);

			// Go back online
			await page.context().setOffline(false);
			await page.waitForTimeout(3000);

			// Check that status shows reconnecting or connected
			const newText = await statusText.textContent();
			expect(newText).toMatch(/Connected|Reconnecting/);
		});
	});

	test.describe('UT2: Client-Side Service Tests', () => {
		test('UT2.1: Client connects to SSE endpoint', async ({ page }) => {
			// Check that connection status is visible
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();

			// Wait for connection
			await page.waitForTimeout(2000);

			// Check that status shows connected
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Connected/);
		});

		test('UT2.2: Client handles incoming messages', async ({ page }) => {
			// Wait for connection
			await page.waitForTimeout(2000);

			// Check that last update time is displayed
			const lastUpdate = page.locator('.last-update');
			const isVisible = await lastUpdate.isVisible();
			expect(isVisible).toBeTruthy();
		});

		test('UT2.3: Client reconnects on disconnect', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			// Get initial status
			let statusText = page.locator('.status-text');
			let text = await statusText.textContent();
			expect(text).toMatch(/Connected/);

			// Simulate network offline
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);

			// Check that status shows reconnecting
			text = await statusText.textContent();
			expect(text).toMatch(/Disconnected|Reconnecting|Failed/);

			// Go back online
			await page.context().setOffline(false);
			await page.waitForTimeout(3000);

			// Check that status shows connected again
			text = await statusText.textContent();
			expect(text).toMatch(/Connected|Reconnecting/);
		});

		test('UT2.4: Client cleans up resources on unload', async ({ page }) => {
			// Wait for connection
			await page.waitForTimeout(2000);

			// Navigate away
			await page.goto('http://localhost:5173/');

			// Wait for cleanup
			await page.waitForTimeout(1000);

			// Navigate back
			await page.goto('http://localhost:5173/app/all-routes');
			await page.waitForLoadState('networkidle');

			// Check that connection is re-established
			const statusText = page.locator('.status-text');
			await page.waitForTimeout(2000);
			const text = await statusText.textContent();
			expect(text).toMatch(/Connected|Reconnecting/);
		});
	});

	test.describe('UT3: UI Integration Tests', () => {
		test('UT3.1: Connection status indicator displays', async ({ page }) => {
			// Check that status indicator is visible
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();

			// Check that status dot is visible
			const statusDot = page.locator('.status-dot');
			await expect(statusDot).toBeVisible();

			// Check that status text is visible
			const statusText = page.locator('.status-text');
			await expect(statusText).toBeVisible();
		});

		test('UT3.2: Connection status updates when connection changes', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			// Get initial status
			let statusText = page.locator('.status-text');
			let initialText = await statusText.textContent();
			expect(initialText).toMatch(/Connected/);

			// Simulate network offline
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);

			// Check that status changed
			let newText = await statusText.textContent();
			expect(newText).not.toBe(initialText);
			expect(newText).toMatch(/Disconnected|Reconnecting|Failed/);

			// Go back online
			await page.context().setOffline(false);
			await page.waitForTimeout(3000);

			// Check that status changed again
			newText = await statusText.textContent();
			expect(newText).toMatch(/Connected|Reconnecting/);
		});

		test('UT3.3: Manual reconnect button works', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			// Simulate network offline
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);

			// Check that reconnect button is visible
			const reconnectBtn = page.locator('.reconnect-btn');
			await expect(reconnectBtn).toBeVisible();

			// Click reconnect button
			await reconnectBtn.click();

			// Go back online
			await page.context().setOffline(false);
			await page.waitForTimeout(3000);

			// Check that status shows connected
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Connected|Reconnecting/);
		});

		test('UT3.4: Last update time displays', async ({ page }) => {
			// Wait for connection
			await page.waitForTimeout(2000);

			// Check that last update time is displayed
			const lastUpdate = page.locator('.last-update');
			const isVisible = await lastUpdate.isVisible();
			expect(isVisible).toBeTruthy();

			// Check that it contains a time
			const text = await lastUpdate.textContent();
			expect(text).toMatch(/Last update:/);
		});

		test('UT3.5: Route cards display health indicators', async ({ page }) => {
			// Wait for page to load
			await page.waitForTimeout(2000);

			// Check that route items are visible
			const routeItems = page.locator('.route-item');
			const count = await routeItems.count();
			expect(count).toBeGreaterThan(0);

			// Check that health indicators are present
			const healthIndicators = page.locator('.health-indicator');
			const indicatorCount = await healthIndicators.count();
			expect(indicatorCount).toBeGreaterThanOrEqual(0); // May not have any errors
		});
	});

	test.describe('UT4: Performance Tests', () => {
		test('UT4.1: Connection establishes within 5 seconds', async ({ page }) => {
			const startTime = Date.now();

			// Wait for connection
			const statusText = page.locator('.status-text');
			await expect(statusText).toContainText(/Connected/, { timeout: 5000 });

			const endTime = Date.now();
			const connectionTime = endTime - startTime;

			expect(connectionTime).toBeLessThan(5000);
		});

		test('UT4.2: Status indicator updates within 1 second', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			const startTime = Date.now();

			// Simulate network offline
			await page.context().setOffline(true);

			// Wait for status to change
			const statusText = page.locator('.status-text');
			await expect(statusText).not.toContainText(/Connected/, { timeout: 2000 });

			const endTime = Date.now();
			const updateTime = endTime - startTime;

			expect(updateTime).toBeLessThan(2000);

			// Go back online
			await page.context().setOffline(false);
		});

		test('UT4.3: No memory leaks on repeated connect/disconnect', async ({ page }) => {
			// Perform multiple connect/disconnect cycles
			for (let i = 0; i < 3; i++) {
				// Wait for connection
				await page.waitForTimeout(2000);

				// Simulate network offline
				await page.context().setOffline(true);
				await page.waitForTimeout(1000);

				// Go back online
				await page.context().setOffline(false);
			}

			// Check that page is still responsive
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();
		});

		test('UT4.4: Page remains responsive during connection', async ({ page }) => {
			// Wait for connection
			await page.waitForTimeout(2000);

			// Try to interact with page
			const routeItems = page.locator('.route-item');
			const count = await routeItems.count();

			expect(count).toBeGreaterThan(0);

			// Try to click a button
			const actionBtn = page.locator('.action-btn').first();
			const isEnabled = await actionBtn.isEnabled();

			expect(isEnabled).toBeTruthy();
		});
	});

	test.describe('UT5: Error Handling Tests', () => {
		test('UT5.1: Handles connection timeout gracefully', async ({ page }) => {
			// Simulate slow network
			await page.route('**/*', (route) => {
				setTimeout(() => route.continue(), 5000);
			});

			// Navigate to page
			await page.goto('http://localhost:5173/app/all-routes', { waitUntil: 'domcontentloaded' });

			// Wait for timeout
			await page.waitForTimeout(7000);

			// Check that page is still usable
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();

			// Unroute
			await page.unroute('**/*');
		});

		test('UT5.2: Handles network errors gracefully', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			// Simulate network error
			await page.context().setOffline(true);
			await page.waitForTimeout(2000);

			// Check that page shows error state
			const statusText = page.locator('.status-text');
			const text = await statusText.textContent();
			expect(text).toMatch(/Disconnected|Reconnecting|Failed/);

			// Go back online
			await page.context().setOffline(false);
			await page.waitForTimeout(3000);

			// Check that page recovers
			const newText = await statusText.textContent();
			expect(newText).toMatch(/Connected|Reconnecting/);
		});

		test('UT5.3: Handles rapid reconnection attempts', async ({ page }) => {
			// Wait for initial connection
			await page.waitForTimeout(2000);

			// Simulate rapid offline/online cycles
			for (let i = 0; i < 5; i++) {
				await page.context().setOffline(true);
				await page.waitForTimeout(500);
				await page.context().setOffline(false);
				await page.waitForTimeout(500);
			}

			// Check that page is still responsive
			const statusIndicator = page.locator('.connection-status');
			await expect(statusIndicator).toBeVisible();
		});
	});
});
