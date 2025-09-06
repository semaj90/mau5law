#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

console.log('🔧 Starting comprehensive Svelte 5 fixes...');

// Find all Svelte files
function findSvelteFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findSvelteFiles(fullPath, files);
    } else if (extname(item) === '.svelte') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix patterns
const fixes = [
  {
    name: 'Convert $: reactive statements to $derived',
    pattern: /\$:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+);?$/gm,
    replacement: 'let $1 = $derived($2);'
  },
  {
    name: 'Fix export class syntax',
    pattern: /export\s*{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*as\s*class\s*}/g,
    replacement: ''
  },
  {
    name: 'Fix $$restProps usage',
    pattern: /\{\.\.\.(\$\$restProps)\}/g,
    replacement: ''
  },
  {
    name: 'Add missing script lang="ts" attributes',
    pattern: /<script>/g,
    replacement: '<script lang="ts">'
  },
  {
    name: 'Fix onclick in button components',
    pattern: /onclick\s*=\s*{([^}]+)}/g,
    replacement: 'on:click={$1}'
  },
  {
    name: 'Fix bindable properties',
    pattern: /export\s+let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]/g,
    replacement: 'let { $1 = $bindable() } = $props(); //'
  }
];

const svelteFiles = findSvelteFiles('src');
console.log(`📁 Found ${svelteFiles.length} Svelte files to process`);

let totalFixes = 0;

for (const filePath of svelteFiles) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let fileFixCount = 0;
    
    for (const fix of fixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fileFixCount += matches.length;
        totalFixes += matches.length;
      }
    }
    
    if (fileFixCount > 0) {
      writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fileFixCount} issues in ${filePath}`);
    }
    
  } catch (error) {
    console.warn(`⚠️ Error processing ${filePath}:`, error.message);
  }
}

console.log(`🎉 Completed! Applied ${totalFixes} fixes across ${svelteFiles.length} files`);

// Additional specific fixes for common component issues
const specificFixes = [
  {
    file: 'src/lib/components/ui/Form.svelte',
    fixes: [
      {
        from: 'loading={$form.isSubmitting || loading}',
        to: 'loading={$form.isSubmitting}'
      }
    ]
  }
];

console.log('🔨 Applying specific component fixes...');

for (const specificFix of specificFixes) {
  try {
    let content = readFileSync(specificFix.file, 'utf-8');
    let changed = false;
    
    for (const fix of specificFix.fixes) {
      if (content.includes(fix.from)) {
        content = content.replace(fix.from, fix.to);
        changed = true;
      }
    }
    
    if (changed) {
      writeFileSync(specificFix.file, content);
      console.log(`✅ Applied specific fixes to ${specificFix.file}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not apply fixes to ${specificFix.file}:`, error.message);
  }
}

console.log('✨ All fixes completed!');