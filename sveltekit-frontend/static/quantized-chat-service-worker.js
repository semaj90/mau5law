// Quantized LLM Service Worker with GRPMO "Thinking" Cache
// Intercepts LLM responses, quantizes output, and creates instant chat experience
// Combines 7-bit glyph compression with CHR-ROM caching for maximum performance

const CACHE_NAME = 'quantized-chat-cache-v1';
const GRPMO_THINKING_CACHE = 'grpmo-thinking-cache';
const CHR_ROM_CACHE = 'chr-rom-patterns';

// Initialize caches and GRPMO thinking system
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(GRPMO_THINKING_CACHE),
      caches.open(CHR_ROM_CACHE),
      initializeGRPMOThinking()
    ])
  );
});

// GRPMO "Thinking" System - Predicts and pre-caches responses
class GRPMOThinkingEngine {
  constructor() {
    this.thinkingPatterns = new Map();
    this.userContextCache = new Map();
    this.quantizedPatterns = new Map();
    this.compressionRatios = new Map();
  }

  // Initialize thinking patterns from user history
  async initialize() {
    try {
      const historicalData = await this.fetchUserChatHistory();
      this.buildThinkingPatterns(historicalData);
      console.log('🧠 GRPMO Thinking Engine initialized with', this.thinkingPatterns.size, 'patterns');
    } catch (error) {
      console.warn('GRPMO initialization failed:', error);
    }
  }

  // Predict likely user queries and pre-cache responses
  predictNextQueries(currentQuery, userContext) {
    const predictions = [];
    const queryEmbedding = this.generateQueryEmbedding(currentQuery);
    
    // Find similar historical patterns
    for (const [pattern, data] of this.thinkingPatterns) {
      const similarity = this.calculateSimilarity(queryEmbedding, data.embedding);
      if (similarity > 0.7) {
        predictions.push({
          query: data.nextQuery,
          confidence: similarity,
          cachedResponse: data.quantizedResponse
        });
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  // Add successful interaction to thinking patterns
  addThinkingPattern(query, response, nextQuery, userContext) {
    const pattern = {
      query,
      response: this.quantizeResponse(response),
      nextQuery,
      userContext,
      embedding: this.generateQueryEmbedding(query),
      timestamp: Date.now(),
      useCount: 1
    };

    const patternKey = this.generatePatternKey(query, userContext);
    if (this.thinkingPatterns.has(patternKey)) {
      this.thinkingPatterns.get(patternKey).useCount++;
    } else {
      this.thinkingPatterns.set(patternKey, pattern);
    }
  }

  // Quantize response for maximum compression
  quantizeResponse(response) {
    // Convert markdown to 7-bit glyph representation
    const glyphEncoded = this.convertToGlyphs(response);
    
    // Apply bit-level compression
    const compressed = this.bitLevelCompress(glyphEncoded);
    
    // Store compression ratio for metrics
    const originalSize = new TextEncoder().encode(response).length;
    const compressedSize = compressed.length;
    this.compressionRatios.set(response.slice(0, 50), originalSize / compressedSize);
    
    return {
      compressed,
      originalSize,
      compressedSize,
      glyphs: glyphEncoded.glyphCount,
      timestamp: Date.now()
    };
  }

  // Convert text to 7-bit visual glyphs (simplified implementation)
  convertToGlyphs(text) {
    const glyphMap = new Map();
    let glyphCount = 0;
    
    // Tokenize and convert common patterns to glyphs
    const tokens = this.tokenizeMarkdown(text);
    const glyphs = tokens.map(token => {
      if (!glyphMap.has(token)) {
        glyphMap.set(token, String.fromCharCode(32 + glyphCount));
        glyphCount++;
      }
      return glyphMap.get(token);
    });

    return {
      glyphs: glyphs.join(''),
      glyphMap: Object.fromEntries(glyphMap),
      glyphCount,
      originalTokens: tokens.length
    };
  }

  // Tokenize markdown for glyph conversion
  tokenizeMarkdown(text) {
    // Simple tokenization - can be enhanced with proper markdown parsing
    const patterns = [
      /\*\*(.*?)\*\*/g,  // Bold
      /\*(.*?)\*/g,      // Italic
      /`(.*?)`/g,        // Code
      /#{1,6}\s+(.*)/g,  // Headers
      /\n/g,             // Newlines
      /\s+/g             // Whitespace
    ];

    let tokens = [text];
    
    for (const pattern of patterns) {
      tokens = tokens.flatMap(token => 
        typeof token === 'string' ? token.split(pattern) : [token]
      );
    }

    return tokens.filter(token => token && token.trim());
  }

  // Bit-level compression for quantized data
  bitLevelCompress(glyphData) {
    const { glyphs, glyphMap } = glyphData;
    
    // Create bit-packed representation
    const bitArray = [];
    for (let i = 0; i < glyphs.length; i++) {
      const charCode = glyphs.charCodeAt(i) - 32;
      bitArray.push(charCode.toString(2).padStart(7, '0'));
    }
    
    const bitString = bitArray.join('');
    
    // Pack bits into bytes
    const bytes = [];
    for (let i = 0; i < bitString.length; i += 8) {
      const byte = bitString.slice(i, i + 8).padEnd(8, '0');
      bytes.push(parseInt(byte, 2));
    }
    
    return {
      bytes: new Uint8Array(bytes),
      glyphMap,
      bitLength: bitString.length
    };
  }

  // Generate simple embedding for query similarity
  generateQueryEmbedding(query) {
    const words = query.toLowerCase().split(/\s+/);
    const embedding = new Float32Array(128).fill(0);
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += 1 / (index + 1);
    });
    
    return embedding;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  calculateSimilarity(embedding1, embedding2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  generatePatternKey(query, userContext) {
    return `${this.simpleHash(query)}_${userContext?.userId || 'anonymous'}`;
  }

  async fetchUserChatHistory() {
    try {
      const response = await fetch('/api/chat/history?limit=100');
      return await response.json();
    } catch (error) {
      console.warn('Could not fetch chat history:', error);
      return [];
    }
  }

  buildThinkingPatterns(chatHistory) {
    for (let i = 0; i < chatHistory.length - 1; i++) {
      const current = chatHistory[i];
      const next = chatHistory[i + 1];
      
      if (current.role === 'user' && next.role === 'user') {
        this.addThinkingPattern(
          current.content,
          'system-generated-response', // Would be actual response
          next.content,
          { userId: current.user_id }
        );
      }
    }
  }
}

// Initialize GRPMO Thinking Engine
let grpmoEngine;

async function initializeGRPMOThinking() {
  grpmoEngine = new GRPMOThinkingEngine();
  await grpmoEngine.initialize();
}

// CHR-ROM Pattern Cache for instant UI rendering
class CHRROMPatternCache {
  constructor() {
    this.patterns = new Map();
    this.renderCache = new Map();
  }

  // Cache pre-rendered HTML patterns
  cachePattern(key, htmlContent, metadata = {}) {
    const pattern = {
      html: htmlContent,
      metadata,
      cached: Date.now(),
      ttl: metadata.ttl || 300000, // 5 minutes default
      renderTime: metadata.renderTime || 0
    };
    
    this.patterns.set(key, pattern);
    console.log('📦 CHR-ROM cached pattern:', key);
  }

  getPattern(key) {
    const pattern = this.patterns.get(key);
    if (!pattern) return null;
    
    // Check TTL
    if (Date.now() > pattern.cached + pattern.ttl) {
      this.patterns.delete(key);
      return null;
    }
    
    return pattern.html;
  }

  // Pre-render markdown to HTML with caching
  async renderAndCacheMarkdown(content, cacheKey) {
    if (this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey);
    }

    const startTime = performance.now();
    const html = await this.markdownToHTML(content);
    const renderTime = performance.now() - startTime;
    
    this.cachePattern(cacheKey, html, { renderTime });
    this.renderCache.set(cacheKey, html);
    
    return html;
  }

  async markdownToHTML(markdown) {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/#{3}\s+(.*)/g, '<h3>$1</h3>')
      .replace(/#{2}\s+(.*)/g, '<h2>$1</h2>')
      .replace(/#{1}\s+(.*)/g, '<h1>$1</h1>')
      .replace(/\n/g, '<br>');
  }
}

const chrROMCache = new CHRROMPatternCache();

// Main service worker event handlers
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept chat API requests
  if (url.pathname === '/api/chat' || url.pathname === '/api/ai/chat') {
    event.respondWith(handleQuantizedChat(event.request));
  }
  
  // Intercept chat stream requests
  if (url.pathname === '/api/chat/stream') {
    event.respondWith(handleQuantizedChatStream(event.request));
  }
});

// Handle quantized chat requests with instant caching
async function handleQuantizedChat(request) {
  const requestBody = await request.json();
  const userQuery = requestBody.messages?.[requestBody.messages.length - 1]?.content || '';
  const userId = requestBody.userId || 'anonymous';
  
  // Check for instant cache hit
  const cacheKey = `chat:${userId}:${grpmoEngine.simpleHash(userQuery)}`;
  const cachedResponse = chrROMCache.getPattern(cacheKey);
  
  if (cachedResponse) {
    console.log('⚡ Instant cache hit for query:', userQuery.slice(0, 50));
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: cachedResponse
        }
      }],
      cached: true,
      processingTime: 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Predict next queries while processing current one
  if (grpmoEngine) {
    const predictions = grpmoEngine.predictNextQueries(userQuery, { userId });
    // Pre-cache predicted responses in background
    self.setTimeout(() => preCachePredictions(predictions, userId), 0);
  }
  
  // Forward to actual API
  const response = await fetch(request);
  const responseData = await response.json();
  
  // Quantize and cache the response
  if (responseData.choices?.[0]?.message?.content) {
    const content = responseData.choices[0].message.content;
    const quantized = grpmoEngine ? grpmoEngine.quantizeResponse(content) : content;
    const renderedHTML = await chrROMCache.renderAndCacheMarkdown(content, cacheKey);
    
    // Cache for future instant retrieval
    chrROMCache.cachePattern(cacheKey, renderedHTML, {
      ttl: 1800000, // 30 minutes
      quantized: quantized,
      originalQuery: userQuery
    });
    
    console.log('💾 Cached quantized response for:', userQuery.slice(0, 50));
  }
  
  return new Response(JSON.stringify(responseData), {
    headers: response.headers
  });
}

// Handle streaming chat with real-time quantization
async function handleQuantizedChatStream(request) {
  const response = await fetch(request);
  const reader = response.body?.getReader();
  
  if (!reader) {
    return response;
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          fullResponse += chunk;
          
          // Real-time markdown conversion
          const htmlChunk = await chrROMCache.markdownToHTML(chunk);
          
          // Send quantized chunk
          const quantizedChunk = grpmoEngine ? 
            grpmoEngine.quantizeResponse(chunk) : 
            { compressed: chunk, originalSize: chunk.length };
          
          const processedChunk = JSON.stringify({
            content: htmlChunk,
            quantized: quantizedChunk,
            streaming: true
          });
          
          controller.enqueue(new TextEncoder().encode(processedChunk + '\n'));
        }
        
        // Cache complete response
        if (fullResponse) {
          const requestBody = await request.json().catch(() => ({}));
          const userQuery = requestBody.messages?.[requestBody.messages.length - 1]?.content || '';
          const userId = requestBody.userId || 'anonymous';
          const cacheKey = `chat:${userId}:${grpmoEngine.simpleHash(userQuery)}`;
          
          const renderedHTML = await chrROMCache.renderAndCacheMarkdown(fullResponse, cacheKey);
          chrROMCache.cachePattern(cacheKey, renderedHTML);
        }
      } catch (error) {
        console.error('Stream processing error:', error);
      } finally {
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked'
    }
  });
}

// Pre-cache predicted responses for instant delivery
async function preCachePredictions(predictions, userId) {
  for (const prediction of predictions) {
    const cacheKey = `chat:${userId}:${grpmoEngine.simpleHash(prediction.query)}`;
    
    if (!chrROMCache.getPattern(cacheKey) && prediction.cachedResponse) {
      // Decompress quantized response
      const decompressed = await decompressQuantizedResponse(prediction.cachedResponse);
      const html = await chrROMCache.renderAndCacheMarkdown(decompressed, cacheKey);
      
      chrROMCache.cachePattern(cacheKey, html, {
        ttl: 600000, // 10 minutes for predictions
        predicted: true,
        confidence: prediction.confidence
      });
      
      console.log('🔮 Pre-cached prediction:', prediction.query.slice(0, 30));
    }
  }
}

// Decompress quantized response back to text
async function decompressQuantizedResponse(quantizedData) {
  if (!quantizedData.compressed) return quantizedData;
  
  const { bytes, glyphMap, bitLength } = quantizedData.compressed;
  
  // Reconstruct bit string
  let bitString = '';
  for (let i = 0; i < bytes.length; i++) {
    bitString += bytes[i].toString(2).padStart(8, '0');
  }
  bitString = bitString.slice(0, bitLength);
  
  // Reconstruct glyphs
  let glyphs = '';
  for (let i = 0; i < bitString.length; i += 7) {
    const bits = bitString.slice(i, i + 7);
    if (bits.length === 7) {
      const charCode = parseInt(bits, 2) + 32;
      glyphs += String.fromCharCode(charCode);
    }
  }
  
  // Convert glyphs back to text using glyph map
  const reverseGlyphMap = Object.fromEntries(
    Object.entries(glyphMap).map(([k, v]) => [v, k])
  );
  
  return glyphs.split('').map(glyph => reverseGlyphMap[glyph] || glyph).join('');
}

// Background sync for thinking patterns
self.addEventListener('sync', (event) => {
  if (event.tag === 'grpmo-thinking-sync') {
    event.waitUntil(syncThinkingPatterns());
  }
});

async function syncThinkingPatterns() {
  if (!grpmoEngine) return;
  
  // Sync thinking patterns with server
  const patterns = Array.from(grpmoEngine.thinkingPatterns.entries()).map(([key, pattern]) => ({
    key,
    pattern: {
      ...pattern,
      quantizedResponse: pattern.response // Already quantized
    }
  }));
  
  try {
    await fetch('/api/grpmo/sync-thinking-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patterns })
    });
    console.log('🧠 Synced', patterns.length, 'thinking patterns');
  } catch (error) {
    console.error('Thinking pattern sync failed:', error);
  }
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_PERFORMANCE_METRICS') {
    const metrics = {
      chrROMCacheSize: chrROMCache.patterns.size,
      thinkingPatterns: grpmoEngine ? grpmoEngine.thinkingPatterns.size : 0,
      compressionRatios: grpmoEngine ? Object.fromEntries(grpmoEngine.compressionRatios) : {},
      cacheHits: chrROMCache.patterns.size,
      timestamp: Date.now()
    };
    
    event.ports[0].postMessage(metrics);
  }
});

console.log('🚀 Quantized Chat Service Worker with GRPMO Thinking initialized');