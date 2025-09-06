#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

console.log('🔧 Fixing import and export issues...');

// Fix missing default exports in UI components
const missingDefaultExports = [
  {
    file: 'src/lib/components/UploadArea.svelte',
    content: `
<script lang="ts">
  interface Props {
    onFileSelected?: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
  }
  
  let { onFileSelected = () => {}, accept = "*", multiple = false }: Props = $props();
  
  let dragActive = false;
  let fileInput: HTMLInputElement;
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      onFileSelected(files);
    }
  }
  
  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      onFileSelected(files);
    }
  }
</script>

<div
  class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
  class:border-blue-500={dragActive}
  class:bg-blue-50={dragActive}
  on:drop={handleDrop}
  on:dragover|preventDefault={() => dragActive = true}
  on:dragleave={() => dragActive = false}
>
  <input
    bind:this={fileInput}
    type="file"
    {accept}
    {multiple}
    on:change={handleFileSelect}
    class="hidden"
  />
  
  <div class="space-y-4">
    <div class="text-4xl">📁</div>
    <div>
      <p class="text-lg font-medium">Drop files here or click to browse</p>
      <p class="text-sm text-gray-500">Supports all file types</p>
    </div>
    <button
      on:click={() => fileInput.click()}
      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Select Files
    </button>
  </div>
</div>`
  },
  {
    file: 'src/lib/components/ai/NierAIAssistant.svelte', 
    content: `
<script lang="ts">
  interface Props {
    user?: any;
    isDarkMode?: boolean;
  }
  
  let { user = {}, isDarkMode = $bindable(false) }: Props = $props();
  
  let messages: any[] = [];
  let currentMessage = '';
  
  function sendMessage() {
    if (!currentMessage.trim()) return;
    
    messages = [...messages, {
      id: Date.now(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date()
    }];
    
    // Mock AI response
    setTimeout(() => {
      messages = [...messages, {
        id: Date.now() + 1,
        text: "I understand your request. Let me analyze that for you.",
        sender: 'ai',
        timestamp: new Date()
      }];
    }, 1000);
    
    currentMessage = '';
  }
</script>

<div class="nier-ai-assistant p-6 bg-black text-green-400 font-mono rounded-lg">
  <div class="mb-4">
    <h3 class="text-xl font-bold">NieR AI Assistant</h3>
    <p class="text-sm opacity-75">Androids are prohibited from removing their visors</p>
  </div>
  
  <div class="messages space-y-3 max-h-60 overflow-y-auto mb-4">
    {#each messages as message}
      <div class="message" class:text-yellow-400={message.sender === 'ai'}>
        <span class="font-bold">[{message.sender.toUpperCase()}]</span>
        {message.text}
      </div>
    {/each}
  </div>
  
  <div class="flex gap-2">
    <input
      bind:value={currentMessage}
      on:keydown={(e) => e.key === 'Enter' && sendMessage()}
      placeholder="Enter command..."
      class="flex-1 bg-gray-900 border border-green-400 text-green-400 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
    />
    <button
      on:click={sendMessage}
      class="bg-green-400 text-black px-4 py-2 rounded hover:bg-green-300 transition-colors"
    >
      SEND
    </button>
  </div>
</div>

<style>
  .nier-ai-assistant {
    background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
    border: 1px solid #00ff00;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  }
  
  .messages {
    scrollbar-width: thin;
    scrollbar-color: #00ff00 #000000;
  }
  
  .messages::-webkit-scrollbar {
    width: 8px;
  }
  
  .messages::-webkit-scrollbar-track {
    background: #000000;
  }
  
  .messages::-webkit-scrollbar-thumb {
    background-color: #00ff00;
    border-radius: 4px;
  }
</style>`
  }
];

// Apply fixes
for (const fix of missingDefaultExports) {
  try {
    writeFileSync(fix.file, fix.content.trim());
    console.log(`✅ Fixed default export: ${fix.file}`);
  } catch (error) {
    console.warn(`⚠️ Could not fix ${fix.file}:`, error.message);
  }
}

// Fix card import case sensitivity issues
const cardFixes = [
  {
    pattern: /from ['"]\$lib\/components\/ui\/Card\/index\.js['"]/g,
    replacement: "from '$lib/components/ui/card/index.js'"
  },
  {
    pattern: /from ['"]\$lib\/components\/ui\/Card\/([^'"]+)['"]/g,
    replacement: "from '$lib/components/ui/card/$1'"
  }
];

// Find and fix import case issues
function findAndFixFiles(dir, fixes) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findAndFixFiles(fullPath, fixes);
    } else if (extname(item) === '.svelte') {
      try {
        let content = readFileSync(fullPath, 'utf-8');
        let changed = false;
        
        for (const fix of fixes) {
          if (fix.pattern.test(content)) {
            content = content.replace(fix.pattern, fix.replacement);
            changed = true;
          }
        }
        
        if (changed) {
          writeFileSync(fullPath, content);
          console.log(`✅ Fixed imports in: ${fullPath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

console.log('🔍 Fixing card import case sensitivity...');
findAndFixFiles('src', cardFixes);

console.log('✨ Import fixes completed!');