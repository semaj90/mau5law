#!/usr/bin/env node
/**
 * Phase 82: Structural Corruption Fixer
 *
 * Targets patterns missed by simple comma/colon fixers:
 * - }; function/const/type joiners → proper newlines
 * - function name(params) | undefined → function name(params): unknown | undefined
 * - Duplicate adjacent blocks (conservative commenting)
 */

import fs from 'node:fs';
import path from 'node:path';

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function writeText(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, 'utf8'); }

function normalizeNewlines(s) { return s.replace(/\r\n/g, '\n'); }

function fixStatementJoiners(s) {
  // Break patterns like: "}; function foo" / "};const x" / "}; export type"
  // Only when it's clearly a "};" followed by a new declaration keyword.
  return s.replace(
    /}\s*;\s*(?=(function|const|let|var|type|interface|export|class)\b)/g,
    '}\n\n'
  );
}

function fixFunctionReturnSplice(s) {
  // function foo(a: T) | undefined { ... }
  // -> function foo(a: T): unknown | undefined { ... }
  // Also handles | null and | undefined | null chains.
  return s.replace(
    /(function\s+[A-Za-z_$][\w$]*\s*\([^)]*\))\s*\|\s*(undefined|null)\b/g,
    (_m, head, tail) => `${head}: unknown | ${tail}`
  );
}

function fixArrowReturnSplice(s) {
  // const f = (x: T) | undefined => ...
  // -> const f = (x: T): unknown | undefined => ...
  return s.replace(
    /(\=\s*\([^)]*\))\s*\|\s*(undefined|null)\s*=>/g,
    (_m, head, tail) => `${head}: unknown | ${tail} =>`
  );
}

function fixGenericTypeColons(s) {
  // Fix Record<string: unknown> -> Record<string, unknown>
  // Fix Map<string: any> -> Map<string, any>
  // Fix Omit<T: K> -> Omit<T, K>
  return s.replace(
    /\b(\w+)\s*<\s*([^,>]+?)\s*:\s*([^>]+?)\s*>/g,
    "$1<$2, $3>"
  );
}

function fixMethodSignatureDamage(s) {
  // Repair damage from fixColonChains on method signatures
  // embedQuery(input: string), /* PHASE82_COLON_CHAIN: Promise<number[]> */ ;
  // -> embedQuery(input: string): Promise<number[]> ;
  return s.replace(
    /(\([^)]+:\s*[^,:{}\n]+)\),\s*\/\*\s*PHASE82_COLON_CHAIN:\s*([^*]+?)\s*\*\/\s*(;|})/g,
    "$1): $2$3"
  );
}

function fixArrowFunctionDamage(s) {
  // Repair damage from fixColonChains on arrow functions
  // invoke: (input, /* PHASE82_COLON_CHAIN: RunnableInvokeInput) => Promise<RunnableInvokeOutput> */
  // -> invoke: (input: RunnableInvokeInput) => Promise<RunnableInvokeOutput>
  return s.replace(
    /(\(\w+),\s*\/\*\s*PHASE82_COLON_CHAIN:\s*([^*]+?)\s*\*\/\s*(,|}|;)/g,
    "$1: $2$3"
  );
}

function fixDottedKeys(s) {
  // Fix "this.config.ollama.baseUrl: val" -> "baseUrl: val"
  // Fix "r.score: val" -> "score: val"
  // Only inside object literals (heuristic: followed by colon)
  return s.replace(
    /([a-zA-Z0-9_$]+\.)+([a-zA-Z0-9_$]+)\s*:/g,
    "$2:"
  );
}

function fixBadCommaOperators(s) {
  // Fix "Date.now() -, startTime" -> "Date.now() - startTime"
  // Fix "i +, idx" -> "i + idx"
  return s.replace(
    /(\s[-+*\/])\s*,\s*/g,
    "$1 "
  );
}

function fixArrayColons(s) {
  // Fix "[a: b]" -> "[a, b]" (inside array literal)
  // e.g. RunnableSequence.from([promptTemplate: this.llm!])
  return s.replace(
    /\[\s*([a-zA-Z0-9_$]+)\s*:\s*([a-zA-Z0-9_$!.()]+)\s*\]/g,
    "[$1, $2]"
  );
}

function fixBadFunctionCallColons(s) {
  // Fix "lokiRedisCache.set(key: value, ...)" -> "lokiRedisCache.set(key, value, ...)"
  // This is a specific pattern seen in qlora-rl-langextract-integration.ts
  let out = s.replace(
    /(lokiRedisCache\.set|console\.log|metrics\.push)\s*\(([^,():]+)\s*:\s*/g,
    "$1($2, "
  );
  return out;
}

function fixClassPropertyCommas(s) {
  // Fix "private a: T, b: U;" -> "private a: T;\n  private b: U;"
  // Handles private/protected/public/readonly
  return s.replace(
    /^\s*(private|protected|public|readonly)\s+([a-zA-Z0-9_$]+)\s*:\s*([^,;]+)\s*,\s*([a-zA-Z0-9_$]+)\s*:\s*([^;]+);/gm,
    (m, mod, p1, t1, p2, t2) => `  ${mod} ${p1}: ${t1};\n  ${mod} ${p2}: ${t2};`
  );
}

function fixDoubleValues(s) {
  // Fix "key: val val," -> "key: val,"
  // e.g. "autosaveInterval: 4000 4000," -> "autosaveInterval: 4000,"
  // e.g. "y: 0 0," -> "y: 0,"
  // NOTE: We must exclude space from the value capture to detect the duplication
  // AND exclude semicolon to avoid eating next property
  return s.replace(
    /(\b\w+\s*:\s*)([^,:{}\n\s;]+)\s+\2\s*(,|}|;)/g,
    "$1$2$3"
  );
}

function fixColonChains(s) {
  // Fix "key: val1: val2," -> "key: val1, /* PHASE82_COLON_CHAIN: val2 */"
  // e.g. "maxStorage...: val1: val2,"
  // Avoid matching index signatures like [key: string]
  // AND exclude semicolon to avoid eating next property on same line
  return s.replace(
    /(\b(?<!\[)\w+\s*:\s*[^,:{}\n;]+)\s*:\s*([^,:{}\n;]+)\s*(,|}|;)/g,
    "$1, /* PHASE82_COLON_CHAIN: $2 */ $3"
  );
}

function fixColonChainDamage(s) {
  // Repair damage from previous fixColonChains run where it ate a semicolon
  // e.g. "score: number; highlights, /* PHASE82_COLON_CHAIN: string[] */ }"
  // -> "score: number; highlights: string[] }"
  return s.replace(
    /(\b\w+\s*:\s*[^,:{}\n]+);\s*(\w+),\s*\/\*\s*PHASE82_COLON_CHAIN:\s*([^*]+?)\s*\*\/\s*(}|;)/g,
    "$1; $2: $3$4"
  );
}

function fixIndexSignatureDamage(s) {
  // Repair damage from previous fixColonChains run on index signatures
  // [key: string], /* PHASE82_COLON_CHAIN: unknown; */ } -> [key: string]: unknown; }
  // [key: string], /* PHASE82_COLON_CHAIN: unknown */ } -> [key: string]: unknown }
  // Also handles [k: string] or other identifiers
  return s.replace(
    /\[\w+:\s*\w+\]\s*,\s*\/\*\s*PHASE82_COLON_CHAIN:\s*([^*]+?)\s*\*\/\s*(}|;)/g,
    (match, type, end) => {
      // Extract the index signature part from the match start
      const indexSig = match.match(/^\[\w+:\s*\w+\]/)[0];
      return `${indexSig}: ${type}${end}`;
    }
  );
}

function fixTypeColonNull(s) {
  // Fix "type: null" -> "type | null"
  // e.g. "similarity?: number: null;" -> "similarity?: number | null;"
  return s.replace(
    /(\b\w+\??\s*:\s*\w+)\s*:\s*(null|undefined)\s*(;|}|,)/g,
    "$1 | $2$3"
  );
}

function fixMixedSeparators(s) {
  // Fix "id: string, entityId: string;" -> "id: string; entityId: string;"
  // This is common in DrizzleTable definitions in rag-pipeline-enhanced.ts
  // We look for a block that ends with ; but has , inside.
  // This is hard to do safely with regex globally.
  // Instead, let's target the specific pattern: "prop: type, prop: type;"
  return s.replace(
    /(\b\w+\??\s*:\s*[^,;{}]+)\s*,\s*(\b\w+\??\s*:\s*[^,;{}]+)\s*;/g,
    "$1; $2;"
  );
}

function dropImmediateDuplicateBlocks(s) {
  // Very conservative: if two adjacent blocks are *exactly* identical,
  // comment out the second one.
  const lines = s.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!/^\s*(export\s+)?(function|const|let|type|interface)\b/.test(line)) {
      out.push(line);
      i++;
      continue;
    }

    // Grab a window of up to 80 lines as a "block candidate"
    const nextStart = i + 1;

    // Find next declaration nearby
    let j = nextStart;
    while (j < Math.min(lines.length, i + 160) && !/^\s*(export\s+)?(function|const|let|type|interface)\b/.test(lines[j])) j++;

    if (j >= lines.length) { out.push(line); i++; continue; }

    // If the first 40 lines match exactly, treat as duplicate chunk
    const a40 = lines.slice(i, i + 40).join('\n');
    const b40 = lines.slice(j, j + 40).join('\n');

    if (a40.trim().length > 0 && a40 === b40) {
      // Emit first chunk unchanged
      out.push(lines[i]);
      i++;

      // When we reach the duplicate declaration, comment it
      while (i < j) { out.push(lines[i]); i++; }
      out.push('// PHASE82_DUPLICATE_BLOCK_COMMENTED: ' + lines[j]);
      j++;
      i = j;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

function applyFixes(input) {
  let s = normalizeNewlines(input);
  const before = s;

  s = fixStatementJoiners(s);
  s = fixFunctionReturnSplice(s);
  s = fixArrowReturnSplice(s);
  s = fixGenericTypeColons(s);
  s = fixMethodSignatureDamage(s);
  s = fixArrowFunctionDamage(s);
  s = fixDottedKeys(s);
  s = fixBadCommaOperators(s);
  s = fixArrayColons(s);
  s = fixBadFunctionCallColons(s);
  s = fixClassPropertyCommas(s);
  s = fixDoubleValues(s);
  s = fixColonChains(s);
  s = fixColonChainDamage(s);
  s = fixIndexSignatureDamage(s);
  s = fixTypeColonNull(s);
  s = fixMixedSeparators(s);
  s = dropImmediateDuplicateBlocks(s);

  return { text: s, changed: s !== before };
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const [k, v] = a.split('=');
    if (a === '--dry-run') args.dryRun = true;
    else if (k === '--list') args.list = v;
    else if (k === '--out') args.out = v;
    else if (k === '--skiplist') args.skiplist = v;
  }
  if (!args.list) throw new Error('Missing --list=PATH');
  return args;
}

function loadList(p) {
  return readText(p).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

function loadSkiplist(p) {
  if (!p || !fs.existsSync(p)) return new Set();
  return new Set(loadList(p));
}

const args = parseArgs(process.argv);
const outDir = args.out || 'reports/phase82_structural';
const files = loadList(args.list);
const skip = loadSkiplist(args.skiplist);

let filesProcessed = 0;
let filesModified = 0;
let totalFixes = 0;

const patchesDir = path.join(outDir, 'patches');
fs.mkdirSync(patchesDir, { recursive: true });

const results = [];

for (const rel of files) {
  if (skip.has(rel)) {
    results.push({ file: rel, skipped: true, reason: 'skiplist' });
    continue;
  }
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) {
    results.push({ file: rel, skipped: true, reason: 'missing' });
    continue;
  }

  filesProcessed++;
  const before = readText(abs);
  const { text: after, changed } = applyFixes(before);

  if (!changed) {
    results.push({ file: rel, changed: false, fixes: 0 });
    continue;
  }

  // crude "fix count": number of joiners repaired + return splices
  const joinFixes = (before.match(/}\s*;\s*(?=(function|const|let|var|type|interface|export|class)\b)/g) || []).length;
  const retFixes  = (before.match(/\)\s*\|\s*(undefined|null)\b/g) || []).length;
  const genFixes  = (before.match(/\b(Record|Map|Promise)\s*<\s*[^,>]+?\s*:\s*[^>]+?\s*>/g) || []).length;
  const callFixes = (before.match(/(lokiRedisCache\.set|console\.log|metrics\.push)\s*\([^,():]+\s*:\s*/g) || []).length;
  const propFixes = (before.match(/^\s*(private|protected|public|readonly)\s+[a-zA-Z0-9_$]+\s*:\s*[^,;]+\s*,\s*[a-zA-Z0-9_$]+/gm) || []).length;
  const doubleFixes = (before.match(/(\b\w+\s*:\s*)([^,:{}\n]+)\s+\2\s*(,|})/g) || []).length;
  const chainFixes = (before.match(/(\b\w+\s*:\s*[^,:{}\n]+)\s*:\s*([^,:{}\n]+)\s*(,|})/g) || []).length;

  const fixes = joinFixes + retFixes + genFixes + callFixes + propFixes + doubleFixes + chainFixes;
  totalFixes += fixes;  filesModified++;
  results.push({ file: rel, changed: true, fixes });

  if (!args.dryRun) writeText(abs, after);

  // write a tiny diff-like patch artifact
  const proofPath = path.join(patchesDir, rel.replace(/[\/\\]/g, '__') + '.before_after.txt');
  writeText(proofPath, `--- BEFORE (${rel}) ---\n${before}\n\n--- AFTER (${rel}) ---\n${after}\n`);
}

const summary = {
  dryRun: !!args.dryRun,
  list: args.list,
  out: outDir,
  filesInList: files.length,
  filesProcessed,
  filesModified,
  totalFixes,
  timestamp: new Date().toISOString(),
};

fs.mkdirSync(outDir, { recursive: true });
writeText(path.join(outDir, 'phase82-structural-summary.json'), JSON.stringify(summary, null, 2));
writeText(path.join(outDir, 'phase82-structural-results.jsonl'), results.map(r => JSON.stringify(r)).join('\n') + '\n');

console.log(JSON.stringify(summary, null, 2));
