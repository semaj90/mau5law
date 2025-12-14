#!/usr/bin/env node

/**
 * Codemod: Convert Svelte 4 event directives to Svelte 5 event attributes
 * Converts: on:click={handler} → onclick={handler}
 * Scope: All .svelte files in src/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../sveltekit-frontend/src');

const eventMap = {
  'on:click': 'onclick',
  'on:submit': 'onsubmit',
  'on:change': 'onchange',
  'on:input': 'oninput',
  'on:keydown': 'onkeydown',
  'on:keyup': 'onkeyup',
  'on:focus': 'onfocus',
  'on:blur': 'onblur',
  'on:mouseenter': 'onmouseenter',
  'on:mouseleave': 'onmouseleave',
  'on:mouseover': 'onmouseover',
  'on:mouseout': 'onmouseout',
  'on:mousedown': 'onmousedown',
  'on:mouseup': 'onmouseup',
  'on:touchstart': 'ontouchstart',
  'on:touchend': 'ontouchend',
  'on:touchmove': 'ontouchmove',
  'on:scroll': 'onscroll',
  'on:load': 'onload',
  'on:error': 'onerror',
};

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

    // Convert each event directive
    for (const [oldEvent, newEvent] of Object.entries(eventMap)) {
      // Match pattern: on:event={handler} or on:event|modifier={handler}
      const regex = new RegExp(`\\b${oldEvent.replace(/:/g, '\\:')}(\\|[a-z]+)*=`, 'g');
      content = content.replace(regex, `${newEvent}=`);
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

console.log('🔄 Converting Svelte 4 event directives to Svelte 5 event attributes...\n');
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
