<!-- @migration-task Error while migrating Svelte code: Attributes need to be unique -->
<!-- Enhanced AI Assistant - Simplified Version -->
<script lang="ts">
  import {
    Brain,
    Loader2,
    Quote,
    Search,
    Settings,
    Trash2,
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";

  let { caseId = $bindable() } = $props(); // string | undefined = undefined;
  export const evidenceIds: string[] = []; // External reference for evidence context;
  let { placeholder = $bindable() } = $props(); // "Ask AI about this case...";
  let { maxHeight = $bindable() } = $props(); // "400px";
  let { showReferences = $bindable() } = $props(); // true;

  const dispatch = createEventDispatcher();

  // State
  let query = $state("");
  let isLoading = $state(false);
  let messages = $state<any[] >([]);
  let showSettings = $state(false);
  let showCitationDialog = $state(false);
  let selectedCitation = $state("");

  // Settings
  let selectedModel = $state("gpt-4");
  let temperature = $state(0.7);
  let searchThreshold = $state(0.7);
  let maxResults = $state(5);

  async function handleSubmit() {
    if (!query.trim() || isLoading) return;

    isLoading = true;
    const userMessage = { role: "user", content: query };
    messages = [...messages, userMessage];
    query = "";

    // Mock AI response
    setTimeout(() => {
      const aiResponse = {
        role: "assistant",
        content: `Based on your query about "${userMessage.content}", here's my analysis:

  This is a legal matter that requires careful consideration of relevant statutes, case law, and regulatory frameworks. The key factors to consider include:

  1. Jurisdictional requirements
  2. Applicable legal precedents
  3. Statutory framework
  4. Regulatory compliance

  I can provide more specific guidance if you share additional details about your case context.`,
        references: [
          {
            title: "Relevant Case Law",
            citation: "Example v. Case, 123 F.3d 456 (2023)",
            relevance: 0.9,
          },
          {
            title: "Statutory Reference",
            citation: "42 U.S.C. § 1983",
            relevance: 0.8,
          },
        ],
      };

      messages = [...messages, aiResponse];
      isLoading = false;
    }, 1500);
  }
  function handleReferenceClick(reference: any) {
    selectedCitation = `${reference.title} - ${reference.citation}`;
    showCitationDialog = true;
  }
  function insertCitation() {
    dispatch("citation-inserted", selectedCitation);
    showCitationDialog = false;
  }
  function clearMessages() {
    messages = [];
  }
</script>

<div class="container mx-auto px-4">
  <!-- Header -->
  <div class="flex justify-between items-center mb-6">
    <div class="flex items-center gap-3">
      <Brain class="w-6 h-6 text-blue-600" />
      <h3>Legal AI Assistant</h3>
      {#if caseId}
        <span class="text-sm text-gray-600">Case: {caseId}</span>
      {/if}
    </div>
    <div class="flex gap-2">
      <button
        class="p-2 hover:bg-gray-100 rounded"
        onclick={() => (showSettings = !showSettings)}
        title="Settings"
      >
        <Settings class="w-4 h-4" />
      </button>
      <button class="p-2 hover:bg-gray-100 rounded" onclick={() => clearMessages()} title="Clear">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto mb-4" style="max-height: {maxHeight}">
    {#each messages as message}
      <div class="mb-4 p-4 border rounded-lg">
        <div class="message-content">
          {message.content}
        </div>

        {#if message.references && showReferences}
          <div class="mt-2 space-y-2">
            <h4>References:</h4>
            {#each message.references as reference}
              <button
                class="flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded"
                onclick={() => handleReferenceClick(reference)}
              >
                <Quote class="w-4 h-4" />
                <span class="font-medium">{reference.title}</span>
                <span class="text-sm text-gray-600">{reference.citation}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    {#if isLoading}
      <div class="flex items-center gap-2 p-4">
        <div class="flex items-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          Analyzing your query...
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <form class="flex gap-2" onsubmit|preventDefault={handleSubmit}>
    <input
      type="text"
      bind:value={query}
      {placeholder}
      disabled={isLoading}
      class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      type="submit"
      disabled={!query.trim() || isLoading}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      <Search class="w-4 h-4" />
    </button>
  </form>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="container mx-auto px-4">
      <div class="container mx-auto px-4">
        <h4>Settings</h4>
        <button class="container mx-auto px-4" onclick={() => (showSettings = false)}
          >×</button
        >
      </div>

      <div class="container mx-auto px-4">
        <div class="container mx-auto px-4">
          <label for="model">Model:</label>
          <select id="model" bind:value={selectedModel}>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
          </select>
        </div>

        <div class="container mx-auto px-4">
          <label for="temp">Temperature: {temperature}</label>
          <input
            id="temp"
            type="range"
            min="0"
            max="1"
            step="0.1"
            bind:value={temperature}
          />
        </div>

        <div class="container mx-auto px-4">
          <label for="threshold">Search Threshold: {searchThreshold}</label>
          <input
            id="threshold"
            type="range"
            min="0"
            max="1"
            step="0.1"
            bind:value={searchThreshold}
          />
        </div>

        <div class="container mx-auto px-4">
          <label for="max">Max Results:</label>
          <input
            id="max"
            type="number"
            min="1"
            max="20"
            bind:value={maxResults}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- Citation Dialog -->
  {#if showCitationDialog}
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-dialog-title"
      tabindex={-1}
      onclick={() => (showCitationDialog = false)}
      keydown={(e) => e.key === "Escape" && (showCitationDialog = false)}
    >
      <div
        class="bg-white p-6 rounded-lg w-96 max-w-full"
        role="document"
        onclick
        keydown={(e) => {
          if (e.key === "Escape") {
            showCitationDialog = false;
          }
        }}
        <div class="flex items-center gap-2 mb-4">
          <h4 id="citation-dialog-title">
            <Quote class="w-5 h-5" /> Legal Citation
          </h4>
        </div>

        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded">
            <p>{selectedCitation}</p>
          </div>

          <div class="flex gap-2">
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick={() => insertCitation()}>
              Insert Citation
            </button>
            <button
              class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              onclick={() => navigator.clipboard.writeText(selectedCitation)}
            >
              Copy
            </button>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onclick={() => (showCitationDialog = false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* @unocss-include */
  .ai-assistant {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
}
  .title-section {
    display: flex;
    align-items: center;
    gap: 8px;
}
  .title-section h3 {
    margin: 0;
    font-weight: 600;
    color: #111827;
}
  .case-badge {
    font-size: 0.75rem;
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 8px;
    border-radius: 12px;
}
  .controls {
    display: flex;
    gap: 4px;
}
  .icon-btn {
    padding: 6px;
    border: none;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
}
  .icon-btn:hover {
    background: #f3f4f6;
    color: #374151;
}
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    min-height: 200px;
}
  .message {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
}
  .message.user {
    background: #dbeafe;
    margin-left: 20%;
    text-align: right;
}
  .message.assistant {
    background: #f3f4f6;
    margin-right: 20%;
}
  .content {
    white-space: pre-wrap;
    line-height: 1.5;
}
  .references {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
}
  .references h4 {
    margin: 0 0 8px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
}
  .reference {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: left;
}
  .reference:hover {
    background: #f9fafb;
    border-color: #d1d5db;
}
  .ref-title {
    font-weight: 500;
    color: #111827;
}
  .ref-citation {
    color: #6b7280;
    font-size: 0.875rem;
}
  .input-form {
    display: flex;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid #e5e7eb;
}
  .input {
    flex: 1;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.2s;
}
  .input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
  .submit-btn {
    padding: 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
}
  .submit-btn:hover:not(:disabled) {
    background: #2563eb;
}
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
  .settings-panel {
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    background: white;
    border-left: 1px solid #e5e7eb;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 10;
}
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
}
  .settings-header h4 {
    margin: 0;
    font-weight: 600;
    color: #111827;
}
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
}
  .settings-content {
    padding: 16px;
}
  .setting {
    margin-bottom: 16px;
}
  .setting label {
    display: block;
    margin-bottom: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}
  .setting select,
  .setting input[type="number"] {
    width: 100%;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    outline: none;
}
  .setting input[type="range"] {
    width: 100%;
}
.modal {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}
  .modal-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
}
  .modal-header h4 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #111827;
}
  .modal-body {
    padding: 16px;
}
  .citation-box {
    padding: 16px;
    background: #f9fafb;
    border-radius: 6px;
    margin-bottom: 16px;
    border-left: 4px solid #3b82f6;
}
  .modal-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}
  .btn-primary {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
}
  .btn-primary:hover {
    background: #2563eb;
}
  .btn-secondary {
    padding: 8px 16px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
}
  .btn-secondary:hover {
    background: #4b5563;
}
  .modal-footer {
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    text-align: right;
}
  .btn-close {
    padding: 8px 16px;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}
  .btn-close:hover {
    background: #e5e7eb;
}
</style>

<!-- TODO: migrate export lets to $props(); CommonProps assumed. -->

