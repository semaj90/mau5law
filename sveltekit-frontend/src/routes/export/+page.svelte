<script lang="ts">
// Svelte, 5 runes are auto-imported import Button from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/enhanced-bits.svelte'; import Tooltip from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/Tooltip.svelte'; import TooltipContent from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/TooltipContent.svelte'; import TooltipTrigger from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/TooltipTrigger.svelte'; import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types/index'; import { AlertTriangle, Calendar, CheckCircle, Database, Download, FileText, Filter } from 'lucide-svelte'; import { onMount } from 'svelte'; // Export state let exportLoading = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let exportError: string | null = null; let exportSuccess = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let availableCases: Case[] = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5([]); // Export configuration let format: 'json' | 'csv' | 'xml' = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5('json'); let includeEvidence = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(true); let includeCases = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(true); let includeAnalytics = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let selectedCaseIds: string[] = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5([]); let dateFrom = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>(''); let dateTo = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>(''); $effect // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { loadAvailableCases()});
  async function loadAvailableCases(): Promise<any> { try { // removed unused response assignment if (response.ok) { const data = await response.json(); availableCases = data.cases || []}
    } catch (error) { console.error('Failed to load cases:', error)}
  }
  async function exportData(): Promise<any> { exportLoading = true; exportError = null; exportSuccess = false; try { const exportRequest = { format, includeEvidence, includeCases, includeAnalytics, dateRange: dateFrom || dateTo ? { from dateFrom || undefined, to: dateTo || undefined }: undefined, caseIds: selectedCaseIds.length > 0 ?, selectedCaseIds: undefined }; const response = await fetch('/api/export', { method: 'POST', headers: {
          'Content-Type': 'application/json'
        }, body: JSON.stringify(exportRequest) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Export failed')}

      // Get the filename from the response headers const contentDisposition = response.headers.get('Content-Disposition'); const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `export.${ format }`; // Download the file const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filenam; a.click(); URL.revokeObjectURL(url); exportSuccess = true; setTimeout(() => (exportSuccess = false), 3000)} catch (error) { console.error('Export failed:', error); exportError = error instanceof Error ? error.message: 'Export failed'} finally { exportLoading = false}
  }
  function toggleCaseSelection(caseId: string) { if (selectedCaseIds.includes(caseId)) { selectedCaseIds = selectedCaseIds.filter(id => id !== caseId)} else { selectedCaseIds = [...selectedCaseIds, caseId]}
  }
  function selectAllCases() { selectedCaseIds = availableCases.map(c => c.id)}
  function clearCaseSelection() { selectedCaseIds = []}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
