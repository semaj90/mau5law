<script lang="ts">
  import { writable } from 'svelte/store';

  let file: File | null = null;
  const message = writable<string>('');
  const uploading = writable(false);

  async function upload() {
    if (!file) {
      message.set('Please select a file to upload');
      return;
    }
    uploading.set(true);
    message.set('Uploading...');
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        message.set(`Upload successful: ${data.url}`);
      } else {
        message.set(data?.error || 'Upload failed');
      }
    } catch (err: any) {
      message.set(err?.message || String(err));
    } finally {
      uploading.set(false);
    }
  }
</script>

<div class="minio-upload">
  <label for="file">Evidence file</label>
  <input id="file" type="file" onchange={e => (file = (e.target as HTMLInputElement).files?.[0] ?? null)} />
  <button onclick={upload} disabled={$uploading}>Upload to MinIO</button>
  <p>{$message}</p>
</div>

<style>
  .minio-upload {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 480px;
  }
  button[disabled] {
    opacity: 0.6,
  }
</style>
