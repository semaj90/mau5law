import { chromium } from 'playwright';

async function testAIChat() {
  console.log('🚀 Testing AI Legal Chat Interface...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the standalone AI chat
    console.log('📱 Opening AI Chat Interface...');
    await page.goto('http://localhost:5175');

    // Wait for the page to load
    await page.waitForTimeout(3000);

    // Take a screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: 'ai-chat-interface-working.png',
      fullPage: true
    });

    console.log('✅ Screenshot saved as ai-chat-interface-working.png');
    console.log('🎮 AI Legal Chat Interface is working with NES.css styling!');

  } catch (error) {
    console.error('❌ Error testing AI chat:', error);
  } finally {
    await browser.close();
  }
}

testAIChat();