<script lang="ts">
  import { onMount } from 'svelte';
  import ModernButton from '$lib/components/ui/button/Button.svelte';

  let input = $state('');
  let sessionId = '';
  let messages: Array<{ id: string; role: 'user'|'assistant'; content: string; createdAt: string }>= $state([]);
  let loading = $state(false);
  let model = $state('gemma3-legal');

  async function ensureSession() {
    if (!sessionId) {
  const res = await fetch('/demo/gpu-assistant/session', { method: 'POST' });
      const data = await res.json();
      sessionId = data.sessionId;
    }
  }

  async function send() {
    if (!input.trim()) return;
    await ensureSession();
  const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: input, createdAt: new Date().toISOString() };
    messages = [...messages, userMsg];
    const q = input;
    input = '';
    loading = true;
    try {
  const res = await fetch('/demo/gpu-assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: q, model })
      });
      const data = await res.json();
      if (data.assistant) {
        messages = [...messages, data.assistant];
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    // Load existing session messages if any (optional graceful fail)
    try {
      const res = await fetch('/demo/gpu-assistant/session');
      if (res.ok) {
        const data = await res.json();
        sessionId = data.sessionId;
        messages = data.messages || [];
      }
    } catch {}
  });
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <h1 class="text-2xl font-bold">GPU Assistant Demo</h1>
  <p class="text-sm text-nier-text-secondary">End-to-end GPU stack with chat persistence (PostgreSQL + Drizzle). Uses Ollama locally and falls back to detected backend when available.</p>

  <div class="flex items-center gap-2">
    <label for="modelSelect" class="text-sm">Model:</label>
    <select id="modelSelect" bind:value={model} class="border rounded px-2 py-1 bg-nier-bg-secondary">
      <option value="gemma3-legal">gemma3-legal</option>
      <option value="llama3.1">llama3.1</option>
    </select>
  </div>

  <div class="border rounded p-4 bg-nier-bg-secondary min-h-[300px] space-y-3">
    {#each messages as m}
      <div class="text-sm">
        <span class="font-semibold">{m.role === 'user' ? 'You' : 'Assistant'}:</span>
        <span class="ml-2 whitespace-pre-wrap">{m.content}</span>
      </div>
    {/each}
    {#if loading}
      <div class="text-xs text-nier-text-muted">Thinking…</div>
    {/if}
  </div>

  <div class="flex gap-2">
  <input class="flex-1 border rounded px-3 py-2 bg-nier-bg-secondary" bind:value={input} placeholder="Ask a question about your case…" onkeydown={(e) => e.key==='Enter' && send()} />
  <ModernButton onclick={send} variant="primary">Send</ModernButton>
  </div>
</div>

