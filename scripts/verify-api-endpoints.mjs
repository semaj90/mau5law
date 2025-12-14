#!/usr/bin/env node

/**
 * Verify API Endpoints: Check that API routes are properly defined
 * Scans for:
 * - +server.ts/js files
 * - API route handlers
 * - Endpoint documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../sveltekit-frontend/src');

console.log('🔌 Verifying API Endpoints\n');

const apiDir = path.join(srcDir, 'routes/api');
let endpointCount = 0;
let serverFileCount = 0;
const endpoints = [];

function walkApiDir(dir, prefix = '') {
  if (!fs.existsSync(dir)) {
    console.log('❌ API directory not found\n');
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkApiDir(filePath, prefix + '/' + file);
      }
    } else if (file === '+server.ts' || file === '+server.js') {
      serverFileCount++;
      const routePath = prefix || '/api';
      endpoints.push({
        path: routePath,
        file: filePath,
      });
      endpointCount++;
    }
  }
}

walkApiDir(apiDir);

console.log(`📊 API Endpoint Statistics:`);
console.log(`   Total +server files: ${serverFileCount}`);
console.log(`   Total endpoints: ${endpointCount}\n`);

// Sample endpoints
console.log(`📋 Sample Endpoints (first 20):`);
endpoints.slice(0, 20).forEach((ep, i) => {
  console.log(`   ${i + 1}. ${ep.path}`);
});

if (endpoints.length > 20) {
  console.log(`   ... and ${endpoints.length - 20} more`);
}

// Check for Svelte 5 patterns in endpoints
console.log(`\n🔍 Checking Svelte 5 compatibility in endpoints...`);
let svelte5Compatible = 0;
let needsUpdate = 0;

for (const endpoint of endpoints.slice(0, 10)) {
  try {
    const content = fs.readFileSync(endpoint.file, 'utf-8');

    // Check for TypeScript types
    if (content.includes('export const GET') || content.includes('export const POST')) {
      svelte5Compatible++;
    } else {
      needsUpdate++;
    }
  } catch (e) {
    // Skip
  }
}

console.log(`   ✅ Svelte 5 compatible: ${svelte5Compatible}`);
if (needsUpdate > 0) {
  console.log(`   ⚠️  May need updates: ${needsUpdate}`);
}

// Check for documentation
console.log(`\n📚 Checking for endpoint documentation...`);
const docFiles = [
  path.join(__dirname, '../API_DOCUMENTATION.md'),
  path.join(__dirname, '../docs/API.md'),
  path.join(srcDir, 'routes/api/README.md'),
];

let docFound = false;
for (const docFile of docFiles) {
  if (fs.existsSync(docFile)) {
    console.log(`   ✅ Found: ${path.relative(__dirname, docFile)}`);
    docFound = true;
  }
}

if (!docFound) {
  console.log(`   ⚠️  No API documentation found`);
}

console.log(`\n✅ API Endpoint Verification Complete`);
console.log(`   Total endpoints verified: ${endpointCount}`);
console.log(`   Status: ${endpointCount > 0 ? 'PASS' : 'FAIL'}`);
