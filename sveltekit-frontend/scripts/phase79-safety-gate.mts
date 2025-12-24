/**
 * 🔒 Phase 79 Safety Gate
 * Validation engine to prevents corruption of codebase by LLM hallucinations.
 * Blocks: Markdown, Explanatory text, Invalid Syntax, Truncated code.
 */

import { parse } from 'svelte/compiler';
import ts from 'typescript';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitizedCode: string | null;
  confidence: number;
}

/**
 * Main Safety Gate Validator
 */
export async function validateContent(
  content: string,
  filePath: string
): Promise<ValidationResult> {
  const issues: string[] = [];
  const extension = filePath.split('.').pop()?.toLowerCase();

  // 1. Sanitize Markdown Wrappers
  let code = content;
  const markdownMatch = content.match(/```(?:typescript|ts|javascript|js|svelte|css|scss)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    code = markdownMatch[1].trim();
  }

  // 2. Reject Explanatory Text (Heuristic)
  const explanationPatterns = [
    /^Here is the fixed code/i,
    /^I returned the file/i,
    /^The error was causing/i,
    /^#\s+File:/i,
    /I cannot fix this/i,
    /Please check the/i
  ];

  if (explanationPatterns.some(p => p.test(code.substring(0, 100)))) {
    issues.push('Content appears to be explanatory text, not code');
  }

  // 3. Syntax Validation
  if (issues.length === 0) {
    try {
      if (['ts', 'mts', 'cts'].includes(extension || '')) {
        validateTypeScript(code);
      } else if (['js', 'mjs', 'cjs'].includes(extension || '')) {
        validateTypeScript(code); // TS parser handles JS
      } else if (extension === 'svelte') {
        validateSvelte(code);
      }
    } catch (e: any) {
      issues.push(`Syntax Error: ${e.message.split('\n')[0]}`);
    }
  }

  // 4. Content Integrity Check
  if (code.length < 10 && content.length > 50) {
    issues.push('Code extraction resulted in suspiciously short content');
  }

  return {
    isValid: issues.length === 0,
    issues,
    sanitizedCode: issues.length === 0 ? code : null,
    confidence: issues.length === 0 ? 1.0 : 0.0
  };
}

function validateTypeScript(code: string) {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      noEmit: true,
      target: ts.ScriptTarget.Latest
    }
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    const msg = typeof result.diagnostics[0].messageText === 'string'
      ? result.diagnostics[0].messageText
      : (result.diagnostics[0].messageText as any).messageText || 'Syntax Error';
    throw new Error(msg);
  }
}

function validateSvelte(code: string) {
  try {
    parse(code);
  } catch (e: any) {
    throw new Error(e.message);
  }
}
