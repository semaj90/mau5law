// Shim worker replacing legacy llama-rl-worker.js. For backward compatibility only.
// For real functionality use nes-rl.js. This file forwards SMART_MODEL_SELECT and GENERATE_LEGAL
// to nes-rl.js if loaded, otherwise returns a deprecation notice.

importScripts('/workers/nes-rl.js');

self.addEventListener('message', (e) => {
  const { type, payload } = e.data || {};
  if (type === 'SMART_MODEL_SELECT' || type === 'GENERATE' || type === 'GENERATE_LEGAL') {
    // Forward to nes-rl (which attached its own onmessage earlier). We simulate by invoking postMessage after small delay.
    // Because nes-rl has its own onmessage, we just re-dispatch.
    setTimeout(() => {
      // Re-dispatch so nes-rl handler processes it.
      self.onmessage && self.onmessage({ data: { type, payload } });
    }, 0);
    return;
  }
  if (type === 'INIT_WASM' || type === 'INIT') {
    setTimeout(() => {
      self.postMessage({ type: type + '_OK', payload: { note: 'Shim worker active (rl-workergemma.js)' } });
    }, 0);
    return;
  }
  self.postMessage({ type: 'DEPRECATED_WORKER', payload: { message: 'rl-workergemma shim only. Use /workers/nes-rl.js directly.' }});
});
