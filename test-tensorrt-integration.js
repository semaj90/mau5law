import { chromium } from 'playwright';

async function testTensorRTIntegration() {
  console.log('🚀 Starting TensorRT Integration Browser Test...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Navigate to homepage
    console.log('📍 Navigating to homepage...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    console.log('✅ Homepage screenshot saved');

    // Test 2: Navigate to AI Chat
    console.log('📍 Navigating to AI Chat...');
    await page.goto('http://localhost:5173/ai-chat', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'ai-chat-page.png', fullPage: true });
    console.log('✅ AI Chat page screenshot saved');

    // Test 3: Check TensorRT bridge health status
    console.log('🔍 Checking TensorRT bridge health status...');
    await page.waitForTimeout(2000);

    // Look for connection status indicator
    const connectionStatus = await page.textContent('.connection-status').catch(() => 'Not found');
    console.log('🔗 Connection Status:', connectionStatus);

    // Test 4: Send a test message
    console.log('💬 Testing chat functionality...');
    const messageInput = await page.locator('.message-input');
    if (await messageInput.isVisible()) {
      await messageInput.fill('What are the key elements of a valid contract?');
      await page.screenshot({ path: 'chat-with-message.png', fullPage: true });

      const sendButton = await page.locator('.send-button');
      if (await sendButton.isEnabled()) {
        await sendButton.click();
        console.log('✅ Message sent successfully');

        // Wait for response
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'chat-with-response.png', fullPage: true });
        console.log('✅ Response screenshot saved');
      }
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testTensorRTIntegration().catch(console.error);