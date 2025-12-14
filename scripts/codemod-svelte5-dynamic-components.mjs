#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('sveltekit-frontend/src');
const exts = new Set(['.svelte']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!ent.name.startsWith('.') && ent.name !== 'node_modules') {
        walk(p, out);
      }
    } else if (exts.has(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

function codemod(s) {
  // Handles: <svelte:component this={endpoint.icon} class="x" />
  // Captures member expressions too.
  return s.replace(
    /<svelte:component\s+this=\{([^}]+)\}([^>]*)\/>/g,
    (_m, expr, rest) => `<${expr}${rest} />`
  );
}

const files = walk(ROOT);
let changed = 0;
let errors = [];

console.log(`🔍 Found ${files.length} Svelte files to process...`);

for (const file of files) {
  try {
    const before = fs.readFileSync(file, 'utf8');
    const after = codemod(before);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed++;
      console.log(`✅ Updated: ${path.relative(ROOT, file)}`);
    }
  } catch (err) {
    errors.push(`❌ Error processing ${file}: ${err.message}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files changed: ${changed}/${files.length}`);
if (errors.length > 0) {
  console.log(`   Errors: ${errors.length}`);
  errors.forEach(e => console.log(`   ${e}`));
}
console.log(`\n✨ Dynamic component migration complete!`);
