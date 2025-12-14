#!/usr/bin/env node

/**
 * Codemod: Fix invalid self-closing non-void HTML elements
 * Converts: <div /> → <div></div>
 * Scope: All .svelte files in src/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../sveltekit-frontend/src');

// Non-void HTML elements that cannot be self-closed
const nonVoidElements = [
  'div', 'span', 'p', 'a', 'button', 'form', 'input', 'label', 'select', 'textarea',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
  'thead', 'tbody', 'tfoot', 'section', 'article', 'nav', 'header', 'footer', 'main',
  'aside', 'figure', 'figcaption', 'blockquote', 'pre', 'code', 'strong', 'em', 'i',
  'b', 'u', 'small', 'sub', 'sup', 'mark', 'del', 'ins', 'kbd', 'samp', 'var',
  'template', 'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'video',
  'audio', 'canvas', 'svg', 'details', 'summary', 'dialog', 'fieldset', 'legend',
  'datalist', 'optgroup', 'option', 'meter', 'progress', 'output', 'time', 'address',
];

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

    // For each non-void element, convert self-closing tags
    for (const element of nonVoidElements) {
      // Match: <element ... /> but not <element ... >
      // Pattern: <element(\s[^>]*)?\s*/>
      const regex = new RegExp(`<${element}(\\s[^>]*)?>\\s*/>`, 'gi');
      content = content.replace(regex, (match, attrs) => {
        const trimmedAttrs = attrs ? attrs.trim() : '';
        if (trimmedAttrs) {
          return `<${element} ${trimmedAttrs}></${element}>`;
        }
        return `<${element}></${element}>`;
      });
    }

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

console.log('🔄 Fixing invalid self-closing non-void HTML elements...\n');
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
