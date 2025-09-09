import { test, expect } from '@playwright/test';

test.describe('Authenticated API Endpoints', () => {
  // Test data - we have a test user with session
  const TEST_USER = {
    email: 'test@example.com',
    sessionId: 'test_session_123',
    userId: '1ebbbeb1-baed-4c9f-a7d5-7367cf167c57'
  };

  test('persons-of-interest API requires authentication', async ({ request }) => {
    // Test without authentication - should fail
    const response = await request.get('/api/v1/persons-of-interest');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  test('persons-of-interest API works with valid session', async ({ request, baseURL }) => {
    // Test with valid session cookie
    const response = await request.get('/api/v1/persons-of-interest', {
      headers: {
        'Cookie': `legal_ai_session=${TEST_USER.sessionId}`
      }
    });
    
    // Should succeed with authentication
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.pagination).toBeDefined();
    expect(data.meta.userId).toBe(TEST_USER.userId);
  });

  test('can create person of interest with authentication', async ({ request }) => {
    const newPerson = {
      name: 'Test Person',
      threatLevel: 'medium',
      status: 'active',
      aliases: ['Test Alias'],
      tags: ['playwright-test'],
      profileData: { age: 30 }
    };

    const response = await request.post('/api/v1/persons-of-interest', {
      headers: {
        'Cookie': `legal_ai_session=${TEST_USER.sessionId}`,
        'Content-Type': 'application/json'
      },
      data: newPerson
    });

    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(newPerson.name);
    expect(data.data.threatLevel).toBe(newPerson.threatLevel);
    expect(data.meta.userId).toBe(TEST_USER.userId);
  });

  test('can list persons of interest with filters', async ({ request }) => {
    // Test with threat level filter
    const response = await request.get('/api/v1/persons-of-interest?riskLevel=medium&page=1&limit=10', {
      headers: {
        'Cookie': `legal_ai_session=${TEST_USER.sessionId}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
    expect(data.meta.riskLevel).toBe('medium');
  });

  test('frontend persons-of-interest page loads with authentication', async ({ page, context }) => {
    // Set the session cookie
    await context.addCookies([{
      name: 'legal_ai_session',
      value: TEST_USER.sessionId,
      domain: 'localhost',
      path: '/'
    }]);

    // Navigate to persons of interest page
    await page.goto('/persons-of-interest');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Persons of Interest');
    
    // Check if statistics cards are present
    await expect(page.locator('[data-testid="total-persons"]')).toBeVisible();
    
    // Check if search functionality is present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('homepage Person Tracking button navigates correctly', async ({ page, context }) => {
    // Set the session cookie
    await context.addCookies([{
      name: 'legal_ai_session', 
      value: TEST_USER.sessionId,
      domain: 'localhost',
      path: '/'
    }]);

    // Navigate to homepage
    await page.goto('/');
    
    // Click Person Tracking button
    await page.click('text="Person Tracking"');
    
    // Should navigate to persons-of-interest page
    await expect(page).toHaveURL('/persons-of-interest');
    await expect(page.locator('h1')).toContainText('Persons of Interest');
  });
});