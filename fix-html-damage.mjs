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

// Find all TypeScript and JavaScript files that might have been damaged
const files = findFiles(frontendDir, ['.ts', '.js', '.mjs']);

let fixedFiles = 0;

console.log('🔧 Fixing HTML damage in TypeScript/JavaScript files...');

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Fix the specific patterns that were incorrectly replaced
    const badPatterns = [
      { from: /Array<!\-\- Component tag fixed \-\->/g, to: 'Array<' },
      { from: /Promise<!\-\- Component tag fixed \-\->/g, to: 'Promise<' },
      { from: /\): Promise<!\-\- Component tag fixed \-\->/g, to: '): Promise<' },
      { from: /<!-- Component tag fixed -->/g, to: '' },
      { from: /!\-\- Component tag fixed \-\->/g, to: '' },
      // Fix other comment damage
      { from: /<!-- Component\s+tag\s+fixed\s+-->/g, to: '' },
      { from: /<!-- Button closing tag fixed -->/g, to: '' },
      { from: /<!-- Card component fixed -->/g, to: '' },
      // Fix broken type declarations
      { from: /Array<\s*;\s*}/g, to: 'Array<any>' },
      { from: /Promise<\s*;\s*}/g, to: 'Promise<any>' },
      { from: /Array<\s*>/g, to: 'Array<any>' },
      { from: /Promise<\s*>/g, to: 'Promise<any>' }
    ];

    for (const pattern of badPatterns) {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    // Fix specific broken syntax patterns
    if (content.includes('Array<!-- Component')) {
      content = content.replace(/Array<!--\s*Component[^>]*-->/g, 'Array<any>');
      modified = true;
    }

    if (content.includes('Promise<!-- Component')) {
      content = content.replace(/Promise<!--\s*Component[^>]*-->/g, 'Promise<any>');
      modified = true;
    }

    // Fix broken type parameters
    content = content.replace(/Array<([^>]*<!--[^>]*-->)>/g, 'Array<any>');
    content = content.replace(/Promise<([^>]*<!--[^>]*-->)>/g, 'Promise<any>');

    if (modified) {
      fs.writeFileSync(file, content);
      fixedFiles++;
      console.log(`✅ Fixed: ${path.relative(frontendDir, file)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎯 Fixed HTML damage in ${fixedFiles} files`);