#!/usr/bin/env node

/**
 * Codemod: Convert Svelte 4 dynamic components to Svelte 5 direct component usage
 * Converts: <svelte:component this={Component} /> → <Component />
 * Scope: All .svelte files in src/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../sveltekit-frontend/src');

let totalFiles = 0;
let changedFiles = 0;
const results = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      }
    } else if (file.endsWith('.svelte')) {
      totalFiles++;
      processSvelteFile(filePath);
    }
  }
}

function processSvelteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Match <svelte:component this={Component} ... /> or <svelte:component this={Component} ...></svelte:component>
    // Pattern: <svelte:component\s+this={([^}]+)}([^>]*)/>
    const selfClosingRegex = /<svelte:component\s+this=\{([^}]+)\}([^>]*)\s*\/>/g;
    content = content.replace(selfClosingRegex, (match, component, attrs) => {
      const trimmedAttrs = attrs.trim();
      if (trimmedAttrs) {
        return `<${component} ${trimmedAttrs} />`;
      }
      return `<${component} />`;
    });

    // Pattern: <svelte:component this={Component} ...>...</svelte:component>
    const openingRegex = /<svelte:component\s+this=\{([^}]+)\}([^>]*)>/g;
    content = content.replace(openingRegex, (match, component, attrs) => {
      const trimmedAttrs = attrs.trim();
      if (trimmedAttrs) {
        return `<${component} ${trimmedAttrs}>`;
      }
      return `<${component}>`;
    });

    // Replace closing tags
    content = content.replace(/<\/svelte:component>/g, '');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      changedFiles++;
      results.push({
        file: path.relative(srcDir, filePath),
        changed: true,
        errors: [],
      });
    }
  } catch (error) {
    results.push({
      file: path.relative(srcDir, filePath),
      changed: false,
      errors: [error.message],
    });
  }
}

console.log('🔄 Converting Svelte 4 dynamic components to Svelte 5 direct usage...\n');
walkDir(srcDir);

console.log(`✅ Conversion complete!`);
console.log(`📊 Statistics:`);
console.log(`   Total files scanned: ${totalFiles}`);
console.log(`   Files changed: ${changedFiles}`);
console.log(`\n📝 Changed files:`);
results.filter(r => r.changed).forEach(r => {
  console.log(`   ✓ ${r.file}`);
});

if (results.some(r => r.errors.length > 0)) {
  console.log(`\n⚠️  Errors:`);
  results.filter(r => r.errors.length > 0).forEach(r => {
    console.log(`   ✗ ${r.file}: ${r.errors.join(', ')}`);
  });
}
