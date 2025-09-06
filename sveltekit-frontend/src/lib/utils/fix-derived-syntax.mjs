#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

async function fixDerivedSyntax() {
  console.log('🔧 Fixing malformed $derived syntax in Svelte files...');
  
  // Find all Svelte files
  const files = await glob('src/**/*.svelte');
  let fixedCount = 0;
  
  for (const file of files) {
    try {
      let content = await readFile(file, 'utf-8');
      const originalContent = content;
      
      // Fix malformed $derived syntax patterns
      content = content
        // Fix: $derived(value;) -> $derived(value)
        .replace(/\$derived\(([^;)]+);\)/g, '$derived($1)')
        // Fix: $derived($store.value;) -> $derived($store.value)
        .replace(/\$derived\((\$[^;)]+);\)/g, '$derived($1)')
        // Fix: let value = $derived(expr;); -> let value = $derived(expr);
        .replace(/(\w+)\s*=\s*\$derived\(([^;)]+);\)/g, '$1 = $derived($2)')
        // Fix other malformed patterns
        .replace(/\$derived\(([^)]+);\s*\)/g, '$derived($1)');
      
      if (content !== originalContent) {
        await writeFile(file, content, 'utf-8');
        console.log(`✅ Fixed ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  }
  
  console.log(`🎉 Fixed ${fixedCount} files with malformed $derived syntax`);
}

fixDerivedSyntax().catch(console.error);