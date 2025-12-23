import { expect, test } from '@playwright/test';

test.describe('User Store Migration (Svelte 5)', () => {
  test('should load user session and update reactivity', async ({ page }) => {
    // 1. Mock the API response
    await page.route('/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            avatarUrl: null
          },
          session: {
            id: 'session-123',
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        })
      });
    });

    // 2. Navigate to the test page
    await page.goto('/test-user-store');

    // 3. Verify initial state
    await expect(page.getByTestId('auth-status')).toContainText('Authenticated: false');
    await expect(page.getByTestId('user-name')).toContainText('Name: Guest');

    // 4. Perform Login
    await page.getByTestId('login-btn').click();

    // 5. Verify authenticated state
    await expect(page.getByTestId('auth-status')).toContainText('Authenticated: true');
    await expect(page.getByTestId('user-name')).toContainText('Name: Test User');

    // 6. Perform Logout
    await page.getByTestId('logout-btn').click();

    // 7. Verify logout state
    await expect(page.getByTestId('auth-status')).toContainText('Authenticated: false');
    await expect(page.getByTestId('user-name')).toContainText('Name: Guest');
  });
});
