#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Cleaning up remaining TODO import comments...');

try {
  // Find all files with TODO comments
  const result = execSync('find src -name "*.ts" -exec grep -l "TODO: Fix import" {} \\;', { encoding: 'utf8' });
  const files = result.trim().split('\n').filter(f => f);
  
  console.log(`Found ${files.length} files with TODO import comments`);
  
  let fixedCount = 0;
  
  for (const filePath of files) {
    try {
      let content = readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Remove TODO import comments that couldn't be auto-fixed
      content = content.replace(
        /^\/\/ TODO: Fix import - \/\/ Orphaned content: import \{.*$/gm,
        ''
      );
      
      // Clean up any double empty lines
      content = content.replace(/\n\n\n+/g, '\n\n');
      
      if (content !== originalContent) {
        writeFileSync(filePath, content, 'utf8');
        fixedCount++;
        console.log(`✅ Cleaned: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Cleaned TODO comments from ${fixedCount} files!`);
  
} catch (error) {
  console.error('Error:', error.message);
}