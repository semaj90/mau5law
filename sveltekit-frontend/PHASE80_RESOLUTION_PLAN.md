# 📉 Phase 80: The 36k Error Resolution Master Plan

This document outlines the systematic strategy to eliminate the ~36,000 errors currently plaguing the codebase. We will use a **tiered strategy** combining mechanical automation, cognitive AI, and surgical agentic repair.

## 📊 Error Breakdown (Estimated)
| Category | Est. Count | Tool / Strategy |
| :--- | :--- | :--- |
| **Svelte 5 Syntax** | ~20,000 | `phase82-codemod` (Mechanical) |
| **Missing Types** | ~10,000 | `phase79-engine` (Cognitive AI) |
| **Route Conflicts** | ~3,000 | `fix-route-conflicts.ps1` (Script) |
| **Logic/Complex** | ~3,000 | `phase79-ultimate` (Agentic Loop) |

---

## 🛠️ Step-by-Step Execution Checklist

### 🟢 Tier 1: The "Clean Sweep" (Mechanical Fixes)
*Goal: Reduce error count by ~60% (20k errors) within minutes.*

1.  **Run Svelte 5 Migration Codemod**
    *   Automated upgrade of `export let` -> `$props()`, `$:` -> `$derived`.
    ```bash
    npm run phase82:svelte5-codemod
    ```

2.  **Apply Route Conflict Fixes**
    *   Resolve duplicate `+page.svelte` / `+layout.svelte` issues.
    ```bash
    ./scripts/resolve-all-route-conflicts.ps1
    ```

3.  **Standardize Imports**
    *   Fix common import aliases (`$lib/` vs `../../`).
    ```bash
    node scripts/fix-imports.js
    ```

### 🟡 Tier 2: The "Cognitive Layer" (AI Batches)
*Goal: Fix type mismatches and missing exports. Reduce by another 30% (10k errors).*

4.  **Populate Error Clusters**
    *   Refresh the database with the latest compiler errors.
    ```bash
    npx svelte-check --output-format json > errors.json
    node scripts/ingest-errors.mjs
    ```

5.  **Run Cognitive Engine (Batch Generation)**
    *   Generate patches for the top 50 most broken files.
    ```bash
    npm run phase79:engine
    ```

6.  **Apply High-Confidence Patches**
    *   Apply patches with >80% Safety Score.
    ```bash
    npm run phase79:ultimate
    ```

### 🔴 Tier 3: The "Surgical" (Agentic Repair)
*Goal: Fix the remaining 10% (Complex logic/dependencies).*

7.  **Run Recursive Autonomous Loop**
    *   Let the agent iterate on specific failing routes until green.
    ```bash
    # Target specific critical routes first
    npx tsx scripts/phase79-cognitive-ultimate.mts --target src/routes/odin
    ```

8.  **Manual "Odin" Verification**
    *   Verify the app builds and runs.
    ```bash
    npm run build
    ```

---

## 🛡️ Prevention Strategy (The "Safety Gate")
To ensure errors don't climb back up:
1.  **Pre-Commit Hook**: Runs `phase79:safety-gate` on changed files.
2.  **CI Pipeline**: Fails if `svelte-check` error count increases.
3.  **Strict Mode**: New files must use Svelte 5 Runes (`<svelte:options runes={true} />`).

## 🚀 Execute Now

Start with Tier 1:
```bash
npm run phase82:svelte5-codemod
```
