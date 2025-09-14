import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findFiles(dir, extensions) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      results.push(...findFiles(fullPath, extensions));
    } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

const frontendDir = path.join(__dirname, 'sveltekit-frontend', 'src');
const svelteFiles = findFiles(frontendDir, ['.svelte']);
const tsFiles = findFiles(frontendDir, ['.ts', '.js']);

let fixedFiles = 0;

console.log('🔧 Fixing TypeScript and Svelte error patterns...');

// Fix Svelte component export issues
for (const file of svelteFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Fix missing default exports for components that need $props()
    if (content.includes('$props()') && !content.includes('export default')) {
      // Check if component has valid script tag structure
      if (content.includes('<script>') && !content.includes('export default')) {
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
          const scriptContent = scriptMatch[1];
          // Add default export for components using $props()
          const newScriptContent = scriptContent + '\n\n// Auto-generated default export\nexport default {};\n';
          content = content.replace(scriptMatch[0], `<script${scriptMatch[0].match(/<script([^>]*)>/)[1] || ''}>${newScriptContent}</script>`);
          modified = true;
        }
      }
    }

    // Fix $state syntax issues
    const statePatterns = [
      { from: /\$state<([^>]+)>\(\)\(\)/g, to: '$state<$1>()' },
      { from: /\$state\(\)\(\)/g, to: '$state()' },
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\$state<([^>]+)>\(\)\(\)/g, to: 'let $1 = $state<$2>()' },
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\$state\(\)\(\)/g, to: 'let $1 = $state()' }
    ];

    for (const pattern of statePatterns) {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    // Fix component binding issues
    if (content.includes('bind:this={')) {
      content = content.replace(/bind:this=\{([^}]+)\}/g, 'bind:this={$1}');
      modified = true;
    }

    // Fix onclick handlers that weren't converted properly
    content = content.replace(/on:onclick=/g, 'onclick=');
    if (content.includes('on:onclick=')) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content);
      fixedFiles++;
      console.log(`✅ Fixed Svelte: ${path.relative(frontendDir, file)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

// Fix TypeScript files
for (const file of tsFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Fix broken type declarations
    const typePatterns = [
      // Fix Array and Promise types
      { from: /Array<\s*>/g, to: 'Array<any>' },
      { from: /Promise<\s*>/g, to: 'Promise<any>' },
      { from: /Array<\s*;\s*>/g, to: 'Array<any>' },
      { from: /Promise<\s*;\s*>/g, to: 'Promise<any>' },

      // Fix object type syntax
      { from: /:\s*\{\s*\}/g, to: ': Record<string, any>' },

      // Fix function return types
      { from: /\):\s*\{\s*\}/g, to: '): Record<string, any>' },

      // Fix variable declarations with empty types
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*\{\s*\}/g, to: 'let $1: Record<string, any>' },
      { from: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*\{\s*\}/g, to: 'const $1: Record<string, any>' },

      // Fix interface issues
      { from: /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{\s*\}/g, to: 'interface $1 {\n  [key: string]: any;\n}' }
    ];

    for (const pattern of typePatterns) {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    // Fix import issues
    if (content.includes('import') && content.includes('from')) {
      // Fix relative imports without extensions
      content = content.replace(/from\s+['"]\.\/([^'"]+)['"](?!\.js|\.ts|\.svelte)/g, "from './$1.js'");
      content = content.replace(/from\s+['"]\.\.\/([^'"]+)['"](?!\.js|\.ts|\.svelte)/g, "from '../$1.js'");

      // This might have changed something
      if (content !== fs.readFileSync(file, 'utf8')) {
        modified = true;
      }
    }

    // Fix missing semicolons
    if (!content.endsWith(';') && !content.endsWith(';\n') && content.trim().length > 0) {
      const lines = content.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine && !lastLine.endsWith(';') && !lastLine.endsWith('}') && !lastLine.startsWith('//') && !lastLine.startsWith('/*')) {
        content = content.trimEnd() + ';\n';
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      fixedFiles++;
      console.log(`✅ Fixed TypeScript: ${path.relative(frontendDir, file)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎯 Fixed TypeScript/Svelte patterns in ${fixedFiles} files`);