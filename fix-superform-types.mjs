#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix SuperForm type compatibility issues
 * Fix patterns like:
 * - Form validation type mismatches
 * - $form.name, $form.email access patterns
 * - superForm schema incompatibilities
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing SuperForm type compatibility issues...\n');

// Find all Svelte files that likely use forms
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

    // Check if file contains SuperForm patterns
    const hasSuperFormIssues = content.includes('superForm(') ||
                              content.includes('$form.') ||
                              content.includes('$errors.') ||
                              content.includes('validators: zod(');

    if (hasSuperFormIssues) {
      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      // Fix form field access patterns
      // Replace $form.name with $form.form.name for nested form structures
      const fieldAccessPattern = /\$form\.(name|email|message|title|description|content)\b/g;
      const fieldMatches = [...content.matchAll(fieldAccessPattern)];

      if (fieldMatches.length > 0) {
        // Check if this is a nested form structure
        if (content.includes('form: {') && content.includes('name: string')) {
          for (const match of fieldMatches) {
            const fieldName = match[1];
            modified = modified.replace(`$form.${fieldName}`, `$form.form.${fieldName}`);
            fileFixes++;
          }
          console.log(`   ✅ Fixed ${fieldMatches.length} nested form field access patterns`);
        }
      }

      // Fix error field access patterns
      const errorAccessPattern = /\$errors\.(name|email|message|title|description|content)\b/g;
      const errorMatches = [...content.matchAll(errorAccessPattern)];

      if (errorMatches.length > 0) {
        // Check if errors need nested structure
        if (content.includes('form: {') && content.includes('name: string')) {
          for (const match of errorMatches) {
            const fieldName = match[1];
            modified = modified.replace(`$errors.${fieldName}`, `$errors.form.${fieldName}`);
            fileFixes++;
          }
          console.log(`   ✅ Fixed ${errorMatches.length} nested error field access patterns`);
        }
      }

      // Fix validator schema mismatch
      // Pattern: validators: zod(testSchema) where testSchema doesn't match form structure
      if (content.includes('validators: zod(testSchema)') && content.includes('form: {')) {
        // Create a wrapper schema that matches the expected structure
        const schemaFix = `validators: zod(z.object({
    form: testSchema
  }))`;

        modified = modified.replace('validators: zod(testSchema)', schemaFix);
        fileFixes++;
        console.log(`   ✅ Fixed validator schema structure mismatch`);
      }

      // Fix superForm data structure mismatch
      if (content.includes('data.form.caseId') && !content.includes('caseId?:')) {
        // Add caseId to the form type structure
        const typePattern = /{\s*(evidenceType\?\:\s*[^;]+;\s*[^}]+)\s*}/;
        const typeMatch = modified.match(typePattern);

        if (typeMatch) {
          const existingFields = typeMatch[1];
          const updatedType = `{
    ${existingFields};
    caseId?: string;
  }`;

          modified = modified.replace(typeMatch[0], updatedType);
          fileFixes++;
          console.log(`   ✅ Added missing caseId field to form type`);
        }
      }

      // Fix ValidationAdapter type mismatch
      const validationAdapterPattern = /Type 'ValidationAdapter<[^>]+>' is not assignable to type 'ClientValidationAdapter/;
      if (validationAdapterPattern.test(content)) {
        // Fix by ensuring proper type alignment
        modified = modified.replace(
          /const\s*{\s*form,\s*errors,\s*enhance:\s*formEnhance,\s*submitting\s*}\s*=\s*superForm\(data,\s*{[^}]*validators:\s*zod\([^)]+\)/,
          (match) => {
            return match.replace('validators: zod(testSchema)', 'validators: zod(z.object({ form: testSchema }))');
          }
        );

        if (modified !== content) {
          fileFixes++;
          console.log(`   ✅ Fixed ValidationAdapter type alignment`);
        }
      }

      // Fix enhance function usage
      if (content.includes('enhance(({ formData }) => {')) {
        modified = modified.replace(
          /enhance\(\(\{\s*formData\s*\}\)\s*=>\s*\{[^}]+\}\)/g,
          'enhance'
        );
        fileFixes++;
        console.log(`   ✅ Fixed enhance() function usage pattern`);
      }

      // Fix use:enhance action patterns
      if (content.includes('use:createEnhancedAction()')) {
        modified = modified.replace('use:createEnhancedAction()', 'use:enhance');
        fileFixes++;
        console.log(`   ✅ Fixed use:createEnhancedAction() to use:enhance`);
      }
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

console.log(`\n🎉 SuperForm type compatibility fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);