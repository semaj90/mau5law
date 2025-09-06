#!/usr/bin/env node

/**
 * Fix malformed arrow function parameter syntax
 * Converts `param: type => ` to `(param: type) => `
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const rootDir = process.cwd();

// Recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findTsFiles(fullPath, files);
    } else if (stat.isFile() && extname(item) === '.ts') {
      files.push(fullPath.replace(rootDir + '\\', '').replace(/\\/g, '/'));
    }
  }

  return files;
}

const tsFiles = findTsFiles(join(rootDir, 'src'));

console.log(`Found ${tsFiles.length} TypeScript files to check for arrow function syntax...`);

let totalFixesApplied = 0;

// Patterns to fix arrow function parameters that are missing parentheses
const patterns = [
  // Fix single parameter arrow functions with type annotations that are missing parentheses
  {
    search: /(\w+): (any|string|number|boolean|void|object|\w+(?:<[^>]*>)?)\s+=>\s+/g,
    replace: '($1: $2) => '
  },
  // Fix resolve: any => setTimeout pattern specifically
  {
    search: /resolve:\s*any\s*=>\s*/g,
    replace: '(resolve: any) => '
  },
  // Fix reject: any => pattern
  {
    search: /reject:\s*any\s*=>\s*/g,
    replace: '(reject: any) => '
  }
];

for (const filePath of tsFiles) {
  const fullPath = join(rootDir, filePath);

  try {
    const content = readFileSync(fullPath, 'utf-8');
    let newContent = content;
    let fileChanged = false;

    // Apply each pattern
    for (const pattern of patterns) {
      const beforeLength = newContent.length;
      newContent = newContent.replace(pattern.search, pattern.replace);
      if (newContent.length !== beforeLength) {
        fileChanged = true;
      }
    }

    if (fileChanged) {
      writeFileSync(fullPath, newContent, 'utf-8');
      console.log(`Fixed arrow functions in: ${filePath}`);
      totalFixesApplied++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`\nCompleted! Fixed arrow function syntax in ${totalFixesApplied} files.`);
