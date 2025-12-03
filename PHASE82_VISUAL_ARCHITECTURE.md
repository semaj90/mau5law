# Phase 82 Visual Architecture

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR CODEBASE                               │
│                                                                     │
│  src/routes/                                                        │
│  ├── /cases                                                         │
│  ├── /analysis-center                                               │
│  ├── /evidence-board                                                │
│  └── ...                                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  ↑
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
        ┌──────────────────────┐    ┌──────────────────────┐
        │   Phase 72           │    │   Phase 82           │
        │   Error Brain        │    │   Upgrade Brain      │
        │                      │    │                      │
        │ • Watches dev output │    │ • Scans for legacy   │
        │ • Captures errors    │    │   patterns           │
        │ • Stores in DB       │    │ • Calls LLM          │
        │ • Suggests fixes     │    │ • Writes upgraded    │
        │                      │    │   files              │
        └──────────────────────┘    └──────────────────────┘
                    ↑                           ↑
                    └─────────────┬─────────────┘
                                  ↓
        ┌─────────────────────────────────────────────────┐
        │  /all-routes Command Center                     │
        │                                                 │
        │  Route cards (grid view)                        │
        │  ├── /cases [HEALTHY]                           │
        │  ├── /analysis-center [WARNING]                 │
        │  └── /evidence-board [BROKEN]                   │
        │                                                 │
        │  Click any card → Detective Board Modal         │
        └─────────────────────────────────────────────────┘
                                  ↓
        ┌─────────────────────────────────────────────────┐
        │  Detective Board Modal                          │
        │                                                 │
        │  ┌──────────────────┬──────────────────────┐   │
        │  │ Route Dossier    │ Diagnostics & Tools │   │
        │  │                  │                      │   │
        │  │ • Path           │ Phase 72 Status      │   │
        │  │ • File           │ • Error count        │   │
        │  │ • Category       │ • Last error         │   │
        │  │ • Packages       │ • [Ask Error Brain]  │   │
        │  │ • Related routes │                      │   │
        │  │                  │ Phase 82 Status      │   │
        │  │                  │ • Upgrade progress   │   │
        │  │                  │ • [Run Codemod]      │   │
        │  └──────────────────┴──────────────────────┘   │
        │                                                 │
        │  [Visit] [AST] [Health Check]                  │
        └─────────────────────────────────────────────────┘
```

---

## Phase 82 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ User clicks "Run Svelte 5 Codemod" in Detective Board Modal      │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ POST /api/phase82/upgrade-route                                  │
│ Body: { route: "/cases" }                                        │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ Endpoint spawns CLI runner:                                      │
│ node scripts/phase82-svelte-runes-codemod.mjs --route /cases     │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ CLI Runner:                                                      │
│ 1. Use ripgrep to find legacy patterns in /cases route           │
│    rg "export let" src/routes/cases/                             │
│    rg "\$:" src/routes/cases/                                    │
│    rg "onMount\(" src/routes/cases/                              │
│                                                                  │
│ 2. For each file found:                                          │
│    - Read file contents                                          │
│    - POST to /api/phase82/svelte-upgrade                         │
│    - Receive transformed code                                    │
│    - Write back to disk                                          │
│    - Log result                                                  │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ For each file:                                                   │
│                                                                  │
│ POST /api/phase82/svelte-upgrade                                 │
│ Body: {                                                          │
│   file_path: "src/routes/cases/+page.svelte",                   │
│   original: "export let cases = [];\n..."                        │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ LLM Transformer (Ollama):                                        │
│                                                                  │
│ 1. Build prompt with Svelte 5 rune rules                         │
│ 2. Call Ollama (gemma3-legal:latest)                             │
│ 3. Send: original code + rules                                   │
│ 4. Receive: transformed code                                     │
│ 5. Return: { upgraded: "let cases = $state([]);\n..." }          │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ CLI Runner writes upgraded code:                                 │
│                                                                  │
│ writeFileSync(                                                   │
│   "src/routes/cases/+page.svelte",                               │
│   upgradedCode                                                   │
│ )                                                                │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ Dev server detects file change                                   │
│ → Rebuilds                                                       │
│ → Phase 72 captures any new errors                               │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ Endpoint returns to UI:                                          │
│ {                                                                │
│   ok: true,                                                      │
│   route: "/cases",                                               │
│   duration_ms: 2345,                                             │
│   stdout: "[phase82-codemod] Upgraded 3 files..."                │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│ UI shows: "✅ Upgrade complete"                                  │
│ Modal updates Phase 82 status:                                   │
│ • Status: COMPLETE                                               │
│ • Files upgraded: 3/3                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detective Board Modal Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎮 /CASES                                          [HEALTHY] [page] ✕ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────┬──────────────────────────────────┐ │
│ │ ROUTE DOSSIER            │ DIAGNOSTICS & TOOLS              │ │
│ │                          │                                  │ │
│ │ SUMMARY                  │ PHASE 72 · ERROR BRAIN           │ │
│ │ Client-side page for     │ ┌──────────────────────────────┐ │ │
│ │ managing legal cases     │ │ TS2304: Cannot find name 'X' │ │ │
│ │                          │ │ 2 hits · last seen 5 min ago │ │ │
│ │ METADATA                 │ │ [🧠 Ask Error Brain]         │ │ │
│ │ Category: Cases          │ └──────────────────────────────┘ │ │
│ │ Version: v1              │                                  │ │
│ │                          │ PHASE 82 · UPGRADE BRAIN         │ │
│ │ REQUIRED PACKAGES        │ ┌──────────────────────────────┐ │ │
│ │ [svelte] [sveltekit]     │ │ ✅ COMPLETE                  │ │ │
│ │ [postgres]               │ │ 3/3 files upgraded           │ │ │
│ │                          │ │ [🔄 Run Svelte 5 Codemod]    │ │ │
│ │ RELATED ROUTES           │ └──────────────────────────────┘ │ │
│ │ [/] [/cases/[id]]        │                                  │ │
│ │                          │                                  │ │
│ └──────────────────────────┴──────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [→ Visit Page] [📊 View AST Graph] [🏥 Route Health Check]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 72 + Phase 82 Integration Loop

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO: You have a TypeScript error in /cases                 │
└─────────────────────────────────────────────────────────────────┘

1. Dev server runs
   ↓
   Phase 72 captures: TS2304: Cannot find name 'X'
   ↓
   Stored in phase72_error table

2. You visit /all-routes
   ↓
   Route card shows: /cases [RED] 1 error

3. Click /cases card
   ↓
   Detective Board opens
   ↓
   Shows:
   • Phase 72: "TS2304 error, seen 1 time"
   • Phase 82: "Not started"

4. Click "Ask Error Brain"
   ↓
   Gemma analyzes error
   ↓
   Suggests: "This looks like old Svelte 3 syntax. Try upgrading to Svelte 5."

5. Click "Run Svelte 5 Codemod"
   ↓
   Phase 82 runs:
   • Finds legacy patterns in /cases
   • Calls LLM to transform
   • Writes upgraded files
   ↓
   Phase 82 status updates: "✅ COMPLETE"

6. Dev server rebuilds
   ↓
   Phase 72 captures new errors (if any)
   ↓
   Route card updates: /cases [GREEN] 0 errors

7. Loop continues until all routes are green ✅
```

---

## MCP Agent Loop

```
┌─────────────────────────────────────────────────────────────────┐
│ AGENT (Gemini/Claude) with MCP Tools                            │
└─────────────────────────────────────────────────────────────────┘

1. Call list_routes()
   ↓
   Get: ["/", "/cases", "/analysis-center", "/evidence-board", ...]

2. For each route:
   ↓
   a. Call open_route(route)
      ↓
      Visit in Playwright
      ↓
      Capture console logs, screenshot
      ↓
      Check for errors

   b. If console has errors:
      ↓
      Call route_errors(route)
      ↓
      Get Phase 72 data
      ↓
      Analyze error type

   c. If error looks like Svelte 3/4 syntax:
      ↓
      Call svelte5_upgrade(route)
      ↓
      Phase 82 runs codemod
      ↓
      Wait for completion

   d. Call open_route(route) again
      ↓
      Check if error is fixed

   e. If still broken:
      ↓
      Try different approach
      ↓
      Or ask for manual fix

3. Report: "All routes green ✅"
   ↓
   Or: "X routes need manual fixes"
```

---

## File Transformation Example

```
BEFORE (Svelte 3/4):
┌─────────────────────────────────────────────────────────────────┐
│ <script>                                                        │
│   export let cases = [];                                        │
│   let selectedCase = null;                                      │
│                                                                 │
│   onMount(() => {                                               │
│     console.log('Component mounted');                           │
│   });                                                           │
│                                                                 │
│   $: filteredCases = cases.filter(c => c.status === 'open');   │
│ </script>                                                       │
│                                                                 │
│ <div>                                                           │
│   {#each filteredCases as case}                                 │
│     <div>{case.name}</div>                                      │
│   {/each}                                                       │
│ </div>                                                          │
└─────────────────────────────────────────────────────────────────┘

                    Phase 82 Codemod
                          ↓

AFTER (Svelte 5):
┌─────────────────────────────────────────────────────────────────┐
│ <script>                                                        │
│   let { cases = [] } = $props();                                │
│   let selectedCase = $state(null);                              │
│                                                                 │
│   $effect(() => {                                               │
│     console.log('Component mounted');                           │
│   });                                                           │
│                                                                 │
│   let filteredCases = $derived(                                 │
│     cases.filter(c => c.status === 'open')                      │
│   );                                                            │
│ </script>                                                       │
│                                                                 │
│ <div>                                                           │
│   {#each filteredCases as case}                                 │
│     <div>{case.name}</div>                                      │
│   {/each}                                                       │
│ </div>                                                          │
└─────────────────────────────────────────────────────────────────┘

KEY CHANGES:
• export let → $props()
• let → $state()
• onMount → $effect()
• $: → $derived()
```

---

## YoRHa Detective Board Aesthetic

```
┌─────────────────────────────────────────────────────────────────┐
│ DESIGN PRINCIPLES                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. AUSTIN KLEON LAYOUT                                          │
│    • High information density                                   │
│    • Not noisy                                                  │
│    • Clear hierarchy                                            │
│                                                                 │
│ 2. YORHA COMMAND CENTER                                         │
│    • Beige background (#f5f1e8)                                 │
│    • Crimson accents (#c41e3a)                                  │
│    • Terminal-like typography                                   │
│    • 3px borders, no border-radius                              │
│                                                                 │
│ 3. EVIDENCE WALL                                                │
│    • Pinned notes & relations                                   │
│    • "This route is a case file"                                │
│    • Related routes as index cards                              │
│                                                                 │
│ 4. RETRO GAME UI                                                │
│    • NES-style cards                                            │
│    • Pixel-perfect borders                                      │
│    • Neon green buttons for AI actions                          │
│    • Status badges (green/yellow/red)                           │
│                                                                 │
│ 5. DARK TERMINAL                                                │
│    • Right column slightly darker                               │
│    • Instrument panel feel                                      │
│    • Monospace font for code                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

COLOR PALETTE:
┌──────────────────────────────────────────────────────────────┐
│ Background:    #f5f1e8 (beige)                               │
│ Paper:         #faf8f3 (light beige)                          │
│ Dark:          #ede9de (darker beige)                         │
│ Ink:           #111 (near black)                              │
│ Crimson:       #c41e3a (accent)                               │
│ Green (OK):    #1e8f3c (healthy)                              │
│ Yellow (WARN): #f6b73c (warning)                              │
│ Neon Green:    #00ff00 (AI actions)                            │
└──────────────────────────────────────────────────────────────┘

TYPOGRAPHY:
┌──────────────────────────────────────────────────────────────┐
│ Headlines:     Uppercase, letter-spacing 1px                 │
│ Body:          Courier New, monospace                        │
│ Labels:        Small caps, letter-spacing 0.5px              │
│ Code:          Monospace, dark background                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration Checklist

```
✅ Phase 82 Codemod Script
   └─ scripts/phase82-svelte-runes-codemod.mjs
      ├─ Finds legacy patterns with ripgrep
      ├─ Calls LLM transformer for each file
      ├─ Writes upgraded code back
      └─ Supports --route filter

✅ Phase 82 Endpoints
   ├─ /api/phase82/svelte-upgrade (file-level)
   └─ /api/phase82/upgrade-route (route-level) ← NEW

✅ Route Inspector Modal
   └─ RouteInspectorDetectiveBoard.svelte
      ├─ 2-column layout (dossier + diagnostics)
      ├─ Phase 72 integration
      ├─ Phase 82 integration
      ├─ Action buttons
      └─ YoRHa aesthetic

⏳ /all-routes Integration
   └─ Update +page.svelte to use modal
      ├─ Import component
      ├─ Add state
      ├─ Add click handler
      └─ Render modal

📚 Documentation
   ├─ PHASE82_COMPREHENSIVE_SUMMARY.md
   ├─ ROUTE_INSPECTOR_DETECTIVE_BOARD_INTEGRATION.md
   ├─ PHASE82_PHASE72_INTEGRATION_CHECKLIST.md
   ├─ PHASE82_READY_TO_WIRE.md
   └─ PHASE82_VISUAL_ARCHITECTURE.md (this file)
```

---

**Status:** 80% built, 20% to wire
**Time to complete:** 30 minutes
**Next action:** Update `/all-routes/+page.svelte`
