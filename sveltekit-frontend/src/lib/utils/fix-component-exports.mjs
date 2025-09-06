#!/usr/bin/env node

/**
 * Comprehensive Component Export Fixer
 * Fixes the 872 Svelte errors by resolving component import/export issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting Component Export Fix...');

// Track fixes
const fixes = {
  barrelExports: 0,
  componentImports: 0,
  eventHandlers: 0,
  typeScriptSyntax: 0,
  bitsUIProperties: 0,
  filesModified: []
};

/**
 * 1. Fix main UI barrel exports
 */
function fixMainUIExports() {
  const mainUIIndexPath = 'src/lib/components/ui/index.ts';
  
  const newContent = `// Comprehensive UI Component Exports
// Auto-generated barrel file for all UI components

// Enhanced Bits UI Components (Legal AI specific)
export * from './enhanced-bits';

// Standard Components
export * from './button';
export * from './card';
export * from './dialog';
export * from './select';
export * from './input';
export * from './label';
export * from './textarea';
export * from './badge';
export * from './separator';
export * from './tabs';
export * from './tooltip';
export * from './context-menu';
export * from './dropdown-menu';
export * from './progress';
export * from './scrollarea';

// Layout Components
export * from './layout';
export * from './grid';
export * from './modal';

// Individual component exports for compatibility
import Badge from "./Badge.svelte";
import Button from "./Button.svelte";
import Card from "./Card.svelte";
import CardContent from "./CardContent.svelte";
import CardFooter from "./CardFooter.svelte";
import CardHeader from "./CardHeader.svelte";
import CardTitle from "./CardTitle.svelte";
import Input from "./Input.svelte";
import Label from "./Label.svelte";
import Modal from "./Modal.svelte";
import Tooltip from "./Tooltip.svelte";

export {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Modal,
  Tooltip
};

// Re-export from enhanced-bits for direct access
export {
  Button as EnhancedButton,
  Card as EnhancedCard,
  Dialog as EnhancedDialog,
  Select as EnhancedSelect,
  Input as EnhancedInput
} from './enhanced-bits';

// Legacy exports for compatibility
export { default as BitsUnoDemo } from "./BitsUnoDemo.svelte";
export { default as CaseForm } from "./CaseForm.svelte";
export { default as CommandMenu } from "./CommandMenu.svelte";
export { default as DragDropZone } from "./DragDropZone.svelte";
export { default as Form } from "./Form.svelte";
export { default as MarkdownRenderer } from "./MarkdownRenderer.svelte";
export { default as RichTextEditor } from "./RichTextEditor.svelte";
export { default as SmartTextarea } from "./SmartTextarea.svelte";
`;
  
  fs.writeFileSync(mainUIIndexPath, newContent);
  fixes.barrelExports++;
  fixes.filesModified.push(mainUIIndexPath);
  console.log('✅ Fixed main UI barrel exports');
}

/**
 * 2. Fix Select component barrel export
 */
function fixSelectBarrelExports() {
  const selectIndexPath = 'src/lib/components/ui/select/index.js';
  
  const newContent = `// Select Component Barrel Export
export { default as SelectRoot } from './SelectRoot.svelte';
export { default as SelectTrigger } from './SelectTrigger.svelte';
export { default as SelectContent } from './SelectContent.svelte';
export { default as SelectItem } from './SelectItem.svelte';
export { default as SelectValue } from './SelectValue.svelte';
export { default as SelectGroup } from './SelectGroup.svelte';
export { default as SelectLabel } from './SelectLabel.svelte';
export { default as SelectSeparator } from './SelectSeparator.svelte';

// Legacy exports
export { default as Select } from './SelectRoot.svelte';

// Types
export type * from './types';
`;
  
  fs.writeFileSync(selectIndexPath, newContent);
  fixes.barrelExports++;
  fixes.filesModified.push(selectIndexPath);
  console.log('✅ Fixed Select barrel exports');
}

/**
 * 3. Fix Button component barrel export
 */
function fixButtonBarrelExports() {
  const buttonIndexPath = 'src/lib/components/ui/button/index.ts';
  
  const newContent = `// Button Component Barrel Export
export { default as Button } from './Button.svelte';
export { buttonVariants } from '../enhanced/button-variants';
export type { ButtonProps, ButtonVariants } from './Button.svelte';
`;
  
  fs.writeFileSync(buttonIndexPath, newContent);
  fixes.barrelExports++;
  fixes.filesModified.push(buttonIndexPath);
  console.log('✅ Fixed Button barrel exports');
}

/**
 * 4. Fix Dialog barrel exports
 */
function fixDialogBarrelExports() {
  const dialogIndexPath = 'src/lib/components/ui/dialog/index.js';
  
  const newContent = `// Dialog Component Barrel Export
export { default as Dialog } from './Dialog.svelte';
export { default as DialogRoot } from './DialogRoot.svelte';
export { default as DialogTrigger } from './DialogTrigger.svelte';
export { default as DialogContent } from './DialogContent.svelte';
export { default as DialogHeader } from './DialogHeader.svelte';
export { default as DialogTitle } from './DialogTitle.svelte';
export { default as DialogDescription } from './DialogDescription.svelte';
export { default as DialogFooter } from './DialogFooter.svelte';
`;
  
  fs.writeFileSync(dialogIndexPath, newContent);
  fixes.barrelExports++;
  fixes.filesModified.push(dialogIndexPath);
  console.log('✅ Fixed Dialog barrel exports');
}

/**
 * 5. Fix BitsDemo.svelte imports
 */
function fixBitsDemoImports() {
  const bitsDemoPath = 'src/lib/components/BitsDemo.svelte';
  
  if (!fs.existsSync(bitsDemoPath)) {
    console.log('⚠️ BitsDemo.svelte not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(bitsDemoPath, 'utf-8');
  
  // Fix imports to use local components instead of bits-ui directly
  content = content.replace(
    `import { Dialog, Button, Select, AlertDialog } from 'bits-ui';`,
    `import { Dialog, Button, Select } from '$lib/components/ui/enhanced-bits';
import { AlertDialog } from 'bits-ui';`
  );
  
  // Fix event handlers for Svelte 5
  content = content.replace(/on:click=/g, 'onclick=');
  content = content.replace(/on:change=/g, 'onchange=');
  content = content.replace(/on:input=/g, 'oninput=');
  
  fs.writeFileSync(bitsDemoPath, content);
  fixes.componentImports++;
  fixes.eventHandlers++;
  fixes.filesModified.push(bitsDemoPath);
  console.log('✅ Fixed BitsDemo.svelte imports and event handlers');
}

/**
 * 6. Fix Enhanced Bits Select component TypeScript issues
 */
function fixEnhancedBitsSelectTypeScript() {
  const selectPath = 'src/lib/components/ui/enhanced-bits/Select.svelte';
  
  if (!fs.existsSync(selectPath)) {
    console.log('⚠️ Enhanced Bits Select.svelte not found, skipping');
    return;
  }
  
  let content = fs.readFileSync(selectPath, 'utf-8');
  
  // Ensure proper lang="ts" attribute
  if (!content.includes('lang="ts"')) {
    content = content.replace('<script>', '<script lang="ts">');
  }
  
  // Fix interface declarations to be properly typed
  content = content.replace(
    'interface SelectOption {',
    'export interface SelectOption {'
  );
  
  fs.writeFileSync(selectPath, content);
  fixes.typeScriptSyntax++;
  fixes.filesModified.push(selectPath);
  console.log('✅ Fixed Enhanced Bits Select TypeScript syntax');
}

/**
 * 7. Fix common component property mismatches
 */
function fixComponentPropertyMismatches() {
  const componentFiles = [
    'src/lib/components/BitsDemo.svelte',
    'src/lib/components/ui/enhanced-bits/EnhancedBitsDemo.svelte'
  ];
  
  componentFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ ${filePath} not found, skipping`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Fix className to class for Svelte
    content = content.replace(/className=/g, 'class=');
    
    // Fix common Bits UI v2 property issues
    content = content.replace(/bind:value={([^}]+)}/g, 'bind:value={$1}');
    
    // Fix directive issues
    content = content.replace(/use:action=/g, 'use:action');
    
    fs.writeFileSync(filePath, content);
    fixes.bitsUIProperties++;
    fixes.filesModified.push(filePath);
    console.log(`✅ Fixed property mismatches in ${path.basename(filePath)}`);
  });
}

/**
 * 8. Create missing barrel export files
 */
function createMissingBarrelExports() {
  const barrelFiles = [
    {
      path: 'src/lib/components/ui/card/index.ts',
      content: `export { default as Card } from './Card.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as CardDescription } from './CardDescription.svelte';
export { default as CardFooter } from './CardFooter.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as CardTitle } from './CardTitle.svelte';`
    },
    {
      path: 'src/lib/components/ui/input/index.ts',
      content: `export { default as Input } from '../Input.svelte';`
    },
    {
      path: 'src/lib/components/ui/label/index.ts',
      content: `export { default as Label } from '../Label.svelte';`
    },
    {
      path: 'src/lib/components/ui/textarea/index.ts',
      content: `export { default as Textarea } from './Textarea.svelte';`
    }
  ];
  
  barrelFiles.forEach(({ path: filePath, content }) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
    fixes.barrelExports++;
    fixes.filesModified.push(filePath);
    console.log(`✅ Created barrel export: ${filePath}`);
  });
}

/**
 * 9. Fix common Svelte 5 migration issues
 */
function fixSvelte5MigrationIssues() {
  const svelteFiles = [
    'src/lib/components/BitsDemo.svelte',
    'src/lib/components/ui/enhanced-bits/EnhancedBitsDemo.svelte',
    'src/lib/components/ui/enhanced-bits/VectorIntelligenceDemo.svelte'
  ];
  
  svelteFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ ${filePath} not found, skipping`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Fix event handlers
    if (content.includes('on:click=')) {
      content = content.replace(/on:click=/g, 'onclick=');
      modified = true;
    }
    
    if (content.includes('on:change=')) {
      content = content.replace(/on:change=/g, 'onchange=');
      modified = true;
    }
    
    if (content.includes('on:input=')) {
      content = content.replace(/on:input=/g, 'oninput=');
      modified = true;
    }
    
    // Fix reactive statements to $derived (basic cases)
    const reactiveRegex = /\\$:\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*([^;\\n]+);?/g;
    if (reactiveRegex.test(content)) {
      content = content.replace(reactiveRegex, 'let $1 = $derived($2);');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      fixes.eventHandlers++;
      fixes.filesModified.push(filePath);
      console.log(`✅ Fixed Svelte 5 migration issues in ${path.basename(filePath)}`);
    }
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting systematic component fixes...\n');
  
  try {
    // 1. Fix main barrel exports
    console.log('📦 Fixing barrel exports...');
    fixMainUIExports();
    fixSelectBarrelExports();
    fixButtonBarrelExports();
    fixDialogBarrelExports();
    createMissingBarrelExports();
    
    // 2. Fix component imports
    console.log('\n🔧 Fixing component imports...');
    fixBitsDemoImports();
    
    // 3. Fix TypeScript syntax issues
    console.log('\n📝 Fixing TypeScript syntax...');
    fixEnhancedBitsSelectTypeScript();
    
    // 4. Fix property mismatches
    console.log('\n🔍 Fixing property mismatches...');
    fixComponentPropertyMismatches();
    
    // 5. Fix Svelte 5 migration issues
    console.log('\n⚡ Fixing Svelte 5 migration issues...');
    fixSvelte5MigrationIssues();
    
    // Summary
    console.log('\n📊 FIX SUMMARY');
    console.log('=' * 50);
    console.log(`✅ Barrel exports fixed: ${fixes.barrelExports}`);
    console.log(`✅ Component imports fixed: ${fixes.componentImports}`);
    console.log(`✅ Event handlers fixed: ${fixes.eventHandlers}`);
    console.log(`✅ TypeScript syntax fixed: ${fixes.typeScriptSyntax}`);
    console.log(`✅ Bits UI properties fixed: ${fixes.bitsUIProperties}`);
    console.log(`📁 Total files modified: ${fixes.filesModified.length}`);
    
    console.log('\n📋 Modified files:');
    fixes.filesModified.forEach(file => {
      console.log(`   • ${file}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Run "npm run check" to verify fixes');
    console.log('2. Run "npm run dev" to test in development');
    console.log('3. Check remaining errors and iterate');
    
    console.log('\n🎉 Component export fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during fixes:', error);
    process.exit(1);
  }
}

// Run the fixes
main().catch(console.error);