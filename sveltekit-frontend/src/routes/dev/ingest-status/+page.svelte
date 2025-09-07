<script lang="ts">
  import { onMount } from 'svelte';
  let jobId = '';
  let status: any = null;
  let error: string | null = null;
  let polling = false;
  let interval: any = null;

  async function fetchStatus(id: string) {
    try {
      const res = await fetch(`/api/ingest/status/${encodeURIComponent(id)}`);
      if (!res.ok) {
        error = `Status not found (${res.status})`;
        status = null;
        return;
      }
      const data = await res.json();
      status = data.status;
      error = null;
    } catch (e: any) {
      error = e?.message || String(e);
    }
  }

  function startPolling() {
    if (!jobId) return;
    polling = true;
    void fetchStatus(jobId);
    clearInterval(interval);
    interval = setInterval(() => fetchStatus(jobId), 1500);
  }

  function stopPolling() {
    polling = false;
    clearInterval(interval);
  }

  onMount(() => () => clearInterval(interval));
</script>

<div style="max-width:720px;margin:1rem auto;padding:1rem;border:1px solid #ddd;border-radius:8px;">
  <h2>Ingest Job Status</h2>
  <div style="display:flex;gap:.5rem;align-items:center;">
    <input placeholder="Enter job ID" bind:value={jobId} style="flex:1;padding:.5rem;border:1px solid #ccc;border-radius:4px;" />
    {#if !polling}
      <button on:click={startPolling} disabled={!jobId}>Start</button>
    {:else}
      <button on:click={stopPolling}>Stop</button>
    {/if}
  </div>

  {#if error}
    <p style="color:#b00;margin-top:.75rem;">{error}</p>
  {/if}

  {#if status}
    <div style="margin-top:1rem;padding:.75rem;border:1px solid #eee;border-radius:6px;background:#fafafa;">
      <div><strong>Status:</strong> {status.status}</div>
      {#if status.progress != null}
        <div style="margin:.5rem 0;">
          <div style="height:8px;background:#eee;border-radius:4px;overflow:hidden;">
            <div style="height:8px;background:#4caf50;width:{status.progress}%"></div>
          </div>
          <small>{status.progress}%</small>
        </div>
      {/if}
      {#if status.counts}
        <div><strong>Counts:</strong> {status.counts.chunks} chunks, {status.counts.embeddings} embeddings</div>
      {/if}
      {#if status.error}
        <div style="color:#b00;white-space:pre-wrap;">{status.error}</div>
      {/if}
    </div>
  {/if}
</div>
