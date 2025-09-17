import http from 'http';
import url from 'url';

const PORT = 8101;

// Mock legal AI responses
const legalResponses = {
  "contract": "A legal contract is a binding agreement between two or more parties that is enforceable by law. Key elements include: 1) Offer and acceptance, 2) Consideration, 3) Legal capacity, 4) Lawful purpose. The contract must be clear, definite, and both parties must understand the terms.",

  "intellectual property": "Intellectual Property (IP) law protects creations of the mind including patents, trademarks, copyrights, and trade secrets. Patents protect inventions, trademarks protect brand identifiers, copyrights protect creative works, and trade secrets protect confidential business information.",

  "due diligence": "Due diligence in M&A is the comprehensive investigation of a target company's business, financials, legal matters, and operations. It includes reviewing contracts, financial statements, regulatory compliance, intellectual property, employee matters, and potential liabilities before completing the transaction.",

  "default": "I'm a legal AI assistant powered by TensorRT and Gemma3-Legal. I can help with contract analysis, intellectual property questions, corporate law matters, regulatory compliance, and general legal information. What legal topic would you like to discuss?"
};

function generateResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('contract')) {
    return legalResponses.contract;
  } else if (lowerPrompt.includes('intellectual property') || lowerPrompt.includes('ip')) {
    return legalResponses["intellectual property"];
  } else if (lowerPrompt.includes('due diligence') || lowerPrompt.includes('m&a')) {
    return legalResponses["due diligence"];
  } else {
    return legalResponses.default;
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health endpoint
  if (path === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "healthy",
      tensorrt_available: true,
      cuda_available: true,
      gpu_name: "RTX 3060 Ti (Simulated)",
      timestamp: new Date().toISOString(),
      version: "1.0.0-mock"
    }));
    return;
  }

  // Stats endpoint
  if (path === '/stats' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      requests_processed: 42,
      average_response_time: "0.3s",
      model_name: "Gemma3-Legal Q4_K_M",
      uptime: "2.5 hours",
      memory_usage: "2.1GB"
    }));
    return;
  }

  // Inference endpoint
  if (path === '/infer' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const prompt = requestData.prompt || '';

        const response = generateResponse(prompt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          response: response,
          model: "Gemma3-Legal Q4_K_M",
          tokens_generated: response.split(' ').length,
          inference_time: "0.3s",
          temperature: requestData.temperature || 0.7,
          max_tokens: requestData.max_tokens || 512
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // OpenAI-compatible embeddings endpoint
  if (path === '/v1/embeddings' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const input = requestData.input || '';

        // Mock embedding vector (384 dimensions)
        const embedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          object: "list",
          data: [{
            object: "embedding",
            index: 0,
            embedding: embedding
          }],
          model: "gemma3-legal-embeddings",
          usage: {
            prompt_tokens: input.split(' ').length,
            total_tokens: input.split(' ').length
          }
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404 for unknown paths
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log('🚀 Mock TensorRT Legal AI Service Started');
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log(`   GET  /health          - Health check`);
  console.log(`   GET  /stats           - Performance statistics`);
  console.log(`   POST /infer           - Legal AI inference`);
  console.log(`   POST /v1/embeddings   - OpenAI-compatible embeddings`);
  console.log('🧠 Mock responses ready for legal queries!');
});