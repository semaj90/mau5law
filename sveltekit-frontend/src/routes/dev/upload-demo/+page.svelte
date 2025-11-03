<script lang="ts">
  import UploadProgress from '$lib/components/upload/UploadProgress.svelte';
  import { submitWithProgress } from '$lib/api/submitWithProgress';

  let last = '';
  let metadata = { title: 'My upload', tags: ['demo'] };

  function onDone(e: CustomEvent) {
    last = `Done: status=${(e as CustomEvent).detail.status}`;
  }
  function onProgress(e: CustomEvent) {
    last = `Progress: ${(e as CustomEvent).detail.percent}%`;
  }
  function onError(e: CustomEvent) {
    last = `Error: ${(e as CustomEvent).detail?.message ?? 'unknown'}`;
  }

  async function saveMetadata(): Promise<void> {
    last = 'Saving metadata...';
    try {
      const res = await submitWithProgress('/api/metadata/save', metadata);
      last = `Metadata saved (status=${res.status})`;
    } catch (err) {
      last = `Save failed: ${String(err)}`;
    }
  }
</script>

<h2>Upload Demo</h2>
<UploadProgress uploadUrl="/api/upload" onprogress={onProgress} ondone={onDone} onerror={onError} />
<div class="mt-4">{last}</div>

<hr />
<h3>Save metadata (JSON example)</h3>
<pre>{JSON.stringify(metadata, null, 2)}</pre>
<button onclick={saveMetadata}>Save metadata</button>

