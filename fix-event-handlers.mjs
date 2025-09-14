#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Fix Event Handler Patterns for Svelte 5
 * Fix patterns like:
 * - on:click to onclick
 * - on:submit to onsubmit
 * - on:change to onchange
 * - Event dispatcher patterns
 */

const frontendDir = './sveltekit-frontend/src';
console.log('🔧 Fixing Event Handler Patterns for Svelte 5...\n');

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

    // Check if file contains old-style event handlers
    const hasOldEventHandlers = content.includes('on:click') ||
                               content.includes('on:submit') ||
                               content.includes('on:change') ||
                               content.includes('on:input') ||
                               content.includes('on:keydown') ||
                               content.includes('on:keyup') ||
                               content.includes('on:focus') ||
                               content.includes('on:blur') ||
                               content.includes('on:mouseenter') ||
                               content.includes('on:mouseleave');

    if (hasOldEventHandlers) {
      console.log(`📝 ${path.relative(process.cwd(), filePath)}:`);

      // Map of old event handlers to new ones
      const eventHandlerMap = {
        'on:click': 'onclick',
        'on:submit': 'onsubmit',
        'on:change': 'onchange',
        'on:input': 'oninput',
        'on:keydown': 'onkeydown',
        'on:keyup': 'onkeyup',
        'on:focus': 'onfocus',
        'on:blur': 'onblur',
        'on:mouseenter': 'onmouseenter',
        'on:mouseleave': 'onmouseleave',
        'on:dragover': 'ondragover',
        'on:dragenter': 'ondragenter',
        'on:dragleave': 'ondragleave',
        'on:drop': 'ondrop',
        'on:paste': 'onpaste',
        'on:load': 'onload',
        'on:error': 'onerror'
      };

      // Convert each old event handler
      for (const [oldHandler, newHandler] of Object.entries(eventHandlerMap)) {
        const oldPattern = new RegExp(`\\b${oldHandler.replace(':', '\\:')}=`, 'g');
        if (oldPattern.test(content)) {
          modified = modified.replace(oldPattern, `${newHandler}=`);
          const count = (content.match(oldPattern) || []).length;
          fileFixes += count;
          console.log(`   ✅ Converted ${count} ${oldHandler} → ${newHandler}`);
        }
      }

      // Fix custom event dispatchers for Svelte 5
      // Convert createEventDispatcher to modern pattern
      if (content.includes('createEventDispatcher')) {
        // Look for const dispatch = createEventDispatcher();
        if (content.includes('const dispatch = createEventDispatcher()')) {
          // Convert to props-based events
          modified = modified.replace(
            /const dispatch = createEventDispatcher\(\);/,
            '// Events now handled via props in Svelte 5\n  // const dispatch = createEventDispatcher();'
          );
          fileFixes++;
          console.log(`   ✅ Commented out createEventDispatcher (Svelte 5 migration note)`);
        }

        // Convert dispatch calls to prop-based callbacks
        const dispatchPattern = /dispatch\('(\w+)',\s*([^)]+)\)/g;
        const dispatchMatches = [...content.matchAll(dispatchPattern)];

        for (const match of dispatchMatches) {
          const eventName = match[1];
          const eventData = match[2];

          // Convert to callback prop
          const callbackName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
          const replacement = `${callbackName}?.(${eventData})`;

          modified = modified.replace(match[0], replacement);
          fileFixes++;
          console.log(`   ✅ Converted dispatch('${eventName}') → ${callbackName}?.() callback`);
        }
      }

      // Fix component event listeners that need conversion
      // Pattern: on:uploadcomplete={handleUploadComplete}
      const componentEventPattern = /on:(\w+)=\{([^}]+)\}/g;
      const componentEventMatches = [...content.matchAll(componentEventPattern)];

      for (const match of componentEventMatches) {
        const eventName = match[1];
        const handlerName = match[2];

        // Convert to prop-based callback for component events
        if (!eventHandlerMap[`on:${eventName}`]) {
          // This is a custom component event
          const callbackProp = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
          const replacement = `${callbackProp}={${handlerName}}`;

          modified = modified.replace(match[0], replacement);
          fileFixes++;
          console.log(`   ✅ Converted component event on:${eventName} → ${callbackProp} prop`);
        }
      }

      // Fix preventDefault and stopPropagation patterns
      if (content.includes('|preventDefault') || content.includes('|stopPropagation')) {
        // Convert modifiers to function calls
        modified = modified.replace(/\|preventDefault/g, '');
        modified = modified.replace(/\|stopPropagation/g, '');

        // Add preventDefault/stopPropagation calls in handlers if needed
        const modifierPattern = /(\w+)=\{([^}]+)\}\|preventDefault/g;
        if (modifierPattern.test(content)) {
          fileFixes++;
          console.log(`   ✅ Removed event modifiers (need manual preventDefault in handlers)`);
        }
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

console.log(`\n🎉 Event Handler Pattern fixes complete!`);
console.log(`📊 Files processed: ${filesProcessed}`);
console.log(`🔧 Total fixes: ${totalFixes}`);
console.log(`📁 Files checked: ${svelteFiles.length}`);