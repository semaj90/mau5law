<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
import type { Document } from '$lib/types';
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  // Dashboard data store - initialize with safe defaults
  const dashboardData = writable({
    jobs: { active: [], recent: [], stats: { total: 0, successRate: 0 } },
    workers: { active: [], stats: {} },
    metrics: { recentActivity: [], performance: {} },
    workflow: { state: 'idle', context: { queueLength: 0, concurrency: 0 } },
    system: { uptime: 0, memory: { rss: 0 }, config: {} }
  });

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let isConnected = $state<boolean>(false);
  let errorMessage = '';
  let autoRefresh = true;
  let refreshRate = 5000; // ms

  // Job submission form state
  let newJob: { documentId: string; text: string; chunks: number; priority: string } = {
    documentId: '',
    text: '',
    chunks: 1,
    priority: 'normal'
  };
  let submissionStatus = '';

  async function fetchDashboardData(): Promise<Response> {
    try {
      const response = await fetch('/api/ingestion/dashboard');
      const result = await response.json().catch(() => null);
      if (result && (result.success === true || result.dashboard)) {
        // try to use result.dashboard if provided, otherwise use result directly
        const payload = result.dashboard ?? result;
        dashboardData.set(payload);
        isConnected = true;
        errorMessage = '';
      } else {
        isConnected = false;
        errorMessage = result?.error || 'Failed to fetch dashboard data';
      }
    } catch (err: any) {
      isConnected = false;
      errorMessage = `Connection error: ${err?.message ?? String(err)}`;
    }
  }

  async function submitTestJob(): Promise<any> {
    if (!newJob.documentId || !newJob.text) {
      submissionStatus = 'Error: Document ID and text are required';
      return;
    }

    try {
      submissionStatus = 'Submitting...';
      const words = newJob.text.trim().split(/\s+/).filter(Boolean);
      const chunkCount = Math.max(1, Math.floor(newJob.chunks) || 1);
      const chunkSize = Math.ceil(words.length / chunkCount) || words.length;
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
      }
      // ensure at least one chunk
      if (chunks.length === 0) chunks.push(newJob.text);

      const response = await fetch('/api/ingestion/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_document',
          documentId: newJob.documentId,
          chunks,
          metadata: {
            priority: newJob.priority,
            source: 'dashboard_test',
            userId: 'test_user'
          }
        })
      });

      const result = await response.json().catch(() => null);
      if (result && result.success) {
        submissionStatus = `✅ Job submitted: ${result.jobId ?? 'unknown-id'}`;
        // Reset form
        newJob = { documentId: '', text: '', chunks: 1, priority: 'normal' };
        // Refresh dashboard
        await fetchDashboardData();
      } else {
        submissionStatus = `❌ Error: ${result?.error ?? 'Submission failed'}`;
      }
    } catch (err: any) {
      submissionStatus = `❌ Network error: ${err?.message ?? String(err)}`;
    }
  }

  async function controlWorkflow(action: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const response = await fetch('/api/ingestion/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });
      const result = await response.json().catch(() => null);
      if (result && result.success) {
        // optional message handling
        console.log('controlWorkflow result:', result.message ?? result);
        await fetchDashboardData();
      } else {
        console.error('controlWorkflow error:', result?.error ?? result);
      }
    } catch (err) {
      console.error(`❌ ${action} failed:`, err);
    }
  }

  function formatBytes(bytes: number) {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + (sizes[i] || 'B'));
  }

  function formatDuration(ms: number) {
    if (ms === 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalMinutes < 60) return `${totalMinutes}m ${seconds}s`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
</script>