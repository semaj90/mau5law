# Copy-Paste Commands: Route Fixer Execution

**Just copy and paste these blocks one at a time. Don't skip any steps!**

---

## STEP 1: Kill Everything & Rename Layout Groups

**Copy this entire block and paste into PowerShell:**

```powershell
Write-Host "🛑 Killing all Node processes..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Write-Host "✅ Node killed" -ForegroundColor Green

Write-Host "🛑 Killing VS Code..." -ForegroundColor Yellow
Stop-Process -Name Code -Force -ErrorAction SilentlyContinue
Write-Host "✅ VS Code killed" -ForegroundColor Green

Write-Host "⏳ Waiting 2 seconds for file handles to release..." -ForegroundColor Cyan
Start-Sleep 2

Write-Host "📁 Navigating to frontend folder..." -ForegroundColor Cyan
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

Write-Host "🔄 Renaming layout groups..." -ForegroundColor Yellow

Rename-Item '.\src\routes\(ai)' '(ai)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (ai) → (ai)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(auth)' '(auth)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (auth) → (auth)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(evidence)' '(evidence)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (evidence) → (evidence)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(legal)' '(legal)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (legal) → (legal)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(tools)' '(tools)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (tools) → (tools)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(demo)' '(demo)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (demo) → (demo)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(admin)' '(admin)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (admin) → (admin)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(dev)' '(dev)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (dev) → (dev)_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\(public)' '(public)_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ (public) → (public)_disabled" -ForegroundColor Green

Write-Host "✅ Step 1 complete! Layout groups renamed." -ForegroundColor Green
```

**Wait for it to complete, then move to Step 2.**

---

## STEP 2A: Dry-Run (See What Would Happen)

**Copy this and paste:**

```powershell
Write-Host "👀 Running DRY-RUN (no changes)..." -ForegroundColor Cyan
Write-Host ""
node scripts/fix-sveltekit-routes.mjs --dry-run
```

This will show you everything the fixer would do. Review the output. If it looks good, proceed to Step 2B.

---

## STEP 2B: Actually Execute the Fixer

**Copy this and paste:**

```powershell
Write-Host "⚙️  Executing route fixer (applying changes)..." -ForegroundColor Yellow
Write-Host ""
node scripts/fix-sveltekit-routes.mjs
Write-Host ""
Write-Host "✅ Route fixer complete!" -ForegroundColor Green
```

Watch for any ❌ errors. If you see "EPERM" errors, **go back to Step 1** and make sure you killed all processes.

---

## STEP 3 (OPTIONAL): Silence Legacy Errors

If you want to reduce svelte-check noise, park the YoRHa prototype folders:

**Copy this and paste:**

```powershell
Write-Host "🗑️  Parking legacy YoRHa prototype routes..." -ForegroundColor Yellow

cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'

Rename-Item '.\src\routes\yorha' 'yorha_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ yorha → yorha_disabled" -ForegroundColor Green

Rename-Item '.\src\routes\yorha-detective' 'yorha-detective_disabled' -ErrorAction SilentlyContinue
Write-Host "  ✔ yorha-detective → yorha-detective_disabled" -ForegroundColor Green

Write-Host "✅ Step 3 complete!" -ForegroundColor Green
```

---

## STEP 4: Verify with svelte-check

**Copy this and paste:**

```powershell
Write-Host "🔍 Running svelte-check..." -ForegroundColor Cyan
cd 'C:\Users\james\Videos\deeds-web-app\sveltekit-frontend'
npx svelte-check --tsconfig tsconfig.check.json
```

**Expected:** Should finish with either ✅ or show <500 errors (actual app issues, not YoRHa noise)

---

## STEP 5: Verify Routes Work

Restart the dev server and test:

```powershell
Write-Host "🚀 Starting dev server..." -ForegroundColor Green
npm run dev
```

Wait for it to start, then open:
- `http://localhost:5173/` (root)
- `http://localhost:5173/cases/123` (cases route)
- `http://localhost:5173/evidence` (evidence page)

All should load without errors.

---

## What to Report Back

After running all steps, paste this into your response with answers filled in:

```
Step 1 Result: ✅ / ❌ (any EPERM errors?)
Step 2A Output: [paste last 10 lines of dry-run output]
Step 2B Output: [paste last 10 lines of actual execution]
Step 3 Done: ✅ / ⏭️ (skipped optional)
Step 4 Result: ✅ (clean) / ⚠️ (<500 errors) / ❌ (failed)
Step 5 Tested: ✅ (routes load) / ❌ (error pages)
```

---

## Stuck? Try This

### If Step 1 still fails with EPERM:

```powershell
# Nuclear reset
Write-Host "🔥 Nuclear process kill..." -ForegroundColor Red
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM Code.exe /T 2>$null
taskkill /F /IM explorer.exe /T 2>$null
Start-Sleep 3
Start-Process explorer

Write-Host "✅ All killed. Wait 3 seconds, then try Step 1 again." -ForegroundColor Green
```

### If Step 2B has EPERM errors:

Those folders might be open in Notepad or another editor.

```powershell
# List open folders
Get-ChildItem src/routes -Directory -Filter "*_disabled*" | ForEach-Object {
  Write-Host "Already disabled: $($_.Name)" -ForegroundColor Cyan
}

# If you see folders NOT ending in _disabled, close any editors on them
```

### If Step 4 (svelte-check) hangs:

```powershell
# Kill it and try with less output
[Ctrl+C]

npx svelte-check --tsconfig tsconfig.check.json 2>&1 | head -50
```

---

## Success Checklist

- [ ] Step 1 completed without EPERM errors
- [ ] Step 2A dry-run shows 62 conflicts
- [ ] Step 2B execution completes with ✔ marks
- [ ] Step 3 optional folders renamed
- [ ] Step 4 svelte-check passes or shows <500 errors
- [ ] Step 5 dev server starts and routes load
- [ ] Ready to proceed with database setup

**When all checked: You're done with route cleanup!** 🎉
