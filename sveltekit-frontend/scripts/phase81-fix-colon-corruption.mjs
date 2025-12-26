import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const norm = (p) => p.replaceAll("\\", "/");
const toAbs = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));

function parseArgv(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;

    const [k, vEq] = a.slice(2).split("=", 2);
    const next = argv[i + 1];

    if (vEq !== undefined) out[k] = vEq;
    else if (next && !next.startsWith("--")) { out[k] = next; i++; }
    else out[k] = true;
  }
  return out;
}

function resolveExistingFile(p) {
  const abs = toAbs(p);
  if (!fs.existsSync(abs)) throw new Error(`Path not found: ${abs}`);
  return abs;
}

function walkDir(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      const rel = norm(path.relative(process.cwd(), full));

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

function writeDiffPatch(fileAbs, before, after) {
  fs.mkdirSync("reports/patches", { recursive: true });

  const safeName = norm(path.relative(process.cwd(), fileAbs))
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
  fs.writeFileSync(`reports/patches/${safeName}.diff`, diffText, "utf8");
}

// -------------------------
// Colon-corruption fixers
// -------------------------

function countChar(s, ch) {
  return (s.match(new RegExp(`\\${ch}`, "g")) ?? []).length;
}

// 1) type alias union: "type X = A: undefined;" => "type X = A | undefined;"
function fixTypeAliasColonUnions(line, stats) {
  const before = line;
  if (!/^\s*type\s+\w+\s*=/.test(line)) return line;
  if (!line.includes(":")) return line;
  if (line.includes("{")) return line; // too risky for object types

  // only if it looks like type-ish tokens around colon
  if (!/\b[A-Za-z_$][\w$]*\b\s*:\s*\b[A-Za-z_$][\w$]*\b/.test(line) &&
      !/\b[A-Za-z_$][\w$]*\b\s*:\s*(undefined|null|never|void)\b/.test(line)) {
    return line;
  }

  const out = line.replace(/\s*:\s*/g, " | ");
  if (out !== before) stats["type-alias-colon-union"] = (stats["type-alias-colon-union"] ?? 0) + 1;
  return out;
}

// 2) generic unions: Promise<Float32Array: null> => Promise<Float32Array | null>
function fixGenericColonUnions(line, stats) {
  const before = line;
  const out = line.replace(/<([^>\n]*?)\s*:\s*(null|undefined|never|void)\b/g, (_m, lhs, rhs) => {
    stats["generic-colon-union"] = (stats["generic-colon-union"] ?? 0) + 1;
    return `<${lhs} | ${rhs}`;
  });
  return out !== before ? out : before;
}

// 3) param list corruption: get(key, string) => get(key: string)
function fixParamNameCommaType(line, stats) {
  const before = line;
  // only touch (...) groups on same line
  const out = line.replace(/\(([^()\n]*)\)/g, (full, inner) => {
    let changed = false;
    let s = inner;

    s = s.replace(
      /(\b[A-Za-z_$][\w$]*\b)\s*,\s*(string|number|boolean|any|unknown|object)\b/g,
      (_m, name, t) => {
        changed = true;
        return `${name}: ${t}`;
      }
    );

    if (!changed) return full;
    stats["param-name-comma-type"] = (stats["param-name-comma-type"] ?? 0) + 1;
    return `(${s})`;
  });
  return out !== before ? out : before;
}

// 4) signature tail corruption: "), any: Promise<...>" => ", options: any): Promise<...>"
function fixSignatureTailParam(line, stats) {
  const before = line;
  if (!/\)\s*,\s*(any|unknown|string|number|boolean)\s*:/.test(line)) return line;
  if (!/(async\s+)?[A-Za-z_$][\w$]*\s*\(|private|public|protected|function/.test(line)) return line;

  const out = line.replace(/\)\s*,\s*(any|unknown|string|number|boolean)\s*:/g, (_m, t) => {
    stats["signature-tail-param"] = (stats["signature-tail-param"] ?? 0) + 1;
    return `, options: ${t}):`;
  });

  return out !== before ? out : before;
}

// 5) object-literal colon chains per line:
// key: value: key2: value2 -> key: value, key2: value2
// conservative: only when colon count is high and not type/interface line
function fixObjectColonChains(line, stats) {
  const before = line;
  const colonCount = countChar(line, ":");
  if (colonCount < 2) return line; // Relaxed to 2
  if (/^\s*(type|interface|export\s+interface)\b/.test(line)) return line;
  if (line.includes("http://") || line.includes("https://")) return line;

  let out = line;

  // Aggressive chain fixer: key: val: key2 -> key: val, key2
  // val cannot contain ? (ternary), { (object), : (nested), ) (func end), , (comma), ; (semi), or ( (func start)
  for (let i = 0; i < 10; i++) {
    const next = out.replace(
      /(\b[A-Za-z_$][\w$]*\b)\s*:\s*([^:?{\n),;(]+?)\s*:\s*(\b[A-Za-z_$][\w$]*\b)/g,
      (_m, k1, v1, k2) => {
        stats["object-colon-chain"] = (stats["object-colon-chain"] ?? 0) + 1;
        return `${k1}: ${v1.trim()}, ${k2}`;
      }
    );
    if (next === out) break;
    out = next;
  }

  return out !== before ? out : before;
}

// 6) Double punctuation: ",;" -> ","
function fixDoublePunctuation(line, stats) {
  const before = line;
  const out = line.replace(/,\s*;/g, ",");
  if (out !== before) stats["double-punctuation"] = (stats["double-punctuation"] ?? 0) + 1;
  return out;
}

function runFixers(text) {
  const stats = {};
  const lines = text.split(/\r?\n/);

  const out = lines.map((line) => {
    let s = line;
    s = fixGenericColonUnions(s, stats);
    s = fixTypeAliasColonUnions(s, stats);
    s = fixSignatureTailParam(s, stats);
    s = fixParamNameCommaType(s, stats);
    s = fixObjectColonChains(s, stats);
    s = fixDoublePunctuation(s, stats);
    return s;
  }).join("\n");

  return { text: out, stats };
}

// -------------------------
// Main
// -------------------------

const args = parseArgv(process.argv.slice(2));
const dryRun = !!args["dry-run"] || !!args.dryrun;

let files = [];
if (args.file) files = [resolveExistingFile(args.file)];
else if (args.dir) files = walkDir(resolveExistingFile(args.dir));
else if (args.list) {
  const listPath = resolveExistingFile(args.list);
  const content = fs.readFileSync(listPath, "utf8");
  files = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(l => toAbs(l));
}
else {
  console.error("Usage: node scripts/phase81-fix-colon-corruption.mjs --file=... [--dry-run]  OR  --dir=... OR --list=...");
  process.exit(2);
}

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/phase81-fix-colon-files-to-process.txt",
  files.map((f) => norm(f)).join("\n") + "\n",
  "utf8"
);
console.log(`📁 Found ${files.length} files to process`);
console.log(`Wrote: reports/phase81-fix-colon-files-to-process.txt (${files.length})`);

let totalFixes = 0;
let filesModified = 0;
const perFile = [];

for (const f of files) {
  const before = fs.readFileSync(f, "utf8");
  const { text: after, stats } = runFixers(before);

  const fixes = Object.values(stats).reduce((a, b) => a + b, 0);
  totalFixes += fixes;

  const changed = after !== before;
  if (changed) filesModified++;

  perFile.push({
    file: norm(path.relative(process.cwd(), f)),
    changed,
    fixes,
    breakdown: stats,
  });

  if (changed) {
    console.log(`  ✅ ${norm(path.relative(process.cwd(), f))}: ${fixes} fixes`);
    writeDiffPatch(f, before, after);
    if (!dryRun) fs.writeFileSync(f, after, "utf8");
  } else {
    console.log(`  · ${norm(path.relative(process.cwd(), f))}: 0 fixes`);
  }
}

const summary = {
  dryRun,
  filesProcessed: files.length,
  filesModified,
  totalFixes,
  topFiles: perFile.sort((a, b) => b.fixes - a.fixes).slice(0, 50),
};

fs.writeFileSync("reports/phase81-fix-colon-summary.json", JSON.stringify(summary, null, 2), "utf8");
console.log(`✅ Done. Modified: ${filesModified}/${files.length}. Total fixes: ${totalFixes}`);
console.log(`Wrote: reports/phase81-fix-colon-summary.json`);
console.log(`Wrote patches: reports/patches/*