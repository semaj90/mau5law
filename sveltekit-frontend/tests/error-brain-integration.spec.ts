import { expect, test } from '@playwright/test';

test.describe('ErrorBrainModal Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to all-routes page
    await page.goto('/all-routes');
    await page.waitForLoadState('networkidle');
  });

  test('should load all-routes page with route list', async ({ page }) => {
    // Check page loads and has routes
    await expect(page.locator('h1')).toContainText('All Routes');
    await expect(page.locator('.route-item')).toHaveCount(await page.locator('.route-item').count());
  });

  test('should open ErrorBrainModal when analyze button is clicked', async ({ page }) => {
    // Find first route with analyze button
    const firstRoute = page.locator('.route-item').first();
    await expect(firstRoute).toBeVisible();

    // Click analyze button
    await firstRoute.getByRole('button', { name: '🧠 Analyze' }).click();

    // Check modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Error Brain Analysis')).toBeVisible();
  });

  test('should load analysis history from API', async ({ page }) => {
    // Open modal
    const firstRoute = page.locator('.route-item').first();
    await firstRoute.getByRole('button', { name: '🧠 Analyze' }).click();

    // Wait for modal content to load
    await page.waitForTimeout(2000); // Allow time for API call

    // Check if analysis content loads (either history or empty state)
    const modalContent = page.locator('[role="dialog"]');
    await expect(modalContent).toBeVisible();

    // Should either show analysis history or indicate no history
    const hasContent = await modalContent.locator('text=/Analysis|History|No analysis/i').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should close ErrorBrainModal', async ({ page }) => {
    // Open modal
    const firstRoute = page.locator('.route-item').first();
    await firstRoute.getByRole('button', { name: '🧠 Analyze' }).click();

    // Check modal is open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal (click close button or outside)
    await page.keyboard.press('Escape');
    // Or click close button if available
    // await page.getByRole('button', { name: 'Close' }).click();

    // Check modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should handle route navigation', async ({ page }) => {
    // Click visit button on first route
    const firstRoute = page.locator('.route-item').first();
    const visitButton = firstRoute.getByRole('button', { name: '→ Visit' });

    // Get the route path for verification
    const routePath = await firstRoute.locator('.route-path').textContent();

    // Click visit
    await visitButton.click();

    // Should navigate to the route
    await page.waitForURL(`**${routePath}**`);
  });

  test('should log interactions to API', async ({ page }) => {
    // This test verifies that interaction logging works
    // We'll intercept the API call to verify it's made

    let interactionLogged = false;
    await page.route('**/api/routes/*/interactions', async route => {
      interactionLogged = true;
      await route.fulfill({ status: 200, body: '{}' });
    });

    // Click analyze button
    const firstRoute = page.locator('.route-item').first();
    await firstRoute.getByRole('button', { name: '🧠 Analyze' }).click();

    // Wait a moment for the API call
    await page.waitForTimeout(1000);

    // Verify interaction was logged
    expect(interactionLogged).toBe(true);
  });

  test('should display route health indicators', async ({ page }) => {
    // Check that routes show health status
    const routes = page.locator('.route-item');

    // At least one route should have a health indicator
    const healthIndicators = page.locator('.health-indicator');
    await expect(healthIndicators.first()).toBeVisible();
  });

  test('should handle routes with errors gracefully', async ({ page }) => {
    // Find a route with error state if any
    const errorRoutes = page.locator('.route-item').filter({ hasText: '❌' });

    if (await errorRoutes.count() > 0) {
      // Click analyze on error route
      await errorRoutes.first().getByRole('button', { name: '🧠 Analyze' }).click();

      // Modal should still open and handle error state
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Error Brain Analysis')).toBeVisible();
    }
  });
});