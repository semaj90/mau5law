const fs = require('fs');

function fixInterfaces(content) {
  const lines = content.split('\n');
  const fixed = [];
  let inInterface = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Track when we enter an interface
    if (trimmed.startsWith('export interface') || trimmed.startsWith('export class')) {
      if (inInterface && braceDepth > 0) {
        // Previous interface wasn't closed, add closing brace
        fixed.push('}');
        fixed.push('');
      }
      inInterface = trimmed.startsWith('export interface');
      braceDepth = 0;
    }
    
    // Count braces
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }
    
    // Add current line
    fixed.push(line);
    
    // If we're in an interface and the next line starts a new export, close the interface
    if (inInterface && i < lines.length - 1) {
      const nextTrimmed = lines[i + 1].trim();
      if ((nextTrimmed.startsWith('export') || nextTrimmed.startsWith('export class')) && braceDepth > 0) {
        fixed.push('}');
        fixed.push('');
        braceDepth = 0;
        inInterface = false;
      }
    }
    
    // Reset when we've closed the interface
    if (inInterface && braceDepth === 0 && trimmed === '}') {
      inInterface = false;
    }
  }
  
  return fixed.join('\n');
}

const files = [
  'sveltekit-frontend/src/lib/services/enhanced-ocr-processor.ts',
  'sveltekit-frontend/src/lib/services/optimized-qdrant-service.ts',
  'sveltekit-frontend/src/lib/services/hierarchical-cache-index.ts',
  'sveltekit-frontend/src/lib/services/user-chat-recommendation-engine.ts'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fixed = fixInterfaces(content);
  fs.writeFileSync(file, fixed, 'utf8');
  console.log(`Fixed interfaces in ${file}`);
});
