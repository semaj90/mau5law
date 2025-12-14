<script lang="ts">
import type { Document } from '$lib/types'; import type { superForm  } from 'sveltekit-superforms'; import type { zod  } from 'sveltekit-superforms/adapters'; import { SearchFormSchema  } from './+page.server'; import type { PageData } from './$types'; const { data } = $props<{ data: PageData }>() const { searchState } = $props<{ searchState: { results: Array<{ id: string }>() title: string, content: string; similarity: number }>; query: string; responseTime: number;, timestamp: string} | null = null; const { form, errors, isSubmitting, constraints, enhance } = superForm( data.form, {
      validators: zod(SearchFormSchema); taintedMessage: 'Update search to apply changes'
    } ); let showAdvanced = $state <boolean>(false); let expandedResults = $state <Set<string>>(new Set()); function toggleResult(id: string) { if (expandedResults.has(id)) { expandedResults.delete(id)} else { expandedResults.add(id)}
    expandedResults = expandedResults}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .search-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Press Start 2P', monospace;
  }

  .search-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .search-header h1 {
    font-size: 2rem;
    color: #d4af37;
    margin-bottom: 0.5rem;
  }

  .search-header p {
    color: #999;
    font-size: 0.9rem;
  }

  .search-form {
    background: #1a1d20;
    border: 3px solid #d4af37;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    color: #d4af37;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .form-group input[type='text'],
  .form-group input[type='number'] {
    width: 100%;
    padding: 0.75rem;
    background: #212529;
    color: #fff;
    border: 2px solid #555;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .form-group input:focus {
    outline: none;
    border-color: #d4af37;
    box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
  }

  .form-group input.error {
    border-color: #ff4444;
  }

  .error-message {
    display: block;
    color: #ff4444;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  .toggle-advanced {
    background: transparent;
    color: #d4af37;
    border: none;
    cursor: pointer;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    padding: 0;
    margin-bottom: 1rem;
  }

  .toggle-advanced:hover {
    text-decoration: underline;
  }

  .advanced-options {
    background: #0d0f12;
    border-left: 3px solid #d4af37;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .threshold-value {
    color: #d4af37;
    font-weight: bold;
    margin-left: 1rem;
  }

  .btn-search {
    width: 100%;
    padding: 1rem;
    background: #d4af37;
    color: #000;
    border: none;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-search:hover:not(:disabled) {
    background: #e6c547;
  }

  .btn-search:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #000;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .error-alert {
    background: #4a0000;
    border: 2px solid #ff4444;
    color: #ff8888;
    padding: 1rem;
    margin-top: 1rem;
    font-size: 0.8rem;
  }

  .results-section {
    margin-top: 2rem;
  }

  .results-header {
    margin-bottom: 1.5rem;
  }

  .results-header h2 {
    color: #d4af37;
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
  }

  .query-text {
    color: #fff;
  }

  .results-meta {
    color: #999;
    font-size: 0.8rem;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-card {
    background: #1a1d20;
    border: 2px solid #444;
    padding: 1rem;
    display: flex;
    gap: 1rem;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .result-card:hover {
    border-color: #d4af37;
  }

  .result-card.expanded {
    border-color: #d4af37;
  }

  .result-toggle {
    background: transparent;
    border: none;
    color: #d4af37;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    flex-shrink: 0;
  }

  .toggle-icon {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
  }

  .result-content {
    flex: 1;
  }

  .result-content h3 {
    color: #d4af37;
    font-size: 1rem;
    margin:
      0,
      0 0.5rem 0;
  }

  .result-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
  }

  .similarity-score {
    color: #4ade80;
    font-weight: bold;
  }

  .result-preview {
    color: #ccc;
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 0.5rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .no-results {
    text-align: center;
    padding: 2rem;
    background: #1a1d20;
    border: 2px dashed #d4af37;
    color: #999;
  }

  .no-results p {
    margin: 0.5rem 0;
  }

  .no-results strong {
    color: #d4af37;
  }
</style>
