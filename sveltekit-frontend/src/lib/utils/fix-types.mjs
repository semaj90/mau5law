#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';

/**
 * Batch fix for common TypeScript issues in Svelte components
 */

const COMMON_FIXES = [
  // Fix variant type issues for Button components
  {
    pattern: /variant="primary"/g,
    replacement: 'variant="default"'
  },
  {
    pattern: /variant="danger"/g,
    replacement: 'variant="destructive"'
  },
  {
    pattern: /variant="nier"/g,
    replacement: 'variant="default"'
  },

  // Fix form field type issues
  {
    pattern: /type="input"/g,
    replacement: 'type="text"'
  },
  {
    pattern: /type="url"/g,
    replacement: 'type="text"'
  },

  // Fix prop issues
  {
    pattern: /loading=\{[^}]*\}/g,
    replacement: 'disabled={$state}'
  },

  // Fix event handler syntax
  {
    pattern: /on:(\w+)="([^"]+)"/g,
    replacement: 'on:$1={$2}'
  },

  // Fix prop spreading
  {
    pattern: /\.\.\.\$restProps/g,
    replacement: '{...$restProps}'
  },

  // Fix component imports
  {
    pattern: /import \{ ([^}]+) \} from "\$lib\/components\/ui\/([^"]+)"\.svelte/g,
    replacement: 'import $1 from "$lib/components/ui/$2.svelte"'
  }
];

const COMPONENT_SPECIFIC_FIXES = {
  'Button.svelte': [
    {
      pattern: /interface Props \{[^}]*loading\?:\s*boolean;[^}]*\}/s,
      replacement: (match) => match.replace('loading?: boolean;', '')
    }
  ],
  'Modal.svelte': [
    {
      pattern: /isOpen\?:\s*boolean;?/g,
      replacement: 'open?: boolean;'
    },
    {
      pattern: /isOpen=/g,
      replacement: 'open='
    }
  ]
};

async function fixFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf-8');
    let hasChanges = false;

    // Apply common fixes
    for (const fix of COMMON_FIXES) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    // Apply component-specific fixes
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
    if (COMPONENT_SPECIFIC_FIXES[fileName]) {
      for (const fix of COMPONENT_SPECIFIC_FIXES[fileName]) {
        const newContent = typeof fix.replacement === 'function' 
          ? content.replace(fix.pattern, fix.replacement)
          : content.replace(fix.pattern, fix.replacement);
        
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      }
    }

    // Write back if changes were made
    if (hasChanges) {
      await writeFile(filePath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Starting TypeScript batch fixes...\n');

  // Find all Svelte files
  const svelteFiles = await glob('src/**/*.svelte', { 
    cwd: process.cwd(),
    absolute: true 
  });

  console.log(`📁 Found ${svelteFiles.length} Svelte files\n`);

  let fixedCount = 0;
  let totalFiles = svelteFiles.length;

  // Process files in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < svelteFiles.length; i += batchSize) {
    const batch = svelteFiles.slice(i, i + batchSize);
    
    const promises = batch.map(fixFile);
    const results = await Promise.all(promises);
    
    fixedCount += results.filter(Boolean).length;
    
    // Progress indicator
    const progress = Math.min(i + batchSize, totalFiles);
    console.log(`📊 Progress: ${progress}/${totalFiles} files processed`);
  }

  console.log(`\n🎉 Batch fix complete!`);
  console.log(`📈 Fixed ${fixedCount}/${totalFiles} files`);
  console.log(`\n💡 Run 'npm run check' to verify remaining errors`);
}

main().catch(console.error);