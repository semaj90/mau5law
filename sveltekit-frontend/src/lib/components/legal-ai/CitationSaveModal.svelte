<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isOpen = false;
  export let selectedText = '';

  const dispatch = createEventDispatcher();

  let statuteCode = '';
  let statuteTitle = '';
  let jurisdiction = '';
  let severity = '';
  let year = '';
  let notes = '';
  let isSaving = false;

  const jurisdictions = ['Federal', 'CA', 'NY', 'TX', 'FL', 'Other'];
  const severities = ['Infraction', 'Misdemeanor', 'Felony', 'Other'];

  function resetForm() {
    statuteCode = '';
    statuteTitle = '';
    jurisdiction = '';
    severity = '';
    year = '';
    notes = '';
  }

  async function handleSave() {
    if (!statuteCode) {
      alert('Statute code is required');
      return;
    }

    isSaving = true;

    try {
      const response = await fetch('/api/citations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statute_code: statuteCode,
          statute_title: statuteTitle,
          jurisdiction: jurisdiction || undefined,
          severity: severity || undefined,
          year: year ? parseInt(year) : undefined,
          highlighted_text: selectedText,
          notes: notes || undefined,
          source_type: 'manual',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          dispatch('saved', data.citation);
          resetForm();
          isOpen = false;
        } else {
          alert(data.error || 'Failed to save citation');
        }
      } else {
        alert('Failed to save citation');
      }
    } catch (error) {
      console.error('Error saving citation:', error);
      alert('Error saving citation');
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    resetForm();
    isOpen = false;
    dispatch('cancel');
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Save Citation</h2>
        <button class="close-btn" on:click={handleCancel}>✕</button>
      </div>

      <div class="modal-content">
        <div class="form-group">
          <label for="statute-code">Statute Code *</label>
          <input
            id="statute-code"
            type="text"
            bind:value={statuteCode}
            placeholder="e.g., 42 U.S.C. § 1983"
            disabled={isSaving}
          />
        </div>

        <div class="form-group">
          <label for="statute-title">Statute Title</label>
          <input
            id="statute-title"
            type="text"
            bind:value={statuteTitle}
            placeholder="e.g., Civil Rights Action"
            disabled={isSaving}
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="jurisdiction">Jurisdiction</label>
            <select id="jurisdiction" bind:value={jurisdiction} disabled={isSaving}>
              <option value="">Select...</option>
              {#each jurisdictions as j}
                <option value={j}>{j}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="severity">Severity</label>
            <select id="severity" bind:value={severity} disabled={isSaving}>
              <option value="">Select...</option>
              {#each severities as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="year">Year</label>
            <input
              id="year"
              type="number"
              bind:value={year}
              placeholder="e.g., 2020"
              disabled={isSaving}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            bind:value={notes}
            placeholder="Add any notes about this citation..."
            disabled={isSaving}
            rows="3"
          ></textarea>
        </div>

        {#if selectedText}
          <div class="highlighted-text">
            <strong>Highlighted Text:</strong>
            <p>{selectedText}</p>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={handleCancel} disabled={isSaving}>
          Cancel
        </button>
        <button class="btn-primary" on:click={handleSave} disabled={isSaving}>
          {#if isSaving}
            Saving...
          {:else}
            Save Citation
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid #d4a574;
  }

  .modal-header h2 {
    margin: 0;
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 1.5rem;
    color: #2c2c2c;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
  }

  .close-btn:hover {
    color: #2c2c2c;
  }

  .modal-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }

  label {
    font-weight: 600;
    color: #2c2c2c;
    font-size: 0.9rem;
  }

  input,
  select,
  textarea {
    padding: 0.75rem;
    border: 1px solid #d4a574;
    border-radius: 4px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.95rem;
    color: #2c2c2c;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #8b4513;
    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background-color: #f0ebe0;
    color: #999;
  }

  .highlighted-text {
    padding: 1rem;
    background-color: #f5f1e8;
    border-left: 3px solid #ffd700;
    border-radius: 4px;
  }

  .highlighted-text strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #2c2c2c;
  }

  .highlighted-text p {
    margin: 0;
    color: #333;
    font-style: italic;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e0d5c7;
    background-color: #f9f7f4;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #8b4513;
    color: #f5f1e8;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #a0522d;
  }

  .btn-primary:disabled {
    background-color: #d4a574;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #e0d5c7;
    color: #2c2c2c;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #d4a574;
  }

  .btn-secondary:disabled {
    background-color: #f0ebe0;
    color: #999;
    cursor: not-allowed;
  }
</style>
