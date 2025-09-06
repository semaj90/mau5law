#!/usr/bin/env node

import { copyFile, access } from 'fs/promises';
import { constants } from 'fs';

// Next batch of high-priority files from backup analysis
const nextBatch = [
  'src/lib/components/CaseInfoForm.svelte',
  'src/lib/components/DocumentUploadForm.svelte',
  'src/lib/components/ErrorBoundary.svelte',
  'src/lib/components/EvidenceAnalysisForm.svelte',
  'src/lib/components/KeyboardShortcuts.svelte',
  'src/lib/components/RealtimeRAG.svelte',
  'src/lib/components/LegalCaseManager.svelte',
  'src/lib/components/ReviewSubmitForm.svelte',
  'src/lib/components/WebGPUProcessor.svelte',
  'src/lib/components/ai/ComprehensiveSummaryEngine.svelte',
  'src/routes/dev/copilot-optimizer/+page.svelte',
  'src/lib/components/AutoCompleteTextArea.svelte',
  'src/lib/components/BreadcrumbNavigation.svelte',
  'src/lib/components/CodeSnippet.svelte',
  'src/lib/components/ConfigurationPanel.svelte',
  'src/lib/components/DataGrid.svelte',
  'src/lib/components/DatePicker.svelte',
  'src/lib/components/DeveloperMetrics.svelte',
  'src/lib/components/Dropdown.svelte',
  'src/lib/components/EmbeddingVisualizer.svelte'
];

async function restoreBatch2() {
  console.log('🔧 Starting batch 2 restoration...');
  
  let restoredCount = 0;
  let skippedCount = 0;
  
  for (const file of nextBatch) {
    const backupFile = `${file}.backup`;
    
    try {
      // Check if backup exists
      await access(backupFile, constants.F_OK);
      
      // Restore the file
      await copyFile(backupFile, file);
      console.log(`✅ Restored ${file}`);
      restoredCount++;
      
    } catch (error) {
      console.log(`⚠️  Skipped ${file} (no backup or error)`);
      skippedCount++;
    }
  }
  
  console.log(`\n🎉 Batch 2 restoration complete:`);
  console.log(`  ✅ Files restored: ${restoredCount}`);
  console.log(`  ⚠️  Files skipped: ${skippedCount}`);
}

restoreBatch2().catch(console.error);