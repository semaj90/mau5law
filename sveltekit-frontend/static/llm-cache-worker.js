// LLM Response Quantization & Cache Service Worker
// Handles: Raw LLM text → Markdown → 7-bit quantization → CHR-ROM cache

const CACHE_NAME = 'llm-responses-v1';
const THINKING_CACHE = 'grpo-thinking-v1';
const VECTOR_CACHE = 'vector-similarity-v1';

// 7-bit glyph compression for text quantization
class TextQuantizer {
  constructor() {
    // Common legal terms mapping to 7-bit codes for compression
    this.legalGlyphs = new Map([
      ['plaintiff', 0x01], ['defendant', 0x02], ['evidence', 0x03],
      ['objection', 0x04], ['sustained', 0x05], ['overruled', 0x06],
      ['contract', 0x07], ['liability', 0x08], ['damages', 0x09],
      ['jurisdiction', 0x0A], ['precedent', 0x0B], ['statute', 0x0C],
      // Extended legal vocabulary... up to 127 codes
    ]);
    
    this.reverseGlyphs = new Map(
      Array.from(this.legalGlyphs.entries()).map(([k, v]) => [v, k])
    );
  }

  // Quantize text using 7-bit glyph compression
  quantize(text) {
    let compressed = [];
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (this.legalGlyphs.has(word)) {
        // Use 7-bit glyph code
        compressed.push({ type: 'glyph', code: this.legalGlyphs.get(word) });
      } else {
        // Store as UTF-8 with base64 for non-legal terms
        compressed.push({ 
          type: 'text', 
          data: btoa(unescape(encodeURIComponent(word)))
        });
      }
    }
    
    return {
      compressed,
      originalLength: text.length,
      compressedSize: this.calculateSize(compressed),
      compressionRatio: text.length / this.calculateSize(compressed)
    };
  }

  // Decompress quantized data back to text
  decompress(quantizedData) {
    return quantizedData.compressed
      .map(item => {
        if (item.type === 'glyph') {
          return this.reverseGlyphs.get(item.code) || '[UNKNOWN]';
        } else {
          return decodeURIComponent(escape(atob(item.data)));
        }
      })
      .join(' ');
  }

  calculateSize(compressed) {
    return compressed.reduce((size, item) => {
      return size + (item.type === 'glyph' ? 1 : item.data.length);
    }, 0);
  }
}

// Markdown converter with legal document awareness
class LegalMarkdownConverter {
  convertToMarkdown(rawText) {
    let markdown = rawText;
    
    // Convert legal citations to markdown links
    markdown = markdown.replace(
      /(\d+\s+[A-Z][a-z]+\.?\s+\d+)/g,
      '[$1](#citation-$1)'
    );
    
    // Bold case names
    markdown = markdown.replace(
      /([A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+)/g,
      '**$1**'
    );
    
    // Convert sections to headers
    markdown = markdown.replace(
      /^(SECTION|ARTICLE|PART)\s+([IVX]+|[0-9]+)/gm,
      '## $1 $2'
    );
    
    // Convert subsections
    markdown = markdown.replace(
      /^([a-z])\)\s+/gm,
      '### $1) '
    );
    
    return markdown;
  }
}

// CHR-ROM pattern caching for instant UI rendering
class CHRROMCache {
  constructor() {
    this.patterns = new Map();
    this.renderCache = new Map();
  }

  // Store pre-rendered HTML patterns
  cachePattern(key, htmlPattern, metadata = {}) {
    this.patterns.set(key, {
      html: htmlPattern,
      metadata: {
        ...metadata,
        cached_at: Date.now(),
        access_count: 0
      }
    });
  }

  // Get cached pattern and update access metrics
  getPattern(key) {
    if (this.patterns.has(key)) {
      const pattern = this.patterns.get(key);
      pattern.metadata.access_count++;
      pattern.metadata.last_accessed = Date.now();
      return pattern.html;
    }
    return null;
  }

  // Generate UI-ready HTML from quantized data
  renderToHTML(quantizedData, markdownContent) {
    const compressionInfo = `
      <div class="compression-info" style="opacity: 0.7; font-size: 0.8em;">
        Compression: ${quantizedData.compressionRatio.toFixed(2)}x 
        (${quantizedData.originalLength}→${quantizedData.compressedSize} bytes)
      </div>
    `;
    
    // Convert markdown to HTML (simplified)
    const htmlContent = markdownContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\n/g, '<br>');
    
    return `
      <div class="llm-response cached-response">
        ${htmlContent}
        ${compressionInfo}
      </div>
    `;
  }
}

// Initialize components
const quantizer = new TextQuantizer();
const markdownConverter = new LegalMarkdownConverter();
const chrromCache = new CHRROMCache();

// Service Worker Event Handlers
self.addEventListener('install', event => {
  console.log('[LLM Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[LLM Worker] Cache opened');
    })
  );
});

self.addEventListener('activate', event => {
  console.log('[LLM Worker] Activating...');
});

// Intercept and process LLM streams
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Intercept chat API streams
  if (url.pathname.includes('/api/chat') || url.pathname.includes('/api/llm')) {
    event.respondWith(handleLLMStream(event.request));
    return;
  }
  
  // Handle cache requests
  if (url.pathname.includes('/api/cache/llm')) {
    event.respondWith(handleCacheRequest(event.request));
    return;
  }
});

async function handleLLMStream(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  const cacheKey = `llm:${sessionId}:${Date.now()}`;
  
  try {
    const response = await fetch(request);
    
    if (!response.ok || !response.body) {
      return response;
    }

    const reader = response.body.getReader();
    let fullResponse = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            fullResponse += chunk;

            // Process chunk in real-time
            const processed = await processLLMChunk(chunk, cacheKey);
            
            // Send processed chunk to client
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              type: 'chunk',
              data: processed.html,
              metadata: {
                quantized: true,
                compression_ratio: processed.compressionRatio,
                cache_key: cacheKey
              }
            })));
          }

          // Process complete response
          const finalProcessed = await processCompleteResponse(fullResponse, cacheKey);
          
          // Store in GRPO thinking cache
          await addToThinkingCache(cacheKey, finalProcessed);
          
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'X-LLM-Cache': 'PROCESSED',
        'X-Compression': 'QUANTIZED'
      }
    });

  } catch (error) {
    console.error('[LLM Worker] Stream processing error:', error);
    return fetch(request); // Fallback to original
  }
}

async function processLLMChunk(chunk, cacheKey) {
  // 1. Convert to markdown
  const markdown = markdownConverter.convertToMarkdown(chunk);
  
  // 2. Quantize the markdown
  const quantized = quantizer.quantize(markdown);
  
  // 3. Generate HTML pattern
  const html = chrromCache.renderToHTML(quantized, markdown);
  
  // 4. Cache the pattern
  chrromCache.cachePattern(`${cacheKey}:chunk:${Date.now()}`, html, {
    type: 'chunk',
    quantized_size: quantized.compressedSize
  });

  return {
    html,
    quantized,
    compressionRatio: quantized.compressionRatio
  };
}

async function processCompleteResponse(fullText, cacheKey) {
  const markdown = markdownConverter.convertToMarkdown(fullText);
  const quantized = quantizer.quantize(markdown);
  const html = chrromCache.renderToHTML(quantized, markdown);
  
  // Cache complete response
  chrromCache.cachePattern(cacheKey, html, {
    type: 'complete',
    original_length: fullText.length,
    quantized_size: quantized.compressedSize,
    compression_ratio: quantized.compressionRatio
  });

  return {
    html,
    quantized,
    markdown,
    metadata: {
      compression_ratio: quantized.compressionRatio,
      memory_saved: fullText.length - quantized.compressedSize
    }
  };
}

// Add to GRPO "thinking" cache for contextual prompting
async function addToThinkingCache(key, processedData) {
  try {
    const cache = await caches.open(THINKING_CACHE);
    
    const cacheData = {
      key,
      html: processedData.html,
      quantized: processedData.quantized,
      markdown: processedData.markdown,
      metadata: {
        ...processedData.metadata,
        thinking_context: true,
        cached_for_context: Date.now()
      }
    };
    
    await cache.put(
      new Request(`thinking://${key}`),
      new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    
    console.log('[GRPO] Added to thinking cache:', key);
  } catch (error) {
    console.error('[GRPO] Thinking cache error:', error);
  }
}

// Handle cache requests from the application
async function handleCacheRequest(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const key = url.searchParams.get('key');
  
  switch (action) {
    case 'get':
      const cached = chrromCache.getPattern(key);
      return new Response(JSON.stringify({
        success: !!cached,
        data: cached,
        from_cache: 'CHR-ROM'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    case 'stats':
      return new Response(JSON.stringify({
        patterns_cached: chrromCache.patterns.size,
        memory_usage: estimateMemoryUsage(),
        compression_stats: getCompressionStats()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    default:
      return new Response('Invalid action', { status: 400 });
  }
}

function estimateMemoryUsage() {
  let total = 0;
  chrromCache.patterns.forEach(pattern => {
    total += pattern.html.length + JSON.stringify(pattern.metadata).length;
  });
  return total;
}

function getCompressionStats() {
  const stats = Array.from(chrromCache.patterns.values())
    .map(p => p.metadata.compression_ratio || 1)
    .filter(r => r > 1);
    
  return {
    average_compression: stats.reduce((a, b) => a + b, 0) / stats.length || 1,
    max_compression: Math.max(...stats, 1),
    total_patterns: stats.length
  };
}

console.log('[LLM Cache Worker] Initialized with quantization support');