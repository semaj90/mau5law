# Phase 6 – Core Routes & Machines Focus

**Strategy:** Tight, mechanical verification of only core UX (10 routes, 10 machines)

## 📋 What "Core" Means

### Core Routes (10)
- `/dashboard`
- `/cases`
- `/cases/new`
- `/cases/[id]`
- `/cases/[id]/evidence`
- `/evidence`
- `/evidence/upload`
- `/evidence/analyze`
- `/legal/documents`
- `/legal-ai-suite`

### Core Machines (10)
- `src/lib/state/legalFormMachine.ts`
- `src/lib/state/caseManagementMachine.ts`
- `src/lib/state/documentUploadMachine.ts`
- `src/lib/state/legalDocumentProcessingMachine.ts`
- `src/lib/state/evidenceProcessingMachine.ts`
- `src/lib/state/app-machine.ts`
- `src/lib/state/async-rabbitmq-state-manager.ts`
- `src/lib/state/crewAIOrchestrationMachine.ts`
- `src/lib/workers/embedding-worker.ts`
- `src/lib/text/utf8-fp32-converter.ts`

## 🚀 Quick Start

### Command Line
```bash
cd sveltekit-frontend
npm run phase6:core
```

### VS Code
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select **"Phase 6: Core (machines + pages)"**

Or use keyboard shortcut:
- `Ctrl+Shift+B` → Select task from dropdown

## 📁 Files Created

### 1. Manifest (Single Source of Truth)
**File:** `scripts/core-focus.json`
```json
{
  "routes": [...],
  "machines": [...]
}
```

### 2. Phase 6 Script
**File:** `scripts/phase6-core-focus.mjs`
- Reads manifest
- Checks TypeScript (machines only)
- Checks Svelte (core pages only)
- Skips 98-file global scan

### 3. PowerShell Helpers
**File:** `scripts/phase6-helpers.ps1`

Load helpers:
```powershell
cd sveltekit-frontend
. .\scripts\phase6-helpers.ps1
```

Available functions:
```powershell
# Find where a machine is used
Find-MachineUsages -MachineName 'caseManagementMachine'

# List all core route files
Get-CoreRouteFiles

# TypeScript check core machines only
Test-CoreMachines

# Find XState patterns (old vs new)
Find-XStatePatterns

# Quick error scan (first 10)
Get-QuickErrors
```

### 4. NPM Script
**File:** `package.json` (updated)
```json
{
  "scripts": {
    "phase6:core": "node ./scripts/phase6-core-focus.mjs"
  }
}
```

### 5. VS Code Tasks
**File:** `.vscode/tasks.json` (updated)
- **Phase 6: Core (machines + pages)** – Run full check
- **Dev: Core routes only** – Start dev server

## 🔍 Ad-Hoc Checks with ripgrep

### Find all uses of a specific machine
```powershell
rg "legalFormMachine" src -n --type ts --type svelte
```

### Find all XState machines with old pattern
```powershell
rg "createMachine<" src/lib/state --type ts -n
```

### Find all XState machines with new pattern
```powershell
rg "setup\(\)\.createMachine" src/lib/state --type ts -n
```

### List all Svelte files in core routes
```powershell
Get-ChildItem -Recurse `
  -Path "src/routes/cases", "src/routes/evidence", "src/routes/legal" `
  -Include "*+page.svelte","*+layout.svelte" |
  Select-Object FullName
```

## 🎯 Phase Labels

**Phase 6 – Core Routes & Machines**
- **Command:** `npm run phase6:core`
- **Focus:** 10 machines + 10 pages
- **Goal:** `/cases + /cases/[id]/evidence + legal docs work without exploding`
- **Duration:** ~30 seconds

**Phase 7 – Global Bracket Cleanup** (future)
- Full 98-file campaign
- Use existing scripts

**Phase 72/82 – Error Brain / Upgrade Brain** (existing)
- Repo-wide analysis
- Phase 72: Error analysis with Redis cache
- Phase 82: Svelte 5 migration codemod

## ✅ Success Criteria

### Phase 6 Pass =
- ✅ All 10 machines compile (TypeScript)
- ✅ All 10 core pages pass svelte-check (or only warnings)
- ✅ Dev server starts: `npm run dev:quic`
- ✅ Core routes load in browser without crash

### What's NOT in Phase 6
- ❌ Other 88 files (leave for Phase 7)
- ❌ Full error reduction (leave for Phase 72)
- ❌ Svelte 5 migration (leave for Phase 82)
- ❌ Database setup (separate task)
- ❌ API implementation (mock data OK)

## 🔄 Workflow

### 1. Fix Core Machines (Already Done ✅)
All 10 machines use clean XState v5 `setup()` pattern:
- ✅ legalFormMachine.ts
- ✅ caseManagementMachine.ts
- ✅ documentUploadMachine.ts
- ✅ legalDocumentProcessingMachine.ts
- ✅ evidenceProcessingMachine.ts
- ✅ app-machine.ts
- ✅ async-rabbitmq-state-manager.ts
- ✅ crewAIOrchestrationMachine.ts
- ✅ embedding-worker.ts
- ✅ utf8-fp32-converter.ts

### 2. Verify Core (Run Phase 6)
```bash
npm run phase6:core
```

### 3. Test in Browser
```bash
npm run dev:quic
```

Visit:
- http://localhost:5173/cases
- http://localhost:5173/cases/new
- http://localhost:5173/cases/test-case-123/evidence

### 4. Fix Issues (If Any)
- Only fix errors in core files
- Ignore warnings in other files
- Use PowerShell helpers to debug

### 5. Iterate
Repeat steps 2-4 until Phase 6 passes clean.

## 📊 Expected Output

```
🔎 Phase 6 – Core Focus (tight + mechanical)
═══════════════════════════════════════════════════════════

📋 Core Routes: 10
   /dashboard
   /cases
   /cases/new
   ...

📋 Core Machines: 10
   src/lib/state/legalFormMachine.ts
   src/lib/state/caseManagementMachine.ts
   ...

═══════════════════════════════════════════════════════════
🧪 Step 1: TypeScript check (core machines only)
═══════════════════════════════════════════════════════════

→ npx tsc --noEmit --skipLibCheck src/lib/state/...

✅ TypeScript check passed

═══════════════════════════════════════════════════════════
🧪 Step 2: Svelte-check (core pages only)
═══════════════════════════════════════════════════════════

→ npx svelte-check --fail-on-warnings src/routes/...

✅ Svelte-check passed

═══════════════════════════════════════════════════════════
✅ Phase 6 core check completed
═══════════════════════════════════════════════════════════

Next: npm run dev:quic → test core routes in browser
```

## 🛠️ Troubleshooting

### "File not found" errors
- Check paths in `scripts/core-focus.json`
- Verify files exist: `Get-ChildItem src/lib/state`

### TypeScript errors in machines
- Review machine file (should use `setup()` pattern)
- Check imports (should be `import { setup, assign, fromPromise }`)
- Verify no old `createMachine<Context, Event>()` syntax

### Svelte-check warnings
- Expected during development
- Focus on errors only
- Check page imports machines correctly

### Dev server won't start
- Check port 5173 not in use: `netstat -ano | findstr :5173`
- Kill process: `taskkill /PID <pid> /F`
- Retry: `npm run dev:quic`

## 📝 Next Steps

After Phase 6 passes:

1. **Test core UX in browser** – Click through all routes
2. **Wire up database** – Connect to `legal_ai_db`
3. **Replace mocks** – Add real API endpoints
4. **Phase 7** – Tackle remaining 88 files (if needed)
5. **Phase 72** – Run full error analysis
6. **Phase 82** – Svelte 5 migration codemod

## 🔗 Related Documentation

- Phase 72: `PHASE72_ERROR_BRAIN.md`
- Phase 82: `PHASE82_SVELTE5_MIGRATION.md`
- Case Routes: `CASES_ROUTES_IMPLEMENTATION.md`
- XState v5: Official docs at https://stately.ai/docs
