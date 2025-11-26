<script lang="ts">
  /**
   * Preferences Page
   * Configure AI analysis settings, web search, theme
   * Part of Phase 74 Task 13: Theme and Preferences
   */
  import { ThemeToggle } from '$lib/components/ui';
  import type { Theme } from '$lib/types';

  let preferences = $state({
    theme: 'yorha' as Theme,
    autoSuggest: true,
    webSearchEnabled: true,
    codebaseIndexing: true,
    exportFormat: 'json' as 'json' | 'csv' | 'markdown',
    autoSaveInterval: 30, // seconds
    maxSuggestions: 5,
    confidenceThreshold: 0.7
  });

  let isSaving = $state(false);
  let saveMessage = $state('');

  async function handleSave() {
    isSaving = true;
    saveMessage = '';

    try {
      // Save to localStorage for now
      localStorage.setItem('preferences', JSON.stringify(preferences));
      saveMessage = '✓ Preferences saved successfully';

      // Reset message after 3 seconds
      setTimeout(() => {
        saveMessage = '';
      }, 3000);
    } catch (error) {
      saveMessage = '✗ Failed to save preferences';
    } finally {
      isSaving = false;
    }
  }

  function handleExport() {
    const data = JSON.stringify(preferences, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preferences-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (confirm('Reset all preferences to defaults?')) {
      preferences = {
        theme: 'yorha',
        autoSuggest: true,
        webSearchEnabled: true,
        codebaseIndexing: true,
        exportFormat: 'json',
        autoSaveInterval: 30,
        maxSuggestions: 5,
        confidenceThreshold: 0.7
      };
      handleSave();
    }
  }
</script>

<svelte:head>
  <title>Preferences | YoRHa Legal AI</title>
</svelte:head>

<div class="preferences-page">
  <header class="page-header">
    <h1>⚙️ Preferences</h1>
    <p>Configure your AI analysis and interface settings</p>
  </header>

  <div class="preferences-grid">
    <!-- Theme Section -->
    <section class="preference-section">
      <h2>🎨 Appearance</h2>

      <div class="preference-group">
        <label class="preference-label">
          <span>Theme</span>
          <span class="hint">Choose your preferred interface theme</span>
        </label>
        <ThemeToggle
          currentTheme={preferences.theme}
          onChange={(theme) => { preferences.theme = theme; }}
        />
      </div>
    </section>

    <!-- AI Analysis Section -->
    <section class="preference-section">
      <h2>🤖 AI Analysis</h2>

      <div class="preference-group">
        <label class="preference-checkbox">
          <input
            type="checkbox"
            bind:checked={preferences.autoSuggest}
          />
          <span>Enable Auto-Suggestions</span>
          <span class="hint">Show AI suggestions as you type</span>
        </label>
      </div>

      <div class="preference-group">
        <label class="preference-label">
          <span>Max Suggestions</span>
          <span class="hint">Number of suggestions to display</span>
        </label>
        <div class="input-group">
          <input
            type="range"
            min="1"
            max="10"
            bind:value={preferences.maxSuggestions}
            class="slider"
          />
          <span class="value-display">{preferences.maxSuggestions}</span>
        </div>
      </div>

      <div class="preference-group">
        <label class="preference-label">
          <span>Confidence Threshold</span>
          <span class="hint">Minimum confidence score for suggestions (0-1)</span>
        </label>
        <div class="input-group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            bind:value={preferences.confidenceThreshold}
            class="slider"
          />
          <span class="value-display">{(preferences.confidenceThreshold * 100).toFixed(0)}%</span>
        </div>
      </div>
    </section>

    <!-- Search & Context Section -->
    <section class="preference-section">
      <h2>🔍 Search & Context</h2>

      <div class="preference-group">
        <label class="preference-checkbox">
          <input
            type="checkbox"
            bind:checked={preferences.webSearchEnabled}
          />
          <span>Enable Web Search</span>
          <span class="hint">Search the web for additional context</span>
        </label>
      </div>

      <div class="preference-group">
        <label class="preference-checkbox">
          <input
            type="checkbox"
            bind:checked={preferences.codebaseIndexing}
          />
          <span>Enable Codebase Indexing</span>
          <span class="hint">Index your codebase for RAG context retrieval</span>
        </label>
      </div>
    </section>

    <!-- Auto-Save Section -->
    <section class="preference-section">
      <h2>💾 Auto-Save</h2>

      <div class="preference-group">
        <label class="preference-label">
          <span>Auto-Save Interval</span>
          <span class="hint">Save analysis results automatically (seconds)</span>
        </label>
        <div class="input-group">
          <input
            type="number"
            min="10"
            max="300"
            step="10"
            bind:value={preferences.autoSaveInterval}
            class="input-field"
          />
          <span class="unit">seconds</span>
        </div>
      </div>
    </section>

    <!-- Export Section -->
    <section class="preference-section">
      <h2>📤 Export</h2>

      <div class="preference-group">
        <label class="preference-label">
          <span>Export Format</span>
          <span class="hint">Default format for exporting analysis results</span>
        </label>
        <select bind:value={preferences.exportFormat} class="select-field">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>
    </section>
  </div>

  <!-- Actions -->
  <div class="preferences-actions">
    <div class="action-buttons">
      <button class="btn btn-primary" onclick={handleSave} disabled={isSaving}>
        {isSaving ? '💾 Saving...' : '💾 Save Preferences'}
      </button>
      <button class="btn btn-secondary" onclick={handleExport}>
        📥 Export Settings
      </button>
      <button class="btn btn-danger" onclick={handleReset}>
        🔄 Reset to Defaults
      </button>
    </div>

    {#if saveMessage}
      <div class="save-message" class:success={saveMessage.startsWith('✓')}>
        {saveMessage}
      </div>
    {/if}
  </div>
</div>

<style>
  .preferences-page {
    min-height: 100vh;
    padding: 2rem;
    background: var(--yorha-bg, #1a1a1a);
    color: var(--yorha-text, #d4d4d4);
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: var(--yorha-accent, #c8a84b);
  }

  .page-header p {
    color: var(--yorha-text-muted, #888);
    margin: 0;
  }

  .preferences-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto 2rem;
  }

  .preference-section {
    background: var(--yorha-bg-secondary, #2a2a2a);
    border: 1px solid var(--yorha-border, #4a4a4a);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .preference-section h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--yorha-text, #d4d4d4);
  }

  .preference-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .preference-group:last-child {
    margin-bottom: 0;
  }

  .preference-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-weight: 500;
    color: var(--yorha-text, #d4d4d4);
  }

  .preference-label span:first-child {
    font-size: 0.95rem;
  }

  .hint {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--yorha-text-muted, #888);
  }

  .preference-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
  }

  .preference-checkbox input {
    margin-top: 0.25rem;
    cursor: pointer;
  }

  .preference-checkbox span:first-of-type {
    font-weight: 500;
    color: var(--yorha-text, #d4d4d4);
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .slider {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--yorha-bg, #1a1a1a);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--yorha-accent, #c8a84b);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--yorha-accent, #c8a84b);
    cursor: pointer;
    border: none;
  }

  .value-display {
    min-width: 3rem;
    text-align: right;
    font-weight: 600;
    color: var(--yorha-accent, #c8a84b);
  }

  .input-field,
  .select-field {
    padding: 0.625rem 0.875rem;
    background: var(--yorha-bg, #1a1a1a);
    border: 1px solid var(--yorha-border, #4a4a4a);
    border-radius: 4px;
    color: var(--yorha-text, #d4d4d4);
    font-size: 0.9rem;
  }

  .input-field:focus,
  .select-field:focus {
    outline: none;
    border-color: var(--yorha-accent, #c8a84b);
  }

  .unit {
    color: var(--yorha-text-muted, #888);
    font-size: 0.85rem;
  }

  .preferences-actions {
    max-width: 1200px;
    margin: 0 auto;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--yorha-accent, #c8a84b);
    color: var(--yorha-bg, #1a1a1a);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--yorha-accent-hover, #d4b85c);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--yorha-bg-secondary, #2a2a2a);
    color: var(--yorha-text, #d4d4d4);
    border: 1px solid var(--yorha-border, #4a4a4a);
  }

  .btn-secondary:hover {
    background: var(--yorha-bg-hover, #333);
  }

  .btn-danger {
    background: var(--yorha-error, #ef4444);
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  .save-message {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.1);
    color: var(--yorha-error, #ef4444);
    text-align: center;
  }

  .save-message.success {
    background: rgba(74, 222, 128, 0.1);
    color: var(--yorha-success, #4ade80);
  }

  @media (max-width: 640px) {
    .preferences-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
