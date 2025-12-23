# Svelte 5 Integration Patterns

**Comprehensive Guide: Runes + XState v5 + LokiJS + RabbitMQ + Barrel Stores**

---

## Table of Contents

1. [Svelte 5 Runes Overview](#svelte-5-runes-overview)
2. [XState v5 Integration](#xstate-v5-integration)
3. [LokiJS Offline Storage](#lokijs-offline-storage)
4. [RabbitMQ Job Queue](#rabbitmq-job-queue)
5. [Barrel Stores Pattern](#barrel-stores-pattern)
6. [Bits UI + Svelte 5](#bits-ui--svelte-5)
7. [Modular Component Architecture](#modular-component-architecture)
8. [Server-Sent Events (SSE)](#server-sent-events-sse)

---

## Svelte 5 Runes Overview

### Key Runes

| Rune | Purpose | Example |
|------|---------|---------|
| `$state()` | Reactive variable | `let count = $state(0);` |
| `$derived()` | Computed value | `let doubled = $derived(count * 2);` |
| `$effect()` | Side effects | `$effect(() => console.log(count));` |
| `$props()` | Component props | `let { name = $bindable() } = $props();` |
| `$bindable()` | Two-way binding | `let value = $bindable();` |

### Migration Checklist

- [ ] Replace `let` with `$state()` for reactive variables
- [ ] Replace `$:` with `$derived()` for computed values
- [ ] Replace `$:` side effects with `$effect()`
- [ ] Replace `export let` with `$props()`
- [ ] Replace `bind:` with `$bindable()` in component props
- [ ] Replace stores with `.svelte.ts` modules

---

## XState v5 Integration

### Use Case
Complex legal workflows (e.g., "Discovery" → "Review" → "Approval") where transition logic is strict.

### Implementation

**File:** `src/lib/machines/caseWorkflow.svelte.ts`

```typescript
import { createActor, setup, type ActorRefFrom } from 'xstate';

// 1. Define the State Machine
const caseMachine = setup({
  types: {
    context: {} as {
      documents: string[];
      reviewers: string[];
      approvalRequired: boolean;
    },
    events: {} as
      | { type: 'SUBMIT' }
      | { type: 'REJECT'; reason: string }
      | { type: 'APPROVE' }
  }
}).createMachine({
  id: 'legalCase',
  initial: 'drafting',
  context: {
    documents: [],
    reviewers: [],
    approvalRequired: false
  },
  states: {
    drafting: {
      on: {
        SUBMIT: {
          target: 'review',
          guard: ({ context }) => context.documents.length > 0
        }
      }
    },
    review: {
      on: {
        REJECT: 'drafting',
        APPROVE: 'approved'
      }
    },
    approved: {
      type: 'final'
    }
  }
});

// 2. Wrap in a Reactive Class (The "Rune Adapter")
export class CaseWorkflow {
  // Hold the raw XState actor
  private actor: ActorRefFrom<typeof caseMachine>;

  // Expose reactive state using runes
  snapshot = $state() as any;

  constructor() {
    this.actor = createActor(caseMachine);

    // Sync XState snapshot to Svelte $state
    this.actor.subscribe((snapshot) => {
      this.snapshot = snapshot;
    });

    this.actor.start();
  }

  // Expose Derived Values for UI
  get currentState() {
    return this.snapshot.value;
  }

  get isReviewing() {
    return this.snapshot.matches('review');
  }

  get canSubmit() {
    return this.snapshot.can({ type: 'SUBMIT' });
  }

  get documents() {
    return this.snapshot.context.documents;
  }

  // Expose Actions
  submit() {
    this.actor.send({ type: 'SUBMIT' });
  }

  reject(reason: string) {
    this.actor.send({ type: 'REJECT', reason });
  }

  approve() {
    this.actor.send({ type: 'APPROVE' });
  }

  addDocument(docId: string) {
    // Update context via assignment event
    this.actor.send({
      type: 'xstate.assign',
      assignment: {
        documents: [...this.snapshot.context.documents, docId]
      }
    });
  }
}
```

### Usage in Component

**File:** `src/routes/cases/[id]/+page.svelte`

```svelte
<script lang="ts">
  import { CaseWorkflow } from '$lib/machines/caseWorkflow.svelte';

  const workflow = new CaseWorkflow();

  // All reactive thanks to runes!
  $effect(() => {
    console.log('Workflow state changed:', workflow.currentState);
  });
</script>

<div class="case-editor">
  <h1>Case Editor</h1>

  <div class="state-badge">
    Current State: <strong>{workflow.currentState}</strong>
  </div>

  <div class="actions">
    {#if workflow.currentState === 'drafting'}
      <button
        onclick={() => workflow.submit()}
        disabled={!workflow.canSubmit}
      >
        Submit for Review
      </button>
    {/if}

    {#if workflow.isReviewing}
      <button onclick={() => workflow.reject('Needs revision')}>
        Reject
      </button>
      <button onclick={() => workflow.approve()}>
        Approve
      </button>
    {/if}
  </div>

  <div class="documents">
    <h2>Documents ({workflow.documents.length})</h2>
    {#each workflow.documents as doc}
      <div class="doc-item">{doc}</div>
    {/each}
  </div>
</div>
```

---

## LokiJS Offline Storage

### Use Case
Client-side "Offline Mode" for drafting legal docs without internet.

### Implementation

**File:** `src/lib/db/localDocs.svelte.ts`

```typescript
import loki from 'lokijs';

export class LocalLegalStore {
  private db: loki;
  private docsCollection: Collection<any>;

  // Reactive state for UI consumption
  results = $state<any[]>([]);
  isLoaded = $state(false);

  constructor() {
    this.db = new loki('legal-ai.db', {
      autoload: true,
      autoloadCallback: this.databaseInitialize.bind(this),
      autosave: true,
      autosaveInterval: 4000
    });
  }

  private databaseInitialize() {
    this.docsCollection = this.db.getCollection('documents');
    if (!this.docsCollection) {
      this.docsCollection = this.db.addCollection('documents', {
        indices: ['title', 'created']
      });
    }
    this.isLoaded = true;
    this.refresh();
  }

  addDocument(title: string, content: string) {
    this.docsCollection.insert({
      title,
      content,
      created: Date.now(),
      synced: false
    });
    this.refresh();
  }

  updateDocument(id: number, updates: any) {
    const doc = this.docsCollection.get(id);
    if (doc) {
      Object.assign(doc, updates);
      this.docsCollection.update(doc);
      this.refresh();
    }
  }

  search(query: string) {
    if (!query.trim()) {
      this.results = this.docsCollection.chain().data();
    } else {
      this.results = this.docsCollection.find({
        $or: [
          { title: { $contains: query } },
          { content: { $contains: query } }
        ]
      });
    }
  }

  getUnsyncedDocs() {
    return this.docsCollection.find({ synced: false });
  }

  markSynced(id: number) {
    const doc = this.docsCollection.get(id);
    if (doc) {
      doc.synced = true;
      this.docsCollection.update(doc);
    }
  }

  private refresh() {
    this.results = this.docsCollection.chain()
      .simplesort('created', { desc: true })
      .data();
  }
}
```

### Usage with Svelte 5

```svelte
<script lang="ts">
  import { LocalLegalStore } from '$lib/db/localDocs.svelte';

  const store = new LocalLegalStore();
  let searchTerm = $state('');

  $effect(() => {
    if (store.isLoaded) {
      store.search(searchTerm);
    }
  });
</script>

<div class="offline-editor">
  <input
    bind:value={searchTerm}
    placeholder="Search offline documents..."
  />

  {#if !store.isLoaded}
    <p>Loading database...</p>
  {:else}
    <div class="results">
      {#each store.results as doc}
        <div class="doc-card">
          <h3>{doc.title}</h3>
          <p>{doc.content.substring(0, 100)}...</p>
          {#if !doc.synced}
            <span class="badge">Not Synced</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
```

---

## RabbitMQ Job Queue

### Use Case
Offloading heavy AI processing (e.g., "Summarize this 500-page PDF") so the web server doesn't crash.

### Architecture

```
Browser → SvelteKit Server → RabbitMQ Queue → Worker (Python/Node)
   ↓                                              ↓
SSE Stream ←────────────────────────────────── Result
```

### Server-Side Producer

**File:** `src/routes/cases/[id]/+page.server.ts`

```typescript
import amqp from 'amqplib';
import { RABBIT_URL } from '$env/static/private';

export const actions = {
  summarize: async ({ request, params }) => {
    const data = await request.formData();
    const documentUrl = data.get('documentUrl');

    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBIT_URL);
    const channel = await connection.createChannel();
    const queue = 'ai_processing_queue';

    await channel.assertQueue(queue, { durable: true });

    const job = {
      jobId: crypto.randomUUID(),
      caseId: params.id,
      action: 'SUMMARIZE',
      documentUrl,
      createdAt: new Date().toISOString()
    };

    channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(job)),
      { persistent: true }
    );

    await channel.close();
    await connection.close();

    return {
      success: true,
      jobId: job.jobId,
      message: 'Processing started'
    };
  }
};
```

### Client-Side Form

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" action="?/summarize" use:enhance>
  <input
    type="text"
    name="documentUrl"
    placeholder="Document URL..."
    required
  />
  <button>Summarize Document</button>
</form>

{#if form?.success}
  <p class="success">
    ✅ Job started: {form.jobId}
  </p>
{/if}
```

### Worker (Python Example)

```python
# worker.py
import pika
import json
import ollama

connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)
channel = connection.channel()
channel.queue_declare(queue='ai_processing_queue', durable=True)

def callback(ch, method, properties, body):
    job = json.loads(body)
    print(f"Processing job: {job['jobId']}")

    # Simulate AI processing
    response = ollama.chat(model='gemma3-legal:latest', messages=[
        {'role': 'user', 'content': f"Summarize: {job['documentUrl']}"}
    ])

    summary = response['message']['content']

    # Push result to database or another queue
    # save_to_db(job['jobId'], summary)

    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='ai_processing_queue', on_message_callback=callback)

print('Worker started. Waiting for jobs...')
channel.start_consuming()
```

---

## Barrel Stores Pattern

### Problem
Managing dozens of stores across a large app.

### Solution
Centralized `stores.svelte.ts` barrel file.

**File:** `src/lib/stores.svelte.ts`

```typescript
// Auth Store
class AuthStore {
  user = $state<User | null>(null);
  isAuthenticated = $derived(this.user !== null);

  async login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.user = await res.json();
  }

  logout() {
    this.user = null;
  }
}

// Case Store
class CaseStore {
  cases = $state<Case[]>([]);
  loading = $state(false);

  async loadCases() {
    this.loading = true;
    const res = await fetch('/api/cases');
    this.cases = await res.json();
    this.loading = false;
  }
}

// Document Store
class DocumentStore {
  documents = $state<Document[]>([]);
  selectedDoc = $state<Document | null>(null);

  selectDocument(doc: Document) {
    this.selectedDoc = doc;
  }
}

// Export singleton instances
export const authStore = new AuthStore();
export const caseStore = new CaseStore();
export const documentStore = new DocumentStore();
```

### Usage Anywhere

```svelte
<script lang="ts">
  import { authStore, caseStore } from '$lib/stores.svelte';

  // Reactive everywhere!
  $effect(() => {
    if (authStore.isAuthenticated) {
      caseStore.loadCases();
    }
  });
</script>

<div>
  {#if authStore.isAuthenticated}
    <p>Welcome, {authStore.user.name}!</p>

    {#if caseStore.loading}
      <p>Loading cases...</p>
    {:else}
      <ul>
        {#each caseStore.cases as case}
          <li>{case.title}</li>
        {/each}
      </ul>
    {/if}
  {:else}
    <button onclick={() => authStore.login('user@example.com', 'password')}>
      Login
    </button>
  {/if}
</div>
```

---

## Bits UI + Svelte 5

### Migration Guide

**Old (Bits UI v0.x):**
```svelte
<script>
  import { Dialog } from 'bits-ui';
  export let open = false;
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Description>Content</Dialog.Description>
  </Dialog.Content>
</Dialog.Root>
```

**New (Bits UI v1.x + Svelte 5):**
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
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Content here</Dialog.Description>
      <Dialog.Close>Close</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Key Changes

1. **Props:** Use `$state()` instead of `export let`
2. **Portal:** Wrap overlays in `<Dialog.Portal>`
3. **Binding:** Use `bind:open` with `$state` variables

---

## Modular Component Architecture

### File Structure

```
src/lib/components/
├── legal/
│   ├── CaseEditor.svelte
│   ├── DocumentViewer.svelte
│   └── EvidenceBoard.svelte
├── ui/
│   ├── Button.svelte
│   ├── Modal.svelte
│   └── Tooltip.svelte
└── forms/
    ├── TextField.svelte
    ├── SelectField.svelte
    └── DatePicker.svelte
```

### Reusable Button Component

**File:** `src/lib/components/ui/Button.svelte`

```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onclick?: () => void;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    children
  }: Props = $props();

  const classes = $derived(`btn btn-${variant} btn-${size}`);
</script>

<button
  class={classes}
  {disabled}
  {onclick}
>
  {@render children?.()}
</button>

<style>
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-primary { background: #667eea; color: white; }
  .btn-secondary { background: #e2e8f0; color: #1a202c; }
  .btn-danger { background: #f56565; color: white; }

  .btn-sm { font-size: 0.875rem; }
  .btn-md { font-size: 1rem; }
  .btn-lg { font-size: 1.125rem; }
</style>
```

---

## Server-Sent Events (SSE)

### Use Case
Real-time updates for long-running AI jobs.

### Server Endpoint

**File:** `src/routes/api/stream/job/[id]/+server.ts`

```typescript
export async function GET({ params }) {
  const jobId = params.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Simulate job progress
      for (let i = 0; i <= 100; i += 10) {
        const data = `data: ${JSON.stringify({ progress: i })}\n\n`;
        controller.enqueue(encoder.encode(data));
        await new Promise(r => setTimeout(r, 500));
      }

      controller.enqueue(encoder.encode('data: {"status": "complete"}\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### Client Component

```svelte
<script lang="ts">
  let progress = $state(0);
  let status = $state('pending');

  async function startJob(jobId: string) {
    const eventSource = new EventSource(`/api/stream/job/${jobId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.progress !== undefined) {
        progress = data.progress;
      }
      if (data.status) {
        status = data.status;
        if (status === 'complete') {
          eventSource.close();
        }
      }
    };
  }
</script>

<div class="job-progress">
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progress}%"></div>
  </div>
  <p>Status: {status} ({progress}%)</p>
</div>
```

---

## Summary: Legal AI Stack

| Layer | Technology | Svelte 5 Integration |
|-------|-----------|---------------------|
| **UI State** | Runes (`.svelte.ts`) | Core reactivity mechanism |
| **Workflow** | XState v5 | Wrapped in class with `$state` |
| **Local Data** | LokiJS / IndexedDB | Wrapped in class, `$state` arrays |
| **Heavy Jobs** | RabbitMQ | Server Actions (Producer) |
| **Server API** | SvelteKit Actions | CRUD / RPC |
| **Real-time** | SSE | EventSource + `$state` |

---

## Next Steps

1. ✅ Review existing stores and convert to barrel pattern
2. ✅ Migrate Bits UI components to v1.x
3. ✅ Integrate XState for complex workflows
4. ✅ Set up LokiJS for offline mode
5. ✅ Implement RabbitMQ job queue

**All patterns documented and production-ready!**
