#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svelteDir = path.join(__dirname, 'sveltekit-frontend');

let totalFixes = 0;
let filesProcessed = 0;

function fixStructuralErrors() {
  console.log('🔧 Starting structural error fixes...\n');

  // Fix specific files with structural issues
  const fileFixes = [
    {
      file: 'sveltekit-frontend/src/routes/yorha-terminal/+page.svelte',
      fixes: [
        {
          search: /(\s+)<\/div>\s*<\/div>\s*$/m,
          replace: '                </div>\n        </div>',
          description: 'Fix closing div tag structure'
        }
      ]
    },
    {
      file: 'sveltekit-frontend/src/routes/yorha-test/+page.svelte',
      fixes: [
        {
          search: /(\s+)<\/div>\s*<\/section>\s*$/m,
          replace: '    </div>\n</section>',
          description: 'Fix closing section tag structure'
        }
      ]
    },
    {
      file: 'sveltekit-frontend/tests/legal-workflow.spec.ts',
      fixes: [
        {
          search: /(\s+)visible: link\.offsetParent !== null/,
          replace: '$1visible: (link as HTMLElement).offsetParent !== null',
          description: 'Add type assertion for offsetParent access'
        }
      ]
    },
    {
      file: 'sveltekit-frontend/tests/nes-architecture.spec.ts',
      fixes: [
        {
          search: /(\s+)const status = response\?\.status\(\);/,
          replace: '$1const status = response?.status;',
          description: 'Fix response status property access'
        },
        {
          search: /(\s+)const text = await response\.text\(\);/,
          replace: '$1const text = await response.text();',
          description: 'Keep response.text() method call (this is correct)'
        }
      ]
    },
    {
      file: 'sveltekit-frontend/tests/ux-layout-tests.spec.ts',
      fixes: [
        {
          search: /(\s+)\/\/ @ts-expect-error - LayoutShift type\s*\n(\s+)cumulativeLayoutShift \+= entry\.value;/,
          replace: '$1// LayoutShift type handling\n$2cumulativeLayoutShift += (entry as any).value;',
          description: 'Replace unused @ts-expect-error with proper type assertion'
        }
      ]
    }
  ];

  // Convert remaining on:click patterns in yorha files
  const onClickFixes = [
    {
      file: 'sveltekit-frontend/src/routes/yorha-simple/+page.svelte',
      description: 'Convert remaining on:click to onclick patterns'
    }
  ];

  // Process structural fixes
  fileFixes.forEach(({ file, fixes }) => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;
    let fixCount = 0;

    fixes.forEach(fix => {
      if (fix.search.test(content)) {
        content = content.replace(fix.search, fix.replace);
        console.log(`   ✅ ${fix.description}`);
        fixCount++;
        fileModified = true;
      }
    });

    if (fileModified) {
      fs.writeFileSync(filePath, content);
      console.log(`📝 ${file}:`);
      console.log(`   💾 Saved with ${fixCount} fixes\n`);
      totalFixes += fixCount;
      filesProcessed++;
    }
  });

  // Process on:click fixes for yorha-simple
  const yorhaSimplePath = path.join(__dirname, 'sveltekit-frontend/src/routes/yorha-simple/+page.svelte');
  if (fs.existsSync(yorhaSimplePath)) {
    let content = fs.readFileSync(yorhaSimplePath, 'utf8');
    let fixCount = 0;

    // Convert on:click patterns
    const onClickPattern = /\bon:click\s*=\s*\{([^}]+)\}/g;
    content = content.replace(onClickPattern, (match, handler) => {
      fixCount++;
      return `onclick={${handler}}`;
    });

    if (fixCount > 0) {
      fs.writeFileSync(yorhaSimplePath, content);
      console.log(`📝 sveltekit-frontend/src/routes/yorha-simple/+page.svelte:`);
      console.log(`   ✅ Converted ${fixCount} on:click to onclick patterns`);
      console.log(`   💾 Saved with ${fixCount} fixes\n`);
      totalFixes += fixCount;
      filesProcessed++;
    }
  }

  console.log('🎉 Structural error fixes complete!');
  console.log(`📊 Files processed: ${filesProcessed}`);
  console.log(`🔧 Total fixes: ${totalFixes}`);
}

// Run the fixes
fixStructuralErrors();