# Error-Brain Incident Response

**Purpose:** What to do when syntax corruption or unexpected errors appear

---

## 🚨 Incident: Syntax Corruption Detected

### Symptoms

- TypeScript parser fails with "Unexpected token" errors
- `npm run check` hangs or crashes
- Colon/comma drift patterns (e.g., `name, type:` instead of `name: type,`)
- Import type misuse (`import type { goto }` for runtime values)

### Immediate Actions

#### 1. Stop All Auto-Fixers

```bash
# Kill any running analyzers/fixers
pkill -f "batch-merger-fixer"
pkill -f "fix-syntax-corruption"
```

#### 2. Create Backup

```bash
# Git stash uncommitted changes
git stash push -u -m "Pre-corruption-fix backup $(date +%Y-%m-%d_%H-%M-%S)"

# Or create manual backup
cp -r src src.backup-$(date +%Y-%m-%d_%H-%M-%S)
```

#### 3. Run Diagnostic

```bash
# Check current error state
npm run check:ultra-fast > reports/incident-$(date +%Y-%m-%d_%H-%M-%S).log 2>&1

# Count errors
grep -c "error TS" reports/incident-*.log
```

---

## 🔧 Recovery Steps

### Step 1: Syntax Corruption Fixer

```bash
# Dry-run first (preview changes)
node scripts/fix-syntax-corruption.mjs --dry-run

# Review report
cat reports/incident-*.md

# If safe, apply fixes
node scripts/fix-syntax-corruption.mjs

# Verify
npm run check:ultra-fast
```

### Step 2: Import Type Fixes

```bash
# Analyze import issues
node scripts/batch-merger-fixer-v2.mjs --analyze

# Check report
cat reports/batch-analysis-*.json | jq '.files[] | select(.patterns[] | .type == "import-type")'

# Apply fixes
node scripts/batch-merger-fixer-v2.mjs --fix-import-types

# Verify
npm run check:ultra-fast
```

### Step 3: Async onMount Fixes

```bash
# Analyze async issues
node scripts/batch-merger-fixer-v2.mjs --analyze

# Apply fixes
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async

# Verify
npm run check:ultra-fast
```

### Step 4: Barrel Export Fixes (if needed)

```bash
# Check for barrel issues
node scripts/batch-merger-fixer-v2.mjs --analyze | grep -i barrel

# Apply fixes
node scripts/batch-merger-fixer-v2.mjs --fix-barrels

# Verify
npm run check:ultra-fast
```

---

## 📊 Post-Recovery Verification

```bash
# Full check suite
npm run check:ultra-fast && echo "✅ PASS" || echo "❌ FAIL"

# Generate comparison report
node scripts/check-and-summarize.mjs

# Review top error files
cat reports/current-error-breakdown.txt | head -20
```

---

## 🔍 Root Cause Analysis

### Common Causes

1. **Mass Codemod Run**
   - **Prevention:** Always use `--dry-run` first
   - **Fix:** Revert via `git stash pop` or restore backup

2. **Backup Files in Compilation**
   - **Symptom:** 16k+ errors from `.bak` files
   - **Fix:** Update `tsconfig.json` excludes:
     ```json
     {
       "exclude": [
         "**/*.bak",
         "**/*.backup",
         "**/*.any-backup",
         "**/*.ast-backup"
       ]
     }
     ```

3. **Regex Fixer False Positives**
   - **Symptom:** Over-eager pattern matching
   - **Fix:** Add guard clauses to transform logic

4. **Concurrent Fixer Runs**
   - **Symptom:** File corruption from race conditions
   - **Fix:** Use `BATCH_REPORT_STAMP` for deterministic naming

---

## 🛡️ Prevention

### 1. Always Use Feature Flags

```bash
# .env (development)
ERROR_BRAIN_ENABLED=true
ERROR_BRAIN_DRY_RUN=true
ERROR_BRAIN_APPLY_MODE=off
```

### 2. Always Test in Dry-Run

```bash
# Preview changes first
node scripts/fix-syntax-corruption.mjs --dry-run
node scripts/batch-merger-fixer-v2.mjs --analyze

# Review reports before applying
```

### 3. Use Safety Caps

```bash
# Limit patch size
ERROR_BRAIN_MAX_PATCH_SIZE=50

# Require high confidence
ERROR_BRAIN_CONFIDENCE_MIN=0.8
```

### 4. Enable Backups

```bash
# Applier automatically creates .backup-<timestamp> files
# Verify in scripts/diff/applier.mjs:
config.backupOriginal = true
```

---

## 📝 Incident Log Template

```markdown
## Incident: [Date] - [Brief Description]

### Timeline

- **14:30** - Errors first detected (npm run check failed)
- **14:35** - Backup created via git stash
- **14:40** - Ran fix-syntax-corruption.mjs (278 files fixed)
- **14:45** - Verification passed (0 errors)

### Root Cause

[Description of what caused the corruption]

### Actions Taken

1. Stopped all auto-fixers
2. Created backup: `git stash push -m "backup-2025-12-15_14-30"`
3. Ran syntax corruption fixer: 278 files, 315 transformations
4. Verified: TypeScript check passed (0 errors)

### Prevention

- [What was changed to prevent recurrence]
- [New guard added to fixer scripts]

### Files Affected

- Total: 278 files
- Top patterns: Parameter corruption (250), Numeric colon strings (20), Object property corruption (8)

### Recovery Time

- Detection to fix: 15 minutes
- Total downtime: 0 (local development only)

### Status

✅ RESOLVED
```

---

## 🔄 Rollback Procedures

### Option 1: Git Stash Pop

```bash
# List stashes
git stash list

# Preview stash
git stash show -p stash@{0}

# Restore
git stash pop stash@{0}

# Verify
npm run check:ultra-fast
```

### Option 2: File Backup Restore

```bash
# List backups
ls -la src.backup-*

# Restore
rm -rf src
mv src.backup-2025-12-15_14-30 src

# Verify
npm run check:ultra-fast
```

### Option 3: Git Reset

```bash
# Reset to last working commit
git log --oneline -10
git reset --hard <commit-hash>

# Verify
npm run check:ultra-fast
```

---

## 📞 Escalation

If recovery fails after 3 attempts:

1. **Stop all work** - Do not apply more fixes
2. **Document state** - Save all reports and logs
3. **Revert to known good** - Use last working commit
4. **Review logs** - Check `reports/` directory
5. **Update incident log** - Document for future reference

---

## ✅ Recovery Checklist

- [ ] All auto-fixers stopped
- [ ] Backup created (git stash or manual)
- [ ] Diagnostic run completed
- [ ] Syntax corruption fixer run
- [ ] Import type fixes applied
- [ ] Async onMount fixes applied
- [ ] TypeScript check passes
- [ ] Svelte check passes
- [ ] Top error files reviewed
- [ ] Incident log updated
- [ ] Prevention measures documented

---

**Last Updated:** December 15, 2025
**Next Review:** After next major codemod run
