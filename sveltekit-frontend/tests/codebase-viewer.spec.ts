import { expect, test } from '@playwright/test';

test.describe('Codebase Viewer Admin UI', () => {
	test('should load and screenshot codebase viewer', async ({ page }) => {
		// Navigate to the codebase viewer
		await page.goto('http://localhost:5175/admin/codebase-viewer');

		// Wait for the page to load
		await page.waitForSelector('.codebase-viewer', { timeout: 10000 });

		// Wait for stats to load
		await page.waitForSelector('.stats-grid', { timeout: 5000 });

		// Take full page screenshot
		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-full.png',
			fullPage: true
		});

		// Verify main elements are present
		await expect(page.locator('h1')).toContainText('Codebase Viewer');
		await expect(page.locator('.stats-grid')).toBeVisible();
		await expect(page.locator('.view-tabs')).toBeVisible();

		// Test Qdrant Collections tab
		await page.click('button:has-text("Qdrant Collections")');
		await page.waitForSelector('.collections-grid');
		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-qdrant.png',
			fullPage: true
		});

		// Test PostgreSQL Embeddings tab
		await page.click('button:has-text("PostgreSQL Embeddings")');
		await page.waitForSelector('.embeddings-table', { timeout: 5000 });
		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-postgres.png',
			fullPage: true
		});

		// Test search functionality
		await page.fill('.search-input', 'accessibility');
		await page.waitForTimeout(500); // Wait for filter
		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-search.png',
			fullPage: true
		});

		// Test Timeline tab
		await page.click('button:has-text("File Timeline")');
		await page.waitForSelector('.timeline-view', { timeout: 5000 });
		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-timeline.png',
			fullPage: true
		});

		console.log('✅ All screenshots saved to reports/screenshots/');
	});

	test('should display correct stats', async ({ page }) => {
		await page.goto('http://localhost:5175/admin/codebase-viewer');
		await page.waitForSelector('.stats-grid');

		// Check that stat cards exist and have values
		const statCards = page.locator('.stat-card');
		await expect(statCards).toHaveCount(4);

		// Verify stat labels
		await expect(page.locator('.stat-label')).toContainText(['Qdrant Vectors', 'Indexed Files', 'Total Errors', 'Embedding Coverage']);
	});

	test('should allow collection selection', async ({ page }) => {
		await page.goto('http://localhost:5175/admin/codebase-viewer');
		await page.waitForSelector('.collections-grid');

		// Click first collection card
		const firstCollection = page.locator('.collection-card').first();
		await firstCollection.click();

		// Verify it's selected
		await expect(firstCollection).toHaveClass(/selected/);

		await page.screenshot({
			path: 'reports/screenshots/codebase-viewer-collection-selected.png',
			fullPage: true
		});
	});
});
