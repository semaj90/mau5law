# Svelte 5 Migration & Error Remediation Strategy

## 1. Executive Summary
**Current Status:** ~37k errors detected by `svelte-check`.
**Primary Issues:**
- **Svelte 5 Migration:** Legacy syntax (`export let`, `on:click`, self-closing tags) in unmigrated components.
- **Missing Exports:** `$lib/db`, `$lib/server/auth`, `$lib/server/db/schema` missing specific exports.
- **Type Errors:** Strict type checking failures in `src/routes__parked` and API routes.
- **Missing Dependencies:** `sveltekit-sse` used but not listed in `package.json`.

## 2. Immediate Remediation Plan (Phase 79)

### Step 1: Fix Critical Module Exports
Create/Update barrel files to ensure all required members are exported.
- **`$lib/server/db/schema.ts`**: Ensure `errorClusters` is exported (Done).
- **`$lib/server/auth/index.ts`**: Export `lucia`.
- **`$lib/db/index.ts`**: Export `db`.

### Step 2: Install Missing Dependencies
```bash
npm install sveltekit-sse amqplib
npm install -D @types/amqplib
```

### Step 3: Automated Svelte 5 Migration
Run the Svelte 5 migration tool on specific directories to fix syntax issues.
```bash
npx sv migrate svelte-5 src/lib/components
npx sv migrate svelte-5 src/routes
```
*Note: Review changes carefully as automated migration might miss edge cases.*

### Step 4: Fix "Parked" Routes
The `src/routes__parked` directory contains legacy code that is causing massive error noise.
- **Action:** Exclude `src/routes__parked` from `tsconfig.json` or `svelte.config.js` check, or delete if obsolete.
- **Alternative:** Move to a separate `legacy/` folder outside `src/` if they are just for reference.

## 3. "Project Odin" Architecture Implementation
The `src/routes/odin` route serves as the reference implementation for the new architecture:
- **Svelte 5 Runes:** `$state`, `$derived`, `$props`.
- **Bits-UI:** Headless accessible components.
- **UnoCSS:** Utility-first CSS.
- **Lucia v3:** Auth integration.
- **Drizzle ORM:** Type-safe database access.

## 4. Next Steps for Agent
1.  **Execute Phase 79 Scripts:** Run `npm run phase79:engine` to start the cognitive engine for deeper analysis.
2.  **Apply Patches:** Use `npm run phase79:ultimate` to apply generated fixes.
3.  **Verify Fixes:** Run `npm run check` iteratively.

## 5. Long-Term Maintenance
- **Strict Mode:** Keep strict mode enabled but use `// @ts-expect-error` for legacy code that cannot be immediately fixed.
- **Component Library:** Standardize on `bits-ui` + `unocss` for all new UI components.
