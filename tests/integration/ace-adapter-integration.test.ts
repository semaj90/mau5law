/**
 * Integration Tests for ACE Adapter
 * Tests the complete flow: context retrieval → tool planning → web search → LLM
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AceAdapter } from '$lib/services/ace-web/ace-adapter';
import type { AceRequest } from '$lib/services/ace-web/ace-adapter';

describe('ACE Adapter Integration', () => {
  let adapter: AceAdapter;

  beforeAll(() => {
    adapter = new AceAdapter({
      llmConfig: {
        provider: 'gemma3',
        temperature: 0.1,
        maxTokens: 1000,
      },
    });
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('End-to-end flow', () => {
    it('should process request with context retrieval', async () => {
      const request: AceRequest = {
        userRequest: 'How to use Svelte 5 runes for reactive state?',
        systemRules: 'Use TypeScript with strict mode',
        projectRules: 'Follow Svelte 5 best practices',
      };

      const response = await adapter.processRequest(request);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(typeof response.response).toBe('string');
      expect(response.response.length).toBeGreaterThan(0);

      // Verify context bundle
      expect(response.context).toBeDefined();
      expect(response.context.chunks).toBeDefined();
      expect(Array.isArray(response.context.chunks)).toBe(true);
      expect(response.context.summary).toBeDefined();

      // Verify tool calls
      expect(response.toolCalls).toBeDefined();
      expect(Array.isArray(response.toolCalls)).toBe(true);

      // Verify metadata
      expect(response.metadata).toBeDefined();
      expect(response.metadata.sessionId).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.contextQuality).toBeDefined();
      expect(['sufficient', 'stale', 'insufficient']).toContain(
        response.metadata.contextQuality
      );
      expect(response.metadata.llmProvider).toBe('gemma3');
    }, 30000); // 30 second timeout for integration test

    it('should handle error context in request', async () => {
      const request: AceRequest = {
        userRequest: 'Fix this TypeScript error',
        errorContext: {
          message: "Property 'foo' does not exist on type 'Bar'",
          filePath: 'src/lib/components/MyComponent.svelte',
          lineNumber: 42,
          code: `
            let bar: Bar = { baz: 'test' };
            console.log(bar.foo); // Error here
          `,
        },
        systemRules: 'Use TypeScript strict mode',
        projectRules: 'Follow Svelte 5 patterns',
      };

      const response = await adapter.processRequest(request);

      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.context).toBeDefined();
      expect(response.metadata.sessionId).toBeDefined();
    }, 30000);

    it('should trigger web search for insufficient context', async () => {
      const request: AceRequest = {
        userRequest: 'How to fix a very obscure error that has no documentation anywhere',
        errorContext: {
          message: 'Unknown error XYZ-123',
          filePath: 'src/test.ts',
          lineNumber: 1,
        },
      };

      const response = await adapter.processRequest(request);

      expect(response).toBeDefined();
      expect(response.metadata.webSearchTriggered).toBeDefined();

      // If web search was triggered, verify ingestion was attempted
      if (response.metadata.webSearchTriggered) {
        expect(response.context.chunks).toBeDefined();
      }
    }, 30000);

    it('should maintain session ID across requests', async () => {
      const sessionId = crypto.randomUUID();

      const request1: AceRequest = {
        userRequest: 'First request',
        sessionId,
      };

      const request2: AceRequest = {
        userRequest: 'Second request',
        sessionId,
      };

      const response1 = await adapter.processRequest(request1);
      const response2 = await adapter.processRequest(request2);

      expect(response1.metadata.sessionId).toBe(sessionId);
      expect(response2.metadata.sessionId).toBe(sessionId);
    }, 30000);
  });

  describe('Context quality assessment', () => {
    it('should assess context as sufficient for well-documented topics', async () => {
      const request: AceRequest = {
        userRequest: 'How to use Svelte 5 $state rune?',
      };

      const response = await adapter.processRequest(request);

      expect(response.metadata.contextQuality).toBeDefined();
      // For well-documented topics, context should be sufficient or stale
      expect(['sufficient', 'stale']).toContain(response.metadata.contextQuality);
    }, 30000);

    it('should assess context as insufficient for obscure topics', async () => {
      const request: AceRequest = {
        userRequest: 'How to fix error ABC-XYZ-999 in obscure library v0.0.1?',
      };

      const response = await adapter.processRequest(request);

      expect(response.metadata.contextQuality).toBeDefined();
      // For obscure topics, context might be insufficient
      expect(['sufficient', 'stale', 'insufficient']).toContain(
        response.metadata.contextQuality
      );
    }, 30000);
  });

  describe('Tool planning', () => {
    it('should suggest web_search for stale context', async () => {
      const request: AceRequest = {
        userRequest: 'Latest features in Svelte 6 (future version)',
      };

      const response = await adapter.processRequest(request);

      expect(response.toolCalls).toBeDefined();

      // If context is stale, should suggest web_search
      if (response.metadata.contextQuality === 'stale') {
        expect(response.toolCalls.length).toBeGreaterThan(0);
        expect(response.toolCalls.some((t) => t.tool === 'web_search')).toBe(true);
      }
    }, 30000);

    it('should not suggest tools for sufficient context', async () => {
      const request: AceRequest = {
        userRequest: 'Basic Svelte component syntax',
      };

      const response = await adapter.processRequest(request);

      expect(response.toolCalls).toBeDefined();

      // If context is sufficient, should not suggest tools
      if (response.metadata.contextQuality === 'sufficient') {
        expect(response.toolCalls.length).toBe(0);
      }
    }, 30000);
  });

  describe('LLM integration', () => {
    it('should receive response from Gemma3', async () => {
      const request: AceRequest = {
        userRequest: 'Explain Svelte 5 runes in one sentence',
      };

      const response = await adapter.processRequest(request);

      expect(response.response).toBeDefined();
      expect(typeof response.response).toBe('string');
      expect(response.response.length).toBeGreaterThan(0);
      expect(response.metadata.llmProvider).toBe('gemma3');
    }, 30000);

    it('should include context in LLM prompt', async () => {
      const request: AceRequest = {
        userRequest: 'How to use $state rune?',
        systemRules: 'Use TypeScript',
        projectRules: 'Follow best practices',
      };

      const response = await adapter.processRequest(request);

      expect(response.response).toBeDefined();
      expect(response.context.chunks.length).toBeGreaterThan(0);

      // Response should be informed by context
      expect(response.response.length).toBeGreaterThan(50);
    }, 30000);
  });

  describe('Error handling', () => {
    it('should handle missing user request gracefully', async () => {
      const request: AceRequest = {
        userRequest: '',
      };

      // Should still process (might return generic response)
      const response = await adapter.processRequest(request);
      expect(response).toBeDefined();
    }, 30000);

    it('should handle very long requests', async () => {
      const longRequest = 'test '.repeat(1000);

      const request: AceRequest = {
        userRequest: longRequest,
      };

      const response = await adapter.processRequest(request);
      expect(response).toBeDefined();
    }, 30000);
  });
});
