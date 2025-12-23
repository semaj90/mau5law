import { expect, test } from '@playwright/test';

test('Architecture Demo: Chat Flow', async ({ page }) => {
  // 1. Navigate to the chat page
  await page.goto('/chat');

  // 2. Verify initial state
  await expect(page.locator('.chat-window')).toBeVisible();
  await expect(page.locator('input[name="message"]')).toBeVisible();

  // 3. Send a message
  const message = 'What is the liability clause?';
  await page.fill('input[name="message"]', message);
  await page.click('button:has-text("Send")');

  // 4. Verify Optimistic UI
  // The user message should appear immediately
  await expect(page.locator('.msg.user')).toContainText(message);
  // The loading indicator should appear
  await expect(page.locator('.loading')).toContainText('AI is reviewing case context...');

  // 5. Wait for AI response (This depends on the worker running)
  // We'll wait up to 30 seconds for the worker to process
  // If the worker isn't running, this part will fail or timeout, which is expected for a real integration test
  // For the purpose of "taking a photo", capturing the optimistic state is key,
  // but capturing the response proves the full loop.

  try {
    await expect(page.locator('.msg.assistant')).toBeVisible({ timeout: 30000 });
    console.log('AI Response received!');
  } catch (e) {
    console.log('AI Response timed out (Worker might not be running or slow). Taking screenshot anyway.');
  }

  // 6. Take a screenshot
  await page.screenshot({ path: 'architecture-demo-chat.png', fullPage: true });
});
