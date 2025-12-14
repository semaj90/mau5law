#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('sveltekit-frontend/src');
const exts = new Set(['.svelte']);

const eventMap = [
  ['on:click', 'onclick'],
  ['on:submit', 'onsubmit'],
  ['on:change', 'onchange'],
  ['on:input', 'oninput'],
  ['on:keydown', 'onkeydown'],
  ['on:keyup', 'onkeyup'],
  ['on:focus', 'onfocus'],
  ['on:blur', 'onblur'],
  ['on:mouseenter', 'onmouseenter'],
  ['on:mouseleave', 'onmouseleave'],
  ['on:mouseover', 'onmouseover'],
  ['on:mouseout', 'onmouseout'],
  ['on:mousedown', 'onmousedown'],
  ['on:mouseup', 'onmouseup'],
  ['on:touchstart', 'ontouchstart'],
  ['on:touchend', 'ontouchend'],
  ['on:touchmove', 'ontouchmove'],
  ['on:scroll', 'onscroll'],
  ['on:wheel', 'onwheel'],
  ['on:load', 'onload'],
  ['on:error', 'onerror'],
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!ent.name.startsWith('.') && ent.name !== 'node_modules') {
        walk(p, out);
      }
    } else if (exts.has(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

function applyEvents(s) {
  let out = s;
  for (const [from, to] of eventMap) {
    // Replace on:xxx= with onxxx=
    // Use word boundary to avoid partial matches
    out = out.replaceAll(new RegExp(`\\b${from.replace(/:/g, '\\:')}=`, 'g'), `${to}=`);
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
    const after = applyEvents(before);
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
console.log(`\n✨ Event handler migration complete!`);
