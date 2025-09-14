#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix use directive syntax issues
 * Fix patterns like use:createEnhancedSubmit() → use:createEnhancedSubmit
 * Fix patterns like use:functionName() → use:functionName
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing use directive syntax issues...\n');

// Find all Svelte files
const svelteFiles = await glob(`${frontendDir}/**/*.svelte`, {
  ignore: ['**/node_modules/**', '**/build/**', '**/.svelte-kit/**']
});

let filesProcessed = 0;
let totalFixes = 0;

for (const filePath of svelteFiles) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;
    let fileFixes = 0;

    // Fix use:functionName() patterns where function returns {destroy}
    // Pattern: use:createEnhancedSubmit() → use:createEnhancedSubmit
    const useDirectivePattern = /\buse:(\w+)\(\)/g;
    const useMatches = [...content.matchAll(useDirectivePattern)];

    if (useMatches.length > 0) {
      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      for (const match of useMatches) {
        const fullMatch = match[0];
        const functionName = match[1];
        const fixed = `use:${functionName}`;

        modified = modified.replace(fullMatch, fixed);
        fileFixes++;
        console.log(`   ✅ ${fullMatch} → ${fixed}`);
      }
    }

    // Fix use directives with complex expressions that should be simple
    // Pattern: use:enhance(someFunction) where someFunction returns wrong type
    const complexUsePattern = /use:enhance\(\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{[^}]*\}\s*\)/g;
    const complexMatches = [...modified.matchAll(complexUsePattern)];

    for (const match of complexMatches) {
      // Replace complex enhance patterns with simple enhance
      modified = modified.replace(match[0], 'use:enhance');
      fileFixes++;
      console.log(`   ✅ Complex enhance pattern → use:enhance`);
    }

    // Fix action directive type mismatches
    // Look for enhance being called incorrectly
    const wrongEnhancePattern = /enhance\(\(\{[^}]*\}\)\s*=>\s*\{[^}]*\}\)/g;
    modified = modified.replace(wrongEnhancePattern, 'enhance');
    if (wrongEnhancePattern.test(content)) {
      fileFixes++;
      console.log(`   ✅ Fixed enhance() call syntax`);
    }

    if (fileFixes > 0) {
      writeFileSync(filePath, modified, 'utf-8');
      filesProcessed++;
      totalFixes += fileFixes;
      console.log(`   💾 Saved with ${fileFixes} fixes\n`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Use directive fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);