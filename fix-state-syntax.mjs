#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix $state type declaration syntax errors
 * Fix patterns like:
 * - $state<HTMLElement; → $state<HTMLElement | null>(null)
 * - $state<Type; → $state<Type | null>(null)
 * - $state<ReturnType<typeof func>() → $state<ReturnType<typeof func> | null>(null)
 * - Malformed generic patterns
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing $state type syntax errors...\n');

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

    // Fix $state<Type; → $state<Type | null>(null)
    const malformedStatePattern = /\$state<([^>]+);([^>]*?)>/g;
    const stateMatches = [...content.matchAll(malformedStatePattern)];

    if (stateMatches.length > 0) {
      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      for (const match of stateMatches) {
        const fullMatch = match[0];
        const typeContent = match[1].trim();
        const afterSemicolon = match[2].trim();

        // Build proper type
        let fixedType = typeContent;
        if (afterSemicolon) {
          fixedType = `${typeContent}${afterSemicolon}`;
        }

        // Add null union if not already present
        if (!fixedType.includes('null') && !fixedType.includes('undefined')) {
          fixedType = `${fixedType} | null`;
        }

        const fixed = `$state<${fixedType}>(null)`;
        modified = modified.replace(fullMatch, fixed);
        fileFixes++;
        console.log(`   ✅ ${fullMatch} → ${fixed}`);
      }
    }

    // Fix $state<ReturnType<typeof func>() patterns
    const returnTypePattern = /\$state<(ReturnType<[^>]+>)\(\)\s*\|\s*null>\(null\)/g;
    const returnTypeMatches = [...modified.matchAll(returnTypePattern)];

    for (const match of returnTypeMatches) {
      const fullMatch = match[0];
      const returnTypeContent = match[1];
      const fixed = `$state<${returnTypeContent} | null>(null)`;

      modified = modified.replace(fullMatch, fixed);
      fileFixes++;
      if (!stateMatches.length) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);
      console.log(`   ✅ Fixed ReturnType pattern: ${returnTypeContent}`);
    }

    // Fix malformed array types in $state
    const arrayTypePattern = /\$state<Array\(\)>/g;
    modified = modified.replace(arrayTypePattern, '$state<any[]>([])');
    if (arrayTypePattern.test(content)) {
      fileFixes++;
      if (!stateMatches.length && !returnTypeMatches.length) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);
      console.log(`   ✅ Fixed Array() → any[]`);
    }

    // Fix $state operators being used incorrectly
    const operatorPattern = /\$state\s*<\s*([^>]+)\s*>\s*([<>])\s*\(/g;
    const operatorMatches = [...modified.matchAll(operatorPattern)];

    for (const match of operatorMatches) {
      const fullMatch = match[0];
      const typeContent = match[1];
      const operator = match[2];

      // Fix the pattern by removing the erroneous operator
      const fixed = `$state<${typeContent}>(`;
      modified = modified.replace(fullMatch, fixed);
      fileFixes++;
      if (!stateMatches.length && !returnTypeMatches.length) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);
      console.log(`   ✅ Fixed operator pattern: removed '${operator}'`);
    }

    // Fix incomplete $state declarations
    const incompletePattern = /let\s+(\w+)\s*=\s*\$state<([^>]+)>\s*\(\s*\)/g;
    const incompleteMatches = [...modified.matchAll(incompletePattern)];

    for (const match of incompleteMatches) {
      const fullMatch = match[0];
      const varName = match[1];
      const typeContent = match[2];

      // Provide appropriate default value based on type
      let defaultValue = 'null';
      if (typeContent.includes('Array') || typeContent.includes('[]')) {
        defaultValue = '[]';
      } else if (typeContent.includes('boolean')) {
        defaultValue = 'false';
      } else if (typeContent.includes('number')) {
        defaultValue = '0';
      } else if (typeContent.includes('string')) {
        defaultValue = "''";
      }

      const fixed = `let ${varName} = $state<${typeContent}>(${defaultValue})`;
      modified = modified.replace(fullMatch, fixed);
      fileFixes++;
      if (!stateMatches.length && !returnTypeMatches.length && !operatorMatches.length) {
        console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);
      }
      console.log(`   ✅ Fixed incomplete $state: added default value ${defaultValue}`);
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

console.log(`\n🎉 $state type syntax fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);