# Quick Start: Using XState Stores in 30 Seconds

## 1. Import a Store
```svelte
<script>
  import { createDocumentUploadStore } from '$lib/stores/machineStores';

  const upload = createDocumentUploadStore();
</script>
```

## 2. Use Reactive State
```svelte
{#if $upload.isUploading$}
  <p>Uploading... {$upload.uploadProgress$}%</p>
{/if}
```

## 3. Call Actions
```svelte
<button onclick={() => upload.selectFile(file)}>
  Upload
</button>
```

Done! That's it.

---

## Available Stores

```typescript
createDocumentUploadStore()      // File upload workflow
createEvidenceProcessingStore()  // Evidence analysis
createCaseManagementStore()      // Case CRUD operations
createLegalDocumentProcessingStore() // OCR & embedding
createCrewAIOrchestrationStore() // Multi-agent AI
```

---

## Common Patterns

### Check Loading State
```svelte
{#if $store.isLoading$}
  <p>Loading...</p>
{/if}
```

### Display Progress
```svelte
<progress value={$store.progress$} max="100" />
<p>{$store.progress$}%</p>
```

### Handle Errors
```svelte
{#if $store.error$}
  <p class="error">{$store.error$}</p>
{/if}
```

### Show Current Data
```svelte
{#each $store.items$ as item (item.id)}
  <div>{item.name}</div>
{/each}
```

### Call Actions
```svelte
<button onclick={() => store.loadData()}>Load</button>
<button onclick={() => store.saveData(data)}>Save</button>
<button onclick={() => store.deleteItem(id)}>Delete</button>
```

---

## Real Example

```svelte
<script>
  import { createCaseManagementStore } from '$lib/stores/machineStores';

  const cases = createCaseManagementStore();

  function loadCases() {
    cases.loadCases(); // or cases.send({ type: 'LOAD' })
  }
</script>

<h1>Cases</h1>

{#if $cases.isLoading$}
  <p>Loading cases...</p>
{:else if $cases.error$}
  <p class="error">Error: {$cases.error$}</p>
  <button onclick={loadCases}>Retry</button>
{:else}
  <div>
    {#each $cases.cases$ as caseItem (caseItem.id)}
      <div class="case-card">
        <h3>{caseItem.name}</h3>
        <p>Status: {caseItem.status}</p>
        <button onclick={() => cases.selectCase(caseItem.id)}>
          Open
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .case-card {
    border: 1px solid #ddd;
    padding: 1rem;
    margin: 0.5rem 0;
    border-radius: 4px;
  }
</style>
```

---

## Store Methods

### Document Upload
```typescript
const upload = createDocumentUploadStore();

upload.selectFile(file)     // Select file to upload
upload.cancelUpload()       // Cancel in-progress upload
upload.retryUpload()        // Retry failed upload
```

### Case Management
```typescript
const cases = createCaseManagementStore();

cases.loadCases()           // Load all cases
cases.selectCase(id)        // Select a case
cases.createCase(data)      // Create new case
cases.updateCase(id, data)  // Update case
cases.deleteCase(id)        // Delete case
cases.searchCases(query)    // Search cases
```

### CrewAI Orchestration
```typescript
const crew = createCrewAIOrchestrationStore();

crew.startReview(task)              // Start AI review
crew.acceptRecommendation(id)       // Accept recommendation
crew.rejectRecommendation(id)       // Reject recommendation
crew.cancelReview()                 // Cancel review
```

### Evidence Processing
```typescript
const evidence = createEvidenceProcessingStore();

evidence.startProcessing()           // Start processing
evidence.addEvidenceItem(item)      // Add evidence
evidence.updateAnalysis(analysis)   // Update analysis
```

### Legal Document Processing
```typescript
const docs = createLegalDocumentProcessingStore();

docs.uploadDocument(file)            // Upload document
docs.processPage(pageNum)            // Process specific page
docs.generateSummary()               // Generate summary
```

---

## Reactive Stores (with $ prefix)

All stores expose reactive subscriptions using Svelte 5's `$` syntax:

```svelte
<!-- These automatically update when state changes -->
$upload.isUploading$        <!-- boolean -->
$upload.uploadProgress$     <!-- number 0-100 -->
$upload.uploadError$        <!-- string | null -->

$cases.isLoading$           <!-- boolean -->
$cases.cases$               <!-- Case[] -->
$cases.currentCase$         <!-- Case | null -->
$cases.error$               <!-- string | null -->

$crew.isOrchestrating$      <!-- boolean -->
$crew.activeAgents$         <!-- string[] -->
$crew.recommendations$      <!-- Recommendation[] -->
$crew.agentResponses$       <!-- AgentResponse[] -->
```

---

## No XState Knowledge Needed

You don't need to understand:
- XState state machines
- Actor systems
- Event dispatching (it's wrapped)
- Generic type parameters
- Type guards

The stores handle all of that. Just import and use.

---

## Where to Learn More

📖 **XSTATE_SVELTE_INTEGRATION.md** - Complete guide with 50+ examples
📝 **INTEGRATION_COMPLETE.md** - Detailed API reference
🔗 **machines-integration-example page** - Working demo

---

## That's It!

You're ready to use state machines in your SvelteKit app.

Start with:
```bash
npm run dev
```

Then visit:
```
http://localhost:5173/machines-integration-example
```

See it working. Copy the patterns. Build your features.

Happy coding! 🚀

