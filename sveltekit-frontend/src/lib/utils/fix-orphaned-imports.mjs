#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

const files = globSync('src/**/*.ts', { cwd: process.cwd() });
let fixCount = 0;

console.log(`🔧 Fixing orphaned imports in ${files.length} TypeScript files...`);

for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Pattern 1: Fix orphaned imports with drizzle-orm
    content = content.replace(
      /\/\/ Orphaned content: import \{\s*([\s\S]*?)\s*(?=import|export|\/\/|$)/g,
      (match, importContent) => {
        const cleanImports = importContent
          .split(/[,\n]/)
          .map(item => item.trim())
          .filter(item => item && !item.startsWith('//'))
          .filter(item => item !== 'import' && item !== '{' && item !== '}');
        
        // Check if these look like drizzle-orm imports
        if (cleanImports.some(imp => ['sql', 'eq', 'and', 'desc', 'asc'].includes(imp))) {
          return `import {\n  ${cleanImports.join(',\n  ')}\n} from "drizzle-orm";\n`;
        }
        
        // Check if these look like XState imports  
        if (cleanImports.some(imp => ['assign', 'createMachine', 'fromCallback', 'interpret'].includes(imp))) {
          return `import {\n  ${cleanImports.join(',\n  ')}\n} from "xstate";\n`;
        }
        
        // Check if these look like Svelte imports
        if (cleanImports.some(imp => ['writable', 'derived', 'get', 'readable'].includes(imp))) {
          return `import {\n  ${cleanImports.join(',\n  ')}\n} from "svelte/store";\n`;
        }
        
        // Default: comment it out for manual review
        return `// TODO: Fix import - ${match.replace(/\n/g, ' ')}`;
      }
    );
    
    // Pattern 2: Fix standalone orphaned import lines
    content = content.replace(
      /^(sql|eq|and|desc|asc|or|isNotNull|ilike|inArray)\s*$/gm,
      '} from "drizzle-orm";'
    );
    
    // Pattern 3: Fix missing import statement starts
    content = content.replace(
      /^([a-zA-Z_$][a-zA-Z0-9_$]*(?:\s*,\s*[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*$/gm,
      (match, imports) => {
        // Only if line looks like orphaned imports
        if (match.includes(',') || ['sql', 'eq', 'and', 'desc'].some(term => match.includes(term))) {
          return `import { ${imports} } from "drizzle-orm";`;
        }
        return match;
      }
    );
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      fixCount++;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Fixed orphaned imports in ${fixCount} files!`);
console.log(`📝 Run 'npx tsc --noEmit' to check for remaining issues.`);