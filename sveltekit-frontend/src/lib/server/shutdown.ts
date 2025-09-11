// Centralized graceful shutdown registry
// Components can register async cleanup callbacks.

const cleaners: Array<() => Promise<any> | any> = [];
let registered = false;

export function registerCleanup(fn: () => Promise<any> | any) {
  cleaners.push(fn);
  ensureHandlers();
}

async function runCleanups(signal: string) {
  console.log(`[shutdown] Received ${signal}, running ${cleaners.length} cleanup tasks`);
  for (const fn of cleaners) {
    try { await fn(); } catch (e: any) { console.error('[shutdown] cleanup error', e?.message || e); }
  }
  process.exit(0);
}

function ensureHandlers() {
  if (registered) return;
  registered = true;
  ['SIGINT','SIGTERM'].forEach(sig => {
    process.on(sig as any, () => runCleanups(sig));
  });
  process.on('uncaughtException', (e) => {
    console.error('[shutdown] uncaughtException', e);
  });
  process.on('unhandledRejection', (r) => {
    console.error('[shutdown] unhandledRejection', r);
  });
}
