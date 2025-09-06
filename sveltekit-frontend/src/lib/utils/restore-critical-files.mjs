#!/usr/bin/env node

import { copyFile, access } from 'fs/promises';
import { constants } from 'fs';

// High priority files that need restoration
const criticalFiles = [
  'src/lib/components/AttractivenessMetr.svelte',
  'src/lib/components/BitsDemo.svelte',
  'src/lib/components/CanvasEditor.svelte',
  'src/lib/components/Chat.svelte',
  'src/lib/components/DocumentUploadForm.svelte',
  'src/lib/components/EvidenceAnalysisForm.svelte',
  'src/lib/components/EvidenceUploader.svelte',
  'src/lib/components/InfiniteScrollList.svelte',
  'src/lib/components/LegalCaseManager.svelte',
  'src/lib/components/RealTimeEvidenceGrid.svelte',
  'src/lib/components/ReviewSubmitForm.svelte',
  'src/lib/components/CaseInfoForm.svelte',
  'src/lib/components/WebGPUProcessor.svelte',
  'src/lib/components/ai/AIRecommendation.svelte',
  'src/lib/components/ai/AIStatusIndicator.svelte',
  'src/lib/components/ai/ChatInterface.svelte',
  'src/lib/components/ai/ComprehensiveSummaryEngine.svelte',
  'src/routes/evidence/+page.svelte',
  'src/routes/dev/copilot-optimizer/+page.svelte'
];

async function restoreCriticalFiles() {
  console.log('🔧 Starting critical file restoration...');
  
  let restoredCount = 0;
  let skippedCount = 0;
  
  for (const file of criticalFiles) {
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
  
  console.log(`\n🎉 Restoration complete:`);
  console.log(`  ✅ Files restored: ${restoredCount}`);
  console.log(`  ⚠️  Files skipped: ${skippedCount}`);
}

restoreCriticalFiles().catch(console.error);