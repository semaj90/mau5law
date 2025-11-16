// tools/parse-svelte-errors.cjs
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputLog = process.argv[2] || '.svelte-errors-raw.log';
const outputJsonl = process.argv[3] || '.svelte-errors.jsonl';

if (!fs.existsSync(inputLog)) {
  console.error(`❌ Input log not found: ${inputLog}`);
  process.exit(1);
}

console.log(`🔍 Parsing TypeScript log: ${inputLog}`);
console.log(`📝 Writing JSONL to: ${outputJsonl}`);

const rl = readline.createInterface({
  input: fs.createReadStream(inputLog, 'utf8'),
  crlfDelay: Infinity,
});

const outStream = fs.createWriteStream(outputJsonl, { encoding: 'utf8' });

let count = 0;

// Regex for TypeScript compiler output: file(line,column): error code: message
const tsErrorRegex = /^(.+?)\((\d+),(\d+)\):\s+error\s+(\w+):\s*(.+)$/;

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // Try TypeScript compiler format
  const tsMatch = tsErrorRegex.exec(trimmed);
  if (tsMatch) {
    const [, file, lineStr, colStr, code, msg] = tsMatch;
    const record = {
      file: path.normalize(file),
      line: Number(lineStr),
      column: Number(colStr),
      code: code,
      message: msg.trim(),
      raw: trimmed,
    };
    outStream.write(JSON.stringify(record) + '\n');
    count++;
  }
});

rl.on('close', () => {
  outStream.end();
  console.log(`✅ Parsed ${count} error records → ${outputJsonl}`);
});