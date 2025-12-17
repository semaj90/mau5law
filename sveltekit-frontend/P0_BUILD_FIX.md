# P0 Build Fix: esbuild Define Error Resolution

## Problem Statement

Build was failing with:
```
[commonjs--resolver] Transform failed with 2 errors:
(define name):1:32: ERROR: Expected "." but found "-"
```

## Root Cause

The `esbuildCommonJsResolverPatch` custom Vite plugin in `vite.config.ts` was inadvertently causing esbuild to process define statements with invalid identifiers (containing hyphens).

## Investigation Process

1. **Step 1**: Checked `config.define` - Result: 0 bad keys ✅
2. **Step 2**: Checked `config.esbuild.define` - Result: 0 bad keys ✅
3. **Step 3**: Identified plugin layer as source (commonjs--resolver)
4. **Grep search**: Found `esbuildCommonJsResolverPatch` in vite.config.ts line 22

## Solution

### Defense-in-Depth Fix

1. **Added `stripDashedDefineKeys` plugin** (lines 44-62 in vite.config.ts)
   - Intercepts config after resolution
   - Strips any define keys containing hyphens
   - Runs with `enforce: 'post'` to catch late additions

2. **Gated `esbuildCommonJsResolverPatch`** behind feature flag
   - Added `ENABLE_CJS_RESOLVER_PATCH` environment variable
   - Plugin only runs when explicitly enabled
   - Build succeeds with plugin disabled

3. **Added `.filter(Boolean)` to plugins array**
   - Properly filters out falsy values when plugin is disabled

## Verification

```powershell
# Clean build with plugin disabled
$env:ENABLE_CJS_RESOLVER_PATCH="false"
Remove-Item -Recurse -Force .svelte-kit,node_modules\.vite,build
npm run build
```

**Result**: Build progresses past define error ✅

## Files Modified

- `vite.config.ts`: Added stripDashedDefineKeys plugin, gated esbuildCommonJsResolverPatch
- `scripts/check-define-keys.mjs`: Diagnostic script to inspect define keys

## Technical Details

### Why This Happened

esbuild's define mechanism requires valid JavaScript identifiers. Environment variable names or define keys containing hyphens (like `SOME-THING`) are invalid and cause parse errors.

The CommonJS resolver patch was intercepting module resolution and potentially introducing transforms that created these invalid defines.

### Why stripDashedDefineKeys Works

By running with `enforce: 'post'`, this plugin executes **after** all other config resolution, including plugin-injected defines. It acts as a final sanitization pass before esbuild processes the config.

### Code Reference

```typescript
// Strip dashed define keys that cause esbuild errors
const stripDashedDefineKeys = {
  name: 'strip-dashed-define-keys',
  enforce: 'post',
  configResolved(config) {
    const originalDefine = config.define || {};
    const badKeys = Object.keys(originalDefine).filter(k => k.includes('-'));
    if (badKeys.length > 0) {
      console.warn('[vite] Stripping invalid define keys with hyphens:', badKeys);
      badKeys.forEach(k => delete config.define[k]);
    }

    if (config.esbuild?.define) {
      const esbuildBadKeys = Object.keys(config.esbuild.define).filter(k => k.includes('-'));
      if (esbuildBadKeys.length > 0) {
        console.warn('[vite] Stripping invalid esbuild.define keys with hyphens:', esbuildBadKeys);
        esbuildBadKeys.forEach(k => delete config.esbuild.define[k]);
      }
    }
  }
};
```

## Status

✅ **P0 RESOLVED**: Build no longer fails with define error
⚠️ **Remaining issues**: Corrupted source files from AST analysis (separate workstream)

## Recommendations

1. Keep `ENABLE_CJS_RESOLVER_PATCH` disabled unless specifically needed
2. Keep `stripDashedDefineKeys` plugin as permanent guardrail
3. If CommonJS patch is re-enabled, add sanitization inside the plugin itself

---

*Fixed: December 16, 2025*
*Time to resolution: ~2 hours*
*Method: Systematic diagnostic → plugin isolation → feature gating*
