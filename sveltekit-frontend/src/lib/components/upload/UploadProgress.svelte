<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();


  import { uploadWithXhr } from '$lib/api/xhr';

  let file: File | null = null;
  let percent = 0;
  let uploading = false;
  let controller: AbortController | null = null;

  export let uploadUrl = '/api/upload';
  export let fieldName = 'file';
  export let maxBytes = 50 * 1024 * 1024; // 50MB default
  export let allowedExtensions: string[] = ['png', 'jpg', 'jpeg', 'pdf', 'txt'];
  export const useChunks = false; // placeholder for chunked upload support

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    file = input.files && input.files[0] ? input.files[0] : null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length) {
      file = e.dataTransfer.files[0];
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function validateFile(f: File | null): string | null {
    if (!f) return 'No file selected';
    if (f.size > maxBytes) return `File too large (${Math.round(f.size / 1024 / 1024)}MB)`;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (allowedExtensions.length && !allowedExtensions.includes(ext)) return `Invalid file extension '.${ext}'`;
    return null;
  }

  async function cancelUpload() {
    if (controller) {
      controller.abort();
      controller = null;
      uploading = false;
      percent = 0;
      dispatch('cancel');
    }
  }

  async function startUpload() {
    const err = validateFile(file);
    if (err) {
      dispatch('error', { message: err });
      return;
    }
    if (!file) return;

    uploading = true;
    percent = 0;
    controller = new AbortController();

    const form = new FormData();
    form.append(fieldName, file as Blob, file?.name);

    try {
      const res = await uploadWithXhr(uploadUrl, form, (loaded, total) => {
        percent = Math.round((loaded / total) * 100);
        dispatch('progress', { percent, loaded, total });
      }, controller.signal);

      uploading = false;
      controller = null;
      const ok = res.status >= 200 && res.status < 300;
      percent = ok ? 100 : percent;
      dispatch('done', { ok, status: res.status, response: res.responseText });
    } catch (err) {
      uploading = false;
      controller = null;
      dispatch('error', { message: String(err) });
    }
  }

  onDestroy(() => {
    if (controller) { // Changed xhr to controller
      try {
        controller.abort(); // Changed xhr to controller
      } catch {}
    }
  });
</script>

<style>
  .progress-track { background: rgba(0,0,0,0.06); height: 12px; border-radius: 9999px; overflow: hidden }
  .progress-fill { background: var(--accent, #0ea5a4); height: 100%; width: 0%; transition: width 300ms ease }
</style>

<div class="flex flex-col gap-2 w-full">
  <div class="flex items-center gap-2">
    <input type="file" on:change={onFileChange} />
    <button on:click={startUpload} disabled={!file || uploading} class="btn">Upload</button>
    <button on:click={cancelUpload} disabled={!uploading} class="btn-ghost">Cancel</button>
  </div>

  <div aria-live="polite">
    {#if uploading}
      <div class="text-sm">Uploading: {percent}%</div>
    {:else if percent === 100}
      <div class="text-sm">Upload complete</div>
    {/if}
  </div>

  <div class="progress-track mt-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <div class="progress-fill" style="width: {percent}%"></div>
  </div>
</div>
