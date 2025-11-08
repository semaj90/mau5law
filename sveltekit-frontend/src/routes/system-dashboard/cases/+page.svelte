<script lang="ts">
  // Removed problematic UI imports (they caused module/type errors)
  // import Button from '$lib/components/ui/enhanced-bits/Button.svelte';
  // import Card from '$lib/components/ui/enhanced-bits/Card.svelte';
  // import Input from '$lib/components/ui/enhanced-bits/Input.svelte';

  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  type Case = {
    id: string;
    title: string;
    status: string;
    progress: number;
    evidenceCount: number;
    lastUpdate: string | number | Date;
  };

  // Use SvelteKit runes-mode pattern for receiving server data
  const props = $props<PageData & { cases?: Case[] }>();

  // local mutable cases state (initialized from server data)
  let cases: Case[] = props?.cases ?? [];

  // Svelte 5 runes-style reactive local state for correct updates
  // (replace older plain `let searchQuery = ''` which caused non-reactive-update errors)
  let searchQuery = $state('');

  // typed helper that returns filtered cases
  function filteredCases(): Case[] {
    const q = (searchQuery ?? '').toString().trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => c.title.toLowerCase().includes(q));
  }

  // load cases from API on mount
  onMount(() => {
    (async () => {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          cases = (await res.json()) as Case[];
        } else {
          console.warn('Failed to load cases:', res.status);
        }
      } catch (err) {
        console.error('Error fetching cases:', err);
      }
    })();
  });

  async function runAnalysis(caseId: string): Promise<void> {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      });
      if (!res.ok) throw new Error(`analysis failed: ${res.status}`);
      const updated = await res.json();
      cases = cases.map((c) => (c.id === caseId ? { ...c, ...updated } : c));
    } catch (err) {
      console.error('Triggering AI analysis failed:', err);
    }
  }

  async function generateReport(caseId: string): Promise<void> {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report' }),
      });
      if (!res.ok) throw new Error(`report failed: ${res.status}`);
      const updated = await res.json();
      cases = cases.map((c) => (c.id === caseId ? { ...c, ...updated } : c));
    } catch (err) {
      console.error('Generating report failed:', err);
    }
  }

  async function deleteCase(caseId: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete this case? This action cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      cases = cases.filter((c) => c.id !== caseId);
    } catch (err) {
      console.error('Deleting case failed:', err);
    }
  }

  async function openEvidenceBoard(caseId: string): Promise<void> {
    await goto(`/evidenceboard?case=${caseId}`);
  }
  async function openDetails(caseId: string): Promise<void> {
    await goto(`/system-dashboard/cases/${caseId}`);
  }
</script>

<main class="cases-dashboard">
  <header class="header">
    <div class="title">Cases</div>
    <div class="subtitle">System dashboard — reconstructed UI</div>
  </header>

  <section class="controls">
    <!-- Use native input to avoid missing component module/type issues -->
    <input
      class="search-input"
      bind:value={searchQuery}
      placeholder="Search cases..."
      aria-label="Search cases"
    />
    <button
      class="btn"
      onclick={() => {
        /* optional refresh action */
      }}>Search</button
    >
  </section>

  <section class="cases-grid">
    {#each filteredCases() as c (c.id)}
      <!-- Use native article element instead of Card component to avoid prop typing errors -->
      <article class="case-card">
        <div class="case-header">
          <h3>{c.title}</h3>
          <div class="case-actions">
            <button class="btn" onclick={() => openDetails(c.id)}>Open</button>
            <button class="btn" onclick={() => openEvidenceBoard(c.id)}>Evidence</button>
            <button class="btn" onclick={() => runAnalysis(c.id)}>Analyze</button>
            <button class="btn" onclick={() => generateReport(c.id)}>Report</button>
            <button class="btn danger" onclick={() => deleteCase(c.id)}>Delete</button>
          </div>
        </div>

        <div class="case-stats">
          <div class="stat">Status: {c.status}</div>
          <div class="stat">Evidence: {c.evidenceCount}</div>
          <div class="progress-bar" aria-hidden="true">
            <div
              class="progress-fill"
              style="width: {Math.min(Math.max(c.progress, 0), 100)}%"
            ></div>
          </div>
          <div class="stat">Updated: {new Date(c.lastUpdate).toLocaleString()}</div>
        </div>
      </article>
    {/each}
  </section>
</main>

<style>
  .cases-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .header {
    background: linear-gradient(135deg, #4a90e2, #7ed321) !important;
    text-align: center;
  }
  .header .title {
    color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.25rem !important;
  }
  .header .subtitle {
    color: rgba(255, 255, 255, 0.9) !important;
    font-size: 0.75rem;
  }
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin: 1rem 0;
  }
  .search-input {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: var(--nier-text-primary);
  }
  .btn {
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(90deg, #4a90e2, #7ed321);
    color: #fff;
    cursor: pointer;
  }
  .btn.danger {
    background: linear-gradient(90deg, #e24a4a, #e27a4a);
  }
  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
  }
  /* keep existing .case-card global rules in place */
  :global(.case-card) {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    padding: 1rem;
    transition: all 0.3s ease;
  }
  :global(.case-card:hover) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.2);
    border-color: var(--n64-secondary) !important;
  }
  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .case-header h3 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.4;
    flex: 1;
  }
  .case-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(15, 15, 35, 0.5);
    border-radius: 4px;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--nier-text-secondary);
  }
  .progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(74, 144, 226, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90e2, #7ed321);
    transition: width 0.3s ease;
  }
  .case-actions {
    display: flex;
    gap: 0.5rem;
  }
  @media (max-width: 768px) {
    .cases-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
