# Svelte 5 Event Handler Swaps (on: -> on) Plan

## Status Snapshot
- Remaining files with `on:` handlers (all .svelte under src/lib + src/routes): 385
- High-priority scope: active app routes (non-`archive`, non-`demo`, non-`_disabled`) and shared UI components.

## Strategy
1) Triage scope
- Exclude obvious archives/demos: `(archive|demo|_disabled)` folders for now.
- Focus on app routes, admin, yorha, evidence, legal, ui primitives.

2) Mechanical swap
- Replace `on:click` -> `onclick`, `on:change` -> `onchange`, `on:input` -> `oninput`, etc.
- Preserve modifiers (e.g., `on:click|stopPropagation` -> `onclick|stopPropagation`).
- Keep inline handlers intact.

3) Validate
- Run `npm run check:svelte:frontend` after batches.
- Spot-check interactive elements: prefer `<button>` over clickable `<div>` where feasible.

## Initial Target List (phase 1)
- `src/routes/+page.svelte` (landing)
- `src/routes/auth/+page.svelte`
- `src/routes/login/+page.svelte` (if present)
- `src/routes/poi-manager/+page.svelte` (already swapped)
- `src/lib/components/ui/Modal.svelte`
- `src/lib/components/ui/tooltip.svelte`
- `src/lib/components/ui/Input.svelte`
- `src/lib/components/ui/Select.svelte`
- `src/lib/components/ui/Button.svelte` (if on handlers)

## Notes
- Field wrapper already runes-safe; keep using snippet-based control prop.
- Vite config compiles dependencies in legacy; app in runes.

## Next Actions
- Apply swaps to the initial target list.
- Re-run `rg -c "on:" ...` to track reduction.
- If no regressions, continue to admin/evidence/legal routes.
