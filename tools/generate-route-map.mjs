#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const routesDir = path.join(projectRoot, 'sveltekit-frontend', 'src', 'routes');
const outFile = path.join(projectRoot, 'ROUTE_MAP_EXPORT.json');

function walk(dir) {
  const entries = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      entries.push(...walk(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

function relativeRoute(p) {
  // Convert file path to a route string approximating SvelteKit routing
  const rel = path.relative(routesDir, p).replace(/\\/g, '/');
  // Remove extension
  const noext = rel.replace(/\.[^/.]+$/, '');
  // remove +page, +layout, +server suffixes and index-like names
  const cleaned = noext.replace(/(^|\/)\+page$|(^|\/)\+layout$|(^|\/)\+server$|(^|\/)index$/g, '');
  const route = '/' + cleaned;
  return route.replace(/\/\//g, '/').replace(/\/$/, '') || '/';
}

function summarize(files) {
  const routes = new Map();
  for (const f of files) {
    const r = relativeRoute(f);
    if (!routes.has(r)) routes.set(r, []);
    routes.get(r).push(path.basename(f));
  }
  return Array.from(routes.entries()).map(([route, files]) => ({ route, files }));
}

try {
  if (!fs.existsSync(routesDir)) {
    console.error('Routes directory not found:', routesDir);
    process.exit(1);
  }
  const files = walk(routesDir);
  const fileRoutes = summarize(files);
  const counts = {
    totalFiles: files.length,
    uniqueRoutes: fileRoutes.length,
  };
  const exportObj = {
    generated: new Date().toISOString(),
    counts,
    fileRoutes: fileRoutes.slice(0, 200),
  };
  fs.writeFileSync(outFile, JSON.stringify(exportObj, null, 2), 'utf8');
  console.log('Wrote', outFile);
  console.log('Summary:', counts);
} catch (err) {
  console.error('Error generating route map:', err);
  process.exit(2);
}
