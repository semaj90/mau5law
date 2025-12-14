#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('sveltekit-frontend/src/routes/api');
const exts = new Set(['.ts', '.js']);

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

const files = walk(ROOT);
let endpointCount = 0;
let bitsUICount = 0;
let endpoints = [];

console.log(`🔍 Auditing ${files.length} API files...`);

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');

    // Count endpoints (GET, POST, PUT, DELETE, PATCH)
    const endpointMatches = content.match(/export\s+(?:const|async\s+function)\s+(?:GET|POST|PUT|DELETE|PATCH)/g);
    if (endpointMatches) {
      endpointCount += endpointMatches.length;
      endpoints.push({
        file: path.relative(ROOT, file),
        count: endpointMatches.length,
        methods: endpointMatches.map(m => m.match(/(?:GET|POST|PUT|DELETE|PATCH)/)[0])
      });
    }

    // Count Bits-UI references
    if (content.includes('bits-ui')) {
      bitsUICount++;
    }
  } catch (err) {
    console.error(`❌ Error reading ${file}: ${err.message}`);
  }
}

console.log(`\n📊 API Endpoint Audit Results:`);
console.log(`   Total API files: ${files.length}`);
console.log(`   Total endpoints: ${endpointCount}`);
console.log(`   Files with Bits-UI: ${bitsUICount}`);

console.log(`\n📋 Top API files by endpoint count:`);
endpoints
  .sort((a, b) => b.count - a.count)
  .slice(0, 20)
  .forEach(ep => {
    console.log(`   ${ep.file}: ${ep.count} endpoints (${ep.methods.join(', ')})`);
  });

console.log(`\n✨ Audit complete!`);
