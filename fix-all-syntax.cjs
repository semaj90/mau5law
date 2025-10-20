const fs = require('fs');
const path = require('path');

const files = [
  'sveltekit-frontend/src/lib/services/enhanced-ocr-processor.ts',
  'sveltekit-frontend/src/lib/services/optimized-qdrant-service.ts',
  'sveltekit-frontend/src/lib/services/hierarchical-cache-index.ts',
  'sveltekit-frontend/src/lib/services/user-chat-recommendation-engine.ts'
];

function comprehensiveFix(content) {
  let fixed = content;
  
  // 1. Remove standalone closing braces (artifacts from earlier corruption)
  const lines = fixed.split('\n');
  const cleaned = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that are just a single }  after imports/interface headers
    if (trimmed === '}' && i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.startsWith('export interface') || nextLine.startsWith('export class')) {
        continue; // Skip this orphan brace
      }
    }
    
    cleaned.push(line);
  }
  
  fixed = cleaned.join('\n');
  
  // 2. Fix interface/type closing braces
  fixed = fixed.replace(/(\s+\})\s*\n(export interface|export class)/gm, '$1\n}\n\n$2');
  
  // 3. Fix function parameter commas
  fixed = fixed.replace(/(\w+),:\s*(string|number|boolean|any|void)/g, '$1: $2');
  fixed = fixed.replace(/(\w+)\s*,\s*:\s*(string|number|boolean|any|void)/g, '$1: $2');
  
  // 4. Fix for loop syntax
  fixed = fixed.replace(/for\s*\(\s*let\s+(\w+)\s*=,?\s*(\d+);,?\s*(\w+)\s*<\s*/g, 'for (let $1 = $2; $3 < ');
  fixed = fixed.replace(/,\s*(\w+)\s*\+\+\)/g, ' $1++)');
  fixed = fixed.replace(/(\w+),(\w+)\+\+;/g, '$1$2++;');
  
  // 5. Fix object literal commas vs semicolons
  fixed = fixed.replace(/:\s+(\w+);$/gm, ': $1,');
  
  // 6. Fix malformed loop/conditional endings
  fixed = fixed.replace(/>\s*$/gm, ') {');
  
  // 7. Fix switch case statements
  fixed = fixed.replace(/case,\s+"([^"]+),\s*":/g, 'case "$1":');
  fixed = fixed.replace(/case,\s+"/g, 'case "');
  
  // 8. Fix throw statements
  fixed = fixed.replace(/throw,\s+new/g, 'throw new');
  
  // 9. Fix variable declarations with trailing commas  
  fixed = fixed.replace(/const\s+(\w+),\s*:/g, 'const $1:');
  fixed = fixed.replace(/let\s+(\w+),\s*:/g, 'let $1:');
  
  // 10. Fix function signatures
  fixed = fixed.replace(/async\s+(\w+)\(\)\s*\n\s+/g, 'async $1(');
  fixed = fixed.replace(/private\s+async\s+(\w+)\(\)\s*\n\s+/g, 'private async $1(');
  fixed = fixed.replace(/public\s+async\s+(\w+)\(\)\s*\n\s+/g, 'public async $1(');
  
  // 11. Fix constructor parameter separators
  fixed = fixed.replace(/constructor\(\)\s*\n\s+private\s+/g, 'constructor(\n    private ');
  
  // 12. Fix extra commas before operators
  fixed = fixed.replace(/,\s*(<|>|<=|>=|===|!==|==|!=|\+|-|\*|\/|\|\||&&)/g, ' $1');
  
  // 13. Fix property access with commas
  fixed = fixed.replace(/\.\s*,\s*/g, '.');
  
  // 14. Fix Set/Map initialization
  fixed = fixed.replace(/new Set\(\[\)\s*/g, 'new Set([');
  fixed = fixed.replace(/new Map\(\[\)\s*/g, 'new Map([');
  
  // 15. Fix extra commas in object properties
  fixed = fixed.replace(/(\w+),\s*:\s*(\w+\.\w+)/g, '$1: $2');
  
  // 16. Fix double parentheses issues
  fixed = fixed.replace(/\{\)\s*\{/g, '{');
  fixed = fixed.replace(/\)\}\}\)/g, ')}}');
  
  // 17. Fix method/function parameter lines
  fixed = fixed.replace(/\)\s*:/g, '):');
  fixed = fixed.replace(/Promise<void>\s*\{$/gm, 'Promise<void> {');
  
  // 18. Fix conditional syntax with semicolons
  fixed = fixed.replace(/if \((.+);$/gm, 'if ($1)');
  
  // 19. Fix property initializers
  fixed = fixed.replace(/private\s+(\w+):\s+(.+),$/gm, 'private $1: $2;');
  
  // 20. Fix trailing commas before closing braces in parameters
  fixed = fixed.replace(/,\s*\)/g, ')');
  
  return fixed;
}

files.forEach(file => {
  try {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(file, 'utf8');
    const fixed = comprehensiveFix(content);
    fs.writeFileSync(file, fixed, 'utf8');
    console.log(`✓ Fixed ${file}`);
  } catch (error) {
    console.error(`✗ Error with ${file}:`, error.message);
  }
});

console.log('\nAll files processed!');
