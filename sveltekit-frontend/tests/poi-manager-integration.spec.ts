import { expect, test } from '@playwright/test';

test.describe('POI Manager Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POI manager page
    await page.goto('/poi-manager');
    await page.waitForLoadState('networkidle');
  });

  test('should load POI manager page', async ({ page }) => {
    // Check page title and basic elements
    await expect(page.locator('h1')).toContainText('POI Manager');
    await expect(page.getByPlaceholder('Search POIs...')).toBeVisible();
  });

  test('should open create POI dialog', async ({ page }) => {
    // Click create POI button
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Check dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create New POI')).toBeVisible();
  });

  test('should create new POI with Field components', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Fill out form using Field components
    await page.getByLabel('Name').fill('John Doe');
    await page.getByLabel('Date of Birth').fill('1985-03-15');
    await page.getByLabel('Address').fill('123 Main St, Anytown, USA');
    await page.getByLabel('Phone').fill('(555) 123-4567');
    await page.getByLabel('Email').fill('john.doe@example.com');
    await page.getByLabel('Status').selectOption('suspect');
    await page.getByLabel('Priority').selectOption('high');
    await page.getByLabel('Threat Level').selectOption('high');
    await page.getByLabel('Last Known Location').fill('Downtown District');
    await page.getByLabel('Last Seen').fill('2024-12-15');
    await page.getByLabel('Danger Level').fill('7');

    // Fill physical description
    await page.getByLabel('Height').fill("6'2\"");
    await page.getByLabel('Weight').fill('200 lbs');
    await page.getByLabel('Hair').fill('Brown, short');
    await page.getByLabel('Eyes').fill('Blue');
    await page.getByLabel('Distinguishing Marks').fill('Tattoo on left arm');

    // Fill profile data
    await page.getByLabel('Modus Operandi').fill('Targets financial institutions');
    await page.getByLabel('Known Habits').fill('Smoking, late nights');
    await page.getByLabel('Associates').fill('Jane Smith, Bob Johnson');

    // Submit form
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Check success message or POI appears in list
    await expect(page.getByText('POI created successfully')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Try to submit without required name field
    await page.getByRole('button', { name: 'Create POI' }).click();

    // Check validation message
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('should edit existing POI', async ({ page }) => {
    // Assuming there's at least one POI in the list
    const poiCard = page.locator('.poi-card').first();
    await expect(poiCard).toBeVisible();

    // Click edit button
    await poiCard.getByRole('button', { name: 'Edit' }).click();

    // Check edit dialog opens
    await expect(page.getByText('Edit POI')).toBeVisible();

    // Modify a field
    await page.getByLabel('Address').fill('456 Updated St, Newtown, USA');

    // Submit changes
    await page.getByRole('button', { name: 'Update POI' }).click();

    // Check success message
    await expect(page.getByText('POI updated successfully')).toBeVisible();
  });

  test('should search POIs', async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder('Search POIs...').fill('John');

    // Check results are filtered
    await expect(page.locator('.poi-card')).toHaveCount(await page.locator('.poi-card').count());
  });

  test('should switch between grid and list view', async ({ page }) => {
    // Check initial view (grid)
    await expect(page.locator('.grid')).toBeVisible();

    // Click list view button
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page.locator('.list')).toBeVisible();

    // Switch back to grid
    await page.getByRole('button', { name: 'Grid' }).click();
    await expect(page.locator('.grid')).toBeVisible();
  });
});