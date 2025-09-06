// Update package.json with modern development scripts
const fs = require('fs');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Add modern development scripts
  const enhancedScripts = {
    ...packageJson.scripts,
    // Development
    'dev:modern': 'concurrently "npm run websocket:start" "vite dev --host localhost --port 5173"',
    'dev:bits-ui': 'vite dev --host localhost --port 5173',
    'dev:xstate': 'XSTATE_INSPECT=true npm run dev',
    // Building and testing
    'build:modern': 'vite build',
    'test:components': 'vitest run tests/',
    'test:e2e': 'playwright test',
    'test:e2e:ui': 'playwright test --ui',
    'test:all': 'npm run test:components && npm run test:e2e',
    // Type checking and linting
    'check:modern': 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
    'check:xstate': 'npm run check:modern && echo "XState machines validated"',
    'lint:fix': 'prettier --write . && eslint . --fix',
    // Database operations
    'db:modern': 'drizzle-kit generate && drizzle-kit migrate',
    'db:studio:modern': 'drizzle-kit studio --port 3001',
    'db:seed:modern': 'tsx src/lib/server/db/seed.ts',
    // Modern deployment
    'preview:modern': 'vite preview --host localhost --port 4173',
    'deploy:check': 'npm run check:modern && npm run build:modern',
    // Debugging and development tools
    'debug:xstate': 'XSTATE_INSPECT=true XSTATE_DEVTOOLS=true npm run dev',
    'debug:components': 'npm run test:components -- --reporter=verbose',
    'analyze:bundle': 'npm run build && npx vite-bundle-analyzer',
    // Quick fixes and maintenance
    'fix:all:modern': 'npm run lint:fix && npm run check:modern',
    'clean:modern': 'rimraf .svelte-kit dist node_modules/.vite',
    'reset:modern': 'npm run clean:modern && npm install'
  };

  packageJson.scripts = enhancedScripts;

  // Add modern dev dependencies
  const modernDevDeps = {
    ...packageJson.devDependencies,
    '@testing-library/svelte': '5.0.0',
    '@testing-library/jest-dom': '6.1.0',
    'vitest': '2.0.0',
    'happy-dom': '15.0.0',
    'concurrently': '8.2.2'
  };

  packageJson.devDependencies = modernDevDeps;

  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Enhanced package.json with modern scripts');
} catch (error) {
  console.error('Error updating package.json:', error);
}
