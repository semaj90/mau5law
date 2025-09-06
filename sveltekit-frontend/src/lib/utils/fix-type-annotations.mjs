#!/usr/bin/env node

/**
 * Fix malformed TypeScript function return type annotations
 * Converts `: type: any =>` to `: type =>`
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

console.log(`Found ${tsFiles.length} TypeScript files to check...`);

let totalFixesApplied = 0;

// Patterns to fix
const patterns = [
  { search: /: number: any =>/g, replace: ': number =>' },
  { search: /: string: any =>/g, replace: ': string =>' },
  { search: /: boolean: any =>/g, replace: ': boolean =>' },
  { search: /: void: any =>/g, replace: ': void =>' },
  { search: /: any: any =>/g, replace: ': any =>' },
  { search: /: object: any =>/g, replace: ': object =>' },
  // Handle generic types - be more careful with regex
  { search: /: ([A-Z][a-zA-Z0-9]*(?:<[^>]*>)?): any =>/g, replace: ': $1 =>' }
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
      console.log(`Fixed: ${filePath}`);
      totalFixesApplied++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`\nCompleted! Fixed ${totalFixesApplied} files.`);