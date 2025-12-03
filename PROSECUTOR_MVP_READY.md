# SvelteKit Frontend - Complete Routes & Architecture Guide

## 🎯 Tech Stack

### Core Framework
- **SvelteKit** - Full-stack framework with file-based routing
- **Svelte 5** - Latest version with runes (`$state`, `$derived`, `$effect`)
- **TypeScript** - Type-safe development

### Styling & UI
- **UnoCSS** - Atomic CSS engine (primary styling solution)
- **Bits-UI v2** - Headless component library (Svelte 5 compatible)
- **NES.css** - Retro gaming UI framework (for specific demos)
- **SvelteKit Animations** - Native transitions and animations

### ⚠️ Deprecated Libraries (DO NOT USE)
- ❌ **shadcn-svelte** - Removed, use Bits-UI v2 instead
- ❌ **Melt-UI** - Removed, use Bits-UI v2 instead

### Backend Integration
- **Drizzle ORM** - Database queries
- **Lucia Auth** - Authentication
- **PostgreSQL** - Primary database with pgvector
- **Redis** - Caching layer
- **MinIO** - Object storage

---

## 📁 Route Organization

### Route Categories

#### 🎮 **Demos & Tests** (v1-v4)
Routes for testing, showcasing features, and development.

**Pattern Detection:** Routes containing `demo`, `test`, `showcase`, `-demo`, `-test`

##### **V1 - Basic Demos**
- `/demo/*` - General demo routes
- `/test/*` - Test pages
- `/simple-test` - Basic functionality tests
- `/ui-test` - UI component tests
- `/simple-upload-test` - File upload testing

##### **V2 - Feature Demos**
- `/agent-demo` - AI agent demonstrations
- `/mcp-demo` - Model Context Protocol demo
- `/rag-demo` - RAG (Retrieval Augmented Generation) demo
- `/rag-test` - RAG testing interface
- `/trt-llm-demo` - TensorRT LLM demo
- `/phase72-demo` - Phase 72 feature demo
- `/webgpu-test` - WebGPU testing

##### **V3 - Advanced Demos**
- `/evidence-canvas-demo` - Evidence canvas showcase
- `/gaming-evidence-board` - Gaming-style evidence UI
- `/gpu-evidence-graph` - GPU-accelerated graph demo
- `/nier-showcase` - NieR-themed UI showcase
- `/yorha/*` - YoRHa-themed interface demos

##### **V4 - Integration Demos**
- `/authenticated-crud-test` - Auth + CRUD testing
- `/cuda-streaming` - CUDA streaming demo
- `/test-route-discovery` - Route discovery system test
- `/all-routes` - Route explorer (NES.css styled)
- `/command/routes` - Command center route viewer
- `/system-status` - System verification demo
- `/nes-dialog-demo` - NES.css dialog patterns

---

#### 🏠 **Core Application Routes**

##### **Authentication**
- `/login` - User login
- `/logout` - User logout
- `/register` - User registration
- `/auth/*` - Auth-related pages
- `/(auth)/*` - Auth layout group

##### **Dashboard & Home**
- `/` - Main homepage
- `/dashboard` - Main dashboard
- `/system-dashboard` - System overview
- `/command-center` - Command center interface

##### **Evidence Management**
- `/evidence` - Evidence listing
- `/evidence-board` - Evidence board interface
- `/evidence-canvas` - Canvas-based evidence view
- `/evidence-editor` - Evidence editing
- `/evidence-graph` - Graph visualization
- `/evidence-library` - Evidence library
- `/evidence-workspace` - Evidence workspace
- `/evidenceboard` - Alternative evidence board
- `/(evidence)/*` - Evidence layout group

##### **Legal & Case Management**
- `/legal` - Legal dashboard
- `/legal-ai` - Legal AI features
- `/legal-ai-suite` - Complete legal AI suite
- `/legal-report-compare` - Report comparison
- `/(legal)/*` - Legal layout group
- `/cases/*` - Case management
- `/active-cases` - Active cases view
- `/investigation` - Investigation interface
- `/prosecutor` - Prosecutor tools

##### **AI & Intelligence**
- `/ai` - AI dashboard
- `/aichat` - AI chat interface
- `/ai-test` - AI testing
- `/(ai)/*` - AI layout group
  - `/ai-dashboard` - AI overview
  - `/ai-rag` - RAG interface
  - `/assistant` - AI assistant
  - `/chat` - Chat interface
  - `/gpu-chat` - GPU-accelerated chat
  - `/summarize` - Document summarization
  - `/vector-search` - Vector search

##### **Search & Discovery**
- `/search-main` - Main search
- `/search-standalone` - Standalone search
- `/global-search` - Global search interface
- `/shader_search` - Shader-based search
- `/(tools)/search` - Tools search

##### **Documents & Reports**
- `/documents/*` - Document management
- `/docs/*` - Documentation
- `/reports` - Reports listing
- `/reports-generator` - Report generation
- `/saved-citations` - Saved legal citations

##### **Persons of Interest**
- `/persons` - Persons listing
- `/persons-of-interest` - POI management
- `/poi` - POI interface
- `/poi-manager` - POI manager

##### **Admin & System**
- `/admin/*` - Admin routes
  - `/admin/users` - User management
  - `/admin/evidence` - Evidence admin
  - `/admin/gpu-demo` - GPU demo
  - `/admin/performance-dashboard` - Performance metrics
- `/(admin)/*` - Admin layout group
- `/settings` - User settings
- `/system-configuration` - System config

##### **Tools & Utilities**
- `/tools/*` - Tool routes
- `/(tools)/*` - Tools layout group
- `/terminal` - Terminal interface
- `/text-editor` - Text editor
- `/upload` - File upload
- `/import` - Data import
- `/export` - Data export

##### **Monitoring & Metrics**
- `/monitor` - System monitor
- `/metrics` - Metrics dashboard
- `/perf` - Performance monitoring
- `/status` - System status
- `/logs` - Log viewer
- `/memory-dashboard` - Memory usage
- `/optimization-dashboard` - Optimization metrics

##### **Development Tools**
- `/dev/*` - Development routes
  - `/dev/route-explorer` - Route explorer
  - `/dev/metrics` - Dev metrics
  - `/dev/cache-demo` - Cache demo
  - `/dev/gpu-tiling` - GPU tiling
  - `/dev/vector-search-demo` - Vector search demo

---

#### 🔌 **API Endpoints** (`/api/*`)

##### **Core APIs**
- `/api/health` - Health check
- `/api/routes/all` - Route discovery API
- `/api/auth/*` - Authentication APIs
- `/api/users/*` - User management APIs

##### **AI & ML APIs**
- `/api/ai/*` - AI services
- `/api/chat/*` - Chat APIs
- `/api/gpu-chat/*` - GPU chat APIs
- `/api/summarize/*` - Summarization APIs
- `/api/embeddings/*` - Embedding generation
- `/api/vector-search/*` - Vector search APIs
- `/api/rag/*` - RAG APIs
- `/api/ollama/*` - Ollama integration

##### **Evidence & Legal APIs**
- `/api/evidence/*` - Evidence management
- `/api/cases/*` - Case management
- `/api/legal/*` - Legal services
- `/api/legal-ai/*` - Legal AI services
- `/api/persons/*` - Person management
- `/api/citations/*` - Citation management

##### **Data & Search APIs**
- `/api/search/*` - Search APIs
- `/api/semantic-search/*` - Semantic search
- `/api/documents/*` - Document APIs
- `/api/upload/*` - Upload APIs

##### **System APIs**
- `/api/system/*` - System APIs
- `/api/metrics/*` - Metrics APIs
- `/api/cache/*` - Cache APIs
- `/api/database/*` - Database APIs

---

## 🏗️ Architecture Patterns

### Layout Groups
SvelteKit uses `(group)` syntax for shared layouts without affecting URLs:

- `(auth)` - Authentication pages
- `(admin)` - Admin pages
- `(ai)` - AI-related pages
- `(evidence)` - Evidence pages
- `(legal)` - Legal pages
- `(tools)` - Tool pages
- `(demo)` - Demo pages
- `(dev)` - Development pages
- `(public)` - Public pages

### File Naming Conventions
- `+page.svelte` - Page component
- `+page.server.ts` - Server-side page logic
- `+page.ts` - Client-side page logic
- `+layout.svelte` - Layout component
- `+layout.server.ts` - Server-side layout logic
- `+server.ts` - API endpoint
- `+error.svelte` - Error page

---

## 🎨 Styling Guidelines

### UnoCSS Usage
```svelte
<!-- Use atomic classes -->
<div class="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <h1 class="text-2xl font-bold text-gray-900">Title</h1>
  <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Click Me
  </button>
</div>
```

### Bits-UI v2 Components (Svelte 5)
```svelte
<script lang="ts">
  import { Dialog } from 'bits-ui';

  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>Open Dialog</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Dialog Title</Dialog.Title>
      <Dialog.Description>Dialog content here</Dialog.Description>
      <Dialog.Close>Close</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Svelte 5 Runes
```svelte
<script lang="ts">
  // State
  let count = $state(0);

  // Derived state
  let doubled = $derived(count * 2);

  // Effects
  $effect(() => {
    console.log('Count changed:', count);
  });

  // Props
  let { title, description }: { title: string; description?: string } = $props();
</script>
```

### Animations
```svelte
<script lang="ts">
  import { fade, slide, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
</script>

<div transition:fade={{ duration: 300 }}>
  Fade in/out
</div>

<div in:fly={{ y: 200, duration: 500, easing: quintOut }}>
  Fly in from bottom
</div>
```

---

## 🐛 Error Fixing Guide

### Common Issues & Solutions

#### 1. **Svelte 5 Migration Issues**

**Problem:** Using old Svelte 4 syntax
```svelte
<!-- ❌ OLD (Svelte 4) -->
<script>
  export let value;
  let count = 0;
  $: doubled = count * 2;
</script>
```

**Solution:** Use Svelte 5 runes
```svelte
<!-- ✅ NEW (Svelte 5) -->
<script lang="ts">
  let { value } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

#### 2. **Event Handler Syntax**

**Problem:** Using old event syntax
```svelte
<!-- ❌ OLD -->
<button on:click={handleClick}>Click</button>
```

**Solution:** Use new event syntax
```svelte
<!-- ✅ NEW -->
<button onclick={handleClick}>Click</button>
```

#### 3. **Component Bindings**

**Problem:** Old bind syntax
```svelte
<!-- ❌ OLD -->
<input bind:value={text} />
```

**Solution:** Still works, but prefer $state
```svelte
<!-- ✅ NEW -->
<script>
  let text = $state('');
</script>
<input bind:value={text} />
```

#### 4. **Deprecated UI Libraries**

**Problem:** Using shadcn-svelte or Melt-UI
```svelte
<!-- ❌ DEPRECATED -->
import { Button } from 'shadcn-svelte';
import { createDialog } from '@melt-ui/svelte';
```

**Solution:** Use Bits-UI v2
```svelte
<!-- ✅ CORRECT -->
import { Button, Dialog } from 'bits-ui';
```

#### 5. **Styling Issues**

**Problem:** Using Tailwind or custom CSS
```svelte
<!-- ❌ AVOID -->
<div class="bg-blue-500 hover:bg-blue-700">
```

**Solution:** Use UnoCSS atomic classes
```svelte
<!-- ✅ CORRECT -->
<div class="bg-blue-5 hover:bg-blue-7">
```

#### 6. **Type Errors**

**Problem:** Missing types
```svelte
<script>
  let data;
</script>
```

**Solution:** Add proper TypeScript types
```svelte
<script lang="ts">
  type Data = { id: string; name: string };
  let data = $state<Data | null>(null);
</script>
```

---

## 📊 Route Statistics

- **Total Routes:** ~1,300
- **Pages:** ~255
- **API Endpoints:** ~1,028
- **Layouts:** ~17
- **Demos:** ~80+

### Route Tags
- `ai` - AI/ML features (141 routes)
- `legal` - Legal features (72 routes)
- `evidence` - Evidence management (99 routes)
- `demo` - Demo pages (varies)
- `admin` - Admin features (25 routes)
- `api` - API endpoints (1,029 routes)
- `auth` - Authentication (28 routes)
- `gpu` - GPU-accelerated (44 routes)
- `vector` - Vector search (41 routes)
- `graph` - Graph visualization (14 routes)

---

## 🚀 Quick Start Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run tests
npm run check        # Type checking
npm run lint         # Lint code
```

### Route Discovery
Visit these pages to explore routes:
- http://localhost:5173/all-routes - Full route explorer with filters
- http://localhost:5173/command/routes - NES-style command center
- http://localhost:5173/test-route-discovery - Route discovery test

---

## 📝 Development Guidelines

### 1. **Always Use TypeScript**
```svelte
<script lang="ts">
  // Type everything
</script>
```

### 2. **Use Svelte 5 Runes**
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props

### 3. **Style with UnoCSS**
- Use atomic classes
- No custom CSS unless necessary
- Leverage UnoCSS shortcuts

### 4. **Use Bits-UI v2 for Components**
- Headless components
- Full accessibility
- Svelte 5 compatible

### 5. **Follow File Structure**
```
routes/
├── (group)/          # Layout groups
│   └── feature/
│       ├── +page.svelte
│       └── +page.server.ts
├── api/              # API endpoints
│   └── endpoint/
│       └── +server.ts
└── feature/          # Regular routes
    ├── +layout.svelte
    └── +page.svelte
```

### 6. **Error Handling**
```svelte
<script lang="ts">
  import { error } from '@sveltejs/kit';

  async function loadData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw error(res.status, 'Failed to load');
      return await res.json();
    } catch (e) {
      console.error('Error:', e);
      throw e;
    }
  }
</script>
```

---

## 🔍 Finding Routes

### By Feature
1. Open `/all-routes`
2. Use "Category" filter → "🎮 Demos" for demos
3. Use "Tags" filter for specific features
4. Use "Sort By" to organize results

### By Pattern
- Demos: Contains `demo`, `test`, `showcase`
- Admin: Starts with `/admin` or in `(admin)` group
- API: Starts with `/api`
- Auth: In `(auth)` group or `/auth`, `/login`, `/register`

### By Tag
Use the tag filter in `/all-routes` to find routes by:
- `ai`, `legal`, `evidence`, `demo`, `admin`, `gpu`, `vector`, etc.

---

## 📚 Additional Resources

- **Svelte 5 Docs:** https://svelte-5-preview.vercel.app/docs
- **SvelteKit Docs:** https://kit.svelte.dev/docs
- **UnoCSS Docs:** https://unocss.dev/
- **Bits-UI Docs:** https://bits-ui.com/
- **Drizzle ORM:** https://orm.drizzle.team/

---

## 🎯 Next Steps

1. **Explore Routes:** Visit `/all-routes` to see all available routes
2. **Check Demos:** Filter by "Demos" category to see examples
3. **Review Code:** Look at demo implementations for patterns
4. **Fix Errors:** Use this guide to migrate old code to Svelte 5
5. **Build Features:** Follow the guidelines above for new development

---

**Last Updated:** 2025-11-30
**Version:** 1.0.0
**Maintainer:** Development Team
