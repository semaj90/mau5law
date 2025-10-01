/**
 * find-route-conflicts.js
 *
 * Usage:
 *   node tools/find-route-conflicts.js           # report conflicts
 *   node tools/find-route-conflicts.js --apply   # move duplicates to tools/route-conflicts/
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'sveltekit-frontend', 'src', 'routes');
const OUT_DIR = path.resolve(__dirname, 'route-conflicts');

function isHidden(p) {
  return path.basename(p).startsWith('.');
}

function normalizeRouteFromPath(p) {
  let rel = p.slice(ROOT.length).replace(/\\/g, '/');
  rel = rel.replace(/\/\+page\.svelte$|\/\+layout\.svelte$|\/index\.svelte$|\/\+server\.[jt]s$|\.svelte$/i, '');
  rel = rel.replace(/\/+$/, '');
  if (rel === '') return '/';
  return rel;
}

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isHidden(name.name)) continue;
    const full = path.join(dir, name.name);
    cb(full, name);
    if (name.isDirectory()) walk(full, cb);
  }
}

function collectRoutes() {
  const map = new Map();
  if (!fs.existsSync(ROOT)) return map;
  walk(ROOT, (full, dirent) => {
    if (dirent.isFile() && full.endsWith('.svelte')) {
      const routeId = normalizeRouteFromPath(full);
      const arr = map.get(routeId) || [];
      arr.push(full);
      map.set(routeId, arr);
    }
  });
  return map;
}

function reportConflicts(map) {
  let conflicts = 0;
  for (const [routeId, paths] of map.entries()) {
    if (paths.length > 1) {
      conflicts++;
      console.log(`\n⚠️ Conflict for route "${routeId}":`);
      for (const p of paths) console.log(`   - ${p}`);
    }
  }
  if (conflicts === 0) console.log('✅ No route conflicts detected.');
  else console.log(`\nFound ${conflicts} conflicting route id(s).`);
  return conflicts;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function applyFixes(map) {
  ensureDir(OUT_DIR);
  let moved = 0;
  for (const [routeId, paths] of map.entries()) {
    if (paths.length <= 1) continue;
    const sorted = paths.slice().sort();
    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    const routeOutDir = path.join(OUT_DIR, routeId === '/' ? 'root' : routeId.replace(/[\/\\:]/g, '_'));
    ensureDir(routeOutDir);
    for (const dup of duplicates) {
      const base = path.basename(dup);
      const target = path.join(routeOutDir, base);
      try {
        fs.renameSync(dup, target);
        console.log(`✂ Moved duplicate: ${dup} -> ${target}`);
        moved++;
      } catch (err) {
        console.error(`❌ Failed to move ${dup}:`, err.message || err);
      }
    }
    try {
      const metaPath = path.join(routeOutDir, 'moved.json');
      const prev = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : [];
      const added = duplicates.map(p => ({ from: p, movedTo: routeOutDir }));
      fs.writeFileSync(metaPath, JSON.stringify(prev.concat(added), null, 2), 'utf8');
    } catch (err) {}
  }
  if (moved === 0) console.log('No duplicates were moved (nothing applied).');
  else console.log(`\nMoved ${moved} duplicate file(s) to: ${OUT_DIR}`);
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  console.log(`Scanning routes under: ${ROOT}`);
  const map = collectRoutes();
  const conflicts = reportConflicts(map);
  if (conflicts > 0 && apply) {
    console.log('\n--apply detected: moving duplicate files to tools/route-conflicts/');
    applyFixes(map);
  } else if (conflicts > 0) {
    console.log('\nRun with --apply to move duplicates to tools/route-conflicts/');
  }
}

main();
