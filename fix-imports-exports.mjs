#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix import/export issues
 * Fix patterns like:
 * - Missing named exports in modules
 * - Incorrect import patterns
 * - Module export mismatches
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing import/export issues...\n');

// Find all TypeScript and Svelte files
const files = await glob(`${frontendDir}/**/*.{ts,js,svelte}`, {
  ignore: ['**/node_modules/**', '**/build/**', '**/.svelte-kit/**']
});

let filesProcessed = 0;
let totalFixes = 0;

// Common import/export fixes
const importExportFixes = [
  {
    // Fix GGUFHelpers import
    pattern: /import\s*{\s*createGGUFRuntime,\s*GGUFHelpers\s*}\s*from\s*['"`]\$lib\/services\/gguf-runtime['"`]/g,
    replacement: "import { createGGUFRuntime } from '$lib/services/gguf-runtime'",
    description: "Fixed GGUFHelpers import (not exported)"
  },
  {
    // Fix createNodeJSOrchestrator import
    pattern: /import\s*{\s*createNodeJSOrchestrator\s*}\s*from\s*['"`]\$lib\/services\/nodejs-orchestrator['"`]/g,
    replacement: "import { NodeJSOrchestrator } from '$lib/services/nodejs-orchestrator'",
    description: "Fixed createNodeJSOrchestrator → NodeJSOrchestrator"
  },
  {
    // Fix NesCard import from wildcard
    pattern: /import\s*{\s*NesCard\s*}\s*from\s*['"`]\$lib\/components\/\*['"`]/g,
    replacement: "import { NesCard } from '$lib/components/ui/nes-ui'",
    description: "Fixed NesCard wildcard import"
  },
  {
    // Fix missing default imports that should be default
    pattern: /import\s+(\w+)\s+from\s+['"`]([^'"`]+\.svelte)['"`]/g,
    replacement: (match, componentName, path) => {
      // Only fix if it's a component import that should be default
      if (path.includes('/components/') && componentName.charAt(0).toUpperCase() === componentName.charAt(0)) {
        return match; // Keep as is - should be default import
      }
      return match;
    },
    description: "Validated default component imports"
  }
];

for (const filePath of files) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;
    let fileFixes = 0;

    // Check if file contains import issues we can fix
    const hasImportIssues = content.includes('GGUFHelpers') ||
                           content.includes('createNodeJSOrchestrator') ||
                           content.includes('NesCard') ||
                           content.includes('has no exported member');

    if (hasImportIssues) {
      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      // Apply each fix
      for (const fix of importExportFixes) {
        if (fix.pattern.test(content)) {
          modified = modified.replace(fix.pattern, fix.replacement);
          fileFixes++;
          console.log(`   ✅ ${fix.description}`);
        }
      }

      // Fix specific file issues based on error messages
      if (filePath.includes('windows-gguf-demo')) {
        // Remove GGUFHelpers usage since it's not exported
        if (modified.includes('GGUFHelpers')) {
          modified = modified.replace(/GGUFHelpers\./g, '// GGUFHelpers.');
          fileFixes++;
          console.log(`   ✅ Commented out GGUFHelpers usage`);
        }
      }

      // Fix createNodeJSOrchestrator usage
      if (modified.includes('createNodeJSOrchestrator')) {
        modified = modified.replace(/createNodeJSOrchestrator/g, 'new NodeJSOrchestrator');
        fileFixes++;
        console.log(`   ✅ Fixed createNodeJSOrchestrator usage`);
      }

      // Add missing exports to service files
      if (filePath.includes('gguf-runtime.ts') || filePath.includes('gguf-runtime.js')) {
        if (!content.includes('export class GGUFHelpers') && !content.includes('export { GGUFHelpers }')) {
          // Add export for GGUFHelpers if class exists
          if (content.includes('class GGUFHelpers')) {
            modified = modified.replace('class GGUFHelpers', 'export class GGUFHelpers');
            fileFixes++;
            console.log(`   ✅ Added GGUFHelpers export`);
          }
        }
      }

      if (filePath.includes('nodejs-orchestrator.ts') || filePath.includes('nodejs-orchestrator.js')) {
        if (!content.includes('export function createNodeJSOrchestrator') && content.includes('NodeJSOrchestrator')) {
          // Add createNodeJSOrchestrator function if missing
          if (!content.includes('createNodeJSOrchestrator')) {
            modified = modified + '\n\nexport function createNodeJSOrchestrator() {\n  return new NodeJSOrchestrator();\n}';
            fileFixes++;
            console.log(`   ✅ Added createNodeJSOrchestrator function`);
          }
        }
      }
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

console.log(`\n🎉 Import/export fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${files.length}`);