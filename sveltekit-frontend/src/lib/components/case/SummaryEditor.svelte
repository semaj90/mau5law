<script lang="ts">
  import type { CaseSummary } from '$lib/types/case-summary';

  export let summary: CaseSummary;

  let isEditing = false;
  let editedText = summary.text;
</script>

<div class="summary-editor">
  <div class="header">
    <h2>Case Summary</h2>
    <div class="meta">
      <span class="version">v{summary.version}</span>
      <span class="date">{new Date(summary.createdAt).toLocaleDateString()}</span>
    </div>
  </div>

  {#if isEditing}
    <textarea bind:value={editedText} class="editor" />
    <div class="editor-actions">
      <button class="btn-save" on:click={() => (isEditing = false)}>Save</button>
      <button class="btn-cancel" on:click={() => (isEditing = false)}>Cancel</button>
    </div>
  {:else}
    <div class="content">
      <div class="text">
        {summary.text}
      </div>

      {#if summary.holding}
        <div class="section">
          <h3>Holding</h3>
          <p>{summary.holding}</p>
        </div>
      {/if}

      {#if summary.citations && summary.citations.length > 0}
        <div class="section">
          <h3>Citations</h3>
          <ul class="citations">
            {#each summary.citations as citation}
              <li>
                <a href="#" class="citation-link">
                  {citation.code} ({citation.jurisdiction})
                </a>
                <span class="citation-title">{citation.title}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <div class="actions">
      <button class="btn-edit" on:click={() => (isEditing = true)}>Edit</button>
    </div>
  {/if}
</div>

<style>
  .summary-editor {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 1rem;
  }

  .header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .meta {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: #666;
  }

  .version {
    background-color: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  .content {
    margin-bottom: 1.5rem;
  }

  .text {
    line-height: 1.6;
    color: #333;
    margin-bottom: 1.5rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .section {
    margin-bottom: 1.5rem;
  }

  .section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #333;
  }

  .section p {
    margin: 0;
    color: #666;
    line-height: 1.5;
  }

  .citations {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .citations li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #f5f5f5;
  }

  .citations li:last-child {
    border-bottom: none;
  }

  .citation-link {
    color: #007bff;
    text-decoration: none;
    font-weight: 500;
  }

  .citation-link:hover {
    text-decoration: underline;
  }

  .citation-title {
    display: block;
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .editor {
    width: 100%;
    min-height: 300px;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
  }

  .editor-actions,
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .btn-save,
  .btn-cancel,
  .btn-edit {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .btn-save {
    background-color: #28a745;
    color: white;
  }

  .btn-save:hover {
    background-color: #218838;
  }

  .btn-cancel {
    background-color: #6c757d;
    color: white;
  }

  .btn-cancel:hover {
    background-color: #545b62;
  }

  .btn-edit {
    background-color: #007bff;
    color: white;
  }

  .btn-edit:hover {
    background-color: #0056b3;
  }
</style>
