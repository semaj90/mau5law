/**
 * Recommendation Worker
 * Background processing for legal document recommendations
 */

self.addEventListener('message', function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'GENERATE_RECOMMENDATIONS':
        handleRecommendations(data);
        break;
      case 'PING':
        self.postMessage({ type: 'PONG', timestamp: Date.now() });
        break;
      default:
        self.postMessage({ type: 'ERROR', message: `Unknown message type: ${type}` });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', message: error.message });
  }
});

function handleRecommendations(data) {
  // Simple recommendation logic
  const { query, documents = [] } = data;
  
  // Simulate processing time
  setTimeout(() => {
    const recommendations = documents
      .map((doc, index) => ({
        id: doc.id || index,
        title: doc.title || `Document ${index + 1}`,
        score: Math.random() * 100,
        relevance: Math.random(),
        type: doc.type || 'legal',
        reason: generateReason(query, doc)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    self.postMessage({
      type: 'RECOMMENDATIONS_COMPLETE',
      recommendations,
      query,
      timestamp: Date.now()
    });
  }, 100);
}

function generateReason(query, doc) {
  const reasons = [
    'High keyword similarity',
    'Similar document structure',
    'Related legal precedent',
    'Matching citation patterns',
    'Similar case context'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// Keep worker alive
self.addEventListener('install', function(e) {
  console.log('Recommendation worker installed');
});

self.addEventListener('activate', function(e) {
  console.log('Recommendation worker activated');
});