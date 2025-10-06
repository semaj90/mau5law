<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  let loading = false;
  let result: any = null;
  let error: string | null = null;
  let limit = 6;
  let page = 1;
  let caseId = '';
  let tag = '';

  // Modal preview state
  let previewOpen = false;
  let previewTitle = '';
  let previewSnippet = '';
  // Copy feedback
  let copiedId: string | null = null;
  let copyTimeout: any = null;

  function buildQuery() {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', String(page));
    if (caseId) params.set('caseId', caseId);
    if (tag) params.set('tag', tag);
    return params.toString();
  }

  async function runQuery() {
    loading = true; error = null; result = null;
    try {
      const resp = await fetch('/api/dev/qdrant?' + buildQuery());
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || 'Request failed');
      result = body;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally { loading = false; }
  }

  function extractTitle(payload: any): string {
    if (!payload) return '';
    return (
      payload.title || payload.metadata?.title || payload.fileName || payload.name || payload.id || ''
    );
  }
  function extractSnippet(payload: any): string {
    if (!payload) return '';
    const s = payload.snippet || payload.text || payload.metadata?.snippet || payload.metadata?.text || '';
    return typeof s === 'string' ? s.slice(0, 400) : '';
  }
  function openPreview(title: string, snippet: string) {
    previewTitle = title;
    previewSnippet = snippet;
    previewOpen = true;
  }
  async function copyId(id: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        // fallback for older browsers: use temporary input
        const tmp = document.createElement('input');
        tmp.style.position = 'fixed'; tmp.style.left = '-10000px';
        tmp.value = id;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      copiedId = id;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => { copiedId = null; copyTimeout = null; }, 2500);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  }

  // Modal markdown rendering toggle + tiny sanitizer
  let previewRenderMarkdown = false;
  function sanitizeHtml(html: string) {
    // very small sanitizer: escape angle brackets and remove script tags
    if (!html) return '';
    // avoid emitting the literal closing-script token so the Svelte parser doesn't see it
    const endScript = '<' + '/script>';
    const scriptRegex = new RegExp('<script[\\s\\S]*?>[\\s\\S]*?' + endScript, 'gi');
    html = html.replace(scriptRegex, '');
    // escape angle brackets
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function renderMarkdownToHtml(md: string) {
    // Minimal markdown -> HTML: headers, bold, italics, links, line breaks
    if (!md) return '';
    let out = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\n/g, '<br/>');
    return out;
  }

  function escHandler(e: KeyboardEvent) {
    if (e.key === 'Escape' && previewOpen) previewOpen = false;
  }

  onMount(() => { runQuery(); window.addEventListener('keydown', escHandler); });
  onDestroy(() => { window.removeEventListener('keydown', escHandler); });
</script>

<div class="p-4 max-w-4xl mx-auto">
  <h1 class="text-xl font-bold mb-4">Dev: Qdrant & pgvector Sanity Check</h1>
  <div class="mb-4">
    <div class="flex flex-wrap gap-2 items-center">
      <label class="text-sm">Limit <input type="number" min="1" bind:value={limit} class="ml-1 w-20" /></label>
      <label class="text-sm">Page <input type="number" min="1" bind:value={page} class="ml-1 w-20" /></label>
      <label class="text-sm">CaseId <input type="text" bind:value={caseId} placeholder="case-123" class="ml-1" /></label>
      <label class="text-sm">Tag <input type="text" bind:value={tag} placeholder="contract" class="ml-1" /></label>
      <button class="bits-btn" on:click={runQuery} disabled={loading}>{loading ? 'Running...' : 'Run Query'}</button>
    </div>
  </div>
  {#if error}
    <div class="bg-red-100 text-red-700 p-3 rounded">{error}</div>
  {:else if !result}
    <div class="text-muted">No result yet.</div>
  {:else}
    <section class="grid gap-4">
      <div>
        <h2 class="font-semibold">Qdrant Neighbors</h2>
        {#if result.qdrant?.result?.length}
          <ul class="divide-y">
            {#each result.qdrant.result as item}
              <li class="py-2 flex justify-between items-start">
                <div class="min-w-0">
                  <div class="font-medium truncate">{extractTitle(item.payload) || 'Untitled'}</div>
                  <div class="text-xs text-muted truncate">ID: {item.id}</div>
                  <div class="text-sm text-muted">Score: {item.score}</div>
                  {#if extractSnippet(item.payload)}
                    <div class="text-xs text-muted truncate">{extractSnippet(item.payload)}{extractSnippet(item.payload).length === 400 ? '…' : ''}</div>
                  {/if}
                </div>
                <div class="flex flex-col items-end gap-2">
                  <div class="relative">
                    <button class="bits-btn bits-ghost text-xs px-2 py-1" title="Copy ID" on:click={() => copyId(item.id)}>{copiedId === item.id ? 'Copied' : 'Copy ID'}</button>
                  </div>
                  <button class="bits-btn bits-ghost text-xs px-2 py-1" title="Preview" on:click={() => openPreview(extractTitle(item.payload), extractSnippet(item.payload))}>Preview</button>
                  <a class="text-primary hover:underline text-xs" href={`/api/evidence-files?download=${item.id}`} target="_blank">Download</a>
                  <a class="text-primary hover:underline text-xs" href={`/evidence/${item.id}`} target="_blank">Open</a>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <pre class="bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(result.qdrant, null, 2)}</pre>
        {/if}
      </div>
      <div>
        <h2 class="font-semibold">pgvector Neighbors</h2>
        {#if result.pgvector?.rows?.length}
          <ul class="divide-y">
            {#each result.pgvector.rows as row}
              <li class="py-2 flex justify-between items-start">
                <div class="min-w-0">
                  <div class="font-medium truncate">{row.title || row.payload?.title || row.metadata?.title || 'ID: ' + row.id}</div>
                  <div class="text-xs text-muted truncate">ID: {row.id}</div>
                  <div class="text-sm text-muted">Similarity: {row.similarity}</div>
                  {#if row.payload || row.metadata}
                    <div class="text-xs text-muted truncate">{(row.payload?.snippet || row.metadata?.snippet || row.snippet || '')?.slice?.(0,400)}{(row.payload?.snippet || row.metadata?.snippet || row.snippet || '').length > 400 ? '…' : ''}</div>
                  {/if}
                </div>
                <div class="flex flex-col items-end gap-2">
                  <button class="bits-btn bits-ghost text-xs px-2 py-1" title="Copy ID" on:click={() => copyId(row.id)}>{copiedId === row.id ? 'Copied' : 'Copy ID'}</button>
                  <button class="bits-btn bits-ghost text-xs px-2 py-1" title="Preview" on:click={() => openPreview(row.title || row.payload?.title || row.metadata?.title || 'Preview', (row.payload?.snippet || row.metadata?.snippet || row.snippet || '') )}>Preview</button>
                  <a class="text-primary hover:underline text-xs" href={`/evidence/${row.id}`} target="_blank">Open</a>
                </div>
              </li>
            {/each}
          </ul>
          {#if result.pgvector?.page}
            <div class="mt-2 flex items-center gap-2">
              <button class="bits-btn bits-ghost" on:click={() => { if (page>1) { page--; runQuery(); } }} disabled={page<=1}>Prev</button>
              <div>Page {result.pgvector.page} (limit {result.pgvector.limit})</div>
              <button class="bits-btn bits-ghost" on:click={() => { page++; runQuery(); }}>Next</button>
            </div>
          {/if}
        {:else}
          <pre class="bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(result.pgvector, null, 2)}</pre>
        {/if}
      </div>
  {#if previewOpen}
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" tabindex="-1" on:click={() => previewOpen = false} aria-hidden={!previewOpen}>
      <div in:fade out:fade class="absolute inset-0"></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={previewTitle || 'Preview'}
        class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative z-10"
        tabindex="-1"
        on:click|stopPropagation
        on:keydown={() => {}}
        in:scale={{ duration: 160 }}
        out:scale={{ duration: 120 }}
      >
        <button class="absolute top-2 right-2 text-gray-500 hover:text-black" on:click={() => previewOpen = false} aria-label="Close">✕</button>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold">{previewTitle || 'Preview'}</h3>
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted flex items-center gap-1"><input type="checkbox" bind:checked={previewRenderMarkdown}/> Render Markdown</label>
            <button class="bits-btn bits-ghost text-xs px-2 py-1" on:click={() => copyId(previewTitle || '')}>Copy Title</button>
          </div>
        </div>
        {#if previewRenderMarkdown}
          <div class="text-sm whitespace-pre-wrap text-muted">{@html sanitizeHtml(renderMarkdownToHtml(previewSnippet))}</div>
        {:else}
          <div class="text-sm whitespace-pre-wrap text-muted">{previewSnippet || 'No snippet available.'}</div>
        {/if}
      </div>
    </div>
  {/if}
    </section>
  {/if}
</div>
