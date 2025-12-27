// scripts/phase81-fix-colon-corruption.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const norm = (p) => p.replaceAll("\\", "/");
const cwd = process.cwd();

function parseArgv(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const [k, vEq] = a.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (vEq !== undefined) out[k] = vEq;
    else if (next && !next.startsWith("--")) {
      out[k] = next;
      i++;
    } else out[k] = true;
  }
  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function tryResolveFile(p) {
  const raw = p;
  const candidates = [];

  const abs = path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);
  candidates.push(abs);

  candidates.push(path.resolve(cwd, "src", "lib", raw));
  candidates.push(path.resolve(cwd, "src", raw));

  if (raw.startsWith("./")) {
    const r2 = raw.slice(2);
    candidates.push(path.resolve(cwd, r2));
    candidates.push(path.resolve(cwd, "src", "lib", r2));
    candidates.push(path.resolve(cwd, "src", r2));
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

function walkDir(dirAbs) {
  const out = [];
  const stack = [dirAbs];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      const rel = norm(path.relative(cwd, full));
      if (
        rel.includes("node_modules/") ||
        rel.startsWith(".svelte-kit/") ||
        rel.startsWith("build/") ||
        rel.startsWith("dist/") ||
        rel.startsWith(".git/")
      ) continue;

      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) out.push(full);
    }
  }
  return out;
}

function readListFile(listPath) {
  const abs = path.isAbsolute(listPath) ? listPath : path.resolve(cwd, listPath);
  if (!fs.existsSync(abs)) throw new Error(`--list not found: ${abs}`);
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines;
}

function readSkipList(skipPath) {
  if (!skipPath) return new Set();
  const abs = path.isAbsolute(skipPath) ? skipPath : path.resolve(cwd, skipPath);
  if (!fs.existsSync(abs)) return new Set();
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return new Set(lines.map(norm));
}

function writeDiffPatch(outDir, fileAbs, before, after) {
  const patchesDir = path.join(outDir, "patches");
  ensureDir(patchesDir);

  const safeName = norm(path.relative(cwd, fileAbs))
    .replaceAll("/", "__")
    .replaceAll(":", "_");

  const tmpA = path.join(os.tmpdir(), `${safeName}.before.ts`);
  const tmpB = path.join(os.tmpdir(), `${safeName}.after.ts`);

  fs.writeFileSync(tmpA, before, "utf8");
  fs.writeFileSync(tmpB, after, "utf8");

  const r = spawnSync("git", ["diff", "--no-index", "--", tmpA, tmpB], {
    encoding: "utf8",
    shell: true,
  });

  const diffText = (r.stdout || "") + (r.stderr || "");
  fs.writeFileSync(path.join(patchesDir, `${safeName}.diff`), diffText, "utf8");
}

function countUnescapedBackticks(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "`") {
      if (i > 0 && s[i - 1] === "\\") continue;
      n++;
    }
  }
  return n;
}

function delimiterBalanceOk(text) {
  let paren = 0, brace = 0, bracket = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "{") brace++;
    else if (ch === "}") brace--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;

    if (paren < 0 || brace < 0 || bracket < 0) return false;
  }
  if (paren !== 0 || brace !== 0 || bracket !== 0) return false;

  const bt = countUnescapedBackticks(text);
  if (bt % 2 !== 0) return false;

  return true;
}

async function typescriptParseOk(fileAbs, text) {
  try {
    const ts = await import("typescript");
    const kind = fileAbs.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true, kind);
    const diags = sf.parseDiagnostics || [];
    return diags.length === 0;
  } catch {
    return true;
  }
}

function fixGenericColonUnions(line, stats) {
  const before = line;
  const out = line.replace(/<([^>\n]*?)\s*:\s*(null|undefined|never|void)\b/g, (m, lhs, rhs) => {
    const replacement = `<${lhs} | ${rhs}`;
    if (replacement !== m) {
        stats["generic-colon-union"] = (stats["generic-colon-union"] ?? 0) + 1;
    }
    return replacement;
  });
  return out !== before ? out : before;
}

function fixTypeAliasColonUnions(line, stats) {
  if (!/^\s*type\s+\w+\s*=/.test(line)) return line;
  if (!line.includes(":")) return line;
  if (line.includes("{")) return line;

  const before = line;
  const rhs = line.split("=").slice(1).join("=");

  const rhsLooksSafe =
    /\b[A-Za-z_$][\w$]*\b\s*:\s*(undefined|null|never|void)\b/.test(rhs) ||
    (!rhs.includes(",") && /\b[A-Za-z_$][\w$]*\b\s*:\s*\b[A-Za-z_$][\w$]*\b/.test(rhs));

  if (!rhsLooksSafe) return line;

  const out = line.replace(/\s*:\s*/g, " | ");
  if (out !== before) stats["type-alias-colon-union"] = (stats["type-alias-colon-union"] ?? 0) + 1;
  return out;
}

function fixParamNameCommaTypePairs(line, stats) {
  const before = line;

  const out = line.replace(/\(([^()\n]*)\)/g, (full, inner) => {
    let changed = false;
    let s = inner;

    s = s.replace(
      /(\b(?!string|number|boolean|any|unknown|void|never|object|Promise|Array|Record|Map|Set|Function)[A-Za-z_$][\w$]*\b)\s*,\s*(string|number|boolean|any|unknown|object)\b(?!\s*:)/g,
      (m, name, t) => {
        const replacement = `${name}: ${t}`;
        if (replacement !== m) {
            changed = true;
            console.log(`[DEBUG] fixParamNameCommaTypePairs: '${m}' -> '${replacement}'`);
        }
        return replacement;
      }
    );

    if (!changed) return full;
    stats["param-name-comma-type"] = (stats["param-name-comma-type"] ?? 0) + 1;
    return `(${s})`;
  });

  return out !== before ? out : before;
}

function fixSignatureTailExtraParam(line, stats) {
  const before = line;

  if (!/\)\s*,\s*(any|unknown|string|number|boolean)\s*:/.test(line)) return line;
  if (!/(async\s+)?[A-Za-z_$][\w$]*\s*\(|private|public|protected|function/.test(line)) return line;

  const out = line.replace(/\)\s*,\s*(any|unknown|string|number|boolean)\s*:/g, (m, t) => {
    const replacement = `, options: ${t}):`;
    if (replacement !== m) {
        stats["signature-tail-param"] = (stats["signature-tail-param"] ?? 0) + 1;
    }
    return replacement;
  });

  return out !== before ? out : before;
}

function fixObjectColonChainsLineWise(line, stats, enabled) {
  if (!enabled) return line;

  const before = line;
  const colonCount = (line.match(/:/g) ?? []).length;
  if (colonCount < 3) return line;

  if (/^\s*(type|interface|export\s+interface)\b/.test(line)) return line;
  if (/^\s*(case|default)\b/.test(line)) return line;
  if (line.includes("http://") || line.includes("https://")) return line;
  if (line.includes("?:")) return line;

  let out = line;
  for (let i = 0; i < 10; i++) {
    const next = out.replace(
      /(\b[A-Za-z_$][\w$]*\b)\s*:\s*([^:\n{}()[\]]+?)\s*:\s*(\b[A-Za-z_$][\w$]*\b)\s*:/g,
      (m, k1, v1, k2) => {
        const replacement = `${k1}: ${v1.trim()}, ${k2}:`;
        if (replacement !== m) {
            stats["object-colon-chain"] = (stats["object-colon-chain"] ?? 0) + 1;
        }
        return replacement;
      }
    );
    if (next === out) break;
    out = next;
  }

  return out !== before ? out : before;
}

function runPass(text, stats, enableObjectChains) {
  const lines = text.split(/\r?\n/);
  const out = lines.map((line) => {
    let s = line;
    s = fixGenericColonUnions(s, stats);
    s = fixTypeAliasColonUnions(s, stats);
    s = fixSignatureTailExtraParam(s, stats);
    s = fixParamNameCommaTypePairs(s, stats);
    s = fixObjectColonChainsLineWise(s, stats, enableObjectChains);
    return s;
  });
  return out.join("\n");
}

function applyFixersIterative(beforeText, enableObjectChains) {
  const stats = {};
  let text = beforeText;

  for (let i = 0; i < 3; i++) {
    const prev = text;
    text = runPass(text, stats, enableObjectChains);
    if (text === prev) break;
  }

  return { afterText: text, stats };
}

const args = parseArgv(process.argv.slice(2));
const dryRun = !!args["dry-run"] || !!args.dryrun;
const verbose = !!args.verbose;
const enableObjectChains = !!args["enable-object-chains"];
const skipListPath = args.skiplist || ".phase81-colon-skiplist.txt";

const runId =
  String(args.out || "").trim() ||
  `reports/phase81-colon-${new Date().toISOString().replaceAll(":", "").replaceAll(".", "")}`;

const outDir = path.isAbsolute(runId) ? runId : path.resolve(cwd, runId);
ensureDir(outDir);
ensureDir(path.join(outDir, "patches"));

const skipSet = readSkipList(skipListPath);

let filesAbs = [];
if (args.file) {
  const resolved = tryResolveFile(args.file);
  if (!resolved) {
    console.error(`❌ --file not found (tried common prefixes): ${args.file}`);
    process.exit(2);
  }
  filesAbs = [resolved];
} else if (args.dir) {
  const dirAbs = path.isAbsolute(args.dir) ? args.dir : path.resolve(cwd, args.dir);
  if (!fs.existsSync(dirAbs) || !fs.statSync(dirAbs).isDirectory()) {
    console.error(`❌ --dir not found: ${dirAbs}`);
    process.exit(2);
  }
  filesAbs = walkDir(dirAbs);
} else if (args.list) {
  const lines = readListFile(args.list);
  for (const entry of lines) {
    const resolved = tryResolveFile(entry);
    if (!resolved) {
      filesAbs.push({ missing: true, entry });
    } else {
      filesAbs.push(resolved);
    }
  }
} else {
  console.error("Usage: node scripts/phase81-fix-colon-corruption.mjs --file=... | --dir=... | --list=... [--dry-run] [--out=...]");
  process.exit(2);
}

const filesToProcessPath = path.join(outDir, "phase81-fix-colon-files-to-process.txt");
const jsonlPath = path.join(outDir, "phase81-fix-colon-results.jsonl");
const summaryPath = path.join(outDir, "phase81-fix-colon-summary.json");

fs.writeFileSync(
  filesToProcessPath,
  filesAbs
    .map((f) => (typeof f === "string" ? norm(path.relative(cwd, f)) : `MISSING:${f.entry}`))
    .join("\n") + "\n",
  "utf8"
);
fs.writeFileSync(jsonlPath, "", "utf8");

let filesProcessed = 0;
let filesModified = 0;
let filesSkipped = 0;
let totalFixes = 0;

const perFile = [];

console.log(`📋 Phase 81: Fix Colon Corruption`);
console.log(`   Mode: ${dryRun ? "dry-run" : "apply"}`);
console.log(`   Files: ${filesAbs.length}`);
console.log(`   Out:  ${norm(path.relative(cwd, outDir))}`);
console.log(`   Skiplist: ${skipListPath} (${skipSet.size} entries)`);
console.log(`   Object-colon-chains: ${enableObjectChains ? "ENABLED (risky)" : "OFF (safe default)"}`);
console.log(`   Wrote: ${norm(path.relative(cwd, filesToProcessPath))}`);

for (const f of filesAbs) {
  filesProcessed++;

  if (typeof f !== "string") {
    filesSkipped++;
    const rec = { file: f.entry, changed: false, skipped: true, reason: "file-not-found" };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    console.log(`  ⛔ ${f.entry}: not found`);
    continue;
  }

  const fileAbs = f;
  const rel = norm(path.relative(cwd, fileAbs));

  if (skipSet.has(rel)) {
    filesSkipped++;
    const rec = { file: rel, changed: false, skipped: true, reason: "skiplist" };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    if (verbose) console.log(`  ⛔ ${rel}: skiplist`);
    continue;
  }

  let before = "";
  try {
    before = fs.readFileSync(fileAbs, "utf8");
  } catch (e) {
    filesSkipped++;
    const rec = { file: rel, changed: false, skipped: true, reason: "read-failed", error: String(e) };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    console.log(`  ⛔ ${rel}: read failed`);
    continue;
  }

  const { afterText, stats } = applyFixersIterative(before, enableObjectChains);
  const fixes = Object.values(stats).reduce((a, b) => a + b, 0);
  totalFixes += fixes;

  if (afterText === before) {
    const rec = { file: rel, changed: false, fixes: 0, breakdown: stats };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    if (verbose) console.log(`  ⏭️ ${rel}: no changes`);
    perFile.push({ file: rel, changed: false, skipped: false, fixes: 0 });
    continue;
  }

  writeDiffPatch(outDir, fileAbs, before, afterText);

  if (!delimiterBalanceOk(afterText)) {
    filesSkipped++;
    const rec = { file: rel, changed: false, skipped: true, reason: "delimiter-balance-failed", fixes, breakdown: stats };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    console.log(`  ⚠️ ${rel}: ${fixes} fixes (SKIPPED: delimiter balance)`);
    perFile.push({ file: rel, changed: false, skipped: true, fixes });
    continue;
  }

  const parseOk = await typescriptParseOk(fileAbs, afterText);
  if (!parseOk) {
    filesSkipped++;
    const rec = { file: rel, changed: false, skipped: true, reason: "ts-parse-failed", fixes, breakdown: stats };
    fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
    console.log(`  ⚠️ ${rel}: ${fixes} fixes (SKIPPED: TS parse)`);
    perFile.push({ file: rel, changed: false, skipped: true, fixes });
    continue;
  }

  if (!dryRun) {
    fs.writeFileSync(fileAbs, afterText, "utf8");
  }

  filesModified++;
  const rec = { file: rel, changed: true, fixes, breakdown: stats };
  fs.appendFileSync(jsonlPath, JSON.stringify(rec) + "\n");
  console.log(`  ✅ ${rel}: ${fixes} fixes`);
  perFile.push({ file: rel, changed: true, skipped: false, fixes });
}

const topFiles = perFile
  .filter(r => r.changed)
  .sort((a, b) => (b.fixes || 0) - (a.fixes || 0))
  .slice(0, 20);

const summary = {
  dryRun,
  enableObjectChains,
  filesProcessed,
  filesModified,
  filesSkipped,
  totalFixes,
  outputs: {
    outDir: norm(path.relative(cwd, outDir)),
    filesToProcess: norm(path.relative(cwd, filesToProcessPath)),
    patchesDir: norm(path.relative(cwd, path.join(outDir, "patches"))),
    resultsJsonl: norm(path.relative(cwd, jsonlPath)),
    summaryJson: norm(path.relative(cwd, summaryPath)),
  },
  topFiles,
};

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

console.log("================================================================================");
console.log(`📊 Summary: processed=${filesProcessed} modified=${filesModified} skipped=${filesSkipped} totalFixes=${totalFixes}`);
console.log(`📁 Proof artifacts (THIS RUN): ${norm(path.relative(cwd, outDir))}`);
console.log("================================================================================");

process.exit(0);
