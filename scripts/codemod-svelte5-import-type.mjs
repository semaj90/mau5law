#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('sveltekit-frontend/src');
const exts = new Set(['.svelte']);

// Transitions and animations that must be runtime imports
const runtimeImports = [
  'fade', 'fly', 'slide', 'blur', 'scale', 'draw', 'crossfade',
  'elasticIn', 'elasticOut', 'elasticInOut',
  'backIn', 'backOut', 'backInOut',
  'bounceIn', 'bounceOut', 'bounceInOut',
  'circIn', 'circOut', 'circInOut',
  'cubicIn', 'cubicOut', 'cubicInOut',
  'expoIn', 'expoOut', 'expoInOut',
  'quadIn', 'quadOut', 'quadInOut',
  'quartIn', 'quartOut', 'quartInOut',
  'quintIn', 'quintOut', 'quintInOut',
  'sineIn', 'sineOut', 'sineInOut',
];

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
  let out = s;

  // Fix import type for transitions and animations
  for (const imp of runtimeImports) {
    // Match: import type { fade } from 'svelte/transition'
    out = out.replace(
      new RegExp(`import\\s+type\\s+\\{\\s*([^}]*\\b${imp}\\b[^}]*)\\s*\\}\\s+from\\s+['"]svelte/(transition|animate)['"]`, 'g'),
      (match, imports, module) => {
        return `import { ${imports} } from 'svelte/${module}'`;
      }
    );
  }

  return out;
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
console.log(`\n✨ Import type migration complete!`);
