<script lang="ts">
  let { statute, onExplain, onViewPDF } = $props<{
    statute: any;
    onExplain: (sectionId: string) => void;
    onViewPDF: (title: string) => void;
  }>();

  let isExplaining = $state(false);
  let explanation = $state<string | null>(null);
</script>

<article class="column">
  <header class="column-header">
    <div class="column-title">
      <h3>{statute.title}</h3>
      <small>{statute.section}</small>
    </div>
    <div class="column-meta">
      <span class="category">{statute.category}</span>
      <span class="jurisdiction">{statute.jurisdiction}</span>
    </div>
  </header>

  <div class="column-body">
    <div class="statute-text">
      {statute.content}
    </div>
  </div>

  <footer class="column-footer">
    <div class="actions">
      <button
        class="action-btn"
        onclick={() => {
          isExplaining = true;
          onExplain(statute.id);
        }}
        disabled={isExplaining}
      >
        {isExplaining ? '⏳ Explaining...' : '💡 Explain this section'}
      </button>

      <button
        class="action-btn secondary"
        onclick={() => onViewPDF(statute.title)}
      >
        📄 View Source PDF
      </button>

      <button
        class="action-btn secondary"
        onclick={() => {
          const citation = `${statute.title}`;
          navigator.clipboard.writeText(citation);
        }}
      >
        📋 Copy Citation
      </button>
    </div>

    {#if explanation}
      <div class="explanation-panel">
        <h4>AI Explanation</h4>
        <div class="explanation-content">
          {explanation}
        </div>
      </div>
    {/if}
  </footer>
</article>

<style>
  .column {
    max-width: 600px;
    padding: 1rem 1.25rem;
    font-family: var(--font-sans);
    background-color: #fff;
    border-right: 1px dotted #e0e0e0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .column-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .column-title h3 {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .column-title small {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: #0066cc;
  }

  .column-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
  }

  .category,
  .jurisdiction {
    padding: 0.25rem 0.5rem;
    background-color: #f0f0f0;
    border-radius: 3px;
    color: #666;
  }

  .column-body {
    flex: 1;
    overflow-y: auto;
  }

  .statute-text {
    font-size: 0.95rem;
    line-height: 1.8;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .column-footer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px dotted #e0e0e0;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fff;
    color: #1a1a1a;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .action-btn:hover:not(:disabled) {
    background-color: #f5f5f5;
    border-color: #0066cc;
    color: #0066cc;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .action-btn.secondary {
    background-color: #fafafa;
    border-color: #e0e0e0;
    color: #666;
  }

  .action-btn.secondary:hover:not(:disabled) {
    background-color: #f0f0f0;
  }

  .explanation-panel {
    padding: 1rem;
    background-color: #faf1a0;
    border: 1px solid #e8e0a0;
    border-radius: 4px;
  }

  .explanation-panel h4 {
    font-family: var(--font-serif);
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .explanation-content {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>
