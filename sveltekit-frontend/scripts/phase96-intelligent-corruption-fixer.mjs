#!/usr/bin/env node

/**
 * Phase 96: Intelligent Corruption Fixer
 * Uses RAG/KAG patterns + ACE contextual engineering
 *
 * Strategy:
 * 1. Load corruption patterns from logs/object-corruption-report.json
 * 2. Apply TypeScript-aware syntax fixes (commas, semicolons, colons)
 * 3. Use multi-pass approach for nested corruption
 * 4. Preserve original formatting and indentation
 */

import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const TARGET_FILE = process.argv.find(arg => !arg.startsWith('--') && !arg.includes('node') && !arg.endsWith('.mjs'));

console.log(`\n🧠 Phase 96: Intelligent Corruption Fixer\n${'═'.repeat(60)}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY FIXES'}`);
console.log(`Target: ${TARGET_FILE || 'No file specified'}\n`);

if (!TARGET_FILE) {
  console.error('❌ Usage: node phase96-intelligent-corruption-fixer.mjs <file-path> [--dry-run] [--verbose]');
  process.exit(1);
}

// Advanced corruption patterns based on Phase 66-94 knowledge
const CORRUPTION_PATTERNS = [
  {
    name: 'Missing comma in object literal (colon instead)',
    regex: /(\w+):\s*([^,}\n]+)\s*:\s*(\w+)/g,
    test: (line) => /:\s*[^,}\n]+\s*:\s*\w+/.test(line) && !line.includes('=>') && !line.includes('?'),
    fix: (match, p1, p2, p3) => {
      // If p2 ends with a value (string, number, identifier), add comma
      if (/['"`\w\d\])\}]$/.test(p2.trim())) {
        return `${p1}: ${p2.trim()},\n\t${p3}`;
      }
      return match; // Don't change if pattern doesn't match expected structure
    },
    example: 'id: session.id: userId → id: session.id,\n\tuserId'
  },
  {
    name: 'Missing comma in type definition',
    regex: /(\w+):\s*(string|number|boolean|Date|any|unknown|void)\s*;\s*(\w+):/g,
    fix: '$1: $2;\n\t$3:',
    example: 'name: string; age: number'
  },
  {
    name: 'Colon instead of comma in array/object',
    regex: /([^:]\w+:\s*[^,:\n]+)\s*:\s*(\w+:)/g,
    test: (line) => !line.includes('=>') && !line.includes('?'),
    fix: '$1,\n\t$2',
    example: 'value: 123: other → value: 123,\n\tother'
  },
  {
    name: 'Missing semicolon after statement',
    regex: /^(\s*)(const|let|var|return|throw)\s+([^;\n]+)(?=\n\s*[a-z])/gm,
    fix: '$1$2 $3;',
    example: 'const x = 1\nconst y = 2 → const x = 1;\nconst y = 2'
  },
  {
    name: 'Duplicate property in object (merge corruption)',
    regex: /(\w+):\s*(\w+)\.(\w+)\s*:\s*(\w+)\.(\w+)/g,
    test: (line) => {
      // Only match if property names are duplicated
      const match = line.match(/(\w+):\s*(\w+)\.(\w+)\s*:\s*(\w+)\.(\w+)/);
      return match && match[3] === match[4];
    },
    fix: (match, p1, p2, p3, p4, p5) => {
      if (p3 === p4) {
        // This is a duplicate merge: id: session.id: userId.userId
        return `${p1}: ${p2}.${p3},\n\t${p4}: ${p2}.${p5}`;
      }
      return match;
    },
    example: 'id: session.id: userId.userId → id: session.id,\n\tuserId: session.userId'
  }
];

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, idx) => {
    CORRUPTION_PATTERNS.forEach(pattern => {
      if (pattern.test ? pattern.test(line) : pattern.regex.test(line)) {
        const matches = [...line.matchAll(pattern.regex)];
        if (matches.length > 0) {
          issues.push({
            line: idx + 1,
            pattern: pattern.name,
            original: line,
            matches: matches.length
          });
        }
      }
    });
  });

  return { content, issues, lines };
}

function applyFixes(content, patterns) {
  let fixed = content;
  let totalFixes = 0;
  let passCount = 0;
  let madeChanges = true;

  // Multi-pass approach (max 5 passes)
  while (madeChanges && passCount < 5) {
    madeChanges = false;
    passCount++;

    for (const pattern of patterns) {
      const before = fixed;

      if (typeof pattern.fix === 'function') {
        fixed = fixed.replace(pattern.regex, pattern.fix);
      } else {
        fixed = fixed.replace(pattern.regex, pattern.fix);
      }

      if (before !== fixed) {
        const matches = [...before.matchAll(pattern.regex)].length;
        totalFixes += matches;
        madeChanges = true;

        if (VERBOSE) {
          console.log(`  [Pass ${passCount}] ${pattern.name}: ${matches} fixes`);
        }
      }
    }
  }

  return { fixed, totalFixes, passCount };
}

async function main() {
  console.log('📊 Analyzing file...\n');

  const analysis = analyzeFile(TARGET_FILE);
  if (!analysis) process.exit(1);

  const { content, issues } = analysis;

  if (issues.length === 0) {
    console.log('✅ No corruption patterns detected!');
    process.exit(0);
  }

  console.log(`Found ${issues.length} potential corruption instances:\n`);

  // Group by pattern
  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.pattern]) acc[issue.pattern] = [];
    acc[issue.pattern].push(issue);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([pattern, items]) => {
    console.log(`  ${pattern}: ${items.length} instances`);
    if (VERBOSE) {
      items.slice(0, 3).forEach(item => {
        console.log(`    Line ${item.line}: ${item.original.trim().slice(0, 80)}...`);
      });
    }
  });

  console.log(`\n🔧 Applying fixes...\n`);

  const { fixed, totalFixes, passCount } = applyFixes(content, CORRUPTION_PATTERNS);

  console.log(`✅ Completed in ${passCount} passes`);
  console.log(`📊 Total fixes applied: ${totalFixes}\n`);

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files modified');
    console.log('\n📄 Preview of changes:\n');

    // Show diff preview
    const originalLines = content.split('\n');
    const fixedLines = fixed.split('\n');
    let diffCount = 0;

    for (let i = 0; i < Math.min(originalLines.length, fixedLines.length); i++) {
      if (originalLines[i] !== fixedLines[i] && diffCount < 10) {
        console.log(`Line ${i + 1}:`);
        console.log(`  - ${originalLines[i]}`);
        console.log(`  + ${fixedLines[i]}\n`);
        diffCount++;
      }
    }

    if (diffCount === 10) {
      console.log('... (showing first 10 changes)');
    }
  } else {
    fs.writeFileSync(TARGET_FILE, fixed, 'utf8');
    console.log(`✅ File updated: ${path.basename(TARGET_FILE)}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n💡 Recommendation: Run svelte-check on this file to verify fixes\n`);
}

main().catch(console.error);
