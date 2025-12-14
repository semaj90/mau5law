#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Creates an inventory of files that need Phase 3 conversions
 * Organizes by task and provides file lists for manual conversion
 */

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function main() {
  console.log('📋 Phase 3 File Inventory\n');

  // Task 9: export let → $props
  console.log('Task 9: export let → $props');
  const exportLetFiles = runCommand(
    'rg "export let" sveltekit-frontend/src --glob "*.svelte" -l'
  );
  console.log(`  Files: ${exportLetFiles.length}`);
  console.log(`  Patterns: 107\n`);

  // Task 10: $: variable = ... → $derived
  console.log('Task 10: $: variable = ... → $derived');
  const derivedFiles = runCommand(
    'rg \'\\$: \\w+ =\' sveltekit-frontend/src --glob "*.svelte" -l'
  );
  console.log(`  Files: ${derivedFiles.length}`);
  console.log(`  Patterns: 7\n`);

  // Task 11: $: { ... } → $effect
  console.log('Task 11: $: { ... } → $effect');
  const effectFiles = runCommand(
    'rg \'\\$: \\{\' sveltekit-frontend/src --glob "*.svelte" -l'
  );
  console.log(`  Files: ${effectFiles.length}`);
  console.log(`  Patterns: 0\n`);

  // Task 12: onMount → $effect
  console.log('Task 12: onMount → $effect');
  const onMountFiles = runCommand(
    'rg "onMount\\(" sveltekit-frontend/src --glob "*.svelte" -l'
  );
  console.log(`  Files: ${onMountFiles.length}`);
  console.log(`  Patterns: 162\n`);

  // Task 13: onDestroy → $effect
  console.log('Task 13: onDestroy → $effect');
  const onDestroyFiles = runCommand(
    'rg "onDestroy\\(" sveltekit-frontend/src --glob "*.svelte" -l'
  );
  console.log(`  Files: ${onDestroyFiles.length}`);
  console.log(`  Patterns: 30\n`);

  // Create inventory file
  const inventory = {
    task9: {
      name: 'export let → $props',
      files: exportLetFiles,
      count: exportLetFiles.length,
      patterns: 107,
    },
    task10: {
      name: '$: variable = ... → $derived',
      files: derivedFiles,
      count: derivedFiles.length,
      patterns: 7,
    },
    task11: {
      name: '$: { ... } → $effect',
      files: effectFiles,
      count: effectFiles.length,
      patterns: 0,
    },
    task12: {
      name: 'onMount → $effect',
      files: onMountFiles,
      count: onMountFiles.length,
      patterns: 162,
    },
    task13: {
      name: 'onDestroy → $effect',
      files: onDestroyFiles,
      count: onDestroyFiles.length,
      patterns: 30,
    },
  };

  fs.writeFileSync(
    'PHASE3_FILE_INVENTORY.json',
    JSON.stringify(inventory, null, 2)
  );

  console.log('✅ Inventory saved to PHASE3_FILE_INVENTORY.json');
  console.log(`\nTotal files to process: ${
    exportLetFiles.length +
    derivedFiles.length +
    effectFiles.length +
    onMountFiles.length +
    onDestroyFiles.length
  }`);
  console.log(`Total patterns to convert: 306`);
}

main();
