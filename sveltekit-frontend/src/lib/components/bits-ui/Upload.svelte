<script lang="ts">
  export let uploadUrl: string = '/api/vector/store';
  export let onDone: (res: any) => void = () => {};
  let file: File | null = null;
  let text = '';

  async function handleUpload() {
    const form = new FormData();
    if (file) form.append('file', file);
    form.append('text', text);
    const res = await fetch(uploadUrl, { method: 'POST', body: form });
    const data = await res.json();
    onDone(data);
  }
</script>

<div class="bits-upload">
  <label class="btn">Choose file<input type="file" onchange={(e) => (file = (e.target as HTMLInputElement).files?.[0] ?? null)} hidden /></label>
  <textarea bind:value={text} placeholder="Optional text to embed"></textarea>
  <button onclick={handleUpload} class="btn primary">Upload</button>
</div>

<style>
.bits-upload { display: flex; gap: .5rem; flex-direction: column; }
.btn { padding: .5rem 1rem; border-radius: 6px; background: #f3f4f6; }
.btn.primary { background: #2563eb; color: white; }
textarea { min-height: 6rem; }
</style>
