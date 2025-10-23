<script lang="ts">
  // Import the potentially problematic stores and the action function
  import { aiAssistant as rawAIAssistant, user as rawUser, sendToAIAssistant } from '$lib/stores/unified';
  import { writable, type Readable } from 'svelte/store'; // Import Readable type
  import { X } from 'lucide-svelte'; // For the close icon

  // Define the expected state interfaces for the stores based on usage
  interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }

  interface AIAssistantStoreState {
    currentMessages: AIMessage[];
    isProcessing: boolean;
    error: string | null;
    // Add other properties if known from the unified store, e.g., currentCaseId
  }

  interface UserStoreValue {
    id: string;
    // Add other user properties if known, e.g., email, name
  }

  // Provide fallback default states for the stores
  const defaultAIAssistantState: AIAssistantStoreState = {
    currentMessages: [],
    isProcessing: false,
    error: null,
  };

  // Ensure aiAssistant and user are always valid Readable stores.
  // If rawAIAssistant or rawUser are undefined, fall back to a writable store with default state.
  const aiAssistant: Readable<AIAssistantStoreState> = (rawAIAssistant as Readable<AIAssistantStoreState> | undefined) || writable(defaultAIAssistantState);
  // The user store's value can be null, so its type should reflect that.
  const user: Readable<UserStoreValue | null> = (rawUser as Readable<UserStoreValue | null> | undefined) || writable<UserStoreValue | null>(null);

  const isOpen = writable(false);
  $: showButton = $user !== null; // This now correctly checks the value of the 'user' store

  function toggle() {
    isOpen.update(v => !v);
  }

  function sendMessage(content: string) {
    // Check if the user store's value is not null and has an id
    if (!$user || !$user.id) {
      console.warn('User not signed in or user ID not available. Cannot send AI message.');
      return;
    }
    // Dispatch an XState event to set the current case ID
    sendToAIAssistant({ type: 'SET_CURRENT_CASE', caseId: $user.id });
    // Send the user's message as an XState event, including id and role for consistency with AIMessage interface
    sendToAIAssistant({ type: 'SEND_MESSAGE', content: content, role: 'user', id: Date.now().toString() });
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
        {#each $aiAssistant.currentMessages as msg (msg.id)}
          <div class="mb-1">
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        {/each}
        {#if $aiAssistant.isProcessing}
          <div class="nes-text is-disabled">AI is thinking...</div>
        {/if}
        {#if $aiAssistant.error}
          <div class="nes-text is-error">Error: {$aiAssistant.error}</div>
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
        <button type="submit" class="nes-btn is-success" disabled={$aiAssistant.isProcessing}>Send</button>
      </form>
    </div>
  {/if}
{/if}

