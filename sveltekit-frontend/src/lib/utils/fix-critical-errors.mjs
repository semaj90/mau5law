#!/usr/bin/env node

/**
 * Critical TypeScript Error Fixes for Production
 * Fixes the most common issues preventing compilation
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

console.log('🚀 Fixing critical TypeScript errors...');

// Create type definitions
const typeFiles = {
  'src/lib/types/ai.ts': `
export interface AIResponse {
  confidence?: number;
  keyTerms?: string[];
  processingTime?: number;
  gpuProcessed?: boolean;
  legalRisk?: string;
  [key: string]: unknown;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  source?: string;
  confidence?: number;
}

export interface SemanticEntity {
  id: string;
  text: string;
  type: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}
`
};

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Create type files
for (const [filePath, content] of Object.entries(typeFiles)) {
  ensureDir(filePath);
  writeFileSync(filePath, content.trim(), 'utf-8');
  console.log(`✅ Created: ${filePath}`);
}

// Fix specific problematic files
const filesToFix = [
  'src/lib/components/ui/enhanced-bits/Select.svelte',
  'src/routes/windows-gguf-demo/+page.svelte'
];

for (const filePath of filesToFix) {
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Fix Bits UI component names
    if (content.includes('BitsSelect')) {
      content = content
        .replace(/BitsSelectRoot/g, 'SelectRoot')
        .replace(/BitsSelectTrigger/g, 'SelectTrigger') 
        .replace(/BitsSelectContent/g, 'SelectContent')
        .replace(/BitsSelectItem/g, 'SelectItem');
      modified = true;
    }

    // Fix component imports
    if (content.includes('import { Button }')) {
      content = content.replace(
        /import \{ (\w+) \} from "\$lib\/components\/ui\/enhanced-bits\/(\w+)\.svelte"/g,
        'import $1 from "$lib/components/ui/enhanced-bits/$2.svelte"'
      );
      modified = true;
    }

    // Add type imports for demo pages
    if (filePath.includes('windows-gguf-demo') && !content.includes('import type { AIResponse }')) {
      content = content.replace(
        /<script lang="ts">/,
        `<script lang="ts">
  import type { AIResponse } from '$lib/types/ai';`
      );
      modified = true;
    }

    // Fix unknown type properties
    if (content.includes('unknown')) {
      content = content.replace(/: unknown/g, ': AIResponse');
      modified = true;
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
    }
  }
}

console.log('🎉 Critical TypeScript errors fixed!');
console.log('👉 Run "npm run check" to verify');