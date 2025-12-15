# Person of Interest - Frontend Integration Guide

**Date**: December 14, 2025
**Status**: Ready for Frontend Integration

---

## Overview

This guide provides step-by-step instructions for integrating the POI frontend components with the backend API and Command Center.

---

## Step 1: Verify Frontend Structure

### 1.1 Check Directory Structure

```bash
# Verify all POI files exist
ls -la sveltekit-frontend/src/lib/types/poi.ts
ls -la sveltekit-frontend/src/lib/services/poi.ts
ls -la sveltekit-frontend/src/lib/components/poi/
ls -la sveltekit-frontend/src/routes/\(app\)/persons-of-interest/
```

### 1.2 Verify File Locations

```
sveltekit-frontend/src/
├── lib/
│   ├── types/
│   │   └── poi.ts ✓
│   ├── services/
│   │   └── poi.ts ✓
│   └── components/
│       └── poi/
│           ├── POIForm.svelte ✓
│           ├── POIStats.svelte ✓
│           └── POIQuickActions.svelte ✓
└── routes/
    └── (app)/
        └── persons-of-interest/
            ├── +page.svelte ✓
            ├── +page.server.ts ✓
            ├── create/
            │   ├── +page.svelte ✓
            │   └── +page.server.ts ✓
            └── [id]/
                ├── +page.svelte ✓
                └── +page.server.ts ✓
```

---

## Step 2: Update API Base URL

### 2.1 Configure API Endpoint

**File**: `sveltekit-frontend/src/lib/services/poi.ts`

Update API_BASE if needed:

```typescript
// Current configuration
const API_BASE = '/api/persons-of-interest';

// If backend is on different host:
const API_BASE = process.env.PUBLIC_API_URL + '/api/persons-of-interest';
```

### 2.2 Update Environment Variables

**File**: `.env.local`

```bash
PUBLIC_API_URL=http://localhost:8000
```

---

## Step 3: Update Page Load Functions

### 3.1 Update List Page Load

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Get case ID from query params or session
  const caseId = url.searchParams.get('caseId') || locals.caseId;

  if (!caseId) {
    throw new Error('Case ID is required');
  }

  return {
    caseId
  };
};
```

### 3.2 Update Detail Page Load

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/[id]/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    poiId: params.id
  };
};
```

### 3.3 Update Create Page Load

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/create/+page.server.ts`

Already configured with SuperForms validation.

---

## Step 4: Update Component Props

### 4.1 Update List Page

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { poiService } from '$lib/services/poi';
  import type { PersonOfInterest } from '$lib/types/poi';

  // Props - data from +page.server.ts
  let { data } = $props();

  // State
  let pois = $state<PersonOfInterest[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    await loadPOIs();
  });

  async function loadPOIs() {
    loading = true;
    error = null;
    try {
      const response = await poiService.listPOIs(data.caseId);
      pois = response.pois;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load POIs';
    } finally {
      loading = false;
    }
  }
</script>
```

### 4.2 Update Detail Page

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/[id]/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { poiService } from '$lib/services/poi';
  import type { PersonOfInterest, KnownAssociate } from '$lib/types/poi';

  // Props - data from +page.server.ts
  let { params } = $props();

  // State
  let poi = $state<PersonOfInterest | null>(null);
  let associates = $state<KnownAssociate[]>([]);
  let loading = $state(true);

  onMount(async () => {
    await loadPOI();
  });

  async function loadPOI() {
    loading = true;
    try {
      poi = await poiService.getPOI(params.id);
      associates = await poiService.listAssociates(params.id);
    } catch (err) {
      // Handle error
    } finally {
      loading = false;
    }
  }
</script>
```

---

## Step 5: Integrate with Command Center

### 5.1 Update Command Center Page

**File**: `sveltekit-frontend/src/routes/(app)/command-center/+page.svelte`

Add POI components:

```svelte
<script lang="ts">
  import POIStats from '$lib/components/poi/POIStats.svelte';
  import POIQuickActions from '$lib/components/poi/POIQuickActions.svelte';

  let { data } = $props();
</script>

<!-- In the dashboard section -->
<div class="dashboard-section">
  <h2>Persons of Interest</h2>
  <POIStats caseId={data.caseId} />
  <POIQuickActions caseId={data.caseId} />
</div>
```

### 5.2 Add POI Navigation

**File**: `sveltekit-frontend/src/routes/(app)/+layout.svelte`

Add POI link to sidebar:

```svelte
<nav class="sidebar">
  <!-- Existing navigation items -->

  <a href="/persons-of-interest" class="nav-item">
    <Users size={20} />
    <span>Persons of Interest</span>
  </a>
</nav>
```

---

## Step 6: Update Form Handling

### 6.1 Update Create Page Form

**File**: `sveltekit-frontend/src/routes/(app)/persons-of-interest/create/+page.svelte`

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import POIForm from '$lib/components/poi/POIForm.svelte';
  import { poiService } from '$lib/services/poi';
  import type { POICreateRequest } from '$lib/types/poi';

  let { data } = $props();

  let error = $state<string | null>(null);
  let success = $state(false);

  async function handleSubmit(formData: POICreateRequest) {
    error = null;
    try {
      const poi = await poiService.createPOI({
        ...formData,
        caseId: data.caseId
      });
      success = true;
      setTimeout(() => {
        goto(`/persons-of-interest/${poi.id}`);
      }, 1000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create POI';
    }
  }
</script>

<POIForm onSubmit={handleSubmit} />
```

---

## Step 7: Testing Frontend Integration

### 7.1 Start Development Server

```bash
cd sveltekit-frontend
npm run dev
```

### 7.2 Test POI List Page

```
Navigate to: http://localhost:5173/persons-of-interest?caseId=<case-id>
Expected: List of POIs (empty if no data)
```

### 7.3 Test POI Create Page

```
Navigate to: http://localhost:5173/persons-of-interest/create
Expected: Form with all fields
Fill form and submit
Expected: Redirect to detail page
```

### 7.4 Test POI Detail Page

```
Navigate to: http://localhost:5173/persons-of-interest/<poi-id>
Expected: Full POI profile with tabs
```

### 7.5 Test Command Center Integration

```
Navigate to: http://localhost:5173/command-center
Expected: POI stats and quick actions visible
```

---

## Step 8: Error Handling

### 8.1 Handle API Errors

Update `sveltekit-frontend/src/lib/services/poi.ts`:

```typescript
export const poiService = {
  async listPOIs(...) {
    try {
      const response = await fetch(`${API_BASE}?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to list POIs');
      }
      return response.json();
    } catch (err) {
      console.error('POI Service Error:', err);
      throw err;
    }
  }
  // ... other methods
};
```

### 8.2 Handle Network Errors

```typescript
async function loadPOIs() {
  loading = true;
  error = null;
  try {
    const response = await poiService.listPOIs(data.caseId);
    pois = response.pois;
  } catch (err) {
    if (err instanceof TypeError) {
      error = 'Network error - backend may be unavailable';
    } else {
      error = err instanceof Error ? err.message : 'Failed to load POIs';
    }
  } finally {
    loading = false;
  }
}
```

---

## Step 9: Styling Verification

### 9.1 Verify YoRHa Theme

Check that all components use:
- Dark background: `#0f0f23`
- Crimson accents: `#dc2626`
- Proper spacing and typography

### 9.2 Test Responsive Design

```bash
# Test on different screen sizes
# Mobile: 375px
# Tablet: 768px
# Desktop: 1024px+
```

---

## Step 10: Performance Optimization

### 10.1 Add Loading States

```svelte
{#if loading}
  <div class="loading">Loading POIs...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  <!-- Content -->
{/if}
```

### 10.2 Add Pagination

```typescript
let limit = $state(50);
let offset = $state(0);

async function loadPOIs() {
  const response = await poiService.listPOIs(data.caseId, limit, offset);
  pois = response.pois;
  total = response.total;
}
```

### 10.3 Add Caching

```typescript
const poiCache = new Map<string, PersonOfInterest>();

async function getPOI(poiId: string) {
  if (poiCache.has(poiId)) {
    return poiCache.get(poiId);
  }
  const poi = await poiService.getPOI(poiId);
  poiCache.set(poiId, poi);
  return poi;
}
```

---

## Step 11: Deployment Checklist

- [ ] All POI files created
- [ ] API base URL configured
- [ ] Page load functions updated
- [ ] Component props updated
- [ ] Command Center integration complete
- [ ] Form handling implemented
- [ ] Error handling in place
- [ ] YoRHa theme verified
- [ ] Responsive design tested
- [ ] Performance optimized
- [ ] All pages tested locally

---

## Troubleshooting

### Issue: "Cannot find module '$lib/services/poi'"

**Solution**: Verify file exists at correct path
```bash
ls -la sveltekit-frontend/src/lib/services/poi.ts
```

### Issue: "API returns 404"

**Solution**: Check backend is running and routes are registered
```bash
curl http://localhost:8000/api/persons-of-interest
```

### Issue: "Form submission fails"

**Solution**: Check form action in +page.server.ts
```bash
# Verify backend endpoint is correct
# Check environment variables
# Check network tab in browser dev tools
```

### Issue: "Styling looks wrong"

**Solution**: Verify CSS is loaded
```bash
# Check browser dev tools
# Verify no CSS conflicts
# Check YoRHa theme colors
```

---

## Next Steps

1. Verify all files are in place
2. Start development server
3. Test all pages and components
4. Verify Command Center integration
5. Test error handling
6. Optimize performance
7. Proceed to testing phase

---

## References

- SvelteKit: https://kit.svelte.dev/
- Svelte 5: https://svelte.dev/
- SuperForms: https://superforms.rocks/
- Bits UI: https://bits-ui.com/
