import { expect, test } from '@playwright/test';

test('Legal AI: Optimistic UI & Streaming Response', async ({ page }) => {
  // --- 1. SETUP MOCKS (Simulate Backend) ---

  // Mock the POST Action (RPC trigger)
  // We intercept the SvelteKit Form Action to return a success immediately
  await page.route('**/chat?/send', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Return a valid SvelteKit action result structure
      body: JSON.stringify({
        type: 'success',
        status: 200,
        data: JSON.stringify({ success: true })
      })
    });
  });

  // Mock the SSE Stream (The "Live Stream")
  // We simulate the AI "thinking" for 1 second, then sending a reply
  await page.route('**/api/stream/*', async route => {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // The data payload matching your Redis Pub/Sub format
    const aiResponse = JSON.stringify({
      type: 'DONE',
      text: 'Based on the liability clause context, the risk is minimal.'
    });

    await route.fulfill({
      status: 200,
      headers,
      body: `data: ${aiResponse}\n\n`
    });
  });

  // --- 2. EXECUTE USER FLOW ---

  // Go to the chat page (Adjust URL if needed)
  await page.goto('/chat');

  // Verify UI is ready
  await expect(page.locator('.chat-window')).toBeVisible();

  // Type a message
  const input = page.locator('input[name="message"]');
  await input.fill('Summarize the liability risks in this contract.');

  // Click Send
  await page.locator('button', { hasText: 'Send' }).click();

  // --- 3. VERIFY OPTIMISTIC UI (Immediate Feedback) ---

  // The user message should appear IMMEDIATELY thanks to Svelte 5 Runes
  const lastUserMsg = page.locator('.msg.user').last();
  await expect(lastUserMsg).toContainText('Summarize the liability risks');

  // The "Thinking" indicator should be visible
  await expect(page.locator('.loading')).toBeVisible();

  // --- 4. VERIFY AI RESPONSE (Reactive Update) ---

  // Wait for our Mocked SSE to deliver the payload
  const aiMsg = page.locator('.msg.assistant').last();
  await expect(aiMsg).toContainText('Based on the liability clause context');

  // Verify "Thinking" is gone
  await expect(page.locator('.loading')).toBeHidden();

  // --- 5. TAKE THE PHOTO ---
  console.log('📸 Taking screenshot of the evidence...');
  await page.screenshot({ path: 'legal-ai-evidence.png', fullPage: true });
});
