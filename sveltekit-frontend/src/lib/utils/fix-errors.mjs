#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

console.log('🔧 Fixing Svelte component errors...');

// Fix Card components with duplicate script tags
const cardComponents = [
  'src/lib/components/ui/card/CardDescription.svelte',
  'src/lib/components/ui/card/CardFooter.svelte', 
  'src/lib/components/ui/card/CardTitle.svelte'
];

cardComponents.forEach(file => {
  try {
    let content = readFileSync(file, 'utf-8');
    
    // Remove duplicate content and create clean component
    if (file.includes('CardDescription')) {
      content = `<script lang="ts">
  import { cn } from "$lib/utils";
  
  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
  }

  let { children, class: className = "" }: Props = $props();
</script>

<p class={cn("text-sm text-muted-foreground", className)}>
  {@render children?.()}
</p>`;
    }
    
    if (file.includes('CardFooter')) {
      content = `<script lang="ts">
  import { cn } from "$lib/utils";
  
  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
  }

  let { children, class: className = "" }: Props = $props();
</script>

<div class={cn("flex items-center p-6 pt-0", className)}>
  {@render children?.()}
</div>`;
    }
    
    if (file.includes('CardTitle')) {
      content = `<script lang="ts">
  import { cn } from "$lib/utils";
  
  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
  }

  let { children, class: className = "" }: Props = $props();
</script>

<h3 class={cn("text-2xl font-semibold leading-none tracking-tight", className)}>
  {@render children?.()}
</h3>`;
    }
    
    writeFileSync(file, content);
    console.log(`✅ Fixed ${file}`);
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

// Fix Input component mixed event handlers
try {
  let inputContent = readFileSync('src/lib/components/ui/Input.svelte', 'utf-8');
  inputContent = inputContent.replace(/on:keydown={onkeydown}/g, 'onkeydown={onkeydown}');
  inputContent = inputContent.replace(/on:keyup={onkeyup}/g, 'onkeyup={onkeyup}');
  writeFileSync('src/lib/components/ui/Input.svelte', inputContent);
  console.log('✅ Fixed Input.svelte event handlers');
} catch (error) {
  console.error('❌ Error fixing Input.svelte:', error.message);
}

// Fix SmartTextarea mixed event handlers
try {
  let textareaContent = readFileSync('src/lib/components/ui/SmartTextarea.svelte', 'utf-8');
  textareaContent = textareaContent.replace(/on:change/g, 'onchange');
  textareaContent = textareaContent.replace(/on:select/g, 'onselect');
  writeFileSync('src/lib/components/ui/SmartTextarea.svelte', textareaContent);
  console.log('✅ Fixed SmartTextarea.svelte event handlers');
} catch (error) {
  console.error('❌ Error fixing SmartTextarea.svelte:', error.message);
}

// Fix Progress component non-reactive state
try {
  let progressContent = readFileSync('src/lib/components/ui/progress/Progress.svelte', 'utf-8');
  progressContent = progressContent.replace(/let className = '';/, 'let className = $state("");');
  writeFileSync('src/lib/components/ui/progress/Progress.svelte', progressContent);
  console.log('✅ Fixed Progress.svelte reactive state');
} catch (error) {
  console.error('❌ Error fixing Progress.svelte:', error.message);
}

// Fix Modal component transition attributes
try {
  let modalContent = readFileSync('src/lib/components/ui/Modal.svelte', 'utf-8');
  modalContent = modalContent.replace(/transitionfade={.*?}/g, '');
  modalContent = modalContent.replace(/transitionfly={.*?}/g, '');
  writeFileSync('src/lib/components/ui/Modal.svelte', modalContent);
  console.log('✅ Fixed Modal.svelte transition attributes');
} catch (error) {
  console.error('❌ Error fixing Modal.svelte:', error.message);
}

console.log('🎉 Component fixes completed!');