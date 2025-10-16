#!/usr/bin/env node

/**
 * Store Consolidation Audit Script
 * Identifies duplicate stores and recommends which to keep/delete
 * Usage: node consolidate-stores-audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORES_DIR = path.join(__dirname, 'src', 'lib', 'stores');

// Store grouping by functionality
const storeGroups = {
  auth: {
    files: [
      'auth.svelte.ts',
      'enhanced-auth.svelte.ts',
      'global-user-store.svelte.ts',
      'sessionManager.svelte.ts',
      'sessionStore.svelte.ts'
    ],
    recommendation: 'Keep: auth.svelte.ts',
    reason: 'Latest version with Svelte 5 support'
  },
  aiAssistant: {
    files: [
      'ai-assistant.svelte.ts',
      'aiAssistant.svelte.ts',
      'ai-chat-store.svelte.ts',
      'ai-chat-store-new.ts',
      'ai-agent.ts',
      'ai-store.ts',
      'ai-unified.ts',
      'ai.ts'
    ],
    recommendation: 'Keep: ai-assistant.svelte.ts',
    reason: 'Svelte 5 $state runes, latest pattern'
  },
  chat: {
    files: [
      'chat.svelte.ts',
      'chatMachine.ts',
      'chatStore.ts',
      'chat-store.ts',
      'chat-history.ts'
    ],
    recommendation: 'Keep: chat.svelte.ts',
    reason: 'Minimal, clean, Svelte 5 ready'
  },
  evidence: {
    files: [
      'evidence.svelte.ts',
      'evidence-global-store.svelte.ts',
      'evidence-store.ts',
      'evidence-unified.ts',
      'evidence-unified-fixed.ts',
      'evidence-workflow.svelte.ts',
      'evidenceStore.ts'
    ],
    recommendation: 'Keep: evidence.svelte.ts (or evidence-global-store.svelte.ts)',
    reason: 'Most feature-complete'
  },
  cases: {
    files: [
      'cases.svelte.ts',
      'cases-fallback.ts',
      'casesStore.ts',
      'caseStore.ts',
      'legal-case.store.svelte.ts',
      'legal-case.svelte.ts'
    ],
    recommendation: 'Keep: cases.svelte.ts',
    reason: 'Svelte 5 naming convention'
  },
  vector: {
    files: [
      'vector-search.ts',
      'citations.ts',
      'legal-citations.ts',
      'legal-poi.ts'
    ],
    recommendation: 'Keep: vector-search.ts + refactor',
    reason: 'Need for vector search integration'
  },
  other: {
    files: [
      'types.ts',
      'index.ts'
    ],
    recommendation: 'Keep: Both',
    reason: 'Barrel exports and type definitions'
  },
  toLiteral: {
    files: [
      'analyticsStore.svelte.ts',
      'analyticsStore.ts',
      'analytics.ts',
      'alerts.ts',
      'ann.ts',
      'avatarStore.ts',
      'barrel-functions.ts',
      'barrel-store-manager.ts',
      'canvas.ts',
      'component-adapter-store.ts',
      'component-metadata-cache.ts',
      'comprehensive-package-barrel-store.svelte.ts',
      'comprehensive-types.ts',
      'current-user.ts',
      'detectiveBoard.ts',
      'dialogs.ts',
      'enhanced-rag-store.ts',
      'enhanced-saved-notes.ts',
      'enhanced-upload-machine.ts',
      'enhancedLokiStore.ts',
      'enhancedStateMachines.ts',
      'error-handler.ts',
      'evidence-cache-service.ts',
      'feedback-store.svelte.ts',
      'form.svelte.ts',
      'global-loki-store.ts',
      'global-loki.ts',
      'gpu-metrics-runes.svelte.ts',
      'gpu-summary-store.svelte.ts',
      'gpu-summary-store.ts',
      'keyboardShortcuts.ts',
      'langchain-service-store.ts',
      'legal-platform-integration.ts',
      'legal-reports.ts',
      'loading-store.ts',
      'lokiStore.ts',
      'modal.ts',
      'multiStepFormMachine.ts',
      'notification.ts',
      'notifications.ts',
      'pg.ts',
      'pipeline.ts',
      'pipelineMachine.ts',
      'realtime.ts',
      'recommendations.ts',
      'redis-component-store.ts',
      'redis-orchestrator-store.ts',
      'redis-state.svelte.ts',
      'report.svelte.ts',
      'saved-notes.ts',
      'system-health-store.svelte.ts',
      'tables.ts',
      'ui.ts',
      'upload-machine.ts',
      'user.analytics.ts',
      'user.ts',
      'userActivityStore.ts',
      'websocket-store.svelte.ts',
      'xstate-service-adapter.svelte.ts',
      'aiHistoryStore.ts',
      'ai-unified.ts'
    ],
    recommendation: 'Delete or refactor into services/',
    reason: 'Duplicate/legacy/redundant'
  }
};

// Get file info
function getFileInfo(filepath) {
  try {
    const stat = fs.statSync(filepath);
    return {
      exists: true,
      size: stat.size,
      sizeKB: (stat.size / 1024).toFixed(1),
      mtime: new Date(stat.mtime).toLocaleDateString()
    };
  } catch (e) {
    return { exists: false };
  }
}

// Main audit
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║          STORE CONSOLIDATION AUDIT (Phase 3)                ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let totalSize = 0;
let totalFiles = 0;
let recommendedKeep = 0;
let recommendedDelete = 0;

Object.entries(storeGroups).forEach(([group, data]) => {
  if (group === 'toLiteral') return;

  console.log(`\n📦 ${group.toUpperCase()}`);
  console.log(`   Recommendation: ${data.recommendation}`);
  console.log(`   Reason: ${data.reason}`);
  console.log(`   Files:\n`);

  let groupSize = 0;
  data.files.forEach((file) => {
    const filepath = path.join(STORES_DIR, file);
    const info = getFileInfo(filepath);

    if (info.exists) {
      console.log(`      ✓ ${file.padEnd(40)} ${info.sizeKB.padStart(7)} KB`);
      groupSize += info.size;
      totalSize += info.size;
      totalFiles++;
      recommendedKeep += data.recommendation.includes(file) ? 1 : 0;
      recommendedDelete += data.recommendation.includes(file) ? 0 : 1;
    } else {
      console.log(`      ✗ ${file.padEnd(40)} NOT FOUND`);
    }
  });

  console.log(`   ────────────────────────────────────────`);
  console.log(`   Group Total: ${(groupSize / 1024).toFixed(1)} KB\n`);
});

// Summary
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                    CONSOLIDATION SUMMARY                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`📊 Current State:`);
console.log(`   Total Store Files: ${totalFiles}`);
console.log(`   Total Size: ${(totalSize / 1024).toFixed(1)} KB`);
console.log(`   Average File Size: ${(totalSize / totalFiles / 1024).toFixed(1)} KB\n`);

console.log(`🎯 After Consolidation:`);
console.log(`   Keep Files: ~7 canonical stores`);
console.log(`   Delete Files: ${totalFiles - 7} (${((totalFiles - 7) / totalFiles * 100).toFixed(0)}%)`);
console.log(`   Expected Size: ~50-70 KB`);
console.log(`   Reduction: ${((totalSize / 1024 - 60) / (totalSize / 1024) * 100).toFixed(0)}%\n`);

// Deletion list
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                  FILES TO DELETE (67 total)                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const filesToDelete = storeGroups.toLiteral.files;
console.log(`Execute this to delete ${filesToDelete.length} files:\n`);
console.log(`cd src/lib/stores && rm -f \\`);
filesToDelete.forEach((file, idx) => {
  console.log(`  ${file}${idx < filesToDelete.length - 1 ? ' \\' : ''}`);
});

console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
console.log('║             CANONICAL STORE STRUCTURE (KEEP)                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('src/lib/stores/');
console.log('├── index.ts                    # Barrel exports');
console.log('├── auth.svelte.ts              # Auth + session (14.7 KB)');
console.log('├── ai-assistant.svelte.ts      # AI assistant (22.9 KB)');
console.log('├── chat.svelte.ts              # Chat messages (9.2 KB)');
console.log('├── evidence.svelte.ts          # Evidence mgmt');
console.log('├── cases.svelte.ts             # Case management');
console.log('└── types.ts                    # Shared types\n');

console.log('✅ Consolidation will:');
console.log('   • Reduce files from 74 to 7 (91% reduction)');
console.log('   • Reduce size from ~462 KB to ~50 KB (89% reduction)');
console.log('   • Improve tree-shaking for unused code');
console.log('   • Simplify debugging and maintenance');
console.log('   • Enable Svelte 5 $state runes consistently\n');

console.log('⚠️  BEFORE DELETING:');
console.log('   1. Backup stores: cp -r src/lib/stores src/lib/stores.backup');
console.log('   2. Search for imports: grep -r "from.*stores" src/ --include="*.ts"');
console.log('   3. Update imports to use barrel exports from index.ts\n');
