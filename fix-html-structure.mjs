#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix HTML structure errors
 * Fix patterns like:
 * - Mismatched closing tags
 * - Duplicate attributes
 * - Malformed HTML structures
 * - Button closing tag issues
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing HTML structure errors...\n');

// Find all Svelte files
const svelteFiles = await glob(`${frontendDir}/**/*.svelte`, {
  ignore: ['**/node_modules/**', '**/build/**', '**/.svelte-kit/**']
});

let filesProcessed = 0;
let totalFixes = 0;

for (const filePath of svelteFiles) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;
    let fileFixes = 0;

    // Fix duplicate role attributes and similar duplicate issues
    if (content.includes('role="button"') && content.includes('tabindex="0"')) {
      // Look for patterns like:
      // onclick={() => fileInput?.click()}
      //                 role="button"
      //                 tabindex="0"
      const duplicateRolePattern = /onclick=\{[^}]+\}\s*role="button"\s*tabindex="0"/g;
      if (duplicateRolePattern.test(content)) {
        console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

        // Fix the pattern by ensuring proper line structure
        modified = modified.replace(
          /onclick=\{[^}]+\}\s*role="button"\s*tabindex="0"/g,
          (match) => {
            const onclickMatch = match.match(/onclick=\{[^}]+\}/);
            if (onclickMatch) {
              const onclick = onclickMatch[0];
              return `${onclick}\n                role="button"\n                tabindex="0"`;
            }
            return match;
          }
        );
        fileFixes++;
        console.log(`   ✅ Fixed duplicate role/tabindex attributes`);
      }
    }

    // Fix Button closing tag issues
    // Pattern: </Button> without opening
    const invalidButtonClosePattern = /^(\s*)<\/Button>\s*$/gm;
    if (invalidButtonClosePattern.test(content)) {
      if (!fileFixes) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      modified = modified.replace(invalidButtonClosePattern, '');
      fileFixes++;
      console.log(`   ✅ Removed invalid </Button> closing tag`);
    }

    // Fix mismatched div closing tags
    // Look for pattern: </div> that doesn't match opening
    const lines = modified.split('\n');
    const divStack = [];
    const fixedLines = [];
    let hadDivFix = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track div openings and closings
      const divOpens = (line.match(/<div[^>]*>/g) || []).length;
      const divCloses = (line.match(/<\/div>/g) || []).length;
      const selfClosingDivs = (line.match(/<div[^>]*\/>/g) || []).length;

      // Add opens to stack (minus self-closing)
      for (let j = 0; j < divOpens - selfClosingDivs; j++) {
        divStack.push(i);
      }

      // Check closes
      for (let j = 0; j < divCloses; j++) {
        if (divStack.length === 0) {
          // Orphaned closing div - remove it
          if (!hadDivFix && !fileFixes) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);
          fixedLines.push(line.replace('</div>', ''));
          fileFixes++;
          hadDivFix = true;
          console.log(`   ✅ Removed orphaned </div> at line ${i + 1}`);
          continue;
        } else {
          divStack.pop();
        }
      }

      if (!hadDivFix || j === divCloses - 1) {
        fixedLines.push(line);
      }
    }

    if (hadDivFix) {
      modified = fixedLines.join('\n');
    }

    // Fix section closing tag issues
    const invalidSectionClosePattern = /^\s*<\/section>\s*$/gm;
    const hasInvalidSection = invalidSectionClosePattern.test(modified);

    if (hasInvalidSection) {
      if (!fileFixes) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      // Check if there are unmatched section closes
      const sectionOpens = (modified.match(/<section[^>]*>/g) || []).length;
      const sectionCloses = (modified.match(/<\/section>/g) || []).length;

      if (sectionCloses > sectionOpens) {
        // Remove extra closing sections
        let closesToRemove = sectionCloses - sectionOpens;
        modified = modified.replace(/<\/section>/g, (match) => {
          if (closesToRemove > 0) {
            closesToRemove--;
            return '';
          }
          return match;
        });
        fileFixes++;
        console.log(`   ✅ Removed ${sectionCloses - sectionOpens} orphaned </section> tags`);
      }
    }

    // Fix malformed HTML comment patterns that break syntax
    const malformedCommentPattern = /\/\*[^*]*\*\/>\s*}/g;
    if (malformedCommentPattern.test(modified)) {
      if (!fileFixes) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      modified = modified.replace(malformedCommentPattern, '>');
      fileFixes++;
      console.log(`   ✅ Fixed malformed HTML comment syntax`);
    }

    // Fix expected token > errors
    const expectedTokenPattern = /\/\*[^*]*\*\/>\s*}/g;
    if (expectedTokenPattern.test(modified)) {
      if (!fileFixes) console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      modified = modified.replace(expectedTokenPattern, '>');
      fileFixes++;
      console.log(`   ✅ Fixed expected token > error`);
    }

    if (fileFixes > 0) {
      writeFileSync(filePath, modified, 'utf-8');
      filesProcessed++;
      totalFixes += fileFixes;
      console.log(`   💾 Saved with ${fileFixes} fixes\n`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 HTML structure fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);