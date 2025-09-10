/*
 * Test Context7 MCP Helper Functions
 * Tests the utility functions from mcp-context72-get-library-docs
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSvelte5Docs, getXStateDocs } from '$lib/mcp-context72-get-library-docs';

type DocSnippet = {
  content?: string;
  title?: string;
  code?: string;
  description?: string;
};

type LibraryDocSuccess = {
  snippets?: DocSnippet[];
  metadata?: { tokenCount?: number };
};

type LibraryDocError = { error: string };
type LibraryDocResult = LibraryDocSuccess | LibraryDocError;

const isErrorResult = (r: LibraryDocResult): r is LibraryDocError =>
  typeof r === 'object' && r !== null && 'error' in r;

const summarize = (r: LibraryDocResult) => {
  const ok = !isErrorResult(r);
  let firstSnippet: string | null = null;
  if (ok) {
    const s = r.snippets?.[0];
    const raw = s?.content ?? s?.code ?? s?.description ?? null;
    firstSnippet = typeof raw === 'string' ? raw.slice(0, 120) : null;
  }
  return {
    status: ok ? 'success' : 'error',
    tokenCount: ok ? (r.metadata?.tokenCount ?? 0) : 0,
    snippets: ok ? (r.snippets?.length ?? 0) : 0,
    firstSnippet,
    error: isErrorResult(r) ? r.error : null,
  };
};

export const GET: RequestHandler = async ({ fetch }) => {
  try {
    console.log('🧪 Testing Context7 MCP helper functions (melt-ui & bits-ui removed)...');

    // Test remaining helper functions with event.fetch
    const [svelteRunes, xstateMachine]: LibraryDocResult[] = await Promise.all([
      getSvelte5Docs('runes', fetch).catch((e: unknown) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
      getXStateDocs('machine', fetch).catch((e: unknown) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
    ]);

    const results = {
      svelteRunes: summarize(svelteRunes),
      xstateMachine: summarize(xstateMachine),
    };

    const all: LibraryDocResult[] = [svelteRunes, xstateMachine];
    const successful = all.filter((r) => !isErrorResult(r)).length;
    const failed = all.length - successful;

    return json({
      success: true,
      message: 'Context7 MCP integration test completed',
      results,
      summary: {
        totalTests: all.length,
        successful,
        failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ Context7 test error:', error);
    const message = error instanceof Error ? error.message : 'Context7 test failed';

    return json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};
