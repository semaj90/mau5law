<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/button/Button.svelte';

  let title = $state('');
  let caseNumber = $state('');
  let description = $state('');
  let status = $state<'active' | 'pending' | 'closed'>('active');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    try {
      loading = true;
      error = null;

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          case_number: caseNumber,
          description,
          status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        goto(`/cases/${data.id}`);
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to create case';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error creating case';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Case - Legal AI Platform</title>
</svelte:head>

<div class="create-case-page">
  <header class="page-header">
    <h1>Create New Case</h1>
  </header>

  <div class="form-container">
    {#if error}
      <div class="error-banner">
        ⚠️ {error}
      </div>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="form-field">
        <label for="title">Case Title *</label>
        <input id="title" type="text" bind:value={title} required disabled={loading} />
      </div>

      <div class="form-field">
        <label for="caseNumber">Case Number</label>
        <input id="caseNumber" type="text" bind:value={caseNumber} disabled={loading} />
      </div>

      <div class="form-field">
        <label for="description">Description</label>
        <textarea id="description" bind:value={description} disabled={loading} rows="5"></textarea>
      </div>

      <div class="form-field">
        <label for="status">Status</label>
        <select id="status" bind:value={status} disabled={loading}>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div class="form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Case'}
        </Button>
        <Button type="button" variant="outline" on:click={() => goto('/cases')}>Cancel</Button>
      </div>
    </form>
  </div>
</div>

<style>
  .create-case-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: bold;
  }

  .form-container {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .error-banner {
    background: #fee;
    border: 1px solid #fcc;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    color: #c00;
  }

  .form-field {
    margin-bottom: 1.5rem;
  }

  .form-field label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500,
  }

  .form-field input,
  .form-field textarea,
  .form-field select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-field input:focus,
  .form-field textarea:focus,
  .form-field select:focus {
    outline: none;
    border-color: #0066cc;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }
</style>
