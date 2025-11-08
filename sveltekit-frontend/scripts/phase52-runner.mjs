#!/usr/bin/env node
const { execSync } = require('child_process');

const steps = [
  { name: 'Format (Prettier)', cmd: 'npm run format' },
  { name: 'ESLint fix', cmd: 'npm run lint:fix' },
  { name: 'TypeScript check', cmd: 'npm run check' },
  { name: 'Route tests', cmd: 'npm run test:routes' }
];

console.log('\n▶ Phase52: Clean & Verify - starting pipeline\n');

for (const step of steps) {
  console.log(`\n--- ${step.name} --> ${step.cmd}`);
  try {
    execSync(step.cmd, { stdio: 'inherit', env: process.env, shell: true });
  } catch (err) {
    console.error(`\n✖ Step failed: ${step.name}`);
    const code = (err && err.status) ? err.status : 1;
    process.exit(code);
  }
}

console.log('\n✅ Phase52: Clean & Verify completed successfully\n');
