import { chromium } from 'playwright';

async function testAIChat() {
  console.log('🤖 Testing AI Chat Functionality...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test TensorRT Bridge Health
    console.log('🔧 Testing TensorRT Bridge...');
    const healthCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8086/health');
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('🏥 TensorRT Bridge Health:', healthCheck);

    // Test AI generation directly
    console.log('🧠 Testing AI Generation...');
    const aiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8086/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma3:270m',
            prompt: 'What is contract law?',
            stream: false
          })
        });
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('🎯 AI Response:', aiTest);

    // Navigate to AI chat page
    console.log('📱 Testing AI Chat Interface...');
    await page.goto('http://localhost:5173/ai-chat');
    await page.waitForTimeout(3000);

    // Try to interact with chat
    try {
      // Look for input field
      const inputSelector = 'input[type="text"], textarea, [contenteditable]';
      await page.waitForSelector(inputSelector, { timeout: 5000 });

      // Type a message
      await page.fill(inputSelector, 'Hello, can you help me with legal questions?');

      // Look for send button
      const sendButton = await page.locator('button:has-text("Send"), button[type="submit"], .send-button').first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Chat message sent successfully');
      }
    } catch (error) {
      console.log('⚠️ Chat interaction failed:', error.message);
    }

    // Create test results page
    await page.goto('about:blank');
    await page.setContent(`
      <html>
        <head><title>AI Chat Test Results</title></head>
        <body style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 20px;">
          <h1>🤖 AI Chat Functionality Test</h1>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🔧 TensorRT Bridge Status</h3>
            <pre>${JSON.stringify(healthCheck, null, 2)}</pre>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🧠 AI Generation Test</h3>
            <pre>${JSON.stringify(aiTest, null, 2)}</pre>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>📍 Chat Interface Location</h3>
            <p>• URL: <code>http://localhost:5173/ai-chat</code></p>
            <p>• TensorRT Bridge: <code>http://localhost:8086</code></p>
            <p>• Models Available: gemma3-legal:latest, gemma3:270m</p>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🎯 How to Use Chat</h3>
            <p>1. Navigate to: <strong>http://localhost:5173/ai-chat</strong></p>
            <p>2. Type your legal question in the input field</p>
            <p>3. Click Send or press Enter</p>
            <p>4. AI will respond using TensorRT-accelerated models</p>
            <p>5. Small queries → gemma3:270m (fast)</p>
            <p>6. Complex legal queries → gemma3-legal:latest (powerful)</p>
          </div>
        </body>
      </html>
    `);

    await page.screenshot({ path: 'ai-chat-test.png', fullPage: true });
    console.log('📸 AI chat test screenshot saved');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testAIChat().catch(console.error);