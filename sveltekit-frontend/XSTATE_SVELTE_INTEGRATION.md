# XState v5 Svelte Integration Guide

## Quick Start

### 1. Basic Integration (Any Machine)

```svelte
<script lang="ts">
  import { useMachine } from '$lib/stores/xstateIntegration';
  import { myMachine } from '$lib/state/myMachine';

  const { state$, send, cleanup } = useMachine(myMachine);
</script>

<div use:cleanup>
  <p>Current state: {$state$.value}</p>
  <button onclick={() => send({ type: 'NEXT' })}>
    Continue
  </button>
</div>
```

### 2. Using Pre-configured Stores (Recommended)

```svelte
<script lang="ts">
  import { createDocumentUploadStore } from '$lib/stores/machineStores';

  const upload = createDocumentUploadStore();
</script>

<input
  type="file"
  onchange={(e) => {
    const file = e.target.files?.[0];
    if (file) upload.selectFile(file);
  }}
/>

{#if $upload.isUploading$}
  <p>Uploading: {Math.round($upload.uploadProgress$ || 0)}%</p>
{/if}

{#if $upload.uploadError$}
  <p class="error">{$upload.uploadError$}</p>
  <button onclick={upload.retryUpload}>Retry</button>
{/if}
```

## Available Stores

### Document Upload
```typescript
const upload = createDocumentUploadStore();

// State
$upload.state$              // Full XState snapshot
$upload.isUploading$        // boolean
$upload.uploadFile$         // File | null
$upload.uploadProgress$     // number (0-100)
$upload.uploadError$        // string | null

// Actions
upload.selectFile(file)     // Send FILE_SELECTED event
upload.retryUpload()        // Retry failed upload
upload.cancelUpload()       // Cancel operation
```

### Evidence Processing
```typescript
const evidence = createEvidenceProcessingStore();

// State
$evidence.isProcessing$     // boolean
$evidence.processingStep$   // string (e.g., "document_processing")
$evidence.processingError$  // string | null

// Actions
evidence.startProcessing(evidence)
evidence.skipStep()
evidence.retryStep()
```

### Case Management
```typescript
const cases = createCaseManagementStore();

// State
$cases.isLoading$           // boolean
$cases.currentCase$         // Case | null
$cases.cases$               // Case[]
$cases.managementError$     // string | null

// Actions
cases.loadCase(caseId)
cases.createCase(caseData)
cases.updateCase(caseData)
cases.deleteCase(caseId)
cases.searchCases(query)
```

### Legal Document Processing
```typescript
const docProcessing = createLegalDocumentProcessingStore();

// State
$docProcessing.isProcessing$     // boolean
$docProcessing.currentStage$     // 'ocr' | 'chunking' | 'embedding' | null

// Actions
docProcessing.uploadDocument(file)
docProcessing.cancelProcessing()
```

### CrewAI Orchestration
```typescript
const crew = createCrewAIOrchestrationStore();

// State
$crew.isOrchestrating$      // boolean
$crew.activeAgents$         // string[]
$crew.agentResponses$       // AgentResponse[]
$crew.recommendations$      // Recommendation[]
$crew.orchestrationError$   // string | null

// Actions
crew.startReview(task)
crew.acceptRecommendation(recommendationId)
crew.retryReview()
crew.cancelReview()
```

## Pattern Examples

### Example 1: Upload Component
```svelte
<script lang="ts">
  import { createDocumentUploadStore } from '$lib/stores/machineStores';

  const upload = createDocumentUploadStore();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) upload.selectFile(file);
  }
</script>

<div>
  <input type="file" onchange={handleFile} />

  {#if $upload.isUploading$}
    <progress value={$upload.uploadProgress$ || 0} max="100" />
  {:else if $upload.uploadError$}
    <div class="error">
      {$upload.uploadError$}
      <button onclick={upload.retryUpload}>Retry</button>
    </div>
  {:else if $upload.state$.matches('completed')}
    <p class="success">Upload complete!</p>
  {/if}
</div>
```

### Example 2: Case Search Form
```svelte
<script lang="ts">
  import { createCaseManagementStore } from '$lib/stores/machineStores';

  const cases = createCaseManagementStore();

  let searchQuery = '';

  function handleSearch() {
    cases.searchCases(searchQuery);
  }
</script>

<div>
  <input bind:value={searchQuery} placeholder="Search cases..." />
  <button onclick={handleSearch} disabled={$cases.isLoading$}>
    {$cases.isLoading$ ? 'Searching...' : 'Search'}
  </button>

  {#if $cases.managementError$}
    <p class="error">{$cases.managementError$}</p>
  {/if}

  <ul>
    {#each $cases.cases$ as case (case.id)}
      <li onclick={() => cases.loadCase(case.id)}>
        {case.name} - {case.status}
      </li>
    {/each}
  </ul>
</div>
```

### Example 3: Evidence Processing with Progress
```svelte
<script lang="ts">
  import { createEvidenceProcessingStore } from '$lib/stores/machineStores';

  const evidence = createEvidenceProcessingStore();

  function handleEvidenceUpload(file) {
    evidence.startProcessing(file);
  }
</script>

<div>
  {#if $evidence.isProcessing$}
    <div>
      <p>Processing: {$evidence.processingStep$}</p>
      <!-- Spinner or progress indicator -->
    </div>
  {:else if $evidence.processingError$}
    <p class="error">{$evidence.processingError$}</p>
    <button onclick={evidence.retryStep}>Retry</button>
    <button onclick={evidence.skipStep}>Skip</button>
  {:else}
    <button onclick={() => handleEvidenceUpload(...)}>
      Upload Evidence
    </button>
  {/if}
</div>
```

## Advanced Usage

### Combining Multiple Machines
```svelte
<script lang="ts">
  import { createCaseManagementStore } from '$lib/stores/machineStores';
  import { createEvidenceProcessingStore } from '$lib/stores/machineStores';

  const cases = createCaseManagementStore();
  const evidence = createEvidenceProcessingStore();

  function handleAddEvidence(file) {
    // Track which case this evidence belongs to
    evidence.startProcessing({
      file,
      caseId: $cases.currentCase$?.id
    });
  }
</script>

<!-- Template uses both stores -->
```

### Persisting Machine State
```typescript
// Save to localStorage
export function persistMachineState(store: any, key: string) {
  store.state$.subscribe((state) => {
    localStorage.setItem(key, JSON.stringify(state.context));
  });
}

// Restore from localStorage
export function restoreMachineState(key: string) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : undefined;
}

// Usage
const upload = createDocumentUploadStore();
persistMachineState(upload, 'upload-state');
```

### Combining with Svelte 5 Runes
```svelte
<script lang="ts">
  import { createCaseManagementStore } from '$lib/stores/machineStores';

  const cases = createCaseManagementStore();

  let selectedCaseId = $state<string | null>(null);

  $effect(() => {
    if (selectedCaseId) {
      cases.loadCase(selectedCaseId);
    }
  });
</script>

<select bind:value={selectedCaseId}>
  {#each $cases.cases$ as case (case.id)}
    <option value={case.id}>{case.name}</option>
  {/each}
</select>

<div>
  {#if $cases.currentCase$}
    <h2>{$cases.currentCase$.name}</h2>
    <p>{$cases.currentCase$.description}</p>
  {/if}
</div>
```

## Integration Checklist

- [ ] Import store creator from `$lib/stores/machineStores`
- [ ] Initialize store in component: `const store = createXxxStore()`
- [ ] Subscribe to derived stores: `$store.stateProp$`
- [ ] Send events via action methods: `store.actionName()`
- [ ] Add cleanup in destroy or component level
- [ ] Test state transitions in component
- [ ] Handle error states with error display
- [ ] Add loading indicators where appropriate

## Common Mistakes

❌ **Forgetting cleanup**
```svelte
// BAD - memory leak
const { cleanup } = useMachine(machine);
// cleanup never called
```

✅ **Using cleanup directive**
```svelte
// GOOD
<div use:machineCleanup={cleanup}>
  <!-- Component content -->
</div>
```

---

❌ **Direct snapshot access**
```svelte
// BAD - loses reactivity
const snapshot = $state.value;
// snapshot doesn't update
```

✅ **Using derived stores**
```svelte
// GOOD
const isLoading$ = machineState(state$, s => s.matches('loading'));
// $isLoading$ updates automatically
```

---

❌ **Sending wrong event types**
```svelte
// BAD - type mismatch
send({ type: 'FILE_SELECTED' }); // Missing 'file' property
```

✅ **Using convenience methods**
```svelte
// GOOD - type-safe
upload.selectFile(file); // Built-in with correct types
```
