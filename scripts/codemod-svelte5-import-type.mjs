#!/usr/bin/env node

/**
 * Codemod: Fix import type for runtime values (transitions, animations)
 * Converts: import type { fade } → import { fade }
 * Scope: All .svelte files in src/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../sveltekit-frontend/src');

// Runtime values that should not be imported as types
const runtimeValues = [
  'fade', 'fly', 'slide', 'scale', 'draw', 'crossfade', 'blur', 'bounce',
  'elasticIn', 'elasticOut', 'elasticInOut', 'backIn', 'backOut', 'backInOut',
  'circIn', 'circOut', 'circInOut', 'cubicIn', 'cubicOut', 'cubicInOut',
  'expoIn', 'expoOut', 'expoInOut', 'quadIn', 'quadOut', 'quadInOut',
  'quartIn', 'quartOut', 'quartInOut', 'quintIn', 'quintOut', 'quintInOut',
  'sineIn', 'sineOut', 'sineInOut', 'linear',
];

let totalFiles = 0;
let changedFiles = 0;
const results = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      }
    } else if (file.endsWith('.svelte')) {
      totalFiles++;
      processSvelteFile(filePath);
    }
  }
}

function processSvelteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Match: import type { ... } from 'svelte/transition' or 'svelte/animate'
    // Pattern: import\s+type\s+\{\s*([^}]+)\s*\}\s+from\s+['"]svelte\/(transition|animate)['"]
    const regex = /import\s+type\s+\{\s*([^}]+)\s*\}\s+from\s+['"]svelte\/(transition|animate)['"]/g;

    content = content.replace(regex, (match, imports, module) => {
      // Check if any of the imported values are runtime values
      const importList = imports.split(',').map(i => i.trim());
      const hasRuntimeValues = importList.some(imp => {
        const name = imp.split(' as ')[0].trim();
        return runtimeValues.includes(name);
      });

      if (hasRuntimeValues) {
        return `import { ${imports} } from 'svelte/${module}'`;
      }
      return match;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      changedFiles++;
      results.push({
        file: path.relative(srcDir, filePath),
        changed: true,
        errors: [],
      });
    }
  } catch (error) {
    results.push({
      file: path.relative(srcDir, filePath),
      changed: false,
      errors: [error.message],
    });
  }
}

console.log('🔄 Fixing import type for runtime values (transitions, animations)...\n');
walkDir(srcDir);

console.log(`✅ Conversion complete!`);
console.log(`📊 Statistics:`);
console.log(`   Total files scanned: ${totalFiles}`);
console.log(`   Files changed: ${changedFiles}`);
console.log(`\n📝 Changed files:`);
results.filter(r => r.changed).forEach(r => {
  console.log(`   ✓ ${r.file}`);
});

if (results.some(r => r.errors.length > 0)) {
  console.log(`\n⚠️  Errors:`);
  results.filter(r => r.errors.length > 0).forEach(r => {
    console.log(`   ✗ ${r.file}: ${r.errors.join(', ')}`);
  });
}
