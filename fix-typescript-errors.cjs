#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix malformed property access patterns like: .(prop as { ... })
function fixMalformedPropertyAccess(content) {
  // Pattern 1: .(data as { ... }).length -> .data.length
  content = content.replace(/\.\((\w+)\s+as\s+\{[^}]+\}\)\.(\w+)/g, '.$1.$2');

  // Pattern 2: .(data as { ... }) without following property -> .data
  content = content.replace(/\.\((\w+)\s+as\s+\{[^}]+\}\)/g, '.$1');

  // Pattern 3: Fix spread operator errors like ..?.model -> ...model
  content = content.replace(/\.\.(\?\.)?(\w+)\s*\|\|\s*"[^"]+"\s*\/\/[^,\n]+/g, '...$2');

  // Pattern 4: Fix incomplete spread operators
  content = content.replace(/\.\.\?\.(\w+)/g, '...$1');

  return content;
}

// Process all TypeScript and Svelte files
async function processFiles() {
  const patterns = [
    'sveltekit-frontend/src/**/*.ts',
    'sveltekit-frontend/src/**/*.svelte'
  ];

  let totalFixed = 0;

  for (const pattern of patterns) {
    const files = glob.sync(pattern);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const fixed = fixMalformedPropertyAccess(content);

        if (content !== fixed) {
          fs.writeFileSync(file, fixed, 'utf-8');
          console.log(`✅ Fixed: ${file}`);
          totalFixed++;
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Total files fixed: ${totalFixed}`);
}

// Check if glob is installed
try {
  require.resolve('glob');
  processFiles();
} catch (e) {
  console.log('Installing glob package...');
  require('child_process').execSync('npm install glob', { stdio: 'inherit' });
  processFiles();
}