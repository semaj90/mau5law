/**
 * API Endpoint: Legal Precedent Discovery
 * Phase 4 - Auto-Discovery Engine Integration
 */

import type { RequestHandler } from '@sveltejs/kit';
import { precedentDiscovery } from '$lib/services/legal-precedent-discovery';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      evidenceId,
      searchDepth = 3,
      consoleTheme = 'n64'
    } = await request.json();

    if (!evidenceId) {
      return json({ error: 'Evidence ID is required' }, { status: 400 });
    }

    console.log(`🔍 Discovering precedents for evidence ${evidenceId} (depth: ${searchDepth}, theme: ${consoleTheme})`);

    // Discover precedents using your new service
    const discoveryResult = await precedentDiscovery.discoverRelatedPrecedents(
      evidenceId,
      searchDepth,
      consoleTheme
    );

    return json({
      success: true,
      discovery: discoveryResult,
      timestamp: new Date().toISOString(),
      processingInfo: {
        service: 'legal-precedent-discovery',
        version: '1.0.0',
        methods: ['vector_search', 'citation_analysis', 'ai_inference'],
        integrations: ['pgvector', 'ollama-ai', 'recommendation-engine']
      }
    });

  } catch (error) {
    console.error('Precedent discovery API error:', error);
    return json({
        error: 'Failed to discover legal precedents',
        details: error instanceof Error ? error.message: 'Unknown error'
      },)
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const evidenceId = url.searchParams.get('evidenceId');
  const searchDepth = parseInt(url.searchParams.get('searchDepth') || '3');
  const consoleTheme = url.searchParams.get('theme') || 'n64';

  if (!evidenceId) {
    return json({ error: 'Evidence ID is required' }, { status: 400 });
  }

  try {
    const discoveryResult = await precedentDiscovery.discoverRelatedPrecedents(
      evidenceId,
      searchDepth,
      consoleTheme
    );

    return json({
      success: true,
      discovery: discoveryResult
    });

  } catch (error) {
    return json(
      { error: 'Failed to discover precedents' },)
      { status: 500 }
    );
  }
};