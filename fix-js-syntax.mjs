#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix JavaScript syntax errors
 * Fix patterns like:
 * - Missing parentheses in function calls
 * - Malformed object literals
 * - Missing closing parentheses
 * - Unexpected tokens
 * - HTML comment damage in transitions
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing JavaScript syntax errors...\n');

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

    // Fix missing closing parentheses in common patterns
    const patterns = [
      // reject(new Error(event.data.error); → reject(new Error(event.data.error));
      {
        pattern: /reject\(new Error\([^)]+\);/g,
        fix: (match) => match.replace(/\);$/, '));'),
        description: 'Fixed reject(new Error) missing parenthesis'
      },

      // Function calls missing closing parens
      {
        pattern: /console\.log\([^)]+\(getCurrentConfig\(\);/g,
        fix: (match) => match.replace(/getCurrentConfig\(\);/, 'getCurrentConfig());'),
        description: 'Fixed getCurrentConfig() missing parenthesis'
      },

      // Object.entries(result.metrics) missing closing paren
      {
        pattern: /Object\.entries\([^)]+\.metrics\) as \[key, value\]/g,
        fix: (match) => match,
        description: 'Fixed Object.entries() pattern'
      },

      // Math.max/min patterns with missing parens
      {
        pattern: /Math\.(max|min)\([^)]+;/g,
        fix: (match) => match.replace(/;$/, ');'),
        description: 'Fixed Math operations missing parenthesis'
      },

      // HTML comment damage in transitions
      {
        pattern: /\/\* transition removed \*\/>\s*}/g,
        fix: () => '>',
        description: 'Fixed HTML comment damage in transitions'
      },

      // Malformed const declarations
      {
        pattern: /const (\w+)\s*>\s*\(\[/g,
        fix: (match, varName) => `const ${varName} = $state([`,
        description: 'Fixed malformed const declarations'
      },

      // Missing equals signs in assignments
      {
        pattern: /const (\w+)\s+\(\[/g,
        fix: (match, varName) => `const ${varName} = ([`,
        description: 'Fixed missing equals in const assignments'
      },

      // Operators being used incorrectly
      {
        pattern: /=\s*\$state<([^>]+)>\([^)]*\)>\s*\(/g,
        fix: (match, type) => `= $state<${type}>(`,
        description: 'Fixed malformed $state assignments'
      },

      // RequestOptions.body missing property
      {
        pattern: /requestOptions\.body\s*=\s*JSON\.stringify/g,
        fix: (match) => {
          // This is a type issue, not syntax - check if we need interface extension
          return match;
        },
        description: 'RequestOptions body property'
      }
    ];

    if (content.includes('reject(new Error(event.data.error);') ||
        content.includes('getCurrentConfig();') ||
        content.includes('/* transition removed */') ||
        content.includes('Math.max(0, Math.min(100, baseValue + variation);') ||
        content.includes('const componentTypes >([') ||
        content.includes('Object.entries(result.metrics) as [key, value]') ||
        content.includes('apiEndpoints.filter(ep => suite.endpoints.includes(ep.id);') ||
        content.includes('updateComponentConfig(`demo-${selectedComponent}`, getCurrentConfig();') ||
        content.includes('Object.fromEntries(response.headers.entries();')) {

      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      // Fix missing closing parentheses patterns
      modified = modified.replace(/reject\(new Error\([^)]+\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed reject(new Error) missing parenthesis`);
        return match.replace(/\);$/, '));');
      });

      modified = modified.replace(/getCurrentConfig\(\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed getCurrentConfig() missing parenthesis`);
        return 'getCurrentConfig());';
      });

      modified = modified.replace(/Math\.max\(0, Math\.min\(100, [^)]+\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed Math operations missing parenthesis`);
        return match.replace(/\);$/, '));');
      });

      modified = modified.replace(/Object\.fromEntries\([^)]+\.entries\(\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed Object.fromEntries() missing parenthesis`);
        return match.replace(/\.entries\(\);/, '.entries());');
      });

      modified = modified.replace(/\.filter\(ep => suite\.endpoints\.includes\(ep\.id\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed filter() missing parenthesis`);
        return match.replace(/ep\.id\);/, 'ep.id));');
      });

      modified = modified.replace(/updateComponentConfig\(`demo-\$\{selectedComponent\}`, getCurrentConfig\(\);/g, (match) => {
        fileFixes++;
        console.log(`   ✅ Fixed updateComponentConfig() missing parenthesis`);
        return match.replace(/getCurrentConfig\(\);/, 'getCurrentConfig());');
      });

      // Fix HTML comment damage
      modified = modified.replace(/\/\* transition removed \*\/>\s*}/g, () => {
        fileFixes++;
        console.log(`   ✅ Fixed HTML comment damage in transitions`);
        return '>';
      });

      // Fix malformed const declarations
      modified = modified.replace(/const (\w+)\s*>\s*\(\[/g, (match, varName) => {
        fileFixes++;
        console.log(`   ✅ Fixed malformed const declaration: ${varName}`);
        return `const ${varName} = $state([`;
      });

      // Fix malformed object patterns
      modified = modified.replace(/const (\w+)\s+\(\[/g, (match, varName) => {
        fileFixes++;
        console.log(`   ✅ Fixed missing equals in const: ${varName}`);
        return `const ${varName} = ([`;
      });
    }

    // Fix specific request options body issue
    if (content.includes('requestOptions.body = JSON.stringify')) {
      // This is actually a TypeScript interface issue - add proper type
      modified = modified.replace(
        /(\s+)(const requestOptions[^{]*{[^}]*)(}\s*;?\s*if[^{]*method[^{]*POST[^{]*{)/s,
        (match, indent, requestOptions, afterBrace) => {
          fileFixes++;
          console.log(`   ✅ Fixed requestOptions interface for body property`);
          return `${indent}${requestOptions}
        body?: string;${afterBrace}`;
        }
      );
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

console.log(`\n🎉 JavaScript syntax fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);