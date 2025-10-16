<script lang="ts">
  import { aiAssistant } from '$lib/stores/ai-assistant-unified.svelte'; // Adjusted import path
  import { user } from '$lib/stores/user';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  const isOpen = writable(false);
  $: showButton = $user !== null;

  function toggle() {
    isOpen.update(v => !v);
  }

  function sendMessage(content: string) {
    if (!$user) {
      console.warn('User not signed in. Cannot send AI message.');
      return;
    }
    aiAssistant.setCurrentCase($user.id); // User-specific "global" case
    aiAssistant.sendMessage($user.id, content);
  }
</script>

{#if showButton}
  <button
    on:click={toggle}
    class="fixed bottom-4 right-4 nes-btn is-primary rounded-full z-50"
  >
    💬 AI
  </button>

  {#if $isOpen}
    <div class="fixed bottom-20 right-4 w-96 h-128 bg-white rounded-xl shadow-2xl p-4 z-50 flex flex-col nes-container is-dark">
      <header class="flex justify-between items-center mb-2">
        <h2 class="font-bold nes-text is-primary">AI Assistant</h2>
        <button class="nes-btn is-error" on:click={toggle}>✕</button>
      </header>

      <div class="flex-1 overflow-auto mb-2">
        {#each aiAssistant.currentMessages as msg (msg.id)}
          <div class="mb-1">
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        {/each}
        {#if aiAssistant.isProcessing}
          <div class="nes-text is-disabled">AI is thinking...</div>
        {/if}
        {#if aiAssistant.error}
          <div class="nes-text is-error">Error: {aiAssistant.error}</div>
        {/if}
      </div>

      <form on:submit|preventDefault={(e) => {
        const input = e.currentTarget.elements.namedItem('prompt') as HTMLInputElement;
        if (input.value.trim()) {
          sendMessage(input.value.trim());
          input.value = '';
        }
      }} class="flex gap-2">
        <input type="text" name="prompt" placeholder="Ask something..." class="flex-1 border rounded px-2 py-1 nes-input" />
        <button type="submit" class="nes-btn is-success" disabled={aiAssistant.isProcessing}>Send</button>
      </form>
    </div>
  {/if}
{/if}
