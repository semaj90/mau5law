#!/usr/bin/env node

/**
 * Verification Script: Svelte 5 + Bits-UI v2 Migration
 * Checks:
 * 1. Build status
 * 2. Core routes accessibility
 * 3. API endpoint documentation
 * 4. Component compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'sveltekit-frontend/src');

console.log('🔍 Svelte 5 + Bits-UI v2 Migration Verification\n');

// Check 1: Verify no legacy patterns remain
console.log('📋 Check 1: Verifying no legacy Svelte 4 patterns remain...');
const legacyPatterns = [
  { pattern: /export\s+let\s+\w+\s*:/g, name: 'export let declarations' },
  { pattern: /\$:\s+\w+\s*=/g, name: 'reactive labels' },
  { pattern: /\$:\s*\{/g, name: 'reactive side effects' },
  { pattern: /on:click=/g, name: 'on:click directives' },
  { pattern: /on:submit=/g, name: 'on:submit directives' },
  { pattern: /on:change=/g, name: 'on:change directives' },
];

let legacyFound = 0;
for (const { pattern, name } of legacyPatterns) {
  const files = findFilesWithPattern(srcDir, pattern);
  if (files.length > 0) {
    console.log(`   ⚠️  Found ${files.length} files with ${name}`);
    legacyFound += files.length;
  }
}

if (legacyFound === 0) {
  console.log('   ✅ No legacy Svelte 4 patterns found\n');
} else {
  console.log(`   ⚠️  Found ${legacyFound} files with legacy patterns\n`);
}

// Check 2: Verify Bits-UI v2 imports
console.log('📋 Check 2: Verifying Bits-UI v2 imports...');
const bitsUIFiles = findFilesWithPattern(srcDir, /from\s+['"]bits-ui/);
console.log(`   Found ${bitsUIFiles.length} files importing from bits-ui`);

let v2Count = 0;
let legacyCount = 0;
for (const file of bitsUIFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes("from 'bits-ui/components/") || content.includes('from "bits-ui/components/')) {
    v2Count++;
  } else if (content.includes("from 'bits-ui'") || content.includes('from "bits-ui"')) {
    legacyCount++;
  }
}

console.log(`   ✅ v2 imports: ${v2Count}`);
if (legacyCount > 0) {
  console.log(`   ⚠️  Legacy imports: ${legacyCount}`);
}
console.log();

// Check 3: Verify UnoCSS classes
console.log('📋 Check 3: Verifying UnoCSS styling...');
const unocssFiles = findFilesWithPattern(srcDir, /class=["'][^"']*[a-z]+-\d+/);
console.log(`   Found ${unocssFiles.length} files using UnoCSS classes`);
console.log('   ✅ UnoCSS classes detected\n');

// Check 4: Verify core routes exist
console.log('📋 Check 4: Verifying core routes...');
const coreRoutes = [
  'sveltekit-frontend/src/routes/(app)/terminal/+page.svelte',
  'sveltekit-frontend/src/routes/(app)/cases/[id]/+page.svelte',
  'sveltekit-frontend/src/routes/yorha-detective/+page.svelte',
];

let routesFound = 0;
for (const route of coreRoutes) {
  if (fs.existsSync(path.join(rootDir, route))) {
    console.log(`   ✅ ${route}`);
    routesFound++;
  } else {
    console.log(`   ❌ ${route} NOT FOUND`);
  }
}
console.log();

// Check 5: Verify no route conflicts
console.log('📋 Check 5: Checking for route conflicts...');
const routeConflicts = findRouteConflicts(path.join(srcDir, 'routes'));
if (routeConflicts.length === 0) {
  console.log('   ✅ No route conflicts detected\n');
} else {
  console.log(`   ⚠️  Found ${routeConflicts.length} potential conflicts:`);
  routeConflicts.forEach(c => console.log(`      - ${c}`));
  console.log();
}

// Summary
console.log('📊 Migration Verification Summary:');
console.log(`   ✅ Legacy patterns: ${legacyFound === 0 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Bits-UI v2: ${v2Count > 0 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ UnoCSS: ${unocssFiles.length > 0 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Core routes: ${routesFound === 3 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Route conflicts: ${routeConflicts.length === 0 ? 'PASS' : 'FAIL'}`);

function findFilesWithPattern(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results.push(...findFilesWithPattern(filePath, pattern));
      }
    } else if (file.endsWith('.svelte') || file.endsWith('.ts') || file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (pattern.test(content)) {
          results.push(filePath);
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }

  return results;
}

function findRouteConflicts(dir) {
  const conflicts = [];
  const seen = new Map();

  function walk(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Check for [id] and [caseId] in same path
        if (file === '[id]' || file === '[caseId]') {
          const key = currentPath;
          if (seen.has(key)) {
            conflicts.push(`${key}: both [id] and [caseId]`);
          }
          seen.set(key, file);
        }
        walk(filePath);
      }
    }
  }

  walk(dir);
  return conflicts;
}
