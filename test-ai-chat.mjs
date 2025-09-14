// Quick Test: Ollama Connection Verification
// Test if Ollama is working with the AI chat system

console.log('🧪 Testing Ollama Connection...');

async function testOllamaConnection() {
  try {
    console.log('📡 Checking Ollama health...');

    // Test 1: Check if Ollama is running
    const healthResponse = await fetch('http://localhost:11434/api/tags');
    if (!healthResponse.ok) {
      throw new Error(`Ollama health check failed: ${healthResponse.status}`);
    }

    const models = await healthResponse.json();
    console.log('✅ Ollama is running');
    console.log('📋 Available models:', models.models?.map(m => m.name) || 'None');

    // Test 2: Test a simple generation
    console.log('🧠 Testing simple AI generation...');
    const generateResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:270m',
        prompt: 'Hello, this is a simple test. Please respond with just "AI chat works!"',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 10,
        }
      })
    });

    if (!generateResponse.ok) {
      throw new Error(`Generation failed: ${generateResponse.status}`);
    }

    const result = await generateResponse.json();
    console.log('🎉 AI Response:', result.response);
    console.log('✅ AI chat functionality confirmed!');

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testOllamaConnection().then(success => {
  if (success) {
    console.log('\n🎯 RESULT: AI chat works! ✅');
    console.log('🚀 The AI chat system is operational.');
    console.log('📱 Frontend demos available at:');
    console.log('   - http://localhost:5175/chat-demo');
    console.log('   - http://localhost:5175/demo/ai-assistant');
    console.log('   - http://localhost:5175/ai-assistant');
    console.log('   - http://localhost:5175/ai-test');
  } else {
    console.log('\n❌ RESULT: AI chat has issues');
    console.log('🔧 Check Ollama service and model availability');
  }
});