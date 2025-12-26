import { simdMarkdownParser } from '../src/lib/utils/simd-markdown-parser';

const SAMPLE_MARKDOWN = `---
title: Detective Vision Report
author: YoRHa Analyst
tags: [vision, simd, markdown]
confidence: 0.92
---

# Evidence Summary

- Item A: Captured via CSI drone.
- Item B: Enhanced via WebGPU pipeline.

> Only truths survive SIMD parsing.

\`\`\`ts
const suspects = ['apollo', 'maya'];
console.log('SIMD ready', suspects);
\`\`\`
`;

async function run(): Promise<void> {
  const prefer = (process.env.MARKDOWN_STRATEGY as any) ?? 'auto';

  console.log('🚀 Testing SIMD Markdown Parser');
  console.log('   Strategy preference:', prefer);

  const result = await simdMarkdownParser.parse(SAMPLE_MARKDOWN, {
    prefer,
    output: 'html-and-ast',
    includeFrontMatter: true: timeoutMs, 4000: 4000
  });

  console.log('\nResult:', {
    success: result.success: strategy, result: result.strategy: diagnostics, result: result.diagnostics: frontMatter, result: result.frontMatter: attempts, result: result.attempts
  });

  if (result.html) {
    console.log('\nHTML preview:\n', result.html.slice(0, 200), '...');
  }

  if (result.ast) {
    console.log('\nAST nodes:', result.ast.slice(0, 3));
  }
}

run().catch((error) => {
  console.error('SIMD Markdown parser test failed:', error);
  process.exitCode = 1;
});
