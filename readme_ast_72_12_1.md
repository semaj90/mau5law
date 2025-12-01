Phase 72 · AST Checkpoint 12.1 — Next Steps
=========================================

Context Snapshot
----------------
- Latest `svelte-check` run dies before diagnostics because `js_tests/svelte.config.js` imports `svelte-preprocess`, which is not installed.
- After the config import throws, Node reaches ~4 GB heap and exits (`Allocation failed - JavaScript heap out of memory`), so no downstream AST data is produced.
- SIMD JSON/markdown services and the AST modal still need verification before promoting Phase 72 to "green".

Blocking Signals from `svelte-check-errors-latest.txt`
------------------------------------------------------
1. `Error while loading config at sveltekit-frontend\js_tests\svelte.config.js`.
2. `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'svelte-preprocess' ...`.
3. Repeated V8 mark-compact cycles concluding with `FATAL ERROR ... heap out of memory` (~87 s runtime).

Immediate Fix Plan
------------------
1. **Stabilize config import**
   - Add `svelte-preprocess` to `devDependencies` or guard the `js_tests` config so it only imports the package when the playground is enabled.
   - Quick guard sketch:
     ```ts
     // sveltekit-frontend/js_tests/svelte.config.js
     const preprocess = (() => {
       try {
         return (await import('svelte-preprocess')).default();
       } catch {
         console.warn('svelte-preprocess unavailable; skipping js_tests preprocessing');
         return undefined;
       }
     })();
     ```
   - Re-export the root config when preprocess is undefined so js test fixtures no longer hard-fail.
2. **Constrain the check scope**
   - Run `npx svelte-kit sync` first (cheap) then invoke:
     ```powershell
     cd sveltekit-frontend
     $env:NODE_OPTIONS='--max-old-space-size=6144'
     npx svelte-check --threshold error --fail-on-warnings false --ignore "js_tests/**"
     ```
   - Once the config is fixed, drop the ignore flag and capture the full report into `typecheck-report.json` / `svelte-check-errors.json` for AST ingestion.
3. **Record deltas for AST modal**
   - Feed the refreshed JSON into `src/lib/ast/svelte-check-analyzer.ts` so the `/dev/ast-graph` UI reflects current files.
   - Note which errors map to the new autosolve templates (TS2304/TS7006/TS6133/TS2345) for future automation hooks.

SIMD Health Task (Required Before Re-run)
-----------------------------------------
1. `cd sveltekit-frontend`
2. `npm run simd:exe:start` (starts the Go SIMD accelerator; expect port 8096).
3. `Invoke-RestMethod http://localhost:8096/health` — log status, CPU instructions, and uptime into this README once confirmed.
4. Stop the worker after verification (`Ctrl+C` or `Stop-Process -Name simd-json` if backgrounded).

AST Automation Roadmap
----------------------
- **Auto-apply suggestions**: Wire `src/lib/components/ast/ErrorPanel.svelte` so each error issues a POST to `/api/ast/suggest` and applies the patch preview in the modal before writing to disk.
- **CI gate**: Add a `check:ast` npm script that runs `node scripts/check-unified.mjs` plus the autosolve dry-run, fail the pipeline on new TS categories.
- **Batch mode**: Extend `context7-autosolve-integration.ts` to accept a queue of files, not just first 10 errors, so nightlies can chew through the backlog.
- **Migration guardrails**: Mirror fixes into `src_fixed/*` snapshots to keep Svelte 5 migration notes honest; add a compare step so regressions surface immediately.

Reporting
---------
- After completing the config + SIMD steps, append timestamps and outcomes to this file (same section headings) so Phase 72 audit can see the progression without digging through logs.
- If `svelte-check` still fails, capture the new stderr block path + heap stats here before escalating.
