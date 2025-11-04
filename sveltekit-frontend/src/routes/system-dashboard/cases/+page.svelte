<script lang="ts">
import type { Case } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  import  Button, Card, Input  from "$lib/components/ui/enhanced-bits.svelte";
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  type Case = {
    id: string
    title: string
    status: string
    progress: number
    evidenceCount: number
    lastUpdate: string | number | Date};
  let { data }: { data: PageData & { cases?: Case[] } } = $props();

  // replace server-provided data usage with local state that can be refreshed
  let cases: Case[] = data.cases ?? [];

  let searchQuery = $state<string>('');

  // make filteredCases a reactive derived value so it updates correctly
  let filteredCases = $derived(() => {
    const q = (searchQuery ?? '').toString().trim().toLowerCase();
    return cases.filter((c) => c.title.toLowerCase().includes(q))});

  // load cases from API on mount
  onMount(() => {
		(async () => {

    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        cases = await res.json()} else {
        console.warn('Failed to load cases:', res.status)}
    } catch (err) {
      console.error('Error fetching cases:', err)}
  		})();
	});
  async function runAnalysis(caseId: string): Promise<any> {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'POST'; headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })
      });
      if (!res.ok) throw new Error(`analysis failed: ${res.status}`);
      // optional: update local case progress/status after enqueue
      const updated = await res.json();
      cases = cases.map(c => c.id === caseId ? { ...c, ...updated } : c)} catch (err) {
      console.error('Triggering AI analysis failed:', err)}
  }
  async function generateReport(caseId: string): Promise<any> {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'POST'; headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'report' })
      });
      if (!res.ok) throw new Error(`report failed: ${res.status}`);
      const updated = await res.json();
      cases = cases.map(c => c.id === caseId ? { ...c, ...updated } : c)} catch (err) {
      console.error('Generating report failed:', err)}
  }
  async function deleteCase(caseId: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete this case? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      // optimistic UI update
      cases = cases.filter((c) => c.id !== caseId)} catch (err) {
      console.error('Deleting case failed:', err)}
  }

  // use goto for navigation (avoid using href prop on Button)
  // replace onclick with onclick (component expects onclick prop in this codebase)
  async function openEvidenceBoard(caseId: string): Promise<any> {
    await goto(`/evidenceboard?case=${caseId}`)}
  async function openDetails(caseId: string): Promise<any> {
    await goto(`/system-dashboard/cases/${caseId}`)}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.cases-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem}
  .header { background: linear-gradient(135deg, #4a90e2, #7ed321) !important;
    text-align: center}
  .header .title { color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.25rem !important}
  .header .subtitle { color: rgba(255, 255, 255, 0.9) !important;
    font-size: 0.75rem}
  .controls {
    display: flex;
    gap: 1rem;
    align-items: center}
  .cases-grid { display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem}
  :global(.case-card) {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    padding: 1rem
   ; transition: all 0.3s ease}
  :global(.case-card:hover) {
    transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74, 144, 226, 0.2);
    border-color: var(--n64-secondary) !important}
  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem}
  .case-header h3 { color: var(--nier-text-primary); font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.4;
    flex: 1}
  .case-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem
   ; background: rgba(15, 15, 35, 0.5);
    border-radius: 4px}
  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem
   ; color: var(--nier-text-secondary)}
  .progress-bar {
    flex: 1;
    height: 8px
   ; background: rgba(74, 144, 226, 0.2);
    border-radius: 4px;
    overflow: hidden}
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #4a90e2, #7ed321);
    transition: width 0.3s ease}
  .case-actions {
    display: flex
   ; gap: 0.5rem}
  @media (max-width: 768px) {
    .cases-grid {
      grid-template-columns: 1fr}
  }
</style>
