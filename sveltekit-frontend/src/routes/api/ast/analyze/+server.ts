/**
 * Phase 74: AST Analysis API Endpoint
 * POST /api/ast/analyze
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { svelteCheckAnalyzer } from '$lib/ast/svelte-check-analyzer';
import { suggestionEngine } from '$lib/ast/suggestion-engine';

export interface AnalyzeRequest {
  code: string;
  language: 'typescript' | 'javascript' | 'svelte';
  filename?: string;
  includesuggestions?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    errors: any[];
    functions: any[];
    variables: any[];
    types: any[];
    imports: string[];
    exports: string[];
    complexity: number;
  };
  suggestions?: any[];
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: AnalyzeRequest = await request.json();
    const { code, language, filename, includesuggestions = true } = body;

    if (!code) {
      return json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    // Determine filename based on language
    const file = filename || (language === 'svelte' ? 'Component.svelte' : 'temp.ts');

    // Analyze code
    const analysis = language === 'svelte'
      ? svelteCheckAnalyzer.analyzeSvelte(code, file)
      : svelteCheckAnalyzer.analyze(code, file);

    // Get suggestions for errors if requested
    let suggestions: any[] = [];
    if (includesuggestions && analysis.errors.length > 0) {
      const suggestionPromises = analysis.errors.slice(0, 5).map(error =>
        suggestionEngine.getSuggestions(error, code)
      );
      const allSuggestions = await Promise.all(suggestionPromises);
      suggestions = allSuggestions.flat();
    }

    return json({
      success: true,
      analysis,
      suggestions,
    });
  } catch (err) {
    console.error('AST analysis error:', err);
    return json(
      { success: false, error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
};
