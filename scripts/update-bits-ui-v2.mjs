#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('sveltekit-frontend/src');
const exts = new Set(['.svelte', '.ts', '.js']);

// Bits-UI v2 import patterns to update
const bitsUIPatterns = [
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/button['"]/g,
    new: "import { Button } from 'bits-ui'",
    desc: 'Button imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/card['"]/g,
    new: "import * as Card from 'bits-ui/components/card'",
    desc: 'Card imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/dialog['"]/g,
    new: "import * as Dialog from 'bits-ui/components/dialog'",
    desc: 'Dialog imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/tooltip['"]/g,
    new: "import * as Tooltip from 'bits-ui/components/tooltip'",
    desc: 'Tooltip imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/select['"]/g,
    new: "import * as Select from 'bits-ui/components/select'",
    desc: 'Select imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/input['"]/g,
    new: "import { Input } from 'bits-ui'",
    desc: 'Input imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/badge['"]/g,
    new: "import { Badge } from 'bits-ui'",
    desc: 'Badge imports'
  },
  {
    old: /import\s+\{\s*([^}]*)\s*\}\s+from\s+['"]bits-ui\/components\/ui\/progress['"]/g,
    new: "import { Progress } from 'bits-ui'",
    desc: 'Progress imports'
  },
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!ent.name.startsWith('.') && ent.name !== 'node_modules') {
        walk(p, out);
      }
    } else if (exts.has(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT);
let changed = 0;
let errors = [];

console.log(`🔍 Found ${files.length} files to process...`);

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let fileChanged = false;

    for (const pattern of bitsUIPatterns) {
      if (pattern.old.test(content)) {
        content = content.replace(pattern.old, pattern.new);
        fileChanged = true;
        console.log(`✅ Updated ${pattern.desc} in ${path.relative(ROOT, file)}`);
      }
    }

    if (fileChanged) {
      fs.writeFileSync(file, content, 'utf8');
      changed++;
    }
  } catch (err) {
    errors.push(`❌ Error processing ${file}: ${err.message}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files changed: ${changed}/${files.length}`);
if (errors.length > 0) {
  console.log(`   Errors: ${errors.length}`);
  errors.forEach(e => console.log(`   ${e}`));
}
console.log(`\n✨ Bits-UI v2 migration complete!`);
