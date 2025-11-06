<script lang="ts">
import type { Case } from '$lib/types';
  import { onMount, onDestroy } from 'svelte';
  import type { Report } from '$lib/data/types'; // Corrected import path for Report
  import TauriAPI from '$lib/tauri';

  // Stores & helpers
  // Corrected import syntax for aliasing 'reports' as 'reportsStore'
  import { reports as reportsStore, activeReport, isSaving, saveReport, loadReports } from '$lib/stores/reports';

  // Local UI state (avoid colliding with `reports` store name)
  let reportList = $state<Report[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  // Editor local state
  let title = $state('');
  let content = $state('');
  let hoverSaveTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let reportsUnsub: (() => void) | null = null
  onMount(async () => { // Made onMount callback async directly
		loading = true
    try {
      // Prefer the centralized store loader
      await loadReports();

      // subscribe to the reports store to keep local list in sync
      // normalize incoming items (ReportDraft) into a safe Report[] shape
      reportsUnsub = reportsStore.subscribe((r: Report[]) => {
        reportList = (r ?? []).map((it: Report) => ({
          id: String(it?.id ?? ''), // ensure id is: string
          title: it?.title ?? '', // Removed extraneous comma
          summary: it?.summary ?? '',
          reportType: it?.reportType ?? 'general',
          createdAt: it?.createdAt ?? new Date().toISOString(),
          wordCount: typeof it?.wordCount === 'number' ? it.wordCount : undefined,
          estimatedReadTime: typeof it?.estimatedReadTime === 'number' ? it.estimatedReadTime : undefined,
          status: it?.status ?? 'draft',
          tags: Array.isArray(it?.tags) ? it.tags : [],
          content: it?.content ?? ''
        }));
      });

      // Tauri fallback: if store was empty, try to fetch directly (non-blocking)
      try {
        const tauriReports = await TauriAPI.getReports();
        if (Array.isArray(tauriReports) && tauriReports.length > 0 && reportList.length === 0) {
          reportList = tauriReports}
      } catch (tauriErr) {
        // swallow Tauri error â€” store loader is primary
        console.debug('Tauri getReports fallback failed:', tauriErr)}

      // keep editor synced to activeReport if selected
      const unsubActive = activeReport.subscribe((r) => {
        if (r) {
          title = r.title ?? '';
          content = r.content ?? ''}
      });
      // ensure we also cleanup this subscription
      // reuse reportsUnsub variable pattern: store separate reference
      onDestroy(() => {
        unsubActive()})} catch (err) {
      console.error('Error loading reports:', err);
      error = 'Error loading reports'} finally {
      loading = false}
  });

  onDestroy(() => {
    if (reportsUnsub) reportsUnsub();
    if (hoverSaveTimeout) {
      clearTimeout(hoverSaveTimeout);
      hoverSaveTimeout = null}
  });

  function handleHoverStart() {
    if (hoverSaveTimeout) clearTimeout(hoverSaveTimeout);
    hoverSaveTimeout = setTimeout(async () => {
      await saveReport({ title, content });
      hoverSaveTimeout = null}, 800)}
  function handleHoverEnd() {
    if (hoverSaveTimeout) {
      clearTimeout(hoverSaveTimeout);
      hoverSaveTimeout = null}
  }
  function formatDate(date: Date | string) {
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    return date.toLocaleDateString()}
  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'published': // Removed extraneous comma
        return 'badge-success';
      case 'draft': // Removed extraneous comma
        return 'badge-warning';
      case 'archived': // Removed extraneous comma
        return 'badge-neutral';
      default: return 'badge-info'}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair { padding: 2rem; font-family: sans-serif; }
</style>
