// Quick test script to verify the integration
// node test-integration.mjs

const testEvidenceAnalysis = async () => {
  console.log('🧪 Testing Evidence Analysis Integration...');

  // Test Ollama connection directly
  console.log('\n1️⃣ Testing Ollama Direct Connection...');
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3-legal:latest',
        prompt: 'Analyze this legal document: Contract between parties ABC and XYZ with potential violations.',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 100
        }
      })
    });

    if (ollamaResponse.ok) {
      const ollamaData = await ollamaResponse.json();
      console.log('✅ Ollama Response:', ollamaData.response.substring(0, 200) + '...');
    } else {
      console.log('❌ Ollama Error:', ollamaResponse.status);
    }
  } catch (error) {
    console.log('❌ Ollama Connection Failed:', error.message);
  }

  // Test our API endpoint (if SvelteKit is running)
  console.log('\n2️⃣ Testing SvelteKit Evidence API...');
  try {
    const apiResponse = await fetch('http://localhost:5175/api/v1/evidence/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId: 'test-integration-001',
        filename: 'contract_violation.pdf',
        content: 'This contract contains clauses that may violate federal regulations regarding data privacy and financial reporting.',
        type: 'document'
      })
    });

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log('✅ SvelteKit API Response:', JSON.stringify(apiData, null, 2));
    } else {
      const errorText = await apiResponse.text();
      console.log('❌ SvelteKit API Error:', apiResponse.status, errorText);
    }
  } catch (error) {
    console.log('❌ SvelteKit API Connection Failed:', error.message);
  }

  // Test search suggestions
  console.log('\n3️⃣ Testing AI Search Suggestions...');
  try {
    const searchResponse = await fetch('http://localhost:5175/api/v1/evidence/search/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'contract violation',
        type: 'legal',
        limit: 3
      })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ Search Suggestions:', JSON.stringify(searchData.data.suggestions, null, 2));
    } else {
      console.log('❌ Search API Error:', searchResponse.status);
    }
  } catch (error) {
    console.log('❌ Search API Connection Failed:', error.message);
  }

  console.log('\n🏁 Integration test complete!');
};

// Run the test
testEvidenceAnalysis().catch(console.error);
