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
const allFiles = findFiles(frontendDir, ['.svelte', '.ts', '.js']);

let fixedFiles = 0;

console.log('🔧 Fixing remaining HTML comment damage...');

for (const file of allFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Fix $state<!-- Component tag fixed --> patterns
    if (content.includes('$state<!-- Component tag fixed -->')) {
      content = content.replace(/\$state<!--\s*Component\s+tag\s+fixed\s*-->/g, '$state');
      modified = true;
    }

    // Fix other specific HTML comment damages
    const htmlCommentPatterns = [
      // Fix $state with broken HTML comments
      { from: /\$state<([^>]*)<!--[^>]*-->([^>]*)>/g, to: '$state<$1$2>' },
      { from: /\$state<!--[^>]*-->/g, to: '$state' },

      // Fix Array and Promise with HTML comments
      { from: /Array<([^>]*)<!--[^>]*-->([^>]*)>/g, to: 'Array<$1$2>' },
      { from: /Promise<([^>]*)<!--[^>]*-->([^>]*)>/g, to: 'Promise<$1$2>' },

      // Fix generic HTML comment damage in types
      { from: /<!--\s*Component\s+tag\s+fixed\s*-->/g, to: '' },
      { from: /<!--\s*Button\s+closing\s+tag\s+fixed\s*-->/g, to: '' },
      { from: /<!--\s*Card\s+component\s+fixed\s*-->/g, to: '' },

      // Fix broken type syntax
      { from: /\$state<([^>]+)>\(\)<!--[^>]*-->\(\)/g, to: '$state<$1>()' },
      { from: /\$state\(\)<!--[^>]*-->\(\)/g, to: '$state()' },

      // Fix return type arrows with comments
      { from: /\)\s*:\s*<!--[^>]*-->/g, to: '): ' },

      // Fix duplicate class attributes
      { from: /class="([^"]*)"[^>]*class="([^"]*)"/g, to: 'class="$1 $2"' },

      // Fix duplicate id attributes
      { from: /id="([^"]*)"[^>]*id="([^"]*)"/g, to: 'id="$1"' },

      // Fix broken JSX comment syntax
      { from: /\{\/\*\s*Component\s+rendering\s+fixed\s*\*\/\}/g, to: '' }
    ];

    for (const pattern of htmlCommentPatterns) {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    // Fix specific Svelte syntax issues
    if (file.endsWith('.svelte')) {
      // Fix event handler attributes that should be onclick not change/input
      content = content.replace(/\s+change=\{/g, ' onchange={');
      content = content.replace(/\s+input=\{/g, ' oninput={');
      content = content.replace(/\s+submit=\{/g, ' onsubmit={');

      // Fix broken bind:this syntax
      if (content.includes('bind:this=')) {
        const bindThisRegex = /bind:this=\{([^}]+)\}/g;
        content = content.replace(bindThisRegex, 'bind:this={$1}');
      }

      if (content !== fs.readFileSync(file, 'utf8')) {
        modified = true;
      }
    }

    // Fix TypeScript-specific issues
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      // Fix broken function syntax
      content = content.replace(/\(\s*;\s*\)/g, '()');
      content = content.replace(/\(\s*,\s*\)/g, '()');

      // Fix broken generics
      content = content.replace(/<\s*;\s*>/g, '<any>');
      content = content.replace(/<\s*,\s*>/g, '<any>');

      if (content !== fs.readFileSync(file, 'utf8')) {
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      fixedFiles++;
      console.log(`✅ Fixed: ${path.relative(frontendDir, file)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎯 Fixed HTML comment damage in ${fixedFiles} files`);