# Svelte 5 + Drizzle ORM + UNO CSS - Quick Reference

## 🎯 Legal AI Platform Stack Integration

### **Core Pattern: Svelte 5 Runes → Drizzle ORM → UNO CSS**

```typescript
// ✅ CANONICAL IMPORT PATTERN
import { db, eq, and, or, sql } from '$lib/server/db';
import { cases, evidence, users } from '$lib/server/db';

// ✅ SVELTE 5 COMPONENT PATTERN
<script lang="ts">
  let { data } = $props();              // Props
  let filter = $state('all');           // Local state
  let filtered = $derived.by(() => {    // Computed
    return data.items.filter(i => i.status === filter);
  });

  $effect(() => {                       // Side effects
    console.log('Filter changed:', filter);
  });
</script>

<!-- UNO CSS utilities -->
<div class="card-legal grid-legal">
  {#each filtered as item}
    <div class="btn-primary hover-lift">
      {item.title}
    </div>
  {/each}
</div>
```

---

## 📋 Svelte 5 Runes Cheat Sheet

### **State Management**

```typescript
// ✅ DO: Use $state() with let
let count = $state(0);
let user = $state({ name: 'John', role: 'admin' });

// ❌ DON'T: Use const with $state()
const count = $state(0); // ERROR!

// ✅ Deep reactivity
let todos = $state([{ text: 'Learn Svelte 5', done: false }]);
todos[0].done = true; // ✅ Triggers reactivity
todos.push({ text: 'Build app', done: false }); // ✅ Reactive

// ✅ Raw state (no deep reactivity)
let config = $state.raw({ api: 'http://api.com', timeout: 5000 });
config.timeout = 10000; // ❌ Won't trigger reactivity
config = { ...config, timeout: 10000 }; // ✅ Must reassign
```

### **Derived State**

```typescript
// ✅ Simple derivation
let doubled = $derived(count * 2);

// ✅ Complex derivation
let total = $derived.by(() => {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
});

// ❌ DON'T: Use $effect to derive state
let doubled = $state(0);
$effect(() => {
  doubled = count * 2; // ❌ Use $derived instead!
});
```

### **Effects**

```typescript
// ✅ Side effects only
$effect(() => {
  console.log('Count is:', count);

  // Optional cleanup
  return () => {
    console.log('Cleanup!');
  };
});

// ✅ Pre-DOM update effects
$effect.pre(() => {
  // Runs before DOM updates
});

// ✅ Manual effect root
const cleanup = $effect.root(() => {
  $effect(() => {
    // Nested effect
  });

  return () => {
    // Manual cleanup
  };
});
```

### **Props**

```typescript
// ✅ Type-safe props
let { items, onSelect }: {
  items: Item[];
  onSelect: (id: string) => void;
} = $props();

// ✅ Optional props with defaults
let { theme = 'light' } = $props();

// ✅ Bindable props
let { value = $bindable() } = $props();
```

---

## 🗄️ Drizzle ORM Patterns

### **Basic Queries**

```typescript
// SELECT
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.role, 'admin'));

// INSERT
const [newUser] = await db
  .insert(usersTable)
  .values({ name: 'John', email: 'john@example.com' })
  .returning();

// UPDATE
await db
  .update(usersTable)
  .set({ name: 'Jane' })
  .where(eq(usersTable.id, userId));

// DELETE
await db
  .delete(usersTable)
  .where(eq(usersTable.id, userId));
```

### **Complex Queries**

```typescript
// JOINS
const result = await db
  .select({
    caseName: cases.title,
    evidenceCount: sql<number>`count(${evidence.id})`,
    userName: users.name
  })
  .from(cases)
  .leftJoin(evidence, eq(cases.id, evidence.caseId))
  .leftJoin(users, eq(cases.userId, users.id))
  .where(eq(cases.status, 'active'))
  .groupBy(cases.id, users.id)
  .orderBy(desc(cases.createdAt));

// SUBQUERIES
const activeWithEvidence = await db
  .select()
  .from(cases)
  .where(
    and(
      eq(cases.status, 'active'),
      sql`EXISTS (
        SELECT 1 FROM ${evidence}
        WHERE ${evidence.caseId} = ${cases.id}
      )`
    )
  );
```

### **Vector Search (pgvector)**

```typescript
// Similarity search
const similar = await db
  .select({
    id: vectors.id,
    content: vectors.content,
    similarity: sql<number>`1 - (${vectors.embedding} <=> ${userEmbedding}::vector)`
  })
  .from(vectors)
  .where(
    sql`${vectors.embedding} <=> ${userEmbedding}::vector < 0.3`
  )
  .orderBy(sql`${vectors.embedding} <=> ${userEmbedding}::vector`)
  .limit(10);

// Distance operators
// <=>  cosine distance
// <->  L2 distance
// <#>  inner product
```

### **Transactions**

```typescript
await db.transaction(async (tx) => {
  const [case] = await tx
    .insert(cases)
    .values({ title: 'New Case' })
    .returning();

  await tx
    .insert(evidence)
    .values({ caseId: case.id, title: 'Evidence 1' });

  // If any query fails, entire transaction rolls back
});
```

---

## 🎨 UNO CSS Reference

### **Layout Shortcuts**

```html
<!-- Container -->
<div class="container-legal">       <!-- max-w-7xl mx-auto px-4 -->

<!-- Grid -->
<div class="grid-legal">            <!-- grid cols-1 md:cols-2 lg:cols-3 gap-6 -->

<!-- Section -->
<section class="section-legal">    <!-- py-12 sm:py-16 lg:py-20 -->
```

### **Component Shortcuts**

```html
<!-- Buttons -->
<button class="btn-legal">Base Button</button>
<button class="btn-primary">Primary</button>
<button class="btn-secondary">Secondary</button>
<button class="btn-outline">Outlined</button>
<button class="btn-ghost">Ghost</button>
<button class="btn-danger">Danger</button>

<!-- Cards -->
<div class="card-legal">Standard Card</div>
<div class="card-evidence">Evidence Card</div>
<div class="card-document">Document Card</div>
<div class="card-ai">AI Card</div>

<!-- Inputs -->
<input class="input-legal" type="text" />
<textarea class="textarea-legal"></textarea>
<select class="select-legal"></select>

<!-- Badges -->
<span class="badge-primary">Active</span>
<span class="badge-success">Success</span>
<span class="badge-warning">Warning</span>
<span class="badge-danger">Urgent</span>
```

### **Theme Colors**

```html
<!-- Legal brand colors -->
<div class="bg-legal-primary">    <!-- Deep blue -->
<div class="bg-legal-secondary">  <!-- Purple -->
<div class="bg-legal-accent">     <!-- Cyan -->
<div class="bg-legal-success">    <!-- Green -->
<div class="bg-legal-warning">    <!-- Amber -->
<div class="bg-legal-danger">     <!-- Red -->

<!-- Document types -->
<div class="bg-document-pdf">     <!-- Red -->
<div class="bg-document-word">    <!-- Blue -->
<div class="bg-document-excel">   <!-- Green -->

<!-- Evidence canvas -->
<div class="border-evidence-node">
<div class="bg-evidence-link">

<!-- AI chat -->
<div class="bg-ai-user">
<div class="bg-ai-assistant">
```

### **Utility Classes**

```html
<!-- Special effects -->
<div class="hover-lift">           <!-- Hover animation -->
<div class="text-gradient">        <!-- Gradient text -->
<div class="glass">                <!-- Glass morphism -->
<div class="shadow-legal">         <!-- Legal theme shadow -->

<!-- Animations -->
<div class="animate-fade-in">
<div class="animate-slide-up">
<div class="animate-scale-in">

<!-- Loading states -->
<div class="skeleton">             <!-- Loading skeleton -->
<span class="spinner">             <!-- Loading spinner -->
```

---

## 🔥 Common Patterns

### **1. Evidence List with Filtering**

```svelte
<script lang="ts">
  let { evidence = [] } = $props();
  let filter = $state('all');
  let search = $state('');

  let filtered = $derived.by(() => {
    return evidence.filter(e => {
      const matchesType = filter === 'all' || e.type === filter;
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  });
</script>

<div class="container-legal">
  <input class="input-legal" bind:value={search} placeholder="Search..." />

  <div class="grid-legal">
    {#each filtered as item (item.id)}
      <div class="card-evidence hover-lift">
        {item.title}
      </div>
    {/each}
  </div>
</div>
```

### **2. AI Chat Interface**

```svelte
<script lang="ts">
  let { messages = [] } = $props();
  let input = $state('');
  let container: HTMLDivElement;

  $effect(() => {
    // Auto-scroll on new messages
    messages.length;
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  });

  async function send() {
    if (!input.trim()) return;
    // Send to API
    input = '';
  }
</script>

<div bind:this={container} class="overflow-auto">
  {#each messages as msg}
    <div class:chat-user={msg.role === 'user'} class:chat-assistant={msg.role === 'assistant'}>
      {msg.content}
    </div>
  {/each}
</div>

<form onsubmit={send}>
  <input class="chat-input" bind:value={input} />
  <button class="btn-primary">Send</button>
</form>
```

### **3. Case Dashboard with Stats**

```typescript
// +page.server.ts
export const load = async ({ locals }) => {
  const userId = locals.user?.id;

  const [cases, stats] = await Promise.all([
    db.select().from(casesTable).where(eq(casesTable.userId, userId)),
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where status = 'active')`,
      closed: sql<number>`count(*) filter (where status = 'closed')`
    }).from(casesTable).where(eq(casesTable.userId, userId))
  ]);

  return { cases, stats: stats[0] };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  let { data } = $props();
  let activeCases = $derived(data.cases.filter(c => c.status === 'active'));
</script>

<div class="grid grid-cols-3 gap-4">
  <div class="card-legal">
    <h3>Total Cases</h3>
    <p class="text-3xl font-bold">{data.stats.total}</p>
  </div>

  <div class="card-legal">
    <h3>Active</h3>
    <p class="text-3xl font-bold text-legal-success">{data.stats.active}</p>
  </div>

  <div class="card-legal">
    <h3>Closed</h3>
    <p class="text-3xl font-bold text-gray-500">{data.stats.closed}</p>
  </div>
</div>
```

---

## ⚠️ Common Mistakes to Avoid

```typescript
// ❌ DON'T: Use const with $state
const count = $state(0);

// ✅ DO: Use let with $state
let count = $state(0);

// ❌ DON'T: Import runes
import { $state } from 'svelte';

// ✅ DO: Runes are global keywords
let count = $state(0);

// ❌ DON'T: Use $effect to derive state
$effect(() => {
  doubled = count * 2;
});

// ✅ DO: Use $derived
let doubled = $derived(count * 2);

// ❌ DON'T: Import from postgres-js adapter
import { drizzle } from 'drizzle-orm/postgres-js';

// ✅ DO: Use canonical imports
import { db } from '$lib/server/db';

// ❌ DON'T: Use any types
catch (error: any) {
  console.log(error.message);
}

// ✅ DO: Use proper type guards
catch (error: unknown) {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  console.log(msg);
}
```

---

## 📚 Additional Resources

- **Svelte 5 Docs**: https://svelte.dev/docs/svelte
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **UNO CSS**: https://unocss.dev/
- **pgvector**: https://github.com/pgvector/pgvector

---

**Last Updated**: October 9, 2025
**Platform**: Legal AI - Evidence Management & Case Tracking
**Stack**: Svelte 5 + SvelteKit 2 + Drizzle ORM + UNO CSS + PostgreSQL + pgvector
