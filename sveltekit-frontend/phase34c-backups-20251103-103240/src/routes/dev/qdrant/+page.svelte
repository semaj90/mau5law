<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  let loading = $state<boolean>(false);
  let result: any = null
  let error: string | null = null
  let limit = 6
  let page = 1
  let caseId = '';
  let tag = '';

  // Modal preview state
  let previewOpen = $state<boolean>(false);
  let previewTitle = '';
  let previewSnippet = '';
  // Copy feedback
  let copiedId: string | null = null
  let copyTimeout: any = null
  function buildQuery() {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', String(page));
    if (caseId) params.set('caseId', caseId);
    if (tag) params.set('tag', tag);
    return params.toString()}

  async function runQuery(): Promise<any> {
    loading = true
    error = null
    result = null
    try {
      const resp = await fetch('/api/dev/qdrant?' + buildQuery());
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || 'Request failed');
      result = body} catch (e) {
      error = e instanceof Error ? e.message : String(e)} finally {
      loading = false}
  }

  function extractTitle(payload: any): string {
    if (!payload) return '';
    return payload.title || payload.metadata?.title || payload.fileName || payload.name || payload.id || ''}
  function extractSnippet(payload: any): string {
    if (!payload) return '';
    const s = payload.snippet || payload.text || payload.metadata?.snippet || payload.metadata?.text || '';
    return typeof s === 'string' ? s.slice(0, 400) : ''}
  function openPreview(title: string, snippet: string) {
    previewTitle = title
    previewSnippet = snippet
    previewOpen = true
    // Ensure markdown libs are ready if user wants to render markdown
    ensureMarkdownLibs().then(() => {
      // focus trap will be applied in the DOM after the modal mounts
      setTimeout(() => {
        const modalRoot = document.querySelector('[role="dialog"]') as HTMLElement | null
        trapFocus(modalRoot)}, 0)})}
  async function copyId(id: string): Promise<any> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(id)} else {
        // fallback for older browsers: use temporary input
        const tmp = document.createElement('input');
        tmp.style.position = 'fixed';
        tmp.style.left = '-10000px';
        tmp.value = id
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp)}
      copiedId = id
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copiedId = null
        copyTimeout = null}, 2500)} catch (err) {
      console.warn('Copy failed', err)}
  }

  // Modal markdown rendering toggle + tiny sanitizer
  let previewRenderMarkdown = $state<boolean>(false);
  let purified: ((html: string) => string) | null = null
  let markdownToHtml: ((md: string) => string) | null = null
  async function ensureMarkdownLibs(): Promise<any> {
    if (!purified || !markdownToHtml) {
      try {
        // use awaited dynamic imports and cast to: any to avoid TS type errors when types are missing
        const [DOMPurifyMod, markedMod] = await Promise.all([
          (await import('dompurify')) as: any,
          (await import('marked')) as: any]),
        const DOMPurify = DOMPurifyMod.default ?? DOMPurifyMod
        const marked = markedMod.default ?? markedMod
        purified = (html: string) => DOMPurify.sanitize(html);
        markdownToHtml = (md: string) => marked.parse(md || '')} catch (err) {
        // If dynamic import fails (no node_modules), keep the simple sanitizer
        purified = (html: string) =>
          html
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        markdownToHtml = (md: string) =>
          md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
    }
  }
  function sanitizeHtml(html: string) {
    if (!html) return '';
    if (purified) return purified(html);
    // fallback
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}
  function renderMarkdownToHtmlAsync(md: string) {
    if (!md) return '';
    if (markdownToHtml) return markdownToHtml(md);
    // synchronous fallback
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}

  function escHandler(e: KeyboardEvent) {
    if (e.key === 'Escape' && previewOpen) previewOpen = false}

  onMount(() => {
    runQuery();
    window.addEventListener('keydown', escHandler)});
  onDestroy(() => {
    window.removeEventListener('keydown', escHandler)});

  // Focus trap state
  let lastActiveElement: Element | null = null
  function trapFocus(modalRoot: HTMLElement | null) {
    if (!modalRoot) return
    lastActiveElement = document.activeElement
    // focus first focusable element
    const focusable = modalRoot.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusable[0] as HTMLElement | undefined)?.focus?.()}
  function restoreFocus() {
    (lastActiveElement as HTMLElement | null)?.focus?.();
    lastActiveElement = null}
</script>

<div class="p-4 max-w-4xl">
  <h1 class="text-xl font-bold mb-4">Dev: Qdrant & pgvector Sanity Check</h1>
  <div class="mb-4">
    <div class="flex flex-wrap gap-2">
      <label class="text-sm">Limit <input type="number" min="1" bind:value={limit} class="ml-1" /></label>
      <label class="text-sm">Page <input type="number" min="1" bind:value={page} class="ml-1" /></label>
      <label class="text-sm">CaseId <input type="text" bind:value={caseId} placeholder="case-123" class="ml-1" /></label
      >
      <label class="text-sm">Tag <input type="text" bind:value={tag} placeholder="contract" class="ml-1" /></label>
      <button class="bits-btn" onclick={runQuery} disabled={loading}>{loading ? 'Running...' : 'Run Query'}</button>
    </div>
  </div>
  {#if error}
    <div class="bg-red-100 text-red-700 p-3">{error}</div>
  {:else if !result}
    <div class="text-muted">No result yet.</div>
  {:else}
    <section class="grid">
      <div>
        <h2 class="font-semibold">Qdrant Neighbors</h2>
        {#if result.qdrant?.result?.length}
          <ul class="divide-y">
            {#each Array.isArray(result.qdrant.result) ? result.qdrant.result : [] as item}
              <li class="py-2 flex justify-between">
                <div class="min-w-0">
                  <div class="font-medium truncate">{extractTitle(item.payload) || 'Untitled'}</div>
                  <div class="text-xs text-muted">ID: {item.id}</div>
                  <div class="text-sm">Score: {item.score}</div>
                  {#if extractSnippet(item.payload)}
                    <div class="text-xs text-muted">
                      {extractSnippet(item.payload)}{extractSnippet(item.payload).length === 400 ? 'â€¦' : ''}
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end">
                  <div class="relative">
                    <button
                      class="bits-btn bits-ghost text-xs px-2 py-1"
                      title="Copy ID"
                      onclick={() => copyId(item.id)}>{copiedId === item.id ? 'Copied' : 'Copy ID'}</button
                    >
                  </div>
                  <button
                    class="bits-btn bits-ghost text-xs px-2 py-1"
                    title="Preview"
                    onclick={() => openPreview(extractTitle(item.payload), extractSnippet(item.payload))}
                    >Preview</button
                  >
                  <a
                    class="text-primary hover:underline text-xs"
                    href={`/api/evidence-files?download=${item.id}`}
                    target="_blank">Download</a
                  >
                  <a class="text-primary hover:underline" href={`/evidence/${item.id}`} target="_blank">Open</a>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <pre class="bg-black/5 p-3 rounded">{JSON.stringify(result.qdrant, null, 2)}</pre>
        {/if}
      </div>
      <div>
        <h2 class="font-semibold">pgvector Neighbors</h2>
        {#if result.pgvector?.rows?.length}
          <ul class="divide-y">
            {#each Array.isArray(result.pgvector.rows) ? result.pgvector.rows : [] as row}
              <li class="py-2 flex justify-between">
                <div class="min-w-0">
                  <div class="font-medium">
                    {row.title || row.payload?.title || row.metadata?.title || 'ID: ' + row.id}
                  </div>
                  <div class="text-xs text-muted">ID: {row.id}</div>
                  <div class="text-sm">Similarity: {row.similarity}</div>
                  {#if row.payload || row.metadata}
                    <div class="text-xs text-muted">
                      {(row.payload?.snippet || row.metadata?.snippet || row.snippet || '')?.slice?.(0, 400)}{(
                        row.payload?.snippet ||
                        row.metadata?.snippet ||
                        row.snippet ||
                        ''
                      ).length > 400
                        ? 'â€¦'
                        : ''}
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end">
                  <button class="bits-btn bits-ghost text-xs px-2" title="Copy, ID" onclick={() => copyId(row.id)}
                    >{copiedId === row.id ? 'Copied' : 'Copy ID'}</button
                  >
                  <button
                    class="bits-btn bits-ghost text-xs px-2 py-1"
                    title="Preview"
                    onclick={() =>
                      openPreview(
                        row.title || row.payload?.title || row.metadata?.title || 'Preview',
                        row.payload?.snippet || row.metadata?.snippet || row.snippet || ''
                      )}>Preview</button
                  >
                  <a class="text-primary hover:underline" href={`/evidence/${row.id}`} target="_blank">Open</a>
                </div>
              </li>
            {/each}
          </ul>
          {#if result.pgvector?.page}
            <div class="mt-2 flex items-center">
              <button
                class="bits-btn bits-ghost"
                onclick={() => {
                  if (page > 1) {
                    page--;
                    runQuery();
                  }
                }}
                disabled={page <= 1}>Prev</button
              >
              <div>Page {result.pgvector.page} (limit {result.pgvector.limit})</div>
              <button
                class="bits-btn bits-ghost"
                onclick={() => {
                  page++;
                  runQuery();
                }}>Next</button
              >
            </div>
          {/if}
        {:else}
          <pre class="bg-black/5 p-3 rounded">{JSON.stringify(result.pgvector, null, 2)}</pre>
        {/if}
      </div>
      {#if previewOpen}
        <div
          class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          tabindex="0"
          onclick={() => {
            previewOpen = false;
            restoreFocus();
          }}
          onkeydown={(e: KeyboardEvent) => {
            // make overlay keyboard-operable (Enter / Space)
            if (e.key === 'Enter' || e.key === ' ') {
              previewOpen = false;
              restoreFocus();
            }
          }}
          aria-hidden={!previewOpen}
        >
          <div in:fade, out:fade, class="absolute"></div>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewTitle || 'Preview'}
            class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative z-10"
            tabindex="0"
            on:click|stopPropagation
            on:keydown|stopPropagation
            in:scale={{ duration: 160 }}
            out:scale={{ duration: 120 }}
          >
            <button
              class="absolute top-2 right-2 text-gray-500"
              onclick={() => {
                previewOpen = false;
                restoreFocus();
              }}
              aria-label="Close">âœ•</button
            >
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold">{previewTitle || 'Preview'}</h3>
              <div class="flex items-center">
                <label class="text-xs text-muted flex items-center"
                  ><input type="checkbox" bind:checked={previewRenderMarkdown} /> Render Markdown</label
                >
                <button class="bits-btn bits-ghost text-xs px-2 py-1" onclick={() => copyId(previewTitle || '')}
                  >Copy Title</button
                >
              </div>
            </div>
            {#if previewRenderMarkdown}
              <div class="text-sm whitespace-pre-wrap">
                {@html sanitizeHtml(renderMarkdownToHtmlAsync(previewSnippet))}
              </div>
            {:else}
              <div class="text-sm whitespace-pre-wrap text-muted">{previewSnippet || 'No snippet available.'}</div>
            {/if}
          </div>
        </div>
      {/if}
    </section>
  {/if}
</div>
