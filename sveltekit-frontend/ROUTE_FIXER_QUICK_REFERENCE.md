# 🎯 SvelteKit Route Fixer – Quick Reference Card

## One-Command Conflict Resolver

**Problem:** Route groups like `(app)`, `(yorha)` map to same URLs → conflicts
**Solution:** Automated script reads `llm.txt` rules, disables legacy routes, verifies with svelte-check

---

## The Three-Part System

### 1. **llm.txt** (Rules File)
```
CANONICAL_GROUP=(app)        # Wins conflicts
DISABLE_GROUP=(yorha)         # Loses conflicts
CANONICAL_PARAM=[id]          # Canonical param
DISABLE_PARAM=[caseId]        # Legacy param (treated as equivalent to [id])
```
📍 Location: `sveltekit-frontend/llm.txt`

### 2. **fix-sveltekit-routes.mjs** (Fixer Script)
```bash
node scripts/fix-sveltekit-routes.mjs
```
Scans routes → Detects conflicts → Disables legacy dirs → Runs svelte-check

📍 Location: `sveltekit-frontend/scripts/fix-sveltekit-routes.mjs`

### 3. **VS Code Task** (One-Click Execution)
```
Ctrl+Shift+P → "Fix SvelteKit route conflicts"
```
📍 Configured in: `.vscode/tasks.json`

---

## How It Works (30-Second Version)

```
1. You have:  src/routes/(app)/evidence/+page.svelte
              src/routes/(yorha)/evidence/+page.svelte
              Both map to /evidence ❌

2. Run fixer with llm.txt saying "disable (yorha)"

3. Script renames: src/routes/(yorha)_disabled/evidence

4. Now only (app) version exists ✅ SvelteKit happy!
```

---

## Common Commands

| Goal | Command |
|------|---------|
| Scan for conflicts (no changes) | `node scripts/fix-sveltekit-routes.mjs` |
| Actually disable legacy routes | `node scripts/fix-sveltekit-routes.mjs` |
| Verify routes still work | `npm run dev` |
| Undo all changes | `git checkout src/routes` |
| Edit rules | `nano llm.txt` or VS Code |
| Add new disable rule | Add `DISABLE_GROUP=(my-group)` to llm.txt |

---

## What Gets Disabled?

Routes that:
1. Are in a `DISABLE_GROUP` from llm.txt, OR
2. Use a `DISABLE_PARAM` from llm.txt, AND
3. Conflict with a canonical route

Disabled routes are **renamed** (not deleted):
- `src/routes/(yorha)/evidence` → `src/routes/(yorha)_disabled/evidence`
- Fully reversible with `git checkout src/routes`

---

## Test It

```bash
# 1. Check current state
node scripts/fix-sveltekit-routes.mjs
# Output shows conflicts found (if any)

# 2. If conflicts exist, script auto-disables them
# (Already happened if you ran step 1!)

# 3. Verify
npm run dev
# Visit http://localhost:5173

# 4. Test routes
# Click on /all-routes, verify pages load
```

---

## When to Use

✅ **New UI variant created** – Run fixer to disable old version
✅ **Param names changed** – Add old name to `DISABLE_PARAM`, run fixer
✅ **Route structure refactored** – Run fixer to catch migration conflicts
✅ **Unsure about conflicts** – Run fixer to get a report (non-destructive scan)

---

## Rules of Thumb

1. **Keep canonical simple** – `CANONICAL_GROUP=(app)` for main logic
2. **List all legacy variants** – Multiple `DISABLE_GROUP=` lines OK
3. **Normalize param names** – `CANONICAL_PARAM=[id]`, list aliases
4. **Update llm.txt when refactoring** – Add new rules before running fixer
5. **Always run svelte-check** – Fixer does this automatically

---

## File Locations

```
sveltekit-frontend/
├── llm.txt                              ← Rules file
├── scripts/
│   └── fix-sveltekit-routes.mjs         ← Fixer script
├── .vscode/
│   └── tasks.json                       ← VS Code task (integrated)
└── src/routes/
    ├── (app)/                           ← Canonical
    │   └── ...
    ├── (yorha)_disabled/                ← Legacy (disabled)
    │   └── ...
    └── ...
```

---

## Integration with Phase 78

**Error Brain Modal** (`/all-routes` page):
- Scans healthy + broken routes
- Shows 🧠 button for error diagnostics
- Route fixer ensures no conflicts in modal data

**Phase 90 Integration:**
- Experimental routes → Mark as `DISABLE_GROUP`
- Old patterns → Auto-disabled by fixer
- Clean migration path to new architecture

---

## Troubleshooting

### Routes still conflicting?
1. Check `llm.txt` is saved in project root
2. Verify rule syntax: `CANONICAL_GROUP=(app)` (no spaces)
3. Re-run: `node scripts/fix-sveltekit-routes.mjs`
4. Check svelte-check output for details

### Want to re-enable a route?
```bash
# 1. Rename back
mv src/routes/(yorha)_disabled src/routes/(yorha)

# 2. If that causes conflicts, update llm.txt to NOT disable it
# Remove: DISABLE_GROUP=(yorha)

# 3. Re-run fixer
node scripts/fix-sveltekit-routes.mjs
```

### Fixer not working on Windows?
- Uses Node.js native APIs (fs.renameSync, path) – cross-platform
- If issues, try: `node --version` (should be 18+)

---

## Next Steps

1. **Understand your routes** – `node scripts/fix-sveltekit-routes.mjs` (view-only)
2. **Customize rules** – Edit `llm.txt` if needed
3. **Apply fixes** – Re-run fixer if changes made
4. **Verify** – `npm run dev` → check `/all-routes`
5. **Integrate** – Add to your CI/CD pipeline

---

## Key Insight

**The fixer is rule-driven, not hardcoded.**

```
❌ Old way:  Manually rename /routes/(yorha) every sprint
✅ New way:  Update llm.txt once, fixer handles it forever
```

Add new disabled groups anytime – just update `llm.txt`! 🎯

---

**Version:** 1.0 | **Date:** Dec 7, 2025 | **Status:** Production Ready ✅
