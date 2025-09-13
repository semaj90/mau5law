import fetch from 'node-fetch';

async function testEnhancedSemanticSearch() {
  console.log('🧪 Testing Enhanced Semantic Search API...');

  try {
    const response = await fetch('http://localhost:5176/api/rag/semantic-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'contract law liability',
        useEnhancedSemanticSearch: true,
        maxResults: 3
      })
    });

    const data = await response.json();

    console.log('📊 API Response:');
    console.log('Status:', response.status);
    console.log('Success:', data.success);
    console.log('Results:', data.results?.length || 0);
    console.log('Response Time:', data.total_time || 'N/A');

    if (data.success) {
      console.log('✅ Enhanced Semantic Search API is working!');
      if (data.results && data.results.length > 0) {
        console.log('📄 Sample result:', data.results[0]);
      }
    } else {
      console.log('❌ API Error:', data.error);
    }

  } catch (error) {
    console.error('🚨 Network Error:', error.message);
  }
}

async function testUploadConfig() {
  console.log('\n🧪 Testing Enhanced Upload Configuration...');

  try {
    const response = await fetch('http://localhost:5176/api/documents/upload-enhanced');
    const data = await response.json();

    console.log('📊 Upload Config Response:');
    console.log('Status:', response.status);
    console.log('Enhanced Features:', data.enhancedFeatures?.length || 0);
    console.log('Supported Formats:', data.supportedFormats?.length || 0);

    if (data.enhancedFeatures) {
      console.log('✅ Enhanced Upload Configuration is working!');
      console.log('🎯 Features:', data.enhancedFeatures.slice(0, 3).join(', '));
    } else {
      console.log('❌ Configuration Error:', data.error);
    }

  } catch (error) {
    console.error('🚨 Network Error:', error.message);
  }
}

// Run tests
testEnhancedSemanticSearch()
  .then(() => testUploadConfig())
  .then(() => console.log('\n🎉 Integration tests complete!'));