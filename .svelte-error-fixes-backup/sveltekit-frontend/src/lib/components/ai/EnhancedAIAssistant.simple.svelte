<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { Brain, Loader2, Quote, Search, Settings, Trash2 } from 'lucide-svelte';

  // Exported props (Svelte 5)
  export let caseId: string | undefined = undefined;
  export let evidenceIds: string[] = [];
  export let placeholder: string = 'Ask AI about this case...';
  export let maxHeight: string = '400px';
  export let showReferences: boolean = true;
  export let enableVoiceInput: boolean = false;
  export let ondispatch: ((citation: string) => void) | undefined;

  // State
  let query = $state('');
  let isLoading = $state(false);
  let messages = $state<any[]>([]);
  let showSettings = $state(false);
  let showCitationDialog = $state(false);
  let selectedCitation = $state('');
  let selectedModel = $state('gpt-4');
  let searchThreshold = $state(0.7);
  let maxResults = $state(5);
  let temperature = $state(0.7);
  let enabledSources = $state(['cases', 'statutes', 'regulations', 'secondary']);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!query.trim() || isLoading) return;
    isLoading = true;
    const userMessage = { role: 'user', content: query };
    messages = [...messages, userMessage];
    query = '';
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: `Based on the case information provided, here are my findings regarding "${userMessage.content}":\n  This appears to be a question about legal precedent and case law. The relevant statutes and regulations would need to be analyzed in the context of your specific jurisdiction.\n  Key considerations:\n  1. Applicable statutory framework\n  2. Relevant case precedents\n  3. Jurisdictional variations\n  4. Current regulatory environment\n  Would you like me to elaborate on any of these aspects?`,
        references: [
          {
            title: 'Smith v. Jones',
            citation: '123 F.3d 456 (2023)',
            relevance: 0.9,
          },
          {
            title: '42 U.S.C. § 1983',
            citation: 'Federal Civil Rights Statute',
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
    ondispatch?.(selectedCitation);
    showCitationDialog = false;
  }
  function clearMessages() {
    messages = [];
  }
</script>

<div class="ai-assistant-container">
  <div style="max-height: {maxHeight}; display: flex; flex-direction: column; height: 100%;">
    <div class="chat-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <Brain />
        <h3>Legal AI Assistant</h3>
        {#if caseId}
          <span>Case: {caseId}</span>
        {/if}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          class="btn-icon"
          onclick={() => (showSettings = !showSettings)}
          title="Settings"
          aria-label="Open settings"
        >
          <Settings aria-hidden="true" />
        </button>
        <button
          type="button"
          class="btn-icon"
          onclick={() => clearMessages()}
          title="Clear conversation"
          aria-label="Clear conversation"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="messages-container">
      {#each messages as message}
        <div class="message {message.role}">
          <div class="message-content">
            {message.content}
          </div>
          {#if message.references && showReferences}
            <div class="references">
              <h4 class="references-title">References:</h4>
              {#each message.references as reference}
                <button
                  type="button"
                  class="reference-item"
                  onclick={() => handleReferenceClick(reference)}
                  aria-label={`Open reference ${reference.title}`}
                >
                  <Quote aria-hidden="true" />
                  <span class="reference-title">{reference.title}</span>
                  <span class="reference-citation">{reference.citation}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      {#if isLoading}
        <div class="message assistant">
          <div style="display: flex; align-items: center; gap: 8px;">
            <Loader2 class="animate-spin" />
            Analyzing your query...
          </div>
        </div>
      {/if}
    </div>

    <form class="chat-input" onsubmit={handleSubmit}>
      <div class="input-container">
        <input type="text" bind:value={query} {placeholder} disabled={isLoading} class="chat-input-field" />
        <button type="submit" disabled={!query.trim() || isLoading} class="chat-submit-btn" aria-label="Send message">
          <Search aria-hidden="true" />
        </button>
      </div>
    </form>
  </div>

  {#if showSettings}
    <div class="settings-panel">
      <div class="settings-header">
        <h4 class="settings-title">AI Assistant Settings</h4>
        <button type="button" class="btn-close" onclick={() => (showSettings = false)} aria-label="Close settings"
          >×</button
        >
      </div>
      <div class="settings-content">
        <div class="setting-group">
          <label for="model-select">Model:</label>
          <select id="model-select" bind:value={selectedModel}>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3">Claude 3</option>
          </select>
        </div>
        <div class="setting-group">
          <label for="temperature-range">Temperature: {temperature}</label>
          <input id="temperature-range" type="range" min="0" max="1" step="0.1" bind:value={temperature} />
        </div>
        <div class="setting-group">
          <label for="threshold-range">Search Threshold: {searchThreshold}</label>
          <input id="threshold-range" type="range" min="0" max="1" step="0.1" bind:value={searchThreshold} />
        </div>
        <div class="setting-group">
          <label for="max-results">Max Results:</label>
          <input id="max-results" type="number" min="1" max="20" bind:value={maxResults} />
        </div>
      </div>
    </div>
  {/if}

  {#if showCitationDialog}
    <div
      class="dialog-overlay"
      tabindex="0"
      onclick={() => (showCitationDialog = false)}
      onkeydown={e => {
        if (e.key === 'Escape') showCitationDialog = false;
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-dialog-title"
    >
      <div
        class="dialog-content"
        role="document"
        tabindex="-1"
        onclick={e => e.stopPropagation()}
        onkeydown={e => e.stopPropagation()}
      >
        <div class="dialog-header">
          <h4 class="dialog-title" id="citation-dialog-title">
            <Quote />
            Legal Citation
          </h4>
          <button
            type="button"
            class="btn-close"
            onclick={() => (showCitationDialog = false)}
            aria-label="Close citation dialog">×</button
          >
        </div>

        <div class="dialog-body">
          <div class="citation-display">
            <p>{selectedCitation}</p>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn-primary" onclick={() => insertCitation()} aria-label="Insert citation"
              >Insert Citation</button
            >
            <button
              type="button"
              class="btn-secondary"
              onclick={() => navigator.clipboard.writeText(selectedCitation)}
              aria-label="Copy citation to clipboard"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-close" onclick={() => (showCitationDialog = false)} aria-label="Close dialog"
            >Close</button
          >
        </div>
      </div>
    </div>
  {/if}
</div>
and ensure it ends cleanly. I'll update that file. Now I'll apply the patch. (Next message will show the patch.)

<style>
  /* @unocss-include */
  .ai-assistant-container {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
}
  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    max-height: 300px;
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
  .message-content {
    white-space: pre-wrap;
    line-height: 1.5;
}
  .references {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
}
  .references-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
}
  .reference-item {
    display: flex;
    align-items: center;
The create_file call created the new file with cleaned content. Now I should remove the duplicated trailing CSS in the original archived file to avoid confusion. I'll patch the archive file to remove the trailing stray CSS after the closing
</style>
