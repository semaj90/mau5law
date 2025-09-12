// Global Playwright Setup - Nintendo Memory Initialization
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎮 Global Playwright Setup - Nintendo Memory Testing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Checking if development server is ready...');
    
    // Wait for dev server to be fully ready
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 120000 
    });
    
    console.log('✅ Development server is ready');
    
    // Check if MCP server is available
    try {
      const mcpResponse = await page.request.get('http://localhost:3000/mcp/health');
      if (mcpResponse.ok()) {
        console.log('✅ MCP Multi-Core Server is ready');
      }
    } catch {
      console.log('⚠️ MCP server not available - some tests may be limited');
    }
    
    // Pre-warm the orchestrator if available
    try {
      await page.goto('http://localhost:5173/demo/legal-ai-orchestrator', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const orchestratorReady = await page.locator('[data-testid="orchestrator-ready"]').count();
      if (orchestratorReady > 0) {
        console.log('✅ Legal AI Orchestrator pre-warmed');
      }
    } catch {
      console.log('⚠️ Orchestrator pre-warm failed - tests will handle initialization');
    }
    
    console.log('🎮 Nintendo Memory Banks initialized for testing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;