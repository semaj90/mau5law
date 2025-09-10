<script lang="ts">
</script>
  import { PUBLIC_SHOW_CACHE_META } from '$env/static/public';
  type Message = { role: 'user' | 'assistant'; content: string };
  let messages: Message[] = [];
  let userInput = '';
  let isLoading = false;
  let lastCached: boolean | null = null;
  let proxyBackend: string | null = null;
  const showCacheMeta = String(PUBLIC_SHOW_CACHE_META || '').toLowerCase() === 'true';

  async function handleSubmit() {
    if (!userInput.trim() || isLoading) return;
    const prompt = userInput;
    messages = [...messages, { role: 'user', content: prompt }, { role: 'assistant', content: '' }];
    userInput = '';
    isLoading = true;
    lastCached = null;
    proxyBackend = null;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, model: 'gemma3-legal', config: {} })
      });
      proxyBackend = res.headers.get('X-Proxy-Backend');
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        messages[messages.length - 1].content += chunk;
        messages = messages;
      }
      // Try to parse final JSON to extract metadata.cached if present
      if (showCacheMeta) {
        try {
          const parsed = JSON.parse(fullText);
          const cached = parsed?.metadata?.cached;
          if (typeof cached === 'boolean') lastCached = cached;
        } catch {}
      }
    } catch (err) {
      console.error(err);
      messages[messages.length - 1].content = 'Sorry, something went wrong.';
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="max-w-2xl mx-auto p-4 space-y-4">
  <h1 class="text-xl font-semibold">Chat (Fetch Streaming via Proxy)</h1>
  {#if showCacheMeta}
    <div class="text-sm text-gray-600 flex items-center gap-2">
      <span class="inline-flex items-center gap-1">
        <span class="font-medium">Cached:</span>
        {#if lastCached === null}
          <span class="px-2 py-0.5 rounded bg-gray-200">—</span>
        {:else if lastCached}
          <span class="px-2 py-0.5 rounded bg-green-200 text-green-900">Yes</span>
        {:else}
          <span class="px-2 py-0.5 rounded bg-red-200 text-red-900">No</span>
        {/if}
      </span>
      {#if proxyBackend}
        <span class="ml-2">via <code class="px-1 py-0.5 bg-gray-100 rounded">{proxyBackend}</code></span>
      {/if}
    </div>
  {/if}
  <div class="border rounded p-3 h-96 overflow-auto space-y-3 bg-white">
    {#each messages as m, i (i)}
      <div class={m.role === 'user' ? 'text-right' : 'text-left'}>
        <div class={'inline-block px-3 py-2 rounded ' + (m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200')}>
          {m.content}
        </div>
      </div>
    {/each}
    {#if isLoading && messages[messages.length - 1]?.role === 'assistant'}
      <span>…</span>
    {/if}
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }} class="flex gap-2">
    <input class="flex-1 border rounded px-3 py-2" bind:value={userInput} placeholder="Type your message…" />
    <button class="border rounded px-3 py-2" disabled={isLoading}>Send</button>
  </form>
</main>

