#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';

const svelteFiles = await glob('src/**/*.svelte');

let fixedCount = 0;

for (const file of svelteFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix common remaining syntax issues
    
    // 1. Fix malformed $state with extra characters
    if (content.includes('$state("");>;')) {
      content = content.replace(/\$state\(""\);\>;/g, '$state("");');
      modified = true;
    }
    
    // 2. Remove orphaned interface property lines between valid code
    const lines = content.split('\n');
    const filteredLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip orphaned property declarations that look like:
      // "    source?: string;" or "}" when they're not part of a proper interface
      if (trimmed.match(/^\w+\?\?\s*:\s*\w+(\[\])?\s*;$/) ||
          (trimmed === '}' && i > 0 && lines[i-1].trim().match(/^\w+\?\?\s*:\s*\w+(\[\])?\s*;$/))) {
        // Skip this line
        modified = true;
        continue;
      }
      
      filteredLines.push(line);
    }
    
    if (modified) {
      content = filteredLines.join('\n');
    }
    
    // 3. Fix double semicolons
    if (content.includes(';;')) {
      content = content.replace(/;;/g, ';');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
    
  } catch (error) {
    console.warn(`Warning: Could not process ${file}: ${error.message}`);
  }
}

console.log(`\nFixed ${fixedCount} files with remaining syntax issues.`);