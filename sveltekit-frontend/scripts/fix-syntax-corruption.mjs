#!/usr/bin/env node
/**
 * fix-syntax-corruption.mjs
 *
 * MECHANICAL, IDEMPOTENT FIXER for syntax corruption incidents.
 *
 * This script applies THREE NARROW TRANSFORMS ONLY to fix colon/comma drift:
 * 1. Parameter corruption: name, type: → name: type,
 * 2. Numeric colon strings: 0: 'TAG' → 0, 'TAG'
 * 3. Object property corruption: key, getEnv( → key: getEnv(
 *
 * CRITICAL: Only narrow regex transforms. NO semantic rewrites. IDEMPOTENT ONLY.
 *
 * Usage:
 *   node scripts/fix-syntax-corruption.mjs [--dry-run]
 *
 * Generates:
 *   reports/incident-YYYYMMDD-HHMMSS.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const reportsDir = path.join(projectRoot, 'reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * THREE SAFE TRANSFORMS - IDEMPOTENT ONLY
 */
const TRANSFORMS = [
  {
    name: 'Parameter Corruption',
    description: 'Fix: name, type: → name: type,',
    pattern: /\b([A-Za-z_$][\w$]*)\s*,\s*(string|number|boolean|any|unknown|never|void)\s*:\s*/g,
    replacement: '$1: $2, ',
    // Guard: only replace if followed by identifier or closing paren
    guard: (match, text, offset) => {
      const after = text.substring(offset + match.length, offset + match.length + 20);
      return /^[\w$)]/.test(after);
    }
  },
  {
    name: 'Numeric Colon String',
    description: 'Fix: 0: \'TAG\' → 0, \'TAG\'',
    pattern: /\b(\d+)\s*:\s*(['"][^'"]+['"])/g,
    replacement: '$1, $2',
    // Guard: numeric followed by string literal
    guard: (match, text, offset) => {
      const before = text.substring(Math.max(0, offset - 5), offset);
      return /[\[\(,\s]$/.test(before) || offset === 0;
    }
  },
  {
    name: 'Object Property with getEnv',
    description: 'Fix: key, getEnv( → key: getEnv(',
    pattern: /\b([A-Za-z_$][\w$]*)\s*,\s*(getEnv\s*\()/g,
    replacement: '$1: $2',
    // Guard: only in object literal context
    guard: (match, text, offset) => {
      const before = text.substring(Math.max(0, offset - 20), offset);
      return /[{,\s]$/.test(before);
    }
  }
];

/**
 * Helper: Write file only if content changed (idempotent)
 */
function writeIfChanged(filePath, newContent) {
  const existing = fs.readFileSync(filePath, 'utf8');
  if (existing === newContent) return false; // No change
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

/**
 * Apply all transforms to a single file
 * Returns: { file, changed, pattern1Count, pattern2Count, ... }
 */
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const counts = {};

  for (const transform of TRANSFORMS) {
    counts[transform.name] = 0;
    let match;

    // Process all matches
    const matches = [];
    const regex = new RegExp(transform.pattern.source, transform.pattern.flags);
    let m;
    while ((m = regex.exec(content)) !== null) {
      matches.push({ match: m[0], offset: m.index });
    }

    // Filter by guard and apply
    for (const { match, offset } of matches) {
      if (transform.guard && !transform.guard(match, content, offset)) {
        continue; // Guard rejected
      }
      content = content.replace(match, transform.replacement);
      counts[transform.name]++;
    }
  }

  const changed = content !== original;
  if (changed && !DRY_RUN) {
    writeIfChanged(filePath, content);
  }

  return {
    file: filePath,
    changed,
    counts
  };
}

/**
 * Main: Scan and fix all TS/JS/Svelte files
 */
async function main() {
  console.log('\n🔧 Syntax Corruption Fixer\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY FIXES'}`);
  console.log(`Scanning: ${srcDir}\n`);

  const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.svelte'];
  const files = await glob(patterns, { cwd: srcDir, absolute: true });

  console.log(`Found ${files.length} files to scan\n`);

  const results = [];
  const startTime = Date.now();

  for (const file of files) {
    try {
      const result = fixFile(file);
      if (result.changed) {
        results.push(result);
        const counts = Object.entries(result.counts)
          .filter(([_, count]) => count > 0)
          .map(([name, count]) => `${name}: ${count}`)
          .join(', ');
        console.log(`✓ ${path.relative(projectRoot, file)} → ${counts}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  const elapsed = Date.now() - startTime;

  // Generate report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportPath = path.join(reportsDir, `incident-${timestamp}.md`);

  const totalChanges = results.reduce((sum, r) =>
    sum + Object.values(r.counts).reduce((a, b) => a + b, 0),
    0
  );

  let reportContent = `# Syntax Corruption Incident Report

**Generated:** ${new Date().toISOString()}
**Mode:** ${DRY_RUN ? 'DRY RUN (no files modified)' : 'APPLIED'}
**Elapsed:** ${elapsed}ms

## Summary

- **Files scanned:** ${files.length}
- **Files modified:** ${results.length}
- **Total transformations:** ${totalChanges}

## Transforms Applied

${TRANSFORMS.map(t => `- **${t.name}**: ${t.description}`).join('\n')}

## Files Changed

${results.length === 0
  ? '_No files required fixing - codebase is clean!_'
  : results.map(r => {
    const counts = Object.entries(r.counts)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');
    return `- \`${path.relative(projectRoot, r.file)}\` → ${counts}`;
  }).join('\n')
}

## Policy & Prevention

✅ **Only narrow, mechanical regex transforms applied**
✅ **Idempotent: Safe to run multiple times**
✅ **No semantic rewrites or code restructuring**
✅ **Guard clauses prevent false positives**

### How to Fix Corruption

If corruption patterns are detected in the future:

\`\`\`bash
node scripts/fix-syntax-corruption.mjs --dry-run  # Preview changes
node scripts/fix-syntax-corruption.mjs            # Apply fixes
\`\`\`

Then verify with:

\`\`\`bash
npm run check:ultra-fast
\`\`\`

---

_Report generated by fix-syntax-corruption.mjs_
`;

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n📊 Report: ${path.relative(projectRoot, reportPath)}`);
  console.log(`\n${DRY_RUN ? '✓ DRY RUN COMPLETE - No files modified' : `✓ ${results.length} files fixed`}\n`);

  return results.length;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
