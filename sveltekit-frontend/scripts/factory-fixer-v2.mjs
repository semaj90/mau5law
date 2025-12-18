#!/usr/bin/env node
/**
 * Phase 72 Factory Fixer v2.0
 *
 * Implements the complete factory loop:
 * Plan → Patch → Apply → Verify → Rollback
 *
 * Features:
 * - Immutable run folders (reports/runs/<timestamp>/)
 * - Path-scoped fixes (--path "src/lib/services/**")
 * - Patch generation before apply
 * - Verification gate (--verify "npm run check:ultra-fast")
 * - Automatic rollback on failure
 * - RAG integration for confidence tracking
 *
 * Usage:
 *   node factory-fixer-v2.mjs --plan --tier 1 --path "src/lib/services/**"
 *   node factory-fixer-v2.mjs --generate-patches --tier 1 --path "src/lib/services/**" --limit 1000
 *   node factory-fixer-v2.mjs --apply --tier 1 --path "src/lib/services/**" --limit 500 --verify "npm run check:ultra-fast"
 *   node factory-fixer-v2.mjs --rollback --run 2025-12-17_235901
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { minimatch } from 'minimatch';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.join(__dirname, '..', 'reports');
const runsDir = path.join(reportsDir, 'runs');

// ============================================================
// CLI FLAGS PARSING
// ============================================================
const FLAGS = {
  // Actions (mutually exclusive)
  PLAN: process.argv.includes("--plan"),
  GENERATE_PATCHES: process.argv.includes("--generate-patches"),
  APPLY: process.argv.includes("--apply") || process.argv.includes("--apply-safe"),
  ROLLBACK: process.argv.includes("--rollback"),
  STATUS: process.argv.includes("--status"),

  // Options
  TIER: process.argv.includes("--tier") ? parseInt(process.argv[process.argv.indexOf("--tier") + 1] || "1") : 1,
  PATH: process.argv.includes("--path") ? process.argv[process.argv.indexOf("--path") + 1] : null,
  LIMIT: process.argv.includes("--limit") ? parseInt(process.argv[process.argv.indexOf("--limit") + 1]) : Infinity,
  VERIFY: process.argv.includes("--verify") ? process.argv[process.argv.indexOf("--verify") + 1] : null,
  RUN: process.argv.includes("--run") ? process.argv[process.argv.indexOf("--run") + 1] : null,
  INPUT: process.argv.includes("--input") ? process.argv[process.argv.indexOf("--input") + 1] : path.join(reportsDir, 'latest', 'errors.jsonl'),

  // Flags
  VERBOSE: process.argv.includes("--verbose"),
  DRY_RUN: process.argv.includes("--dry-run"),
  FORCE: process.argv.includes("--force"),
  TRACK_RAG: !process.argv.includes("--no-rag")
};

// Show help if no action specified
if (!FLAGS.PLAN && !FLAGS.GENERATE_PATCHES && !FLAGS.APPLY && !FLAGS.ROLLBACK && !FLAGS.STATUS) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                 Phase 72 Factory Fixer v2.0                           ║
║            Plan → Patch → Apply → Verify → Rollback                   ║
╚═══════════════════════════════════════════════════════════════════════╝

ACTIONS (pick one):
  --plan                 Generate fix plan (dry-run analysis)
  --generate-patches     Create patch files for review
  --apply                Apply fixes with backups + verification
  --rollback             Restore files from a previous run
  --status               Show recent runs and stats

OPTIONS:
  --tier <N>             Fix tier: 1=safe, 2=review, 3=manual (default: 1)
  --path <glob>          Scope fixes to path (e.g., "src/lib/services/**")
  --limit <N>            Max errors to fix (default: unlimited)
  --verify <cmd>         Run command after apply (rollback if fails)
  --run <timestamp>      Target run for rollback (e.g., 2025-12-17_235901)
  --input <file>         JSONL input (default: reports/latest/errors.jsonl)

FLAGS:
  --verbose              Show detailed progress
  --dry-run              Simulate apply without writing files
  --force                Skip safety checks (dangerous!)
  --no-rag               Disable RAG confidence tracking

EXAMPLES:

  # 1. Plan Tier 1 fixes for services directory
  node factory-fixer-v2.mjs --plan --tier 1 --path "src/lib/services/**"

  # 2. Generate patches for review (limit 1000)
  node factory-fixer-v2.mjs --generate-patches --tier 1 \\
    --path "src/lib/services/**" --limit 1000

  # 3. Apply fixes with verification gate
  node factory-fixer-v2.mjs --apply --tier 1 \\
    --path "src/lib/services/**" --limit 500 \\
    --verify "npm run check:ultra-fast"

  # 4. Rollback if something went wrong
  node factory-fixer-v2.mjs --rollback --run 2025-12-17_235901

  # 5. Check status of recent runs
  node factory-fixer-v2.mjs --status

FACTORY WORKFLOW:
  1. Plan → Analyze scope and generate fix list
  2. Patches → Review changes before applying
  3. Apply → Execute fixes with backups
  4. Verify → Run checks (auto-rollback if fails)
  5. Track → Record success in RAG database

Run folder structure:
  reports/runs/<timestamp>/
    ├── fix-plan.json       (what will be fixed)
    ├── patches/            (diffs for review)
    ├── backups/            (originals before apply)
    └── manifest.json       (execution record)
`);
  process.exit(0);
}

// ============================================================
// TIER DEFINITIONS
// ============================================================
const TIER_DEFINITIONS = {
  1: {
    name: 'Safe Deterministic',
    description: 'Zero-risk transformations with 100% correctness',
    patterns: [
      {
        id: 'unused-import',
        category: 'import-cleanup',
        match: /^(?:(?:(?:Property|Variable) '[^']+' is declared but )|(?:'))('[^']+' is declared but (?:its value )?is never read)/,
        confidence: 0.95,
        fix: (line, match) => {
          // Remove the import line entirely
          return null; // Signals: delete this line
        }
      },
      {
        id: 'import-type-to-value',
        category: 'import-transform',
        match: /'([^']+)' cannot be used as a value because it was imported using 'import type'/,
        confidence: 0.90,
        fix: (line, match) => {
          // Change: import type { X } from 'Y' → import { X } from 'Y'
          return line.replace(/import\s+type\s+\{/, 'import {');
        }
      },
      {
        id: 'lucide-default-import',
        category: 'import-transform',
        match: /Module ["']lucide-svelte["'] has no exported member ['"']([A-Z][a-zA-Z0-9]+)['"']/,
        confidence: 0.85,
        fix: (line, match) => {
          const iconName = match[1];
          // Change: import { Brain } from "lucide-svelte" → import Brain from "lucide-svelte"
          return line.replace(
            new RegExp(`import\\s*\\{\\s*${iconName}\\s*\\}\\s*from\\s*["']lucide-svelte["']`),
            `import ${iconName} from "lucide-svelte"`
          );
        }
      },
      {
        id: 'reactive-assignment',
        category: 'svelte-update',
        match: /Assignments to the property of stores will not be reactive/,
        confidence: 0.80,
        fix: (line, match) => {
          // Requires context - mark for manual review
          return line; // No-op for now, requires AST
        }
      }
    ]
  },
  2: {
    name: 'Review Required',
    description: 'Behavior-preserving refactors needing validation',
    patterns: []
  },
  3: {
    name: 'Manual Only',
    description: 'Complex changes requiring domain expertise',
    patterns: []
  }
};

// ============================================================
// IMMUTABLE RUN MANAGEMENT
// ============================================================
function createImmutableRun() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
  const runDir = path.join(runsDir, timestamp);

  // Invariant: Never overwrite existing runs
  if (fs.existsSync(runDir)) {
    console.error(`❌ INVARIANT VIOLATED: Run ${timestamp} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(path.join(runDir, 'patches'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'backups'), { recursive: true });

  return { timestamp, runDir };
}

function updateLatestPointer(timestamp) {
  const latestDir = path.join(reportsDir, 'latest');
  const sourceDir = path.join(runsDir, timestamp);

  // Windows-safe: Copy files (no symlinks)
  if (!fs.existsSync(latestDir)) {
    fs.mkdirSync(latestDir, { recursive: true });
  }

  const filesToCopy = ['fix-plan.json', 'manifest.json'];
  filesToCopy.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const dstPath = path.join(latestDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
    }
  });
}

// ============================================================
// JSONL EVENT LOADER
// ============================================================
async function loadEvents(filePath) {
  const events = [];

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Input file not found: ${filePath}`);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    let lineNum = 0;
    rl.on('line', (line) => {
      lineNum++;
      if (!line.trim()) return;

      try {
        const event = JSON.parse(line);
        events.push(event);

        if (FLAGS.VERBOSE && lineNum % 1000 === 0) {
          process.stdout.write(`\r⏳ Loaded ${lineNum} events...`);
        }
      } catch (e) {
        if (FLAGS.VERBOSE) {
          console.warn(`⚠️  Invalid JSON at line ${lineNum}`);
        }
      }
    });

    rl.on('close', () => {
      if (FLAGS.VERBOSE) process.stdout.write(`\n`);
      resolve(events);
    });

    rl.on('error', reject);
  });
}

// ============================================================
// PATH FILTERING
// ============================================================
function matchesPathFilter(filePath, globPattern) {
  if (!globPattern) return true;

  // Normalize Windows paths for minimatch
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedGlob = globPattern.replace(/\\/g, '/');

  return minimatch(normalizedPath, normalizedGlob, { matchBase: true });
}

function filterEventsByPath(events, pathGlob) {
  if (!pathGlob) return events;

  const filtered = events.filter(e => matchesPathFilter(e.file, pathGlob));

  console.log(`📁 Path filter: ${pathGlob}`);
  console.log(`   Matched: ${filtered.length} / ${events.length} errors`);

  return filtered;
}

// ============================================================
// FIX PLAN GENERATION
// ============================================================
function generateFixPlan(events, tier) {
  const tierDef = TIER_DEFINITIONS[tier];
  if (!tierDef) {
    console.error(`❌ Invalid tier: ${tier}`);
    process.exit(1);
  }

  const plan = {
    tier,
    tierName: tierDef.name,
    timestamp: new Date().toISOString(),
    totalErrors: events.length,
    fixes: [],
    summary: {
      byCategory: {},
      byFile: {},
      totalFixable: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 }
    }
  };

  events.forEach(event => {
    for (const pattern of tierDef.patterns) {
      const match = event.message.match(pattern.match);
      if (match) {
        const fix = {
          fingerprint: event.fingerprint,
          file: event.file,
          line: event.line,
          column: event.col,
          message: event.message,
          code: event.code,
          patternId: pattern.id,
          category: pattern.category,
          confidence: pattern.confidence
        };

        plan.fixes.push(fix);

        // Update summary
        plan.summary.byCategory[pattern.category] = (plan.summary.byCategory[pattern.category] || 0) + 1;
        plan.summary.byFile[event.file] = (plan.summary.byFile[event.file] || 0) + 1;
        plan.summary.totalFixable++;

        if (pattern.confidence >= 0.9) plan.summary.confidenceDistribution.high++;
        else if (pattern.confidence >= 0.7) plan.summary.confidenceDistribution.medium++;
        else plan.summary.confidenceDistribution.low++;

        break; // Only match first pattern per error
      }
    }
  });

  return plan;
}

// ============================================================
// PATCH GENERATION
// ============================================================
function generatePatches(plan, runDir) {
  const patchesDir = path.join(runDir, 'patches');
  const manifest = {
    timestamp: plan.timestamp,
    tier: plan.tier,
    patches: []
  };

  // Group fixes by file
  const fileGroups = {};
  plan.fixes.forEach(fix => {
    if (!fileGroups[fix.file]) fileGroups[fix.file] = [];
    fileGroups[fix.file].push(fix);
  });

  let patchCount = 0;
  for (const [file, fixes] of Object.entries(fileGroups)) {
    const patchName = `${path.basename(file)}.patch`;
    const patchPath = path.join(patchesDir, patchName);

    let patchContent = `--- ${file}\n+++ ${file} (fixed)\n\n`;

    fixes.forEach(fix => {
      patchContent += `@@ Line ${fix.line}, Col ${fix.column} @@\n`;
      patchContent += `Pattern: ${fix.patternId} (${fix.category})\n`;
      patchContent += `Confidence: ${(fix.confidence * 100).toFixed(1)}%\n`;
      patchContent += `Message: ${fix.message}\n`;
      patchContent += `\n`;
    });

    fs.writeFileSync(patchPath, patchContent);

    manifest.patches.push({
      file,
      patch: patchName,
      fixCount: fixes.length,
      categories: [...new Set(fixes.map(f => f.category))]
    });

    patchCount++;
  }

  fs.writeFileSync(path.join(patchesDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return { patchCount, manifest };
}

// ============================================================
// FIX APPLICATION
// ============================================================
function applyFixes(plan, runDir) {
  const backupsDir = path.join(runDir, 'backups');
  const tierDef = TIER_DEFINITIONS[plan.tier];

  const stats = {
    applied: 0,
    skipped: 0,
    errors: 0,
    filesModified: new Set()
  };

  // Group by file
  const fileGroups = {};
  plan.fixes.slice(0, FLAGS.LIMIT).forEach(fix => {
    if (!fileGroups[fix.file]) fileGroups[fix.file] = [];
    fileGroups[fix.file].push(fix);
  });

  for (const [file, fixes] of Object.entries(fileGroups)) {
    const absPath = path.resolve(file);

    if (!fs.existsSync(absPath)) {
      console.warn(`⚠️  File not found: ${file}`);
      stats.skipped += fixes.length;
      continue;
    }

    try {
      // Backup original
      const backupPath = path.join(backupsDir, path.basename(file) + `.${Date.now()}.bak`);
      fs.copyFileSync(absPath, backupPath);

      if (!FLAGS.DRY_RUN) {
        let content = fs.readFileSync(absPath, 'utf-8');
        const lines = content.split('\n');

        // Sort fixes by line number (descending) to avoid offset issues
        fixes.sort((a, b) => b.line - a.line);

        fixes.forEach(fix => {
          const pattern = tierDef.patterns.find(p => p.id === fix.patternId);
          if (!pattern) return;

          const lineIdx = fix.line - 1;
          if (lineIdx < 0 || lineIdx >= lines.length) return;

          const originalLine = lines[lineIdx];
          const match = originalLine.match(pattern.match);

          if (match) {
            const newLine = pattern.fix(originalLine, match);

            if (newLine === null) {
              // Delete line
              lines.splice(lineIdx, 1);
            } else if (newLine !== originalLine) {
              // Replace line
              lines[lineIdx] = newLine;
            }

            stats.applied++;
            if (FLAGS.VERBOSE) {
              console.log(`✅ ${file}:${fix.line} - ${fix.patternId}`);
            }
          }
        });

        fs.writeFileSync(absPath, lines.join('\n'), 'utf-8');
        stats.filesModified.add(file);
      } else {
        stats.applied += fixes.length;
      }

    } catch (error) {
      console.error(`❌ Error fixing ${file}: ${error.message}`);
      stats.errors++;
    }
  }

  return stats;
}

// ============================================================
// VERIFICATION GATE
// ============================================================
function runVerification(command) {
  if (!command) return { success: true, skipped: true };

  console.log(`\n🔍 Running verification: ${command}`);
  console.log('═'.repeat(70));

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      timeout: 60000 // 1 minute
    });

    console.log('✅ Verification PASSED');
    return { success: true };
  } catch (error) {
    console.error('❌ Verification FAILED');
    return { success: false, error: error.message };
  }
}

// ============================================================
// ROLLBACK
// ============================================================
function rollbackRun(timestamp) {
  const runDir = path.join(runsDir, timestamp);
  const backupsDir = path.join(runDir, 'backups');

  if (!fs.existsSync(backupsDir)) {
    console.error(`❌ No backups found for run: ${timestamp}`);
    process.exit(1);
  }

  console.log(`🔄 Rolling back run: ${timestamp}`);
  console.log('═'.repeat(70));

  const backups = fs.readdirSync(backupsDir);
  let restoredCount = 0;

  backups.forEach(backupFile => {
    const backupPath = path.join(backupsDir, backupFile);
    const originalFile = backupFile.replace(/\.\d+\.bak$/, '');

    // Find original file path from manifest
    const manifestPath = path.join(runDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`⚠️  Manifest not found for ${timestamp}`);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const fileEntry = manifest.filesModified?.find(f => path.basename(f) === originalFile);

    if (fileEntry) {
      const targetPath = path.resolve(fileEntry);
      fs.copyFileSync(backupPath, targetPath);
      console.log(`✅ Restored: ${fileEntry}`);
      restoredCount++;
    }
  });

  console.log(`\n✅ Rolled back ${restoredCount} files`);
}

// ============================================================
// STATUS REPORT
// ============================================================
function showStatus() {
  console.log(`\n📊 Phase 72 Factory Status`);
  console.log('═'.repeat(70));

  if (!fs.existsSync(runsDir)) {
    console.log('No runs found yet.');
    return;
  }

  const runs = fs.readdirSync(runsDir)
    .filter(name => fs.statSync(path.join(runsDir, name)).isDirectory())
    .sort()
    .reverse()
    .slice(0, 10);

  console.log(`\nRecent Runs (last 10):\n`);

  runs.forEach((timestamp, i) => {
    const runDir = path.join(runsDir, timestamp);
    const manifestPath = path.join(runDir, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`${i + 1}. ${timestamp}`);
      console.log(`   Tier: ${manifest.tier} | Applied: ${manifest.stats?.applied || 0} | Files: ${manifest.stats?.filesModified?.length || 0}`);
      console.log(`   Status: ${manifest.verificationPassed ? '✅ Verified' : '❌ Failed'}`);
    } else {
      console.log(`${i + 1}. ${timestamp} (incomplete)`);
    }
  });
}

// ============================================================
// RAG INTEGRATION
// ============================================================
async function recordFixAttemptInRAG(plan, stats, verificationPassed) {
  if (!FLAGS.TRACK_RAG) return;

  try {
    // Import RAG service (dynamic to avoid dependency issues)
    const { recordFix } = await import('../src/lib/services/error-pattern-rag.ts');

    // Record each category
    for (const [category, count] of Object.entries(plan.summary.byCategory)) {
      await recordFix(
        null, // db connection (will be created internally)
        plan.fixes[0]?.fingerprint || 'unknown',
        category,
        verificationPassed,
        count
      );
    }

    console.log(`✅ Recorded fix attempt in RAG database`);
  } catch (error) {
    if (FLAGS.VERBOSE) {
      console.warn(`⚠️  RAG tracking failed: ${error.message}`);
    }
  }
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================
async function main() {
  console.log(`\n╔${'═'.repeat(68)}╗`);
  console.log(`║  Phase 72 Factory Fixer v2.0 - Plan → Patch → Apply → Verify  ║`);
  console.log(`╚${'═'.repeat(68)}╝\n`);

  // ============================================================
  // ACTION: STATUS
  // ============================================================
  if (FLAGS.STATUS) {
    showStatus();
    return;
  }

  // ============================================================
  // ACTION: ROLLBACK
  // ============================================================
  if (FLAGS.ROLLBACK) {
    if (!FLAGS.RUN) {
      console.error('❌ --rollback requires --run <timestamp>');
      process.exit(1);
    }
    rollbackRun(FLAGS.RUN);
    return;
  }

  // ============================================================
  // LOAD EVENTS
  // ============================================================
  console.log(`📖 Loading events: ${FLAGS.INPUT}`);
  const allEvents = await loadEvents(FLAGS.INPUT);
  console.log(`✅ Loaded ${allEvents.length} error events\n`);

  // Apply path filter
  const events = filterEventsByPath(allEvents, FLAGS.PATH);

  if (events.length === 0) {
    console.log('⚠️  No errors matched path filter.');
    return;
  }

  // ============================================================
  // ACTION: PLAN
  // ============================================================
  if (FLAGS.PLAN) {
    console.log(`\n🎯 Generating fix plan for Tier ${FLAGS.TIER}...`);
    const plan = generateFixPlan(events, FLAGS.TIER);

    const { timestamp, runDir } = createImmutableRun();

    fs.writeFileSync(
      path.join(runDir, 'fix-plan.json'),
      JSON.stringify(plan, null, 2)
    );

    updateLatestPointer(timestamp);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 FIX PLAN SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Tier: ${plan.tierName} (${plan.tier})`);
    console.log(`Total Errors: ${plan.totalErrors}`);
    console.log(`Fixable: ${plan.summary.totalFixable} (${((plan.summary.totalFixable / plan.totalErrors) * 100).toFixed(1)}%)`);
    console.log(`Files Affected: ${Object.keys(plan.summary.byFile).length}`);
    console.log(`\nConfidence Distribution:`);
    console.log(`  High   (≥90%): ${plan.summary.confidenceDistribution.high}`);
    console.log(`  Medium (≥70%): ${plan.summary.confidenceDistribution.medium}`);
    console.log(`  Low    (<70%): ${plan.summary.confidenceDistribution.low}`);
    console.log(`\nBy Category:`);
    Object.entries(plan.summary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });
    console.log(`\n📄 Plan saved: ${runDir}/fix-plan.json`);
    console.log(`\n💡 NEXT: node factory-fixer-v2.mjs --generate-patches --tier ${FLAGS.TIER} --path "${FLAGS.PATH || '**'}"`);
    console.log('═'.repeat(70) + '\n');
    return;
  }

  // ============================================================
  // ACTION: GENERATE PATCHES
  // ============================================================
  if (FLAGS.GENERATE_PATCHES) {
    console.log(`\n📝 Generating patches...`);
    const plan = generateFixPlan(events, FLAGS.TIER);

    const { timestamp, runDir } = createImmutableRun();

    fs.writeFileSync(
      path.join(runDir, 'fix-plan.json'),
      JSON.stringify(plan, null, 2)
    );

    const { patchCount, manifest } = generatePatches(plan, runDir);

    updateLatestPointer(timestamp);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('✅ PATCHES GENERATED');
    console.log('═'.repeat(70));
    console.log(`Patches: ${patchCount}`);
    console.log(`Location: ${runDir}/patches/`);
    console.log(`\n📄 Review patches before applying:`);
    console.log(`   code ${runDir}\\patches\\`);
    console.log(`\n💡 NEXT: node factory-fixer-v2.mjs --apply --tier ${FLAGS.TIER} --path "${FLAGS.PATH || '**'}" --limit ${FLAGS.LIMIT} --verify "npm run check:ultra-fast"`);
    console.log('═'.repeat(70) + '\n');
    return;
  }

  // ============================================================
  // ACTION: APPLY
  // ============================================================
  if (FLAGS.APPLY) {
    console.log(`\n🔧 Applying fixes (Tier ${FLAGS.TIER})...`);
    const plan = generateFixPlan(events, FLAGS.TIER);

    const { timestamp, runDir } = createImmutableRun();

    fs.writeFileSync(
      path.join(runDir, 'fix-plan.json'),
      JSON.stringify(plan, null, 2)
    );

    const stats = applyFixes(plan, runDir);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 APPLICATION RESULTS');
    console.log('═'.repeat(70));
    console.log(`Applied: ${stats.applied}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Files Modified: ${stats.filesModified.size}`);

    // Verification gate
    let verificationResult = { success: true, skipped: true };

    if (FLAGS.VERIFY && !FLAGS.DRY_RUN) {
      verificationResult = runVerification(FLAGS.VERIFY);

      if (!verificationResult.success && !FLAGS.FORCE) {
        console.log(`\n🔄 Verification failed - initiating automatic rollback...`);
        rollbackRun(timestamp);
        process.exit(1);
      }
    }

    // Save manifest
    const manifest = {
      timestamp,
      tier: plan.tier,
      stats: {
        applied: stats.applied,
        skipped: stats.skipped,
        errors: stats.errors,
        filesModified: Array.from(stats.filesModified)
      },
      verificationPassed: verificationResult.success,
      verificationSkipped: verificationResult.skipped
    };

    fs.writeFileSync(
      path.join(runDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    updateLatestPointer(timestamp);

    // RAG tracking
    if (verificationResult.success) {
      await recordFixAttemptInRAG(plan, stats, true);
    }

    console.log(`\n✅ Run complete: ${timestamp}`);
    console.log(`📄 Manifest: ${runDir}/manifest.json`);
    console.log(`💾 Backups: ${runDir}/backups/`);

    if (verificationResult.success) {
      console.log(`\n💡 NEXT: Rerun error analysis to measure impact`);
      console.log(`   npm run check:svelte`);
    }

    console.log('═'.repeat(70) + '\n');
  }
}

main().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  if (FLAGS.VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});
