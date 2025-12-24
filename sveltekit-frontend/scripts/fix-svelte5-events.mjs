import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

console.log('🔄 Svelte 5 Event Handler Migration\n');

const replacements = [
  { old: /on:click=/g, new: 'onclick=' },
  { old: /on:submit=/g, new: 'onsubmit=' },
  { old: /on:change=/g, new: 'onchange=' },
  { old: /on:input=/g, new: 'oninput=' },
  { old: /on:focus=/g, new: 'onfocus=' },
  { old: /on:blur=/g, new: 'onblur=' },
  { old: /on:keydown=/g, new: 'onkeydown=' },
  { old: /on:keyup=/g, new: 'onkeyup=' },
  { old: /on:keypress=/g, new: 'onkeypress=' },
  { old: /on:mouseenter=/g, new: 'onmouseenter=' },
  { old: /on:mouseleave=/g, new: 'onmouseleave=' },
  { old: /on:mouseover=/g, new: 'onmouseover=' },
  { old: /on:mouseout=/g, new: 'onmouseout=' },
  { old: /on:load=/g, new: 'onload=' },
  { old: /on:dragover=/g, new: 'ondragover=' },
  { old: /on:dragleave=/g, new: 'ondragleave=' },
  { old: /on:drop=/g, new: 'ondrop=' },
];

const includeQuarantined = process.argv.includes('--include-quarantined');

const paths = [
  'src/**/*.svelte',
  ...(includeQuarantined ? ['../quarantined-routes/**/*.svelte', '../sveltekit-evidence/src/**/*.svelte'] : [])
];

let totalFiles = 0;
let totalReplacements = 0;

for (const pattern of paths) {
  const files = glob.sync(pattern, { cwd: process.cwd(), absolute: true });

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;
      let fileReplacements = 0;

      for (const { old, new: newVal } of replacements) {
        const matches = content.match(old);
        if (matches) {
          fileReplacements += matches.length;
          modified = true;
          content = content.replace(old, newVal);
        }
      }

      if (modified) {
        writeFileSync(file, content, 'utf-8');
        totalFiles++;
        totalReplacements += fileReplacements;
        console.log(`✓ ${path.basename(file)}: ${fileReplacements} replacements`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err.message);
    }
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files modified: ${totalFiles}`);
console.log(`  Total replacements: ${totalReplacements}`);
console.log(`\n✅ Migration complete!`);
