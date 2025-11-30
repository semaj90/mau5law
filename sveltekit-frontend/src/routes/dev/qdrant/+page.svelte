<script lang="ts">
import { onMount, onDestroy } from 'svelte';;
  import type { fade, scale  } from 'svelte/transition';
  let loading = $state <boolean>(false);
  let result: unknown = null
  let error: string | null = null
  let limit = 6
  let page = 1
  let caseId = '';
  let tag = '';

  // Modal preview state
  let previewOpen = $state <boolean>(false);
  let previewTitle = '';
  let previewSnippet = '';
  // Copy feedback
  let copiedId: string | null = null
  let copyTimeout: unknown = null
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
  function extractTitle(payload: unknown): string {
    if (!payload) return '';
    return payload.title || payload.metadata?.title || payload.fileName || payload.name || payload.id || ''}
  function extractSnippet(payload: unknown): string {
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
  let previewRenderMarkdown = $state <boolean>(false);
  let purified: ((html: string) => string) | null = null
  let markdownToHtml: ((md: string) => string) | null = null
  async function ensureMarkdownLibs(): Promise<any> {
    if (!purified || !markdownToHtml) {
      try {
        // use awaited dynamic imports and cast to: unknown to avoid TS type errors when types are missing
        const [DOMPurifyMod, markedMod] = await Promise.all([
          (await import('dompurify')) as: unknown,
          (await import('marked')) as: unknown]),
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

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
