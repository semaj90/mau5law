// GRPO Thinking Response Embedding Worker
// Service Worker for processing reasoning chain patterns with timestamp-based indexing

const GRPO_CACHE_NAME = 'grpo-thinking-cache-v1';
const GRPO_API_BASE = '/api/v3/grpo';
const MAX_CONCURRENT_GRPO_JOBS = 2;
const BATCH_SIZE = 8;

// Worker state management
const grpoWorkerState = {
  activeJobs: new Map(),
  jobQueue: [],
  stats: {
    totalProcessed: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    cacheHits: 0,
    startTime: Date.now()
  }
};

// GRPO job types
const GRPO_JOB_TYPES = {
  INDEX_THINKING: 'index_thinking',
  BATCH_EMBED: 'batch_embed',
  SEARCH_PATTERNS: 'search_patterns',
  TREND_ANALYSIS: 'trend_analysis',
  RECOMMENDATION_UPDATE: 'recommendation_update'
};

// Enhanced logging for GRPO operations
function grpoLog(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    worker: 'grpo-thinking',
    message,
    ...data
  };
  
  console[level](`[GRPO-${level.toUpperCase()}] ${message}`, logEntry);
  
  // Store critical logs for debugging
  if (level === 'error' || level === 'warn') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'grpo-log',
          level,
          message,
          data: logEntry
        });
      });
    });
  }
}

// Process GRPO thinking response for indexing
async function processThinkingResponse(thinkingData) {
  const startTime = Date.now();
  
  try {
    grpoLog('info', 'Processing thinking response', { 
      messageId: thinkingData.messageId,
      thinkingType: thinkingData.thinkingType 
    });
    
    // Extract reasoning patterns
    const reasoningPatterns = extractReasoningPatterns(thinkingData.thinkingChain);
    
    // Enhance metadata with pattern analysis
    const enhancedMetadata = {
      ...thinkingData.metadata,
      patterns: reasoningPatterns,
      processingTime: 0, // Will be filled below
      workerId: 'grpo-sw-' + Date.now(),
      timestamp: new Date().toISOString(),
      complexity: calculateComplexity(thinkingData),
      keyTerms: extractKeyTerms(thinkingData.thinkingChain),
      legalCitations: extractLegalCitations(thinkingData.thinkingChain)
    };
    
    // Generate embedding using API
    const embeddingResponse = await fetch(`${GRPO_API_BASE}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: thinkingData.thinkingChain,
        type: 'grpo_thinking',
        useCache: true
      })
    });
    
    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }
    
    const { embedding } = await embeddingResponse.json();
    
    // Store with enhanced indexing
    const storeResponse = await fetch(`${GRPO_API_BASE}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...thinkingData,
        embedding,
        metadata: {
          ...enhancedMetadata,
          processingTime: Date.now() - startTime
        }
      })
    });
    
    if (!storeResponse.ok) {
      throw new Error(`Storage API error: ${storeResponse.status}`);
    }
    
    const processingTime = Date.now() - startTime;
    grpoWorkerState.stats.totalProcessed++;
    grpoWorkerState.stats.successfulJobs++;
    updateAverageProcessingTime(processingTime);
    
    grpoLog('info', 'Thinking response processed successfully', {
      messageId: thinkingData.messageId,
      processingTime,
      embeddingLength: embedding.length
    });
    
    return {
      success: true,
      messageId: thinkingData.messageId,
      processingTime,
      patterns: reasoningPatterns.length
    };
    
  } catch (error) {
    grpoWorkerState.stats.failedJobs++;
    grpoLog('error', 'Failed to process thinking response', {
      messageId: thinkingData.messageId,
      error: error.message,
      processingTime: Date.now() - startTime
    });
    
    throw error;
  }
}

// Extract reasoning patterns from thinking chain
function extractReasoningPatterns(thinkingChain) {
  const patterns = [];
  
  // Legal reasoning patterns
  const reasoningMarkers = [
    /therefore[,\s]/gi,
    /consequently[,\s]/gi,
    /it follows that/gi,
    /given that/gi,
    /based on/gi,
    /according to/gi,
    /pursuant to/gi,
    /in light of/gi,
    /considering that/gi,
    /whereas/gi
  ];
  
  // Evidence patterns
  const evidenceMarkers = [
    /the evidence shows/gi,
    /the record indicates/gi,
    /as demonstrated by/gi,
    /the facts establish/gi,
    /it is established that/gi
  ];
  
  // Conclusion patterns
  const conclusionMarkers = [
    /in conclusion/gi,
    /ultimately/gi,
    /in summary/gi,
    /the court finds/gi,
    /it is held that/gi,
    /the ruling is/gi
  ];
  
  // Extract sentences with patterns
  const sentences = thinkingChain.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    
    // Classify sentence type
    let patternType = 'general';
    if (reasoningMarkers.some(marker => marker.test(trimmed))) {
      patternType = 'reasoning';
    } else if (evidenceMarkers.some(marker => marker.test(trimmed))) {
      patternType = 'evidence';
    } else if (conclusionMarkers.some(marker => marker.test(trimmed))) {
      patternType = 'conclusion';
    }
    
    if (patternType !== 'general') {
      patterns.push({
        type: patternType,
        text: trimmed,
        position: index,
        length: trimmed.length
      });
    }
  });
  
  return patterns;
}

// Calculate thinking complexity score
function calculateComplexity(thinkingData) {
  const factors = {
    chainLength: Math.min(thinkingData.thinkingChain.length / 1000, 2), // 0-2
    stepCount: Math.min(thinkingData.reasoningSteps.length / 10, 1.5), // 0-1.5
    evidenceCount: Math.min(thinkingData.evidenceCited.length / 5, 1), // 0-1
    principleCount: Math.min(thinkingData.legalPrinciples.length / 3, 0.5) // 0-0.5
  };
  
  const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
  
  if (totalScore >= 3.5) return 'high';
  if (totalScore >= 2) return 'medium';
  return 'low';
}

// Extract key legal terms
function extractKeyTerms(text) {
  const legalTerms = [
    // Constitutional law
    'due process', 'equal protection', 'first amendment', 'fourth amendment',
    'fifth amendment', 'sixth amendment', 'eighth amendment', 'fourteenth amendment',
    
    // Criminal law
    'mens rea', 'actus reus', 'burden of proof', 'reasonable doubt', 'probable cause',
    'miranda rights', 'search and seizure', 'double jeopardy', 'habeas corpus',
    
    // Civil procedure
    'motion to dismiss', 'summary judgment', 'discovery', 'deposition', 'interrogatory',
    'motion for summary judgment', 'motion to compel', 'motion in limine',
    
    // Contract law
    'consideration', 'breach of contract', 'specific performance', 'damages',
    'material breach', 'anticipatory breach', 'frustration of purpose',
    
    // Tort law
    'negligence', 'strict liability', 'intentional tort', 'duty of care',
    'proximate cause', 'but for causation', 'comparative negligence'
  ];
  
  const foundTerms = [];
  const lowerText = text.toLowerCase();
  
  legalTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      foundTerms.push({
        term,
        count: matches.length,
        positions: [...lowerText.matchAll(regex)].map(m => m.index)
      });
    }
  });
  
  return foundTerms.sort((a, b) => b.count - a.count).slice(0, 10);
}

// Extract legal citations
function extractLegalCitations(text) {
  const citationPatterns = [
    // Federal cases: Name v. Name, Volume Reporter Page (Court Year)
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+v\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+\d+\s+[A-Z][a-z]*\.?\s*\d*[a-z]?\s+\d+\s*\([A-Z][a-z.\s]+\d{4}\)/gi,
    
    // Supreme Court: Name v. Name, Volume U.S. Page (Year)
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+v\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+\d+\s+U\.S\.\s+\d+\s*\(\d{4}\)/gi,
    
    // Statutes: Title U.S.C. § Section
    /\d+\s+U\.S\.C\.?\s+§\s*\d+(?:\([a-z]\))?/gi,
    
    // Federal Rules
    /Fed\.?\s*R\.?\s*(?:Civ\.?\s*P\.?|Crim\.?\s*P\.?|Evid\.?)\s*\d+(?:\([a-z]\))?/gi,
    
    // Constitutional references
    /U\.S\.?\s*Const\.?\s*(?:art\.?\s*[IVX]+|amend\.?\s*[IVX]+)/gi
  ];
  
  const citations = [];
  
  citationPatterns.forEach((pattern, index) => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      citations.push({
        text: match[0].trim(),
        type: ['case', 'case', 'statute', 'rule', 'constitutional'][index],
        position: match.index,
        length: match[0].length
      });
    });
  });
  
  // Remove duplicates and sort by position
  return citations
    .filter((citation, index, self) => 
      self.findIndex(c => c.text === citation.text) === index
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, 15); // Limit to 15 citations
}

// Batch processing of multiple thinking responses
async function processBatch(thinkingResponses, jobId) {
  const results = {
    success: [],
    failed: [],
    totalTime: 0
  };
  
  const startTime = Date.now();
  
  grpoLog('info', 'Starting batch processing', {
    jobId,
    batchSize: thinkingResponses.length
  });
  
  try {
    // Process in smaller sub-batches for memory efficiency
    for (let i = 0; i < thinkingResponses.length; i += BATCH_SIZE) {
      const subBatch = thinkingResponses.slice(i, i + BATCH_SIZE);
      
      const subBatchPromises = subBatch.map(async (response) => {
        try {
          const result = await processThinkingResponse(response);
          results.success.push(result);
        } catch (error) {
          results.failed.push({
            messageId: response.messageId,
            error: error.message
          });
        }
      });
      
      await Promise.all(subBatchPromises);
      
      // Brief pause between sub-batches to prevent overwhelming the system
      if (i + BATCH_SIZE < thinkingResponses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    results.totalTime = Date.now() - startTime;
    
    grpoLog('info', 'Batch processing completed', {
      jobId,
      successCount: results.success.length,
      failedCount: results.failed.length,
      totalTime: results.totalTime
    });
    
    return results;
    
  } catch (error) {
    grpoLog('error', 'Batch processing failed', {
      jobId,
      error: error.message,
      totalTime: Date.now() - startTime
    });
    throw error;
  }
}

// Update average processing time statistic
function updateAverageProcessingTime(newTime) {
  const { totalProcessed, averageProcessingTime } = grpoWorkerState.stats;
  
  if (totalProcessed === 1) {
    grpoWorkerState.stats.averageProcessingTime = newTime;
  } else {
    grpoWorkerState.stats.averageProcessingTime = 
      (averageProcessingTime * (totalProcessed - 1) + newTime) / totalProcessed;
  }
}

// Handle incoming messages
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'grpo-process-thinking':
        const result = await processThinkingResponse(data);
        event.ports[0]?.postMessage({ success: true, data: result, id });
        break;
        
      case 'grpo-batch-process':
        const batchResult = await processBatch(data.responses, data.jobId);
        event.ports[0]?.postMessage({ success: true, data: batchResult, id });
        break;
        
      case 'grpo-get-stats':
        const stats = {
          ...grpoWorkerState.stats,
          uptime: Date.now() - grpoWorkerState.stats.startTime,
          activeJobs: grpoWorkerState.activeJobs.size,
          queueLength: grpoWorkerState.jobQueue.length
        };
        event.ports[0]?.postMessage({ success: true, data: stats, id });
        break;
        
      case 'grpo-clear-cache':
        try {
          await caches.delete(GRPO_CACHE_NAME);
          grpoLog('info', 'GRPO cache cleared');
          event.ports[0]?.postMessage({ success: true, id });
        } catch (error) {
          throw new Error(`Failed to clear cache: ${error.message}`);
        }
        break;
        
      default:
        throw new Error(`Unknown GRPO message type: ${type}`);
    }
    
  } catch (error) {
    grpoLog('error', 'Message handling error', {
      type,
      error: error.message
    });
    
    event.ports[0]?.postMessage({
      success: false,
      error: error.message,
      id
    });
  }
});

// Handle fetch events for GRPO API caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle GRPO API requests
  if (!url.pathname.startsWith(GRPO_API_BASE)) {
    return;
  }
  
  event.respondWith(handleGrpoRequest(event.request));
});

// Handle GRPO API requests with caching
async function handleGrpoRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;
  
  try {
    // Check cache for GET requests
    if (request.method === 'GET') {
      const cache = await caches.open(GRPO_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        grpoWorkerState.stats.cacheHits++;
        grpoLog('debug', 'GRPO cache hit', { path: url.pathname });
        return cachedResponse;
      }
    }
    
    // Forward to network
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(GRPO_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      grpoLog('debug', 'GRPO response cached', { path: url.pathname });
    }
    
    return networkResponse;
    
  } catch (error) {
    grpoLog('error', 'GRPO fetch error', {
      path: url.pathname,
      error: error.message
    });
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'GRPO service unavailable',
      details: error.message
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Periodic cleanup and maintenance
setInterval(() => {
  // Clean up old jobs from active jobs map
  const cutoffTime = Date.now() - 300000; // 5 minutes
  
  for (const [jobId, job] of grpoWorkerState.activeJobs) {
    if (job.startTime < cutoffTime) {
      grpoWorkerState.activeJobs.delete(jobId);
      grpoLog('warn', 'Cleaning up stale job', { jobId });
    }
  }
  
  // Log periodic stats
  if (grpoWorkerState.stats.totalProcessed > 0) {
    grpoLog('info', 'GRPO worker stats', {
      ...grpoWorkerState.stats,
      uptime: Date.now() - grpoWorkerState.stats.startTime,
      successRate: (grpoWorkerState.stats.successfulJobs / grpoWorkerState.stats.totalProcessed * 100).toFixed(2) + '%'
    });
  }
}, 60000); // Every minute

grpoLog('info', 'GRPO thinking worker initialized', {
  maxConcurrentJobs: MAX_CONCURRENT_GRPO_JOBS,
  batchSize: BATCH_SIZE,
  apiBase: GRPO_API_BASE
});