<script lang="ts">
import type { Document } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  import SimpleFileUpload from '$lib/components/ai/SimpleFileUpload.svelte';
  interface ServiceStatus { healthy: boolean; [key: string]: unknown }
  interface SystemStatus { services?: Record<string, ServiceStatus>; [key: string]: unknown }
  interface UploadResult { filename?: string; status?: string; documentId?: string; size?: number; embeddingGenerated?: boolean; error?: string; [key:string]: unknown }

  // make these Svelte, 5 reactive state variables so assignments trigger updates
  let uploadResults = $state<UploadResult[]>([]);
  let systemStatus = $state<SystemStatus>({});

  // helper to safely get entries for template iteration
  function serviceEntries(): [string, ServiceStatus][] {
    return systemStatus?.services ? Object.entries(systemStatus.services) as [string, ServiceStatus][] : []}

  // Svelte emits a CustomEvent; the payload lives in event.detail
  function handleUploadComplete(e: CustomEvent<UploadResult>) {
    const result = e.detail
    console.log('Upload completed:', result);
    uploadResults = [...uploadResults, result]}

  // Robust polling with retries, timeout, backoff and cleanup
  $effect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    const MAX_RETRIES = 5
    const REQUEST_TIMEOUT_MS = 8000
    const POLL_INTERVAL_MS = 5000
    let pollActive = true
    let currentController: AbortController | null = null
    async function fetchStatus(attempt = 1): Promise<Response | null> {
      currentController = new AbortController();
      const controller = currentController
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE}/api/rag/status`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timer);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        systemStatus = json as SystemStatus
        return res} catch (err) {
        clearTimeout(timer);
        if (attempt < MAX_RETRIES && pollActive) {
          const backoff = Math.min(1000 * 2 ** (attempt - 1), 10000) + Math.random() * 250
          console.warn(`Status fetch failed (attempt ${attempt}):`, err);
          await new Promise(r => setTimeout(r, backoff));
          return fetchStatus(attempt + 1)} else {
          console.error('Giving up fetching system status:', err);
          return: null}
      }
    }

    // start initial fetch and background poll
    (async () => {
      await fetchStatus(); // initial attempt, sets systemStatus on success

      // background loop
      (async function pollLoop(): Promise<any> {
        while (pollActive) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          if (document.hidden) continue
          await fetchStatus(1)}
      })()})();

    const onBeforeUnload = () => {
      pollActive = false
      currentController?.abort()};
    addEventListener('beforeunload', onBeforeUnload);

    // cleanup when effect re-runs / component unmounts
    return () => {
      pollActive = false
      currentController?.abort();
      removeEventListener('beforeunload', onBeforeUnload)}});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair { padding: 2rem; font-family: sans-serif; }
</style>
