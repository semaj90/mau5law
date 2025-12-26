#!/usr/bin/env node
/**
 * Phase 80 Extended Codemod - Fix remaining corruption patterns
 * Targets patterns not caught by the base codemod
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const patterns = [
  // Fix return type union: ): Type: undefined => ): Type | undefined
  {
    name: 'return-type-union-extended',
    // Match things like "): Promise<T>: undefined" or "): Foo: null"
    regex: /\):\s*([A-Za-z_][\w<>\[\],\s|]*?):\s*(null|undefined)\b(?!\s*\|)/g,
    replace: '): $1 | $2',
  },
  // Fix class property type union: property: Type: null = => property: Type | null =
  {
    name: 'property-type-union',
    regex: /^(\s*(?:private\s+|public\s+|protected\s+|readonly\s+)*)(\w+):\s*([A-Za-z_][\w<>\[\],\s]*?):\s*(null|undefined)\s*=/gm,
    replace: '$1$2: $3 | $4 =',
  },
  // Fix function signature with extra type: (a: Type, value: number, number): => (a: Type, value: number):
  {
    name: 'trailing-type-param',
    regex: /,\s*(\w+)\):\s*(\w+)/g,
    replace: '): $2',
    // Only apply when we see `, word): word` pattern at end of params
    validate: (content, match) => {
      // Make sure this is fixing a duplicate like ", number): number"
      const before = content.slice(Math.max(0, match.index - 40), match.index);
      return before.includes(match[1]); // The same word appears before
    }
  },
  // Fix object literal shorthand corruption: { prop: value: prop2, value2: value2 }
  // Pattern: key: value: key2, => key: value, key2:
  {
    name: 'object-colon-separator',
    regex: /(\w+):\s*(\w+|\d+(?:\.\d+)?|true|false|null|'[^']*'|"[^"]*"):\s*(\w+),/g,
    replace: '$1: $2, $3:',
  },
  // Fix repeated identifier pattern: obj: obj: obj.prop => obj.prop
  {
    name: 'repeated-identifier',
    regex: /(\w+):\s*\1:\s*\1\.(\w+)/g,
    replace: '$1.$2',
  },
  // Fix type parameter that's a keyword: 0: 0: 0.5 => 0.5
  {
    name: 'numeric-colon-chain',
    regex: /(\d+):\s*\d+:\s*(\d+(?:\.\d+)?)/g,
    replace: '$2',
  },
  // Fix "func( thing, this: this: this.prop" => "func( thing, this.prop"
  {
    name: 'this-corruption',
    regex: /this:\s*this:\s*this\./g,
    replace: 'this.',
  },
  // Fix shorthand property that repeats: provided: provided: provided.X => provided.X
  {
    name: 'repeated-variable-access',
    regex: /\b(\w+):\s*\1:\s*\1\./g,
    replace: '$1.',
  },
  // Fix ": true, true: true," => ": true,"
  {
    name: 'boolean-corruption',
    regex: /:\s*(true|false),\s*\1:\s*\1,/g,
    replace: ': $1,',
  },
];

function processFile(filePath, dryRun = false) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`  ❌ Cannot read: ${filePath}`);
    return { fixes: 0, modified: false };
  }

  let modified = content;
  let totalFixes = 0;
  const fixDetails = [];

  for (const pattern of patterns) {
    let patternFixes = 0;
    const matches = modified.matchAll(new RegExp(pattern.regex.source, pattern.regex.flags));

    for (const match of [...matches]) {
      // Skip if pattern has validation and it fails
      if (pattern.validate && !pattern.validate(modified, match)) {
        continue;
      }
    }

    const newContent = modified.replace(pattern.regex, (...args) => {
      patternFixes++;
      // Build replacement string
      let replacement = pattern.replace;
      for (let i = 1; i < args.length - 2; i++) {
        if (args[i] !== undefined) {
          replacement = replacement.replace(new RegExp(`\\$${i}`, 'g'), args[i]);
        }
      }
      return replacement;
    });

    if (newContent !== modified) {
      totalFixes += patternFixes;
      fixDetails.push(`${pattern.name}: ${patternFixes}`);
      modified = newContent;
    }
  }

  if (totalFixes > 0 && !dryRun) {
    fs.writeFileSync(filePath, modified, 'utf8');
  }

  return { fixes: totalFixes, modified: totalFixes > 0, details: fixDetails };
}

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .svelte-kit, etc.
        if (!['node_modules', '.svelte-kit', 'dist', '.git', 'build'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dirArg = args.find(a => a.startsWith('--dir='));
const fileArg = args.find(a => a.startsWith('--file='));

console.log(`\n🔧 Phase 80: Extended Pattern Codemod${dryRun ? ' (DRY RUN)' : ''}`);
console.log('='.repeat(50));

let files = [];
const rootDir = path.resolve(__dirname, '..');

if (fileArg) {
  files = [path.resolve(rootDir, fileArg.replace('--file=', ''))];
} else if (dirArg) {
  const targetDir = path.resolve(rootDir, dirArg.replace('--dir=', ''));
  files = findFiles(targetDir);
} else {
  // Default to src directory
  files = findFiles(path.join(rootDir, 'src'));
}

console.log(`\n📁 Found ${files.length} files to process\n`);

let totalFixes = 0;
let filesModified = 0;
const patternCounts = {};

for (const file of files) {
  const relPath = path.relative(rootDir, file);
  const result = processFile(file, dryRun);

  if (result.fixes > 0) {
    console.log(`  ✅ ${relPath}: ${result.fixes} fixes`);
    if (result.details) {
      for (const detail of result.details) {
        console.log(`      - ${detail}`);
        const [name, count] = detail.split(': ');
        patternCounts[name] = (patternCounts[name] || 0) + parseInt(count);
      }
    }
    filesModified++;
    totalFixes += result.fixes;
  }
}

console.log('\n' + '='.repeat(50));
console.log('📊 Summary');
console.log('='.repeat(50));
console.log(`Files processed: ${files.length}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Total fixes: ${totalFixes}`);
console.log('\nFixes by pattern:');
for (const [name, count] of Object.entries(patternCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  - ${name}: ${count}`);
}
console.log(`\n✅ Codemod complete!${dryRun ? ' (no changes written)' : ''}`);
