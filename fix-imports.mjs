#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SVELTEKIT_SRC = './sveltekit-frontend/src';

// Comprehensive patterns for enhanced-bits migration
const replacements = [
  // 1. Import consolidation - Old UI paths to enhanced-bits
  {
    name: 'Card imports',
    pattern: /import\s+(?:(\w+)\s+from\s+)?['"`]\$lib\/components\/ui\/Card\.svelte['"`];?/g,
    replace: 'import { Card } from \'$lib/components/ui/enhanced-bits\';'
  },
  {
    name: 'Button imports',
    pattern: /import\s+(?:(\w+)\s+from\s+)?['"`]\$lib\/components\/ui\/Button\.svelte['"`];?/g,
    replace: 'import { Button } from \'$lib/components/ui/enhanced-bits\';'
  },
  {
    name: 'Badge imports',
    pattern: /import\s+(?:(\w+)\s+from\s+)?['"`]\$lib\/components\/ui\/Badge\.svelte['"`];?/g,
    replace: '// Badge replaced with span - not available in enhanced-bits'
  },
  {
    name: 'Card destructured imports',
    pattern: /import\s+\{\s*([^}]*Card[^}]*)\s*\}\s+from\s+['"`]\$lib\/components\/ui\/card['"`];?/g,
    replace: (match, components) => {
      const cardComponents = ['Card', 'CardHeader', 'CardTitle', 'CardContent', 'CardDescription', 'CardFooter'];
      const usedComponents = cardComponents.filter(comp =>
        components.includes(comp.replace('Card', ''))
      );
      return `import { ${usedComponents.join(', ')} } from '$lib/components/ui/enhanced-bits';`;
    }
  },
  {
    name: 'Button destructured imports',
    pattern: /import\s+\{\s*Button\s*\}\s+from\s+['"`]\$lib\/components\/ui\/button['"`];?/g,
    replace: 'import { Button } from \'$lib/components/ui/enhanced-bits\';'
  },

  // 2. Event handler syntax updates (Svelte 5)
  {
    name: 'on:click events',
    pattern: /\bon:click\b/g,
    replace: 'onclick'
  },
  {
    name: 'on:change events',
    pattern: /\bon:change\b/g,
    replace: 'onchange'
  },
  {
    name: 'on:input events',
    pattern: /\bon:input\b/g,
    replace: 'oninput'
  },
  {
    name: 'on:submit events',
    pattern: /\bon:submit\b/g,
    replace: 'onsubmit'
  },
  {
    name: 'on:keydown events',
    pattern: /\bon:keydown\b/g,
    replace: 'onkeydown'
  },

  // 3. Component class updates for enhanced-bits
  {
    name: 'shadcn-card to bits-card',
    pattern: /class="([^"]*?)shadcn-card([^"]*?)"/g,
    replace: 'class="$1bits-card$2" variant="default" legal={true}'
  },
  {
    name: 'Button bits classes',
    pattern: /<Button([^>]*?)>/g,
    replace: (match) => {
      if (match.includes('class=')) {
        return match.replace(/class="([^"]*)"/, 'class="$1 bits-btn"');
      } else {
        return match.replace('<Button', '<Button class="bits-btn"');
      }
    }
  },

  // 4. Badge component replacement with spans
  {
    name: 'Badge to span replacement',
    pattern: /<Badge\s+variant="([^"]*)"[^>]*>\s*([^<]*)\s*<\/Badge>/g,
    replace: (match, variant, content) => {
      const variantClasses = {
        'default': 'bg-blue-500 text-white',
        'secondary': 'bg-gray-200 text-gray-700',
        'destructive': 'bg-red-500 text-white',
        'outline': 'border border-gray-300 text-gray-700'
      };
      const classes = variantClasses[variant] || 'bg-gray-200 text-gray-700';
      return `<span class="px-2 py-1 rounded text-xs font-medium ${classes}">${content.trim()}</span>`;
    }
  }
];function processFile(filePath) {
  if (!filePath.endsWith('.svelte') && !filePath.endsWith('.ts')) return { changed: false };

  try {
    let content = readFileSync(filePath, 'utf-8');
    let changed = false;
    const appliedFixes = [];

    replacements.forEach(({ name, pattern, replace }) => {
      const originalContent = content;
      content = typeof replace === 'function'
        ? content.replace(pattern, replace)
        : content.replace(pattern, replace);

      if (content !== originalContent) {
        changed = true;
        appliedFixes.push(name);
      }
    });

    if (changed) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      console.log(`   Applied: ${appliedFixes.join(', ')}`);
      return { changed: true, fixes: appliedFixes };
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
  return { changed: false };
}

function processDirectory(dirPath) {
  let totalFixed = 0;
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip backup and node_modules directories
        if (entry.includes('backup') || entry === 'node_modules' || entry === '.git') continue;
        const subResults = processDirectory(fullPath);
        totalFixed += subResults.fixed;
        totalProcessed += subResults.processed;
        totalErrors += subResults.errors;
      } else if (stat.isFile()) {
        const result = processFile(fullPath);
        if (result.changed === false && !result.error) {
          // File was processed but no changes needed
          totalProcessed++;
        } else if (result.changed === true) {
          totalFixed++;
          totalProcessed++;
        } else if (result.error) {
          totalErrors++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message);
    totalErrors++;
  }

  return { fixed: totalFixed, processed: totalProcessed, errors: totalErrors };
}

console.log('🚀 Starting comprehensive enhanced-bits migration...');
console.log('📋 Migration includes:');
console.log('   • Import path consolidation to enhanced-bits');
console.log('   • Event handler syntax (on:click → onclick)');
console.log('   • Component class updates (shadcn → bits)');
console.log('   • Badge → span replacements\n');

const results = processDirectory(SVELTEKIT_SRC);
console.log('\n📊 Migration Results:');
console.log(`✅ Files fixed: ${results.fixed}`);
console.log(`📁 Files processed: ${results.processed}`);
console.log(`❌ Errors: ${results.errors}`);
console.log('\n🎯 Next steps:');
console.log('   1. Run: npx svelte-check --output human');
console.log('   2. Test critical components');
console.log('   3. Verify Redis-GPU pipeline functionality');
