#!/usr/bin/env node
import net from 'net';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

async function checkTcp(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const onResult = (ok, reason) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ok, reason });
    };
    socket.setTimeout(ms);
    socket.on('connect', () => onResult(true));
    socket.on('timeout', () => onResult(false, 'timeout'));
    socket.on('error', (e) => onResult(false, e.message));
    socket.connect(port, host);
  });
}

async function checkHttp(url, ms = 2000) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { timeout: ms }, (res) => {
        // consume response data so socket closes cleanly
        res.on('data', () => {});
        res.on('end', () => {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'timeout' });
      });

      req.on('error', (e) => {
        resolve({ ok: false, error: e && e.message ? e.message : String(e) });
      });
    } catch (e) {
      resolve({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });
}

async function runChecks() {
  console.log('\nBackend Integration Health Check');
  console.log('Date:', new Date().toISOString());

  const checks = [
    { name: 'Postgres (5433)', type: 'tcp', host: '127.0.0.1', port: 5433 },
    { name: 'Redis (6379)', type: 'tcp', host: '127.0.0.1', port: 6379 },
    { name: 'Ollama (11436)', type: 'http', url: 'http://127.0.0.1:11436/health' },
    { name: 'Enhanced RAG (8094)', type: 'http', url: 'http://127.0.0.1:8094/health' },
    { name: 'Upload Service (8093)', type: 'http', url: 'http://127.0.0.1:8093/health' },
    { name: 'Websocket server (ws?)', type: 'tcp', host: '127.0.0.1', port: 3001 },
  ];

  const results = [];
  for (const c of checks) {
    if (c.type === 'tcp') {
      process.stdout.write(`Checking ${c.name}... `);
      const r = await checkTcp(c.host, c.port).catch((e) => ({ ok: false, reason: String(e) }));
      console.log(r.ok ? 'OK' : `FAIL (${r.reason || 'no response'})`);
      results.push({ check: c.name, ok: !!r.ok, detail: r });
    } else if (c.type === 'http') {
      process.stdout.write(`Checking ${c.name}... `);
      const r = await checkHttp(c.url).catch((e) => ({ ok: false, error: String(e) }));
      console.log(r.ok ? `HTTP ${r.status || ''}` : `FAIL (${r.error || 'no response'})`);
      results.push({ check: c.name, ok: !!r.ok, detail: r });
    }
  }

  // Also check SvelteKit /ai and /chat routes locally (server-side handlers)
  console.log('\nChecking app routes /ai and /chat (via HTTP)');
  const base = 'http://127.0.0.1:3000';
  const appRoutes = ['/ai', '/chat'];
  for (const r of appRoutes) {
    const url = base + r;
    process.stdout.write(`Checking ${url}... `);
    const res = await checkHttp(url, 3000).catch((e) => ({ ok: false, error: String(e) }));
    console.log(res.ok ? `HTTP ${res.status}` : `FAIL (${res.error})`);
    results.push({ check: `app:${r}`, ok: !!res.ok, detail: res });
  }

  const out = { generated: new Date().toISOString(), results };
  const outFile = path.join(process.cwd(), 'tools', 'backend-health-check-result.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log('\nWrote result to', outFile);

  const failing = results.filter((r) => !r.ok);
  if (failing.length === 0) {
    console.log('\nAll checks passed (or at least responded OK)');
  } else {
    console.log('\nFailing checks:');
    failing.forEach((f) => console.log('-', f.check, JSON.stringify(f.detail)));
  }
}

runChecks().catch((e) => {
  console.error('Health check run failed:', e);
  process.exit(2);
});
