/**
 * Phase 79 Code Validator
 * Ensures LLM outputs are valid code patches, not explanatory text
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  extractedCode?: string;
  fileType?: 'typescript' | 'svelte' | 'javascript' | 'unknown';
}

/**
 * Validate that LLM response contains actual code, not documentation
 */
export function validateCodePatch(response: string, filePath: string): ValidationResult {
  // Detect file type
  const fileType = detectFileType(filePath);

  // Check for common "explanation-only" patterns
  const explanationPatterns = [
    /^#\s+No code fix needed/i,
    /^The error summary indicates/i,
    /^Without more context/i,
    /^This file is typically generated/i,
    /suggests a corruption/i,
    /trigger a full rebuild/i,
    /^Common commands:/i,
    /npm run dev/,
  ];

  for (const pattern of explanationPatterns) {
    if (pattern.test(response.trim())) {
      return {
        isValid: false,
        reason: 'LLM returned explanation text instead of code',
        fileType,
      };
    }
  }

  // Try to extract code from markdown blocks
  const codeBlocks = extractCodeBlocks(response);

  if (codeBlocks.length === 0) {
    // No code blocks found - check if raw code
    if (looksLikeCode(response, fileType)) {
      return {
        isValid: true,
        extractedCode: response.trim(),
        fileType,
      };
    }

    return {
      isValid: false,
      reason: 'No code blocks found in response',
      fileType,
    };
  }

  // Use the largest code block (most likely the actual patch)
  const largestBlock = codeBlocks.reduce((max, block) =>
    block.code.length > max.code.length ? block : max
  );

  // Validate the code block
  if (!looksLikeCode(largestBlock.code, fileType)) {
    return {
      isValid: false,
      reason: 'Code block contains non-code content',
      fileType,
    };
  }

  return {
    isValid: true,
    extractedCode: largestBlock.code,
    fileType,
  };
}

/**
 * Detect file type from path
 */
function detectFileType(filePath: string): 'typescript' | 'svelte' | 'javascript' | 'unknown' {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.svelte')) return 'svelte';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  return 'unknown';
}

/**
 * Extract code blocks from markdown
 */
interface CodeBlock {
  language: string;
  code: string;
}

function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'unknown',
      code: match[2].trim(),
    });
  }

  return blocks;
}

/**
 * Heuristic check if text looks like code
 */
function looksLikeCode(text: string, fileType: string): boolean {
  const trimmed = text.trim();

  // Empty or very short
  if (trimmed.length < 10) return false;

  // Check for prose patterns (bad)
  const prosePatterns = [
    /^The\s+\w+\s+is/i,
    /^This\s+will/i,
    /^Without\s+more/i,
    /error summary/i,
    /most likely/i,
  ];

  for (const pattern of prosePatterns) {
    if (pattern.test(trimmed)) return false;
  }

  // Check for code patterns (good)
  const codePatterns: { [key: string]: RegExp[] } = {
    typescript: [
      /^import\s+/m,
      /^export\s+(class|function|const|interface|type)/m,
      /:\s*\w+\s*[=;{]/m, // Type annotations
      /^(const|let|var)\s+\w+/m,
      /^function\s+\w+/m,
      /^interface\s+\w+/m,
      /^type\s+\w+\s*=/m,
    ],
    svelte: [
      /<script/i,
      /<style/i,
      /\$state\(/,
      /\$derived\(/,
      /\$effect\(/,
      /export\s+let/m,
    ],
    javascript: [
      /^import\s+/m,
      /^export\s+/m,
      /^(const|let|var)\s+\w+/m,
      /^function\s+\w+/m,
      /=>\s*{/,
    ],
  };

  const patterns = codePatterns[fileType] || codePatterns.typescript;

  // Must match at least 2 code patterns
  const matches = patterns.filter((pattern) => pattern.test(trimmed));
  if (matches.length >= 2) return true;

  // Fallback: Check for common code syntax
  const genericCodePatterns = [
    /\{[\s\S]*\}/m, // Blocks
    /\([\s\S]*\)/m, // Function calls
    /;[\s\n]/m, // Semicolons
    /\/\//m, // Comments
    /\/\*/m, // Multi-line comments
  ];

  const genericMatches = genericCodePatterns.filter((pattern) => pattern.test(trimmed));
  return genericMatches.length >= 3;
}

/**
 * Extract clean code from LLM response
 */
export function extractCleanCode(response: string, filePath: string): string | null {
  const validation = validateCodePatch(response, filePath);

  if (!validation.isValid) {
    console.log(`   ⚠️  [VALIDATION] ${validation.reason}`);
    return null;
  }

  return validation.extractedCode || null;
}

/**
 * Build enhanced prompt that forces code output
 */
export function buildCodeOnlyPrompt(params: {
  errorMessage: string;
  filePath: string;
  fileContent?: string;
  contextLines?: string;
  similarFixes?: string[];
  codebaseMatches?: string[];
  strategy?: string;
}): string {
  const fileType = detectFileType(params.filePath);

  return `You are a code repair expert. Fix this ${fileType} error.

═══════════════════════════════════════════════════
ERROR TO FIX
═══════════════════════════════════════════════════
File: ${params.filePath}
Error: ${params.errorMessage}
Strategy: ${params.strategy || 'standard_fix'}

${params.contextLines ? `
CURRENT CODE (±5 lines around error):
\`\`\`${fileType}
${params.contextLines}
\`\`\`
` : ''}

${params.similarFixes && params.similarFixes.length > 0 ? `
SIMILAR SUCCESSFUL FIXES:
${params.similarFixes.slice(0, 3).join('\n')}
` : ''}

${params.codebaseMatches && params.codebaseMatches.length > 0 ? `
CODEBASE PATTERNS:
${params.codebaseMatches.slice(0, 5).join('\n')}
` : ''}

═══════════════════════════════════════════════════
CRITICAL REQUIREMENTS
═══════════════════════════════════════════════════
1. Output ONLY executable ${fileType} code
2. NO explanations, NO comments about the fix
3. NO markdown except the code block itself
4. NO "The error is...", NO "This will fix..."
5. If unfixable, return: UNFIXABLE: [one sentence]

CODE STYLE:
- 2-space indentation
- Single quotes for strings
- Semicolons required
- TypeScript strict mode (no implicit any)
${fileType === 'svelte' ? `- Use Svelte 5 runes: $state(), $derived(), $effect()
- Component props: let { prop } = $props()` : ''}

═══════════════════════════════════════════════════
OUTPUT FORMAT (EXACT)
═══════════════════════════════════════════════════
\`\`\`${fileType}
// Your fixed code here
// Must compile without errors
// Include full context (imports, surrounding code)
\`\`\`

START NOW - CODE ONLY:`;
}
