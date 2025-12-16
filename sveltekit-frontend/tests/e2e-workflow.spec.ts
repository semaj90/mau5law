import { expect, test } from '@playwright/test';

test.describe('End-to-End Workflow Tests', () => {
  test('complete POI management workflow', async ({ page }) => {
    // 1. Navigate to POI Manager
    await page.goto('/poi-manager');
    await page.waitForLoadState('networkidle');

    // 2. Create a new POI
    await page.getByRole('button', { name: 'Create POI' }).click();
    await expect(page.getByText('Create New POI')).toBeVisible();

    // Fill out comprehensive POI data
    await page.getByLabel('Name').fill('Jane Smith');
    await page.getByLabel('Date of Birth').fill('1980-05-15');
    await page.getByLabel('Address').fill('789 Oak Avenue, Springfield, IL');
    await page.getByLabel('Phone').fill('(555) 987-6543');
    await page.getByLabel('Email').fill('jane.smith@example.com');
    await page.getByLabel('Status').selectOption('suspect');
    await page.getByLabel('Priority').selectOption('critical');
    await page.getByLabel('Threat Level').selectOption('extreme');
    await page.getByLabel('Last Known Location').fill('Springfield Downtown');
    await page.getByLabel('Last Seen').fill('2024-12-10');
    await page.getByLabel('Danger Level').fill('9');

    // Physical description
    await page.getByLabel('Height').fill("5'6\"");
    await page.getByLabel('Weight').fill('140 lbs');
    await page.getByLabel('Hair').fill('Blonde, long');
    await page.getByLabel('Eyes').fill('Green');
    await page.getByLabel('Distinguishing Marks').fill('Scar on right cheek');

    // Profile data
    await page.getByLabel('Modus Operandi').fill('Cyber fraud targeting elderly victims');
    await page.getByLabel('Known Habits').fill('Online shopping, social media');
    await page.getByLabel('Associates').fill('John Doe, Bob Wilson');

    // Submit
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Verify creation success
    await expect(page.getByText(/POI created successfully|Jane Smith/)).toBeVisible();

    // 3. Search for the created POI
    await page.getByPlaceholder('Search POIs...').fill('Jane Smith');
    await expect(page.locator('.poi-card').filter({ hasText: 'Jane Smith' })).toBeVisible();

    // 4. Edit the POI
    const poiCard = page.locator('.poi-card').filter({ hasText: 'Jane Smith' });
    await poiCard.getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByText('Edit POI')).toBeVisible();

    // Update some information
    await page.getByLabel('Address').fill('1001 Pine Street, Springfield, IL');
    await page.getByLabel('Priority').selectOption('high');

    await page.getByRole('button', { name: 'Update POI' }).click();

    // Verify update
    await expect(page.getByText('POI updated successfully')).toBeVisible();

    // 5. Navigate to all-routes page
    await page.goto('/all-routes');
    await page.waitForLoadState('networkidle');

    // 6. Test ErrorBrainModal integration
    const firstRoute = page.locator('.route-item').first();
    await firstRoute.getByRole('button', { name: '🧠 Analyze' }).click();

    // Verify modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Error Brain Analysis')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 7. Test route navigation
    await firstRoute.getByRole('button', { name: '→ Visit' }).click();

    // Verify navigation occurred
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toBe('http://localhost:5173/all-routes');
  });

  test('error handling and recovery workflow', async ({ page }) => {
    // Test form validation
    await page.goto('/poi-manager');
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Should show validation errors
    await expect(page.getByText(/required|Name is required/i)).toBeVisible();

    // Fill required field and test partial submission
    await page.getByLabel('Name').fill('Test POI');
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Should succeed with minimal data
    await expect(page.getByText(/created successfully|Test POI/i)).toBeVisible();
  });

  test('data persistence across page reloads', async ({ page }) => {
    // Create a POI
    await page.goto('/poi-manager');
    await page.getByRole('button', { name: 'Create POI' }).click();

    await page.getByLabel('Name').fill('Persistence Test POI');
    await page.getByRole('button', { name: 'Create POI' }).click();

    await expect(page.getByText(/created successfully|Persistence Test POI/i)).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // POI should still be visible
    await expect(page.locator('.poi-card').filter({ hasText: 'Persistence Test POI' })).toBeVisible();
  });

  test('concurrent user actions', async ({ page, context }) => {
    // Open multiple tabs/pages
    const page2 = await context.newPage();

    // Both pages navigate to POI manager
    await page.goto('/poi-manager');
    await page2.goto('/poi-manager');

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Both create POIs simultaneously
    await page.getByRole('button', { name: 'Create POI' }).click();
    await page2.getByRole('button', { name: 'Create POI' }).click();

    await page.getByLabel('Name').fill('Concurrent POI 1');
    await page2.getByLabel('Name').fill('Concurrent POI 2');

    await page.getByRole('button', { name: 'Create POI' }).click();
    await page2.getByRole('button', { name: 'Create POI' }).click();

    // Both should succeed
    await expect(page.getByText(/created successfully|Concurrent POI 1/i)).toBeVisible();
    await expect(page2.getByText(/created successfully|Concurrent POI 2/i)).toBeVisible();

    await page2.close();
  });

  test('accessibility compliance', async ({ page }) => {
    await page.goto('/poi-manager');

    // Check for proper ARIA labels and roles
    await page.getByRole('button', { name: 'Create POI' }).click();

    // All form fields should have labels
    const requiredLabels = ['Name', 'Date of Birth', 'Address', 'Phone', 'Email'];
    for (const label of requiredLabels) {
      await expect(page.getByLabel(label)).toBeVisible();
    }

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Name')).toBeFocused();

    // Fill form with keyboard
    await page.keyboard.type('Accessibility Test POI');
    await page.keyboard.press('Tab');
    await page.keyboard.type('1990-01-01');

    // Submit with Enter
    await page.getByRole('button', { name: 'Create POI' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/created successfully|Accessibility Test POI/i)).toBeVisible();
  });
});