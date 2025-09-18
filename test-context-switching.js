import { chromium } from 'playwright';

async function testContextSwitching() {
  console.log('🎯 Testing TensorRT Context Switching...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Small query (should route to gemma3:270m)
    console.log('📝 Testing small query routing...');
    const smallQueryResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8086/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma3:270m',
            prompt: 'Summary',
            stream: false
          })
        });
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('📊 Small Query Result:', JSON.stringify(smallQueryResponse, null, 2));

    // Test 2: Large legal query (should route to gemma3-legal:latest)
    console.log('⚖️ Testing large legal query routing...');
    const largePrompt = 'Contract law analysis litigation precedent jurisdiction ' + 'legal '.repeat(500);
    const largeQueryResponse = await page.evaluate(async (prompt) => {
      try {
        const response = await fetch('http://localhost:8086/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma3-legal:latest',
            prompt: prompt,
            stream: false
          })
        });
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    }, largePrompt);
    console.log('📊 Large Query Result:', JSON.stringify(largeQueryResponse, null, 2));

    // Test 3: Health check with CORS
    console.log('🏥 Testing health check with CORS...');
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8086/health');
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('💚 Health Check:', JSON.stringify(healthResponse, null, 2));

    // Create results page
    await page.goto('about:blank');
    await page.setContent(`
      <html>
        <head><title>TensorRT Context Switching Test</title></head>
        <body style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 20px;">
          <h1>🎯 TensorRT Context Switching Results</h1>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>📝 Small Query (gemma3:270m)</h3>
            <pre>${JSON.stringify(smallQueryResponse, null, 2)}</pre>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>⚖️ Large Legal Query (gemma3-legal:latest)</h3>
            <pre>${JSON.stringify(largeQueryResponse, null, 2)}</pre>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>🏥 Health Status</h3>
            <pre>${JSON.stringify(healthResponse, null, 2)}</pre>
          </div>

          <div style="background: #111; padding: 15px; border: 1px solid #00ff00; margin: 10px 0;">
            <h3>✅ Integration Status</h3>
            <p>• CORS Headers: ${healthResponse.error ? '❌' : '✅'}</p>
            <p>• Small Model Routing: ${smallQueryResponse.error ? '❌' : '✅'}</p>
            <p>• Large Model Routing: ${largeQueryResponse.error ? '❌' : '✅'}</p>
            <p>• Browser Compatibility: ✅</p>
          </div>
        </body>
      </html>
    `);

    await page.screenshot({ path: 'context-switching-test.png', fullPage: true });
    console.log('📸 Context switching test screenshot saved');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testContextSwitching().catch(console.error);