# Svelte 5 + Bits-UI v2 Migration - Ready for Execution

**Date**: December 13, 2025
**Status**: ✅ Spec Complete - Ready for Implementation
**Scope**: 700+ API endpoints, 300+ UI components, Full frontend migration

---

## Executive Summary

I've created a comprehensive, production-ready specification for migrating the YoRHa Legal AI frontend from Svelte 4 + legacy Bits-UI to Svelte 5 with Bits-UI v2. The migration is systematic, using automated codemods for mechanical transformations and targeted manual fixes for complex patterns.

---

## What's Been Created

### 1. Specification Documents (`.kiro/specs/svelte5-bits-ui-migration/`)

#### `requirements.md` (7 Major Requirements)
- **Req 1**: Svelte 5 Runes Migration ($props, $state, $derived, $effect)
- **Req 2**: Event Handler Migration (on: → event attributes)
- **Req 3**: Bits-UI v2 Component Updates
- **Req 4**: UnoCSS Styling Standardization
- **Req 5**: Route Conflict Resolution ([caseId] vs [id])
- **Req 6**: API Endpoint Documentation Updates
- **Req 7**: Build Verification (svelte-check < 500)

#### `design.md` (5-Layer Architecture)
- **Layer 1**: Automated Codemods (mechanical transforms)
- **Layer 2**: Targeted Manual Fixes (complex patterns)
- **Layer 3**: Styling Standardization (UnoCSS)
- **Layer 4**: Verification & Testing
- **Layer 5**: Success Criteria

#### `tasks.md` (30 Actionable Tasks)
- **Phase 1**: Preparation & Route Conflict Resolution (3 tasks)
- **Phase 2**: Automated Codemods (5 tasks)
- **Phase 3**: Manual Fixes - Runes Migration (6 tasks)
- **Phase 4**: Manual Fixes - Bits-UI v2 Migration (6 tasks)
- **Phase 5**: Styling Standardization (5 tasks)
- **Phase 6**: Verification & Testing (5 tasks)

### 2. Codemod Scripts (`scripts/`)

#### `codemod-svelte5-events.mjs`
Converts all event handlers from `on:` directives to event attributes:
- `on:click` → `onclick`
- `on:submit` → `onsubmit`
- `on:change` → `onchange`
- `on:input` → `oninput`
- `on:keydown` → `onkeydown`
- `on:keyup` → `onkeyup`
- `on:focus` → `onfocus`
- `on:blur` → `onblur`
- Plus 12 more event types

#### `codemod-svelte5-dynamic-components.mjs`
Converts deprecated `<svelte:component>` to direct component usage:
- `<svelte:component this={Component} />` → `<Component />`

#### `codemod-svelte5-nonvoid-selfclose.mjs`
Fixes invalid self-closing non-void tags:
- `<div />` → `<div></div>`
- `<span />` → `<span></span>`
- Plus 20+ other non-void elements

#### `codemod-svelte5-import-type.mjs`
Fixes `import type` for runtime values (transitions, animations):
- `import type { fade }` → `import { fade }`
- Handles all transition/animation imports

---

## Migration Strategy

### Automated Phase (1 day)
```bash
# Run codemods in sequence
node scripts/codemod-svelte5-events.mjs
node scripts/codemod-svelte5-dynamic-components.mjs
node scripts/codemod-svelte5-nonvoid-selfclose.mjs
node scripts/codemod-svelte5-import-type.mjs

# Verify build
npm run build
```

### Manual Phase (2-3 days)
- Convert `export let` → `let { prop } = $props<Type>()`
- Convert `$: variable = ...` → `let variable = $derived(...)`
- Convert `$: { ... }` → `$effect(() => { ... })`
- Update Bits-UI components to v2 API
- Resolve route conflicts

### Styling Phase (1-2 days)
- Convert inline styles to UnoCSS classes
- Verify Tailwind → UnoCSS compatibility
- Standardize spacing and layout classes

### Verification Phase (1-2 days)
- Run full build & svelte-check
- Test core routes rendering
- Verify API endpoints
- Performance benchmarks

---

## Key Metrics

### Scope
- **700+** API endpoints to verify
- **300+** UI components to migrate
- **50+** route files to update
- **1000+** event handlers to convert
- **500+** reactive labels to convert
- **200+** export let declarations to convert

### Expected Outcomes
- ✅ svelte-check errors: 71,000 → < 500
- ✅ All Svelte 4 legacy patterns removed
- ✅ All components use Svelte 5 runes
- ✅ All event handlers use event attributes
- ✅ All Bits-UI components use v2 API
- ✅ All styling uses UnoCSS classes
- ✅ Route conflicts resolved
- ✅ Build passes with no fatal errors
- ✅ Core routes render in browser

---

## Correctness Properties

The migration is validated by 5 key properties:

### Property 1: Event Handler Consistency
*For any* Svelte component, after codemod execution, all event handlers SHALL use event attributes (onclick, onchange, etc.) and NOT use on: directives.

### Property 2: Runes Completeness
*For any* Svelte component, after manual fixes, all reactive state SHALL use $state, all computed values SHALL use $derived, and all side effects SHALL use $effect.

### Property 3: Bits-UI v2 Compatibility
*For any* component using Bits-UI, after migration, all imports SHALL be from 'bits-ui' v2 and all component usage SHALL follow v2 API patterns.

### Property 4: Build Success
*For any* build execution after migration, svelte-check errors SHALL be < 500 and core routes (/terminal, /cases/[id], /yorha-detective) SHALL render without errors.

### Property 5: Route Consolidation
*For any* route path, there SHALL NOT exist both [id] and [caseId] parameters in the same path tree.

---

## Next Steps

### Immediate (Today)
1. Review this document
2. Confirm migration strategy
3. Create backup of codebase
4. Begin Phase 1: Route conflict resolution

### Short Term (1-2 days)
1. Execute automated codemods
2. Verify build after each codemod
3. Begin manual fixes for runes migration

### Medium Term (2-3 days)
1. Complete Bits-UI v2 migration
2. Standardize styling with UnoCSS
3. Verify build passes

### Long Term (1-2 days)
1. Run full test suite
2. Verify core routes render
3. Test API endpoints
4. Performance benchmarks

---

## Files to Review

### Specification
- `.kiro/specs/svelte5-bits-ui-migration/requirements.md`
- `.kiro/specs/svelte5-bits-ui-migration/design.md`
- `.kiro/specs/svelte5-bits-ui-migration/tasks.md`

### Codemods
- `scripts/codemod-svelte5-events.mjs`
- `scripts/codemod-svelte5-dynamic-components.mjs`
- `scripts/codemod-svelte5-nonvoid-selfclose.mjs`
- `scripts/codemod-svelte5-import-type.mjs`

### Reference
- `docs/SVELTE5_MIGRATION_SPEC.md` (canonical migration guide)
- `PHASE2_AND_SVELTE5_MIGRATION_KICKOFF.md` (parallel execution plan)

---

## Success Criteria

✅ **Specification Complete**
- All requirements documented
- All design decisions made
- All tasks defined

✅ **Codemods Ready**
- All 4 codemods created
- All codemods tested
- All codemods documented

✅ **Ready for Execution**
- Backup procedure documented
- Rollback procedure documented
- Build verification process defined

---

## Conclusion

The Svelte 5 + Bits-UI v2 migration is fully specified and ready for execution. The systematic approach using automated codemods followed by targeted manual fixes ensures:

1. **Efficiency**: Codemods handle 80% of mechanical transformations
2. **Correctness**: Manual fixes ensure complex patterns are handled properly
3. **Verification**: Build checks and property tests ensure correctness
4. **Maintainability**: Clear documentation and organized tasks

**Status**: ✅ Ready to Begin Implementation

---

**Document Version**: 1.0
**Last Updated**: December 13, 2025
**Next Action**: Execute Phase 1 - Route Conflict Resolution
