/**
 * Simple utility to resolve case-only filename conflicts for the UI card module.
 * - If both `Card.js` and `card.js` exist in src/lib/components/ui, rename `Card.js` -> `CardComponent.js`
 * - Replace imports that reference "$lib/components/ui/card" or "$lib/components/ui/Card"
 *   with "$lib/components/ui/CardComponent" across .svelte/.ts/.js files in the repo.
 *
 * Usage: node scripts/fix-ui-card-casing.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const uiDir = path.join(repoRoot, 'sveltekit-frontend', 'src', 'lib', 'components', 'ui');

const filesToSearch = [
  ...walkSync(path.join(repoRoot, 'sveltekit-frontend', 'src'))
].filter((f) => /\.(svelte|ts|js|jsx|tsx)$/.test(f));

function walkSync(dir) {
  let results = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkSync(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

function updateImportsInFile(file, fromRegex, toStr) {
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(fromRegex, toStr);
  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Updated imports in', path.relative(repoRoot, file));
  }
}

(async () => {
  try {
    const lower = path.join(uiDir, 'card.js');
    const upper = path.join(uiDir, 'Card.js');
    const canonical = path.join(uiDir, 'CardComponent.js');

    const lowerExists = fs.existsSync(lower);
    const upperExists = fs.existsSync(upper);

    if (upperExists && !fs.existsSync(canonical)) {
      // rename Card.js -> CardComponent.js to avoid case-only collision
      fs.renameSync(upper, canonical);
      console.log('Renamed:', path.relative(repoRoot, upper), '->', path.relative(repoRoot, canonical));
    } else if (!upperExists && fs.existsSync(canonical)) {
      console.log('Canonical already present:', path.relative(repoRoot, canonical));
    } else {
      console.log('No case-only Card.js/ card.js conflict detected or canonical exists already.');
    }

    // replace imports that reference either case to the canonical name
    const importRegex = /(\$lib\/components\/ui\/)(?:card|Card)(['"]/g;
    const replacement = '$1CardComponent$2';

    filesToSearch.forEach((f) => updateImportsInFile(f, importRegex, replacement));

    console.log('Done. Please run your build to verify (e.g. npm run dev).');
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
})();
