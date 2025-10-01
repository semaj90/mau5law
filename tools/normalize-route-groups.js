/**
 * normalize-route-groups.js
 *
 * Usage:
 *   node tools/normalize-route-groups.js
 *
 * Behavior:
 * - Scans sveltekit-frontend/src/routes for directories whose names are
 *   Svelte route group folders (enclosed in parentheses) but contain
 *   extra whitespace or variants like "(ai )", "( ai )", etc.
 * - Moves contents from the incorrect folder into the canonical folder
 *   with normalized group name "(ai)" and removes the empty source folder.
 *
 * NOTE: This performs filesystem moves. Review the console output before
 * restarting your dev server.
 */
const fs = require('fs');
const path = require('path');

const ROUTES_ROOT = path.resolve(__dirname, '..', 'sveltekit-frontend', 'src', 'routes');

if (!fs.existsSync(ROUTES_ROOT)) {
  console.error('Routes root not found:', ROUTES_ROOT);
  process.exit(1);
}

function isGroupDirName(name) {
  return /^\(.*\)$/.test(name);
}

function normalizeGroupName(name) {
  // Trim internal/external spaces inside parentheses, collapse multiple spaces
  // Examples: "(ai )" -> "(ai)"; "( ai )" -> "(ai)"; "( AI )" -> "(AI)"
  return name
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([^\s]+)\s*/, '$1')
    .replace(/^/, '(')
    .replace(/$/, ')')
    .replace(/\(\s+/, '(')
    .replace(/\s+\)/, ')');
}

function moveContents(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(src, ent.name);
    const destPath = path.join(dest, ent.name);
    try {
      // If destination exists, attempt to move into a subpath (avoid overwrite)
      if (fs.existsSync(destPath)) {
        // if both are directories, merge recursively
        if (ent.isDirectory() && fs.statSync(destPath).isDirectory()) {
          moveContents(srcPath, destPath);
          // remove srcPath if empty
          try { fs.rmdirSync(srcPath); } catch {}
          continue;
        }
        // If file exists at destination, append suffix to avoid clobber
        const parsed = path.parse(destPath);
        const alt = path.join(parsed.dir, `${parsed.name}__from_src${parsed.ext}`);
        fs.renameSync(srcPath, alt);
        console.log(`⚠️ Destination existed. Moved ${srcPath} -> ${alt}`);
      } else {
        fs.renameSync(srcPath, destPath);
        console.log(`✂ Moved ${srcPath} -> ${destPath}`);
      }
    } catch (err) {
      console.error(`❌ Failed moving ${srcPath} -> ${destPath}:`, err.message || err);
    }
  }
}

function findAndNormalize(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    const fullPath = path.join(dir, name);

    // Recurse first
    findAndNormalize(fullPath);

    if (isGroupDirName(name)) {
      const normalized = normalizeGroupName(name);
      if (normalized !== name) {
        const destDir = path.join(dir, normalized);
        console.log(`\n🔎 Found variant group directory: ${fullPath}`);
        console.log(`    -> Normalized name will be: ${normalized}`);
        // Ensure dest exists, move contents
        moveContents(fullPath, destDir);
        // After moving, attempt to remove the now-empty source directory
        try {
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) {
            fs.rmdirSync(fullPath);
            console.log(`🧹 Removed empty directory: ${fullPath}`);
          } else {
            console.warn(`⚠️ Source directory not empty after move: ${fullPath}`);
            console.warn(' Remaining entries:', remaining);
          }
        } catch (err) {
          console.warn(`⚠️ Could not remove ${fullPath}:`, err.message || err);
        }
      }
    }
  }
}

// Run normalization
console.log(`Scanning routes root: ${ROUTES_ROOT}`);
findAndNormalize(ROUTES_ROOT);
console.log('Done. Review changes, then restart your dev server (npm run dev:gpu).');
