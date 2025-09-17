import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAIChatDemo() {
  console.log('🚀 Starting AI Chat Demo Test...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down for demo
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });

  const page = await context.newPage();

  try {
    console.log('📡 Navigating to AI Chat page...');
    await page.goto('http://localhost:5174/ai-chat');

    // Wait for page to load
    await page.waitForSelector('.chat-container', { timeout: 10000 });
    console.log('✅ AI Chat page loaded');

    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({
      path: join(__dirname, 'ai-chat-initial.png'),
      fullPage: true
    });

    // Wait for connection status
    await page.waitForSelector('.connection-status', { timeout: 5000 });

    // Check if TensorRT service is connected
    const connectionStatus = await page.textContent('.connection-status');
    console.log(`🔗 Connection Status: ${connectionStatus}`);

    // Click on a sample prompt
    console.log('🖱️ Clicking sample prompt...');
    await page.click('button:has-text("CONTRACT ELEMENTS")');

    // Wait a moment for the text to populate
    await page.waitForTimeout(1000);

    // Take screenshot of populated input
    await page.screenshot({
      path: join(__dirname, 'ai-chat-with-prompt.png'),
      fullPage: true
    });

    // Send the message
    console.log('📤 Sending message to TensorRT...');
    await page.click('.send-button');

    // Wait for response (with longer timeout for TensorRT)
    try {
      await page.waitForSelector('.message.assistant', { timeout: 15000 });
      console.log('✅ Received AI response!');

      // Take screenshot of conversation
      await page.screenshot({
        path: join(__dirname, 'ai-chat-conversation.png'),
        fullPage: true
      });

      // Get the AI response text
      const responseText = await page.textContent('.message.assistant .message-text');
      console.log('🧠 AI Response:', responseText?.substring(0, 100) + '...');

    } catch (error) {
      console.log('⚠️ No AI response received (TensorRT might be in simulation mode)');

      // Take screenshot anyway
      await page.screenshot({
        path: join(__dirname, 'ai-chat-no-response.png'),
        fullPage: true
      });
    }

    // Test typing a custom message
    console.log('⌨️ Testing custom message input...');
    await page.fill('.message-input', 'What is a legal contract?');

    await page.screenshot({
      path: join(__dirname, 'ai-chat-custom-message.png'),
      fullPage: true
    });

    // Send custom message
    await page.click('.send-button');

    // Wait for any response
    await page.waitForTimeout(3000);

    // Final screenshot
    await page.screenshot({
      path: join(__dirname, 'ai-chat-final.png'),
      fullPage: true
    });

    console.log('✅ AI Chat Demo Test Complete!');
    console.log('📸 Screenshots saved:');
    console.log('  - ai-chat-initial.png');
    console.log('  - ai-chat-with-prompt.png');
    console.log('  - ai-chat-conversation.png');
    console.log('  - ai-chat-custom-message.png');
    console.log('  - ai-chat-final.png');

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    await page.screenshot({
      path: join(__dirname, 'ai-chat-error.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

// Run the test
testAIChatDemo().catch(console.error);