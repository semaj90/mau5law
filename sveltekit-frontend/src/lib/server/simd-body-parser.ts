/**
 * SIMD-accelerated body parser for hot SvelteKit API endpoints
 * Optimizes JSON parsing for legal AI CRUD operations
 */

import type { RequestEvent } from '@sveltejs/kit';
import { nodeSIMDJSON, fastParse } from '$lib/services/node-simd-json.js';
import { dev } from '$app/environment';

// Performance monitoring
interface BodyParseMetrics {
  endpoint: string;
  contentLength: number;
  parseTime: number;
  simdUsed: boolean;
  timestamp: number;
}

class SIMDBodyParser {
  private metrics: BodyParseMetrics[] = [];
  private simdEnabled: boolean;
  private hotEndpoints: Set<string> = new Set([
    '/api/ai/chat',
    '/api/ai/inference', 
    '/api/documents/search',
    '/api/documents/parse',
    '/api/documents/batch',
    '/api/legal/entities',
    '/api/legal/citations',
    '/api/embeddings/generate',
    '/api/embeddings/search',
    '/api/cache/store',
    '/api/cache/retrieve'
  ]);

  constructor() {
    // Check environment variable for SIMD toggle
    this.simdEnabled = process.env.USE_SIMDJSON_NODE === '1' || 
                       process.env.ENABLE_SIMD_JSON === 'true';
    
    if (dev) {
      console.log('🚀 SIMD Body Parser initialized:', {
        simdEnabled: this.simdEnabled,
        hotEndpoints: this.hotEndpoints.size
      });
    }
  }

  /**
   * Fast body reader with SIMD acceleration for hot endpoints
   */
  async readBodyFast<T = any>(event: RequestEvent): Promise<T | null> {
    const startTime = performance.now();
    const endpoint = event.url.pathname;
    
    try {
      // Check if this is a hot endpoint that benefits from SIMD
      const isHotEndpoint = this.isHotEndpoint(endpoint);
      const shouldUseSIMD = this.simdEnabled && isHotEndpoint;

      // Get request body
      const body = await event.request.text();
      
      if (!body || body.length === 0) {
        return null;
      }

      let parsed: T;
      
      if (shouldUseSIMD) {
        // Use SIMD-accelerated parsing
        parsed = fastParse<T>(body);
        
        if (dev) {
          console.log(`🚀 SIMD parsed ${endpoint} (${body.length} bytes)`);
        }
      } else {
        // Use standard JSON.parse for non-hot endpoints
        parsed = JSON.parse(body);
      }

      // Record metrics
      const parseTime = performance.now() - startTime;
      this.recordMetrics({
        endpoint,
        contentLength: body.length,
        parseTime,
        simdUsed: shouldUseSIMD,
        timestamp: Date.now()
      });

      return parsed;

    } catch (error) {
      // Fallback to standard JSON.parse on any error
      try {
        const body = await event.request.text();
        const fallbackResult = JSON.parse(body);
        
        const parseTime = performance.now() - startTime;
        this.recordMetrics({
          endpoint,
          contentLength: body.length,
          parseTime,
          simdUsed: false,
          timestamp: Date.now()
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Body parsing failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Batch body parser for multiple documents
   */
  async readBatchBodyFast<T = any>(event: RequestEvent): Promise<T[]> {
    const startTime = performance.now();
    const endpoint = event.url.pathname;
    
    try {
      const body = await event.request.text();
      
      if (!body || body.length === 0) {
        return [];
      }

      const shouldUseSIMD = this.simdEnabled && this.isHotEndpoint(endpoint);
      let results: T[];

      if (shouldUseSIMD) {
        // Use SIMD batch processing
        const jsonStrings = this.extractJSONStrings(body);
        results = await nodeSIMDJSON.batchParse<T>(jsonStrings);
        
        if (dev) {
          console.log(`🚀 SIMD batch parsed ${results.length} items from ${endpoint}`);
        }
      } else {
        // Standard JSON parsing
        const parsed = JSON.parse(body);
        results = Array.isArray(parsed) ? parsed : [parsed];
      }

      const parseTime = performance.now() - startTime;
      this.recordMetrics({
        endpoint,
        contentLength: body.length,
        parseTime,
        simdUsed: shouldUseSIMD,
        timestamp: Date.now()
      });

      return results;

    } catch (error) {
      console.error('Batch body parsing failed:', error);
      return [];
    }
  }

  /**
   * Streaming body parser for large legal documents
   */
  async readStreamingBodyFast<T = any>(event: RequestEvent): Promise<AsyncGenerator<T, void, unknown>> {
    const endpoint = event.url.pathname;
    const shouldUseSIMD = this.simdEnabled && this.isHotEndpoint(endpoint);
    
    return this.createStreamingParser<T>(event.request.body, shouldUseSIMD);
  }

  /**
   * Create async generator for streaming JSON parsing
   */
  private async* createStreamingParser<T>(
    body: ReadableStream<Uint8Array> | null, 
    useSIMD: boolean
  ): AsyncGenerator<T, void, unknown> {
    if (!body) return;

    const reader = body.getReader();
    let buffer = '';
    let braceCount = 0;
    let currentDoc = '';
    let inString = false;
    let escapeNext = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        // Process buffer character by character to find complete JSON objects
        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          
          if (escapeNext) {
            escapeNext = false;
            currentDoc += char;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            currentDoc += char;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
            currentDoc += char;
            continue;
          }

          if (inString) {
            currentDoc += char;
            continue;
          }

          if (char === '{') {
            braceCount++;
            currentDoc += char;
          } else if (char === '}') {
            braceCount--;
            currentDoc += char;
            
            if (braceCount === 0 && currentDoc.trim()) {
              // Complete JSON object found
              try {
                const parsed = useSIMD ? 
                  fastParse<T>(currentDoc.trim()) : 
                  JSON.parse(currentDoc.trim());
                yield parsed;
              } catch (error) {
                console.warn('Failed to parse streaming JSON chunk:', error);
              }
              currentDoc = '';
            }
          } else if (char !== ',' && char !== ' ' && char !== '\n' && char !== '\t') {
            currentDoc += char;
          }
        }

        // Keep unprocessed part of buffer
        buffer = currentDoc;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Legal document-specific body parser with entity extraction
   */
  async readLegalDocumentFast(event: RequestEvent): Promise<{
    document: any;
    entities: Array<{ type: string; text: string; confidence: number }>;
    citations: Array<{ citation: string; court: string }>;
    parseTime: number;
  } | null> {
    const startTime = performance.now();
    
    try {
      const body = await this.readBodyFast(event);
      if (!body) return null;

      // Extract legal entities using optimized patterns
      const entities = this.extractLegalEntities(body.content || '');
      const citations = this.extractCitations(body.content || '');
      
      const parseTime = performance.now() - startTime;
      
      return {
        document: body,
        entities,
        citations,
        parseTime
      };

    } catch (error) {
      console.error('Legal document parsing failed:', error);
      return null;
    }
  }

  /**
   * Extract legal entities with optimized regex
   */
  private extractLegalEntities(content: string): Array<{ type: string; text: string; confidence: number }> {
    const entities: Array<{ type: string; text: string; confidence: number }> = [];
    
    const patterns = [
      { pattern: /\b\d+\s+U\.S\.C\.\s+§?\s*\d+/g, type: 'statute', confidence: 0.95 },
      { pattern: /\b\d+\s+C\.F\.R\.\s+§?\s*\d+/g, type: 'regulation', confidence: 0.90 },
      { pattern: /\b\d+\s+F\.\d+d\s+\d+/g, type: 'case_citation', confidence: 0.85 },
      { pattern: /\b\d+\s+U\.S\.\s+\d+/g, type: 'supreme_court', confidence: 0.98 },
      { pattern: /\b(?:Supreme Court|District Court|Circuit Court|Court of Appeals)\b/gi, type: 'court', confidence: 0.80 }
    ];

    for (const { pattern, type, confidence } of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(content)) !== null) {
        entities.push({
          type,
          text: match[0],
          confidence
        });
      }
    }

    return entities;
  }

  /**
   * Extract legal citations with court identification
   */
  private extractCitations(content: string): Array<{ citation: string; court: string }> {
    const citations: Array<{ citation: string; court: string }> = [];
    const citationPattern = /(\d+)\s+(U\.S\.|F\.\d+d|S\.Ct\.)\s+(\d+)/g;
    
    let match;
    while ((match = citationPattern.exec(content)) !== null) {
      const court = this.identifyCourt(match[2]);
      citations.push({
        citation: match[0],
        court
      });
    }
    
    return citations;
  }

  /**
   * Identify court from citation reporter
   */
  private identifyCourt(reporter: string): string {
    switch (reporter) {
      case 'U.S.': return 'Supreme Court';
      case 'S.Ct.': return 'Supreme Court';
      case 'F.2d':
      case 'F.3d': return 'Federal Circuit';
      default: return 'Unknown';
    }
  }

  /**
   * Check if endpoint is hot (frequently accessed)
   */
  private isHotEndpoint(pathname: string): boolean {
    return this.hotEndpoints.has(pathname) || 
           pathname.startsWith('/api/ai/') ||
           pathname.startsWith('/api/documents/') ||
           pathname.startsWith('/api/legal/');
  }

  /**
   * Extract JSON strings from concatenated format
   */
  private extractJSONStrings(body: string): string[] {
    // Handle both array format and newline-delimited JSON
    if (body.trim().startsWith('[')) {
      const parsed = JSON.parse(body);
      return Array.isArray(parsed) ? parsed.map(item => JSON.stringify(item)) : [body];
    }
    
    // Handle newline-delimited JSON
    return body.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('{') || line.startsWith('[')));
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metric: BodyParseMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalRequests: number;
    simdRequests: number;
    averageParseTime: number;
    simdSpeedup: number;
    hotEndpointUsage: Record<string, number>;
  } {
    const total = this.metrics.length;
    const simdMetrics = this.metrics.filter(m => m.simdUsed);
    const standardMetrics = this.metrics.filter(m => !m.simdUsed);
    
    const avgSimdTime = simdMetrics.length > 0 
      ? simdMetrics.reduce((sum, m) => sum + m.parseTime, 0) / simdMetrics.length 
      : 0;
    
    const avgStandardTime = standardMetrics.length > 0
      ? standardMetrics.reduce((sum, m) => sum + m.parseTime, 0) / standardMetrics.length
      : 0;
    
    const speedup = avgStandardTime > 0 ? avgStandardTime / avgSimdTime : 1;
    
    // Count usage per endpoint
    const endpointUsage: Record<string, number> = {};
    this.metrics.forEach(m => {
      endpointUsage[m.endpoint] = (endpointUsage[m.endpoint] || 0) + 1;
    });
    
    return {
      totalRequests: total,
      simdRequests: simdMetrics.length,
      averageParseTime: total > 0 ? this.metrics.reduce((sum, m) => sum + m.parseTime, 0) / total : 0,
      simdSpeedup: speedup,
      hotEndpointUsage: endpointUsage
    };
  }

  /**
   * Toggle SIMD on/off at runtime
   */
  toggleSIMD(enabled: boolean): void {
    this.simdEnabled = enabled;
    if (dev) {
      console.log(`🔄 SIMD Body Parser ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Add/remove hot endpoints at runtime
   */
  configureHotEndpoint(endpoint: string, isHot: boolean): void {
    if (isHot) {
      this.hotEndpoints.add(endpoint);
    } else {
      this.hotEndpoints.delete(endpoint);
    }
    
    if (dev) {
      console.log(`🎯 Endpoint ${endpoint} ${isHot ? 'added to' : 'removed from'} hot list`);
    }
  }
}

// Export singleton instance
export const simdBodyParser = new SIMDBodyParser();

// Convenience functions for use in API routes
export const readBodyFast = <T = any>(event: RequestEvent): Promise<T | null> => 
  simdBodyParser.readBodyFast<T>(event);

export const readBatchBodyFast = <T = any>(event: RequestEvent): Promise<T[]> => 
  simdBodyParser.readBatchBodyFast<T>(event);

export const readStreamingBodyFast = <T = any>(event: RequestEvent) => 
  simdBodyParser.readStreamingBodyFast<T>(event);

export const readLegalDocumentFast = (event: RequestEvent) =>
  simdBodyParser.readLegalDocumentFast(event);

// Export types
export type { BodyParseMetrics };
export { type RequestEvent };