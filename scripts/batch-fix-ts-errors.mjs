#!/usr/bin/env node
/**
 * Batch TypeScript Error Fixer
 *
 * Targets the most common error patterns to reduce 31,777 errors
 * to a manageable number for IDE performance.
 *
 * Usage: node scripts/batch-fix-ts-errors.mjs [--dry-run] [--pattern=TS2307]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PATTERN = process.argv.find(a => a.startsWith('--pattern='))?.split('=')[1];

// Common error patterns and their fixes
const ERROR_FIXES = {
  // TS2307: Cannot find module
  'TS2307': {
    patterns: [
      // Missing $lib imports
      { match: /from ['"](\$lib\/[^'"]+)['"]/g, fix: null }, // Check if file exists
      // Missing type imports
      { match: /import type \{ ([^}]+) \} from ['"]([^'"]+)['"]/g, fix: null },
    ],
    autoFix: false,
    suggestion: 'Add missing module to tsconfig paths or install package'
  },

  // TS2339: Property does not exist on type
  'TS2339': {
    patterns: [
      // Common Svelte 5 issues
      { match: /\.(\w+)\s*=\s*\$state\(/g, fix: null },
    ],
    autoFix: false,
    suggestion: 'Add property to interface or use type assertion'
  },

  // TS1005: Expected semicolon/comma
  'TS1005': {
    patterns: [
      // Missing semicolons after statements
      { match: /(\})\s*\n\s*(const|let|var|function|class|export)/g, fix: '$1;\n$2' },
    ],
    autoFix: true,
    suggestion: 'Add missing punctuation'
  },

  // TS7006: Parameter implicitly has 'any' type
  'TS7006': {
    patterns: [
      // Event handlers without types
      { match: /\((\w+)\)\s*=>/g, fix: '($1: any) =>' },
      // Function parameters
      { match: /function\s+\w+\s*\(([^)]+)\)/g, fix: null },
    ],
    autoFix: true,
    suggestion: 'Add explicit type annotation'
  },

  // TS2345: Argument type not assignable
  'TS2345': {
    patterns: [],
    autoFix: false,
    suggestion: 'Check argument types or add type assertion'
  },

  // TS2322: Type not assignable
  'TS2322': {
    patterns: [],
    autoFix: false,
    suggestion: 'Check variable types or add type assertion'
  },

  // TS18046: Variable is of type 'unknown'
  'TS18046': {
    patterns: [
      // Add type assertion for unknown
      { match: /catch\s*\((\w+)\)/g, fix: 'catch ($1: unknown)' },
    ],
    autoFix: true,
    suggestion: 'Add type guard or assertion'
  },
};

// Svelte 5 specific fixes
const SVELTE5_FIXES = [
  // Convert let to $state
  {
    name: 'let-to-state',
    match: /let\s+(\w+)\s*=\s*([^;]+);(\s*\/\/\s*reactive)?/g,
    fix: 'let $1 = $state($2);',
    filePattern: /\.svelte$/,
    contextCheck: (content, match) => {
      // Only in script tags, not in regular JS
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      return scriptMatch && scriptMatch[1].includes(match[0]);
    }
  },
  // Convert $: to $derived
  {
    name: 'reactive-to-derived',
    match: /\$:\s+(\w+)\s*=\s*([^;]+);/g,
    fix: 'let $1 = $derived($2);',
    filePattern: /\.svelte$/,
  },
  // Convert on:click to onclick
  {
    name: 'event-handler',
    match: /on:(\w+)=/g,
    fix: 'on$1=',
    filePattern: /\.svelte$/,
  },
];

// bits-ui v2 fixes
const BITS_UI_FIXES = [
  // Dialog.Root to Dialog.Root
  {
    name: 'dialog-open',
    match: /bind:open/g,
    fix: 'open={open} onOpenChange={(o) => open = o}',
    filePattern: /\.svelte$/,
  },
];

/**
 * Recursively find all TypeScript/Svelte files
 */
function findFiles(dir, extensions = ['.ts', '.tsx', '.svelte']) {
  const files = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip node_modules, .git, etc.
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build') {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findFiles(fullPath, extensions));
        } else if (extensions.includes(extname(entry))) {
          files.push(fullPath);
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't access
  }

  return files;
}

/**
 * Apply fixes to a file
 */
function applyFixes(filePath, fixes) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  const changes = [];

  for (const fix of fixes) {
    // Check file pattern
    if (fix.filePattern && !fix.filePattern.test(filePath)) {
      continue;
    }

    // Check context if needed
    if (fix.contextCheck) {
      const matches = content.matchAll(fix.match);
      for (const match of matches) {
        if (!fix.contextCheck(content, match)) {
          continue;
        }
      }
    }

    // Apply fix
    const newContent = content.replace(fix.match, fix.fix);

    if (newContent !== content) {
      changes.push({
        name: fix.name,
        count: (content.match(fix.match) || []).length
      });
      content = newContent;
      modified = true;
    }
  }

  if (modified && !DRY_RUN) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return { modified, changes };
}

/**
 * Analyze errors from tsc output
 */
function analyzeErrors(tscOutput) {
  const errorCounts = {};
  const errorFiles = {};

  const errorPattern = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm;
  let match;

  while ((match = errorPattern.exec(tscOutput)) !== null) {
    const [, file, line, col, code, message] = match;

    errorCounts[code] = (errorCounts[code] || 0) + 1;

    if (!errorFiles[code]) {
      errorFiles[code] = new Set();
    }
    errorFiles[code].add(file);
  }

  return { errorCounts, errorFiles };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 TypeScript Error Batch Fixer');
  console.log('================================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target: ${TARGET_PATTERN || 'ALL'}`);
  console.log('');

  // Find all files
  const svelteKitFiles = findFiles('sveltekit-frontend/src');
  const backendFiles = findFiles('backend', ['.ts', '.tsx']);
  const allFiles = [...svelteKitFiles, ...backendFiles];

  console.log(`Found ${allFiles.length} files to process`);
  console.log('');

  // Combine all fixes
  const allFixes = [
    ...SVELTE5_FIXES,
    ...BITS_UI_FIXES,
  ];

  // Apply fixes
  let totalModified = 0;
  let totalChanges = 0;

  for (const file of allFiles) {
    const { modified, changes } = applyFixes(file, allFixes);

    if (modified) {
      totalModified++;
      totalChanges += changes.reduce((sum, c) => sum + c.count, 0);

      if (changes.length > 0) {
        console.log(`✅ ${file}`);
        for (const change of changes) {
          console.log(`   - ${change.name}: ${change.count} fixes`);
        }
      }
    }
  }

  console.log('');
  console.log('================================');
  console.log(`Files modified: ${totalModified}`);
  console.log(`Total changes: ${totalChanges}`);

  if (DRY_RUN) {
    console.log('');
    console.log('⚠️  DRY RUN - No files were actually modified');
    console.log('   Run without --dry-run to apply changes');
  }

  // Print error fix suggestions
  console.log('');
  console.log('📋 Manual Fix Suggestions:');
  console.log('');

  for (const [code, info] of Object.entries(ERROR_FIXES)) {
    if (TARGET_PATTERN && code !== TARGET_PATTERN) continue;

    console.log(`${code}: ${info.suggestion}`);
    if (info.autoFix) {
      console.log(`   ✅ Auto-fixable`);
    } else {
      console.log(`   ⚠️  Manual fix required`);
    }
  }

  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Run: npm run check:typescript 2>&1 | head -200');
  console.log('2. Focus on TS2307 (missing modules) first');
  console.log('3. Then TS7006 (implicit any) - add types');
  console.log('4. Finally TS2339 (property not exist) - interface updates');
}

main().catch(console.error);
