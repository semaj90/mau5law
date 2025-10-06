#!/usr/bin/env node
/*
  deploy-migrations.mjs
  - Generates drizzle types, runs migrations, and optionally refreshes materialized views.
  Usage: node deploy-migrations.mjs [--refresh-mv] [--mv view1,view2]
*/
import { spawnSync } from 'child_process';
import path from 'path';

const root = process.cwd();
const front = path.join(root);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const refreshFlag = args.includes('--refresh-mv') || process.env.REFRESH_MVS === 'true';
  const mvIndex = args.findIndex(a => a === '--mv');
  let mvList = [];
  if (mvIndex !== -1 && args[mvIndex + 1]) {
    mvList = args[mvIndex + 1].split(',').map(s => s.trim()).filter(Boolean);
  }

  console.log('1) Running drizzle-kit generate (codegen)');
  // run from project root - this assumes drizzle-kit is installed
  run('npx', ['drizzle-kit', 'generate']);

  console.log('2) Running drizzle-kit migrate');
  run('npx', ['drizzle-kit', 'migrate']);

  if (refreshFlag || mvList.length) {
    console.log('3) Refreshing materialized views');
    const refreshScript = path.join(front, 'scripts', 'db', 'refresh-mv.mjs');
    const mvArg = mvList.length ? `--mv ${mvList.join(',')}` : '';
    run('node', [refreshScript, ...(mvList.length ? ['--mv', mvList.join(',')] : [])]);
  }

  console.log('db deploy complete');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
#!/usr/bin/env node
import { $ } from 'zx';
import path from 'path';

// Usage: node deploy-migrations.mjs [--refresh mv1,mv2] [--dir=./drizzle]
// This script runs drizzle-kit generate -> drizzle-kit migrate -> optional refresh of materialized views

const args = process.argv.slice(2);
const refreshArg = args.find(a => a.startsWith('--refresh='));
const dirArg = args.find(a => a.startsWith('--dir='));
const mvs = refreshArg ? refreshArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : [];
const migrationsDir = dirArg ? dirArg.split('=')[1] : './drizzle';

(async () => {
  try {
    const cwd = path.resolve(process.cwd(), 'sveltekit-frontend');
    console.log('Running drizzle-kit generate...');
    await $`npx -y --prefix ${cwd} drizzle-kit generate`;
    console.log('Running drizzle-kit migrate...');
    await $`npx -y --prefix ${cwd} drizzle-kit migrate`;
    if (mvs.length > 0) {
      console.log('Refreshing materialized views:', mvs.join(', '));
      const refreshCmd = `node ${path.join(cwd, 'scripts', 'db', 'refresh-mv.mjs')} ${mvs.join(' ')}`;
      await $`${refreshCmd}`;
    }
    console.log('Migration deploy flow complete.');
  } catch (err) {
    console.error('Deploy migration failed:', err?.message || err);
    process.exit(1);
  }
})();
