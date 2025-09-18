import { chromium } from 'playwright';

async function locateAIChat() {
  console.log('🔍 Locating AI Chat Interface...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to homepage
    console.log('🏠 1. Navigating to homepage...');
    await page.goto('http://127.0.0.1:5173');
    await page.waitForTimeout(3000);

    // Step 2: Look for AI chat navigation
    console.log('🔍 2. Looking for AI chat navigation...');

    // Try to find AI chat link/button on homepage
    const aiChatLinks = await page.locator('a:has-text("AI"), a:has-text("Chat"), a:has-text("Assistant"), [href*="ai-chat"], [href*="chat"]').all();

    if (aiChatLinks.length > 0) {
      console.log(`✅ Found ${aiChatLinks.length} potential AI chat links`);
      await aiChatLinks[0].click();
      await page.waitForTimeout(2000);
    } else {
      // Step 3: Navigate directly to ai-chat route
      console.log('🎯 3. Navigating directly to /ai-chat...');
      await page.goto('http://127.0.0.1:5173/ai-chat');
      await page.waitForTimeout(3000);
    }

    // Step 4: Analyze the page structure
    console.log('📋 4. Analyzing AI chat page structure...');

    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page Title: ${pageTitle}`);

    // Look for common chat interface elements
    const chatElements = {
      'Input Field': await page.locator('input[type="text"], textarea, [contenteditable="true"]').count(),
      'Send Button': await page.locator('button:has-text("Send"), button[type="submit"], .send-button, .submit-button').count(),
      'Message Container': await page.locator('.message, .chat-message, .conversation, .messages').count(),
      'Chat Container': await page.locator('.chat, .chat-container, .ai-chat, .conversation-container').count(),
      'AI Elements': await page.locator('[class*="ai"], [class*="assistant"], [class*="bot"]').count()
    };

    console.log('🔧 Chat interface elements found:');
    for (const [element, count] of Object.entries(chatElements)) {
      console.log(`   • ${element}: ${count}`);
    }

    // Step 5: Try to interact if possible
    console.log('🤝 5. Testing interaction...');

    try {
      const inputField = page.locator('input[type="text"], textarea, [contenteditable="true"]').first();
      if (await inputField.isVisible()) {
        await inputField.fill('Hello AI assistant, can you help with legal questions?');
        console.log('✅ Successfully entered test message');

        const sendButton = page.locator('button:has-text("Send"), button[type="submit"], .send-button').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
          console.log('✅ Send button clicked');
          await page.waitForTimeout(2000);
        }
      }
    } catch (error) {
      console.log('⚠️  Interaction test failed:', error.message);
    }

    // Step 6: Create comprehensive results page
    await page.goto('about:blank');
    await page.setContent(`
      <html>
        <head><title>AI Chat Interface Location Guide</title></head>
        <body style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 20px;">
          <h1>🤖 AI Chat Interface - Location Guide</h1>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>📍 Direct Access URL</h3>
            <p><strong>AI Chat URL:</strong> <code style="color: #ffff00;">http://127.0.0.1:5173/ai-chat</code></p>
            <p><strong>Current Status:</strong> ${currentUrl.includes('ai-chat') ? '✅ FOUND' : '❌ NOT FOUND'}</p>
            <p><strong>Page Title:</strong> ${pageTitle}</p>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🔧 Interface Elements Detected</h3>
            ${Object.entries(chatElements).map(([element, count]) =>
              `<p>• <strong>${element}:</strong> ${count} ${count > 0 ? '✅' : '❌'}</p>`
            ).join('')}
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🎯 How to Access AI Chat</h3>
            <ol>
              <li><strong>Direct Link:</strong> Click <a href="http://127.0.0.1:5173/ai-chat" style="color: #ffff00;">http://127.0.0.1:5173/ai-chat</a></li>
              <li><strong>From Homepage:</strong> Go to <a href="http://127.0.0.1:5173" style="color: #ffff00;">http://127.0.0.1:5173</a> and look for AI/Chat links</li>
              <li><strong>Navigation:</strong> Look for menu items with "AI", "Chat", or "Assistant"</li>
            </ol>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>⚡ TensorRT Backend Integration</h3>
            <p>• <strong>TensorRT Bridge:</strong> http://localhost:8086</p>
            <p>• <strong>Smart Model Routing:</strong>
              <br>&nbsp;&nbsp;→ Quick queries: gemma3:270m
              <br>&nbsp;&nbsp;→ Complex legal: gemma3-legal:latest
            </p>
            <p>• <strong>GPU Acceleration:</strong> RTX 3060 Ti (2-10x speedup)</p>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>💬 Usage Instructions</h3>
            <p>1. Open the AI chat interface at the URL above</p>
            <p>2. Type your legal question in the input field</p>
            <p>3. Press Enter or click Send</p>
            <p>4. AI will respond using TensorRT-accelerated models</p>
            <p>5. Conversation history is maintained during session</p>
          </div>
        </body>
      </html>
    `);

    await page.screenshot({ path: 'ai-chat-location-guide.png', fullPage: true });
    console.log('📸 AI chat location guide screenshot saved');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

locateAIChat().catch(console.error);