const fs = require('fs');

const file = 'sveltekit-frontend/src/lib/services/enhanced-ocr-processor.ts';
let content = fs.readFileSync(file, 'utf8');

// Apply all fixes in order
content = content
  // Fix extra closing parens/braces
  .replace(/\s*\)\s*\}\}/g, ' }')
  .replace(/{ recursive: true\)\}\}/g, '{ recursive: true }')
  
  // Fix object literals with semicolons
  .replace(/:\s*`([^`]+)`;\s*$/gm, ': `$1`,')
  .replace(/:\s*'([^']+)';\s*$/gm, ': \'$1\',')
  .replace(/:\s*(\d+),\s*$/gm, ': $1,')
  .replace(/:\s*(true|false|null|undefined);\s*$/gm, ': $1,')
  
  // Fix function parameters split across lines
  .replace(/async\s+processFile\((\w+):\s*(\w+)\s*\n\s*(\w+):/g, 'async processFile($1: $2,\n    $3:')
  
  // Fix more object literals
  .replace(/id:\s*`([^`]+)`;\s*\n/g, 'id: `$1`,\n')
  .replace(/status:\s*'([^']+)';\s*\n/g, 'status: \'$1\',\n')
  .replace(/language:\s*'([^']+)';\s*\n/g, 'language: \'$1\',\n')
  
  // Fix switch cases
  .replace(/case\s*"([^"]+)":\s*$/gm, 'case "$1":')
  
  // Fix trailing commas in type annotations
  .replace(/:\s*([A-Z]\w+),t;/g, ': $1;')
  
  // Fix method calls with extra commas
  .replace(/\.([a-z]\w+),\s*=/g, '.$1 =')
  
  // Fix property declarations
  .replace(/private\s+(\w+):\s+(.+),\s*$/gm, 'private $1: $2;')
  .replace(/public\s+(\w+):\s+(.+),\s*$/gm, 'public $1: $2;')
  
  // Clean up double spaces
  .replace(/  +/g, '  ');

fs.writeFileSync(file, content, 'utf8');
console.log('Applied final fixes to enhanced-ocr-processor.ts');
