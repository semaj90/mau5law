// scripts/phase82-fix-structural-corruption.mjs
import fs from "node:fs";
import path from "node:path";

function readText(p) { return fs.readFileSync(p, "utf8"); }
function writeText(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, "utf8"); }

function normalizeNewlines(s) { return s.replace(/\r\n/g, "\n"); }

function fixStatementJoiners(s) {
  // Break patterns like: "}; function foo" / "};const x" / "}; export type"
  // Only when it's clearly a "};" followed by a new declaration keyword.
  return s.replace(
    /}\s*;\s*(?=(function|const|let|var|type|interface|export|class)\b)/g,
    "}\n\n"
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

function fixNesMemoryCorruption(s) {
  // Fix "startAddress: NES_MEMORY_MAP.INTERNAL_RAM.start, NES_MEMORY_MAP.INTERNAL_RAM.end, size: used,"
  // -> "startAddress: NES_MEMORY_MAP.INTERNAL_RAM.start, endAddress: NES_MEMORY_MAP.INTERNAL_RAM.end, size: NES_MEMORY_MAP.INTERNAL_RAM.size, used: 0,"
  return s.replace(
    /startAddress:\s*([^,]+),\s*([^,]+)\.end,\s*size:\s*used,/g,
    "startAddress: $1, endAddress: $2.end, size: $2.size, used: 0,"
  );
}

function dropImmediateDuplicateBlocks(s) {
  // Very conservative: if two adjacent blocks are *exactly* identical,
  // comment out the second one.
  // This catches accidental duplicated helper blocks.
  const lines = s.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    // Detect block-ish regions by braces count (simple heuristic).
    // We'll only attempt if we see "function " or "const " starts.
    const line = lines[i];
    if (!/^\s*(export\s+)?(function|const|let|type|interface)\b/.test(line)) {
      out.push(line);
      i++;
      continue;
    }

    // Grab a window of up to 80 lines as a "block candidate"
    const a = lines.slice(i, i + 80).join("\n");
    const nextStart = i + 1;

    // Find next declaration nearby
    let j = nextStart;
    while (j < Math.min(lines.length, i + 160) && !/^\s*(export\s+)?(function|const|let|type|interface)\b/.test(lines[j])) j++;

    if (j >= lines.length) { out.push(line); i++; continue; }

    const b = lines.slice(j, j + 80).join("\n");

    // If the first 40 lines match exactly, treat as duplicate chunk
    const a40 = lines.slice(i, i + 40).join("\n");
    const b40 = lines.slice(j, j + 40).join("\n");

    if (a40.trim().length > 0 && a40 === b40) {
      // Emit first chunk unchanged (line-by-line), and comment second chunk start
      // We only comment the next declaration line to avoid huge comment blocks.
      out.push(lines[i]);
      // advance one line for first chunk
      i++;

      // When we reach the duplicate declaration, comment it
      while (i < j) { out.push(lines[i]); i++; }
      out.push("// PHASE82_DUPLICATE_BLOCK_COMMENTED: " + lines[j]);
      j++;
      while (j < lines.length && j < i + 1) j++; // no-op
      i = j;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join("\n");
}

function applyFixes(input) {
  let s = normalizeNewlines(input);
  const before = s;

  s = fixStatementJoiners(s);
  s = fixFunctionReturnSplice(s);
  s = fixArrowReturnSplice(s);
  s = dropImmediateDuplicateBlocks(s);

  return { text: s, changed: s !== before };
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const [k, v] = a.split("=");
    if (a === "--dry-run") args.dryRun = true;
    else if (k === "--list") args.list = v;
    else if (k === "--out") args.out = v;
    else if (k === "--skiplist") args.skiplist = v;
  }
  if (!args.list) throw new Error("Missing --list=PATH");
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
const outDir = args.out || "reports/phase82_structural";
const files = loadList(args.list);
const skip = loadSkiplist(args.skiplist);

let filesProcessed = 0;
let filesModified = 0;
let totalFixes = 0;

const patchesDir = path.join(outDir, "patches");
fs.mkdirSync(patchesDir, { recursive: true });

const results = [];

for (const rel of files) {
  if (skip.has(rel)) {
    results.push({ file: rel, skipped: true, reason: "skiplist" });
    continue;
  }
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) {
    results.push({ file: rel, skipped: true, reason: "missing" });
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
  const fixes = joinFixes + retFixes;
  totalFixes += fixes;

  filesModified++;
  results.push({ file: rel, changed: true, fixes });

  if (!args.dryRun) writeText(abs, after);

  // write a tiny diff-like patch artifact (not a true git diff, but proof)
  const proofPath = path.join(patchesDir, rel.replace(/[\/\\]/g, "__") + ".before_after.txt");
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
writeText(path.join(outDir, "phase82-structural-summary.json"), JSON.stringify(summary, null, 2));
writeText(path.join(outDir, "phase82-structural-results.jsonl"), results.map(r => JSON.stringify(r)).join("\n") + "\n");

console.log(JSON.stringify(summary, null, 2));
