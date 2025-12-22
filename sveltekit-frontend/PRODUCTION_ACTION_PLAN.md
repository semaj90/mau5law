# 🚀 Production Action Plan - Step-by-Step Guide

**Target:** Zero compilation errors in 3 weeks
**Current State:** 46,059 errors + 792 warnings
**Strategy:** Automated fixes (70%) + AI-assisted (20%) + Manual (10%)

---

## 🎯 Phase 1: Immediate Actions (Next 24 Hours)

### Step 1: Generate AI Suggestions for All Error Clusters
**Impact:** Creates fix guidance for 72 error clusters

```bash
cd sveltekit-frontend

# Increase timeout for large batch
$env:SUGGESTION_TIMEOUT="300000"

# Generate suggestions with verbose logging
npx tsx scripts/phase78-generate-suggestions.mts --verbose

# Verify suggestions created
npm run check-patches
```

**Expected Output:**
- 72+ AI patch suggestions in database
- JSON patches for top error files
- Recommended fix strategies per cluster

---

### Step 2: Analyze SIMD Integration Errors (17.3% of TS errors)
**Impact:** 3,663 errors - biggest single file issue

```bash
# Open the problematic file
code src/lib/simd/simd-json-integration.ts

# Check if SIMD library is installed
npm list | Select-String "simd"

# Review TypeScript errors in this file
npm run check 2>&1 | Select-String "simd-json-integration"

# Count errors specifically in this file
(npm run check 2>&1 | Select-String "simd-json-integration").Count
```

**Diagnosis Checklist:**
- [ ] Is `simd-json` package installed?
- [ ] Are type definitions missing (`@types/simd-json`)?
- [ ] Are WebAssembly types imported correctly?
- [ ] Is the library compatible with ESM modules?

**Likely Fix Options:**

#### Option A: Install Missing Types
```bash
npm install --save-dev @types/simd-json
```

#### Option B: Replace with Native Implementation
```typescript
// Instead of SIMD JSON parsing:
// - Use native JSON.parse() for simplicity
// - Add manual type assertions
// - Keep SIMD for production optimization later
```

#### Option C: Add Type Declarations
```typescript
// Create: src/lib/simd/simd-json.d.ts
declare module 'simd-json' {
  export function parse<T = any>(input: string): T;
  export function stringify(value: any): string;
}
```

---

### Step 3: Fix SuperForms + Zod Integration Pattern
**Impact:** Fixes form validation across all routes

```bash
# Search for broken SuperForms patterns
Select-String -Path "src/routes*/**/*.ts" -Pattern "superValidate\((?!zod\()" -CaseSensitive

# Count occurrences
(Select-String -Path "src/routes*/**/*.ts" -Pattern "superValidate\((?!zod\()" -CaseSensitive).Count
```

**Find & Replace Pattern:**

#### Before (❌ Broken):
```typescript
import { superValidate } from 'sveltekit-superforms/server';
import type { uploadSchema } from '$lib/schemas/upload';

export const load = async () => {
  const form = await superValidate(uploadSchema); // ❌ Missing adapter
  return { form };
};
```

#### After (✅ Fixed):
```typescript
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { uploadSchema } from '$lib/schemas/upload'; // Not 'type'

export const load = async () => {
  const form = await superValidate(zod(uploadSchema)); // ✅ With adapter
  return { form };
};
```

**Automated Fix Script:**
```powershell
# Create fix-superforms.ps1
$files = Get-ChildItem -Path "src/routes*" -Recurse -Include "*.ts","*.svelte"

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw

  # Fix import
  $content = $content -replace "import { superValidate } from 'sveltekit-superforms/server'", "import { superValidate } from 'sveltekit-superforms'`nimport { zod } from 'sveltekit-superforms/adapters'"

  # Fix usage
  $content = $content -replace "superValidate\((\w+)\)", "superValidate(zod(`$1))"

  Set-Content $file.FullName -Value $content
}

Write-Host "SuperForms patterns fixed across all routes"
```

---

### Step 4: Fix Type Import vs Value Import Errors
**Impact:** ~5,000 errors from incorrect import syntax

```bash
# Find "import type" used incorrectly
Select-String -Path "src/**/*.ts" -Pattern "import type.*zod" | Select-String -Pattern "zod\(" -Context 0,3

# Find value imports that should be type imports
Select-String -Path "src/**/*.ts" -Pattern "import \{[^}]*\} from.*types" | Where-Object { $_.Line -notmatch "import type" }
```

**Fix Pattern:**

#### Error 1: Type Import Used as Value
```typescript
// ❌ BROKEN
import type { zod } from 'sveltekit-superforms/adapters';
const form = await superValidate(zod(schema)); // Runtime error!

// ✅ FIXED
import { zod } from 'sveltekit-superforms/adapters';
const form = await superValidate(zod(schema));
```

#### Error 2: Value Import Should Be Type
```typescript
// ❌ INEFFICIENT
import { PageServerLoad } from './$types';

// ✅ OPTIMIZED (if only used in type position)
import type { PageServerLoad } from './$types';
```

**Automated Detection:**
```bash
# Install ts-prune to find unused exports
npm install --save-dev ts-prune

# Find unused imports
npx ts-prune | Select-String "used in module"
```

---

## 📅 Phase 2: Week 1 Systematic Fixes

### Day 1-2: Batch Automated Fixes

#### Fix 1: Add Missing `.js` Extensions (ESM Compliance)
**Impact:** ~5,000 import errors

```bash
# Install fix tool
npm install --save-dev eslint-plugin-import

# Create .eslintrc.cjs with rule
@"
module.exports = {
  plugins: ['import'],
  rules: {
    'import/extensions': ['error', 'always', {
      ignorePackages: true,
      pattern: { js: 'always' }
    }]
  }
};
"@ | Out-File -FilePath ".eslintrc.cjs"

# Auto-fix all imports
npx eslint --fix "src/**/*.ts" --rule "import/extensions: [error, always]"
```

**Manual Pattern:**
```typescript
// ❌ BEFORE
import { db } from '$lib/server/db';
import { routes } from '$lib/data/routes';

// ✅ AFTER
import { db } from '$lib/server/db.js';
import { routes } from '$lib/data/routes.js';
```

---

#### Fix 2: Svelte 5 Runes Migration
**Impact:** ~10,000 component errors

```bash
# Official Svelte migration tool
npx sv migrate svelte-5

# Review changes before committing
git diff src/routes/**/*.svelte
```

**Common Patterns:**

##### Reactive Statements → $derived
```svelte
<!-- ❌ OLD: Svelte 4 -->
<script>
  export let count = 0;
  $: doubled = count * 2;
  $: console.log('count changed:', count);
</script>

<!-- ✅ NEW: Svelte 5 -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

##### Props → $props()
```svelte
<!-- ❌ OLD -->
<script>
  export let title;
  export let count = 0;
</script>

<!-- ✅ NEW -->
<script>
  let { title, count = 0 } = $props();
</script>
```

##### Stores → Auto-subscribe
```svelte
<!-- ❌ OLD -->
<script>
  import { page } from '$app/stores';
  $: currentPath = $page.url.pathname;
</script>

<!-- ✅ NEW -->
<script>
  import { page } from '$app/stores';
  let currentPath = $derived($page.url.pathname);
</script>
```

---

#### Fix 3: XState v5 Migration
**Impact:** 495 errors in RabbitMQ integration

```bash
# Check XState version
npm list xstate

# Update to v5 if needed
npm install xstate@latest

# Review migration guide
Start-Process "https://stately.ai/docs/migration"
```

**Breaking Changes:**

##### Machine Creation
```typescript
// ❌ OLD: XState v4
import { createMachine } from 'xstate';

const machine = createMachine({
  id: 'rabbitmq',
  initial: 'disconnected',
  states: { /* ... */ }
});

// ✅ NEW: XState v5
import { setup, createActor } from 'xstate';

const machine = setup({
  types: {} as {
    context: { connectionId: string };
    events: { type: 'CONNECT' } | { type: 'DISCONNECT' };
  }
}).createMachine({
  id: 'rabbitmq',
  initial: 'disconnected',
  states: { /* ... */ }
});

const actor = createActor(machine);
```

---

### Day 3-4: Library Integration Fixes

#### Fix: Drizzle ORM Type Regeneration
```bash
# Regenerate types from latest schema
npx drizzle-kit generate:pg

# Push schema changes to database
npx drizzle-kit push:pg

# Verify types are up-to-date
npm run db:check
```

#### Fix: GPU Service Type Definitions
```typescript
// Create: src/lib/services/gpu-types.d.ts
export interface GPUServiceConfig {
  endpoint: string;
  timeout: number;
  maxRetries: number;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}
```

---

### Day 5-7: Manual Expert Fixes

#### Critical Files Requiring Manual Review:

1. **`simd-json-integration.ts`** (3,663 errors)
   - Low-level WASM bindings
   - Performance-critical code
   - Requires domain expertise

2. **`rabbitmq-xstate-integration.ts`** (332 errors)
   - State machine complexity
   - Message routing logic
   - Connection management

3. **`mcp-context72-get-library-docs.ts`** (290 errors)
   - MCP tool integration
   - API contract mismatches
   - Tool definition types

4. **`ocr-client.ts`** (271 errors)
   - OCR service integration
   - Image processing types
   - External API bindings

5. **`vite-error-schema.ts`** (226 errors)
   - Error type definitions
   - Schema validation
   - Type guards

**Review Process:**
1. Open file in VS Code
2. Run `npm run check` to see specific errors
3. Use AI suggestion from Phase 78 system
4. Apply fixes incrementally
5. Test after each change
6. Commit working changes

---

## 📊 Phase 3: Week 2 - Type Safety Hardening

### Enable Strict TypeScript Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### API Type Generation

```bash
# Generate API types from database schema
npx drizzle-kit generate:types

# Create Zod schemas for validation
node scripts/generate-api-schemas.mjs

# Generate OpenAPI spec
npx swagger-jsdoc -d swaggerDef.js src/routes/api/**/*.ts
```

### Runtime Validation

```typescript
// Example: Validate API responses
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string()
});

export async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Runtime validation
  return UserSchema.parse(data);
}
```

---

## 🎯 Phase 4: Week 3 - Production Polish

### Final QA Checklist

```bash
# 1. Clean build
npm run clean
npm run build

# 2. Type checking
npm run check

# 3. Linting
npx eslint src --ext .ts,.js,.svelte

# 4. Tests
npm run test

# 5. Bundle analysis
npx vite-bundle-visualizer

# 6. Performance audit
npx lighthouse http://localhost:5173 --view
```

### Production Build Configuration

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['svelte', '@sveltejs/kit'],
          'ui': ['$lib/components/*'],
          'services': ['$lib/services/*']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['xstate', 'drizzle-orm', 'zod']
  }
});
```

---

## 📈 Progress Tracking

### Daily Error Count Monitoring

```bash
# Create tracking script: track-errors.ps1
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$output = "error-tracking-$timestamp.json"

# Run type check
$errors = npm run check 2>&1 | Select-String "error TS" | Measure-Object
$warnings = npm run check 2>&1 | Select-String "warning" | Measure-Object

# Save progress
@{
  timestamp = $timestamp
  errors = $errors.Count
  warnings = $warnings.Count
  target = 0
  percentComplete = [math]::Round((1 - $errors.Count / 46059) * 100, 2)
} | ConvertTo-Json | Out-File $output

Write-Host "Progress: $($percentComplete)% complete ($($errors.Count) errors remaining)"
```

### Weekly Review Meetings

**Agenda Template:**
1. Error reduction metrics
2. Blockers encountered
3. AI suggestion effectiveness
4. Manual fix complexity
5. Next week priorities

---

## 🚨 Emergency Rollback Plan

### If Automated Fixes Break Code

```bash
# Rollback to last working state
git reset --hard HEAD

# Create fix branch
git checkout -b fix/type-errors-$(Get-Date -Format "yyyy-MM-dd")

# Apply fixes incrementally with commits
git commit -m "fix: add ESM extensions to imports"
git commit -m "fix: migrate SuperForms to v2 adapter pattern"
git commit -m "fix: update XState to v5 syntax"
```

### Test After Each Major Change

```bash
# Run dev server
npm run dev

# Open test route
Start-Process "http://localhost:5173/all-routes"

# Verify no runtime errors
# Check browser console
# Test database queries
# Validate AI suggestions
```

---

## ✅ Success Criteria

### Week 1 Target
- [ ] Errors reduced to < 17,000 (63% reduction)
- [ ] SIMD integration fixed (3,663 errors gone)
- [ ] SuperForms pattern updated (2,000+ errors gone)
- [ ] ESM imports fixed (5,000+ errors gone)
- [ ] Svelte 5 migration 80% complete

### Week 2 Target
- [ ] Errors reduced to < 2,000 (95% reduction)
- [ ] All library integrations working
- [ ] API types fully validated
- [ ] Database queries type-safe
- [ ] Component props validated

### Week 3 Target
- [ ] **Zero compilation errors** ✅
- [ ] Zero warnings
- [ ] Production build successful
- [ ] All 121 routes functional
- [ ] Performance targets met (Lighthouse > 90)

---

## 🎉 Deployment Readiness

### Pre-Deployment Checklist

```bash
# 1. Final build verification
npm run build
# Expected: ✅ Build completed successfully

# 2. Production preview
npm run preview
# Test all routes: http://localhost:4173

# 3. Database migrations
npm run db:migrate:prod
# Verify schema matches production

# 4. Environment variables
# Copy .env.example to .env.production
# Fill in production values

# 5. Deployment
# Follow your hosting provider's deployment guide
# (Vercel, Netlify, custom server, etc.)
```

---

## 📞 Support Resources

### When Stuck
1. Check AI suggestions: `npm run check-patches`
2. Review migration guides in `/docs`
3. Search error code: `Select-String "TS2345" error-log.txt`
4. Ask AI for specific fix: `npx tsx scripts/phase78-generate-suggestions.mts --cluster-id <id>`

### Useful Commands Reference

```bash
# Error analysis
npm run check 2>&1 | Out-File errors.txt
Select-String "error TS" errors.txt | Group-Object | Sort-Object Count -Desc

# Top error files
npm run check 2>&1 | Select-String "error TS" | ForEach-Object { ($_ -split ':')[0] } | Group-Object | Sort-Object Count -Desc | Select-Object -First 20

# AI assistance
npx tsx scripts/phase78-generate-suggestions.mts --verbose

# Database stats
$env:PGPASSWORD="123456"; psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM error_cluster WHERE archived_at IS NULL;"

# Route health check
Start-Process "http://localhost:5173/all-routes"
```

---

**Last Updated:** December 21, 2025
**Next Review:** Daily error count tracking
**Estimated Completion:** January 11, 2026 (3 weeks)
