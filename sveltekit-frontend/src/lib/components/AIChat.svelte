<script lang="ts">
  import { interpret } from 'xstate';
  import { chatMachine } from '$lib/machines/chatMachine.js';
  let chatContainer: HTMLDivElement | null = null;
  let userInput = $state<string>('');
  // Create and start XState service manually so we don't rely on @xstate/svelte types.
  const service = interpret(chatMachine);
  let snapshot: any = service.initialState;
  service.subscribe((state: any) => {
    snapshot = state;
  });
  service.start();
  const send = (event: any) => service.send(event);
  // Actor implementation with explicit types and safer error handling
  // (the machine will call this actor via options; ensure machine expects actor name `streamChatActor`)
  // Provide the actor factory on the machine side or pass it via machine options where used.
  // If the machine already wires actors via context, this factory can be exported elsewhere.
  const streamChatActorFactory = ({ input }: any) => {
    return (sendBack: (e: any) => void, _receive: any) => {
      const controller = new AbortController();
      async function stream(): Promise<any> {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: input?.messages ?? [] }),
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error('Failed to get response stream.');
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((line: string) => line.trim().startsWith('data:'));
            for (const line of lines) {
              try {
                const jsonResponse = JSON.parse(line.replace('data:', '').trim());
                if (jsonResponse?.message?.content) {
                  sendBack({ type: 'STREAM_CHUNK', chunk: jsonResponse.message.content });
                } else if (jsonResponse?.type === 'token' && jsonResponse.content) {
                  sendBack({ type: 'STREAM_CHUNK', chunk: jsonResponse.content });
                }
              } catch (_err) {
                // ignore incomplete chunks
              }
            }
          }
          sendBack({ type: 'STREAM_DONE' });
        } catch (err: any) {
          const e = err as any;
          if (e?.name !== 'AbortError') {
            console.error('Chat stream error:', e);
            sendBack({ type: 'error', data: e });
          }
        }
      }
      stream();
      return () => {
        controller.abort();
      };
    };
  };
  // Submit handler: accept generic Event to match Svelte DOM types, then cast to SubmitEvent
  function handleSubmit(event: Event) {
    const submitEvent = event as SubmitEvent;
    submitEvent.preventDefault();
    if (!userInput.trim()) return;
    send({ type: 'SUBMIT', message: userInput });
    userInput = '';
  }
  // Reactive statement to scroll down when messages change
  $effect(() => {
    if (snapshot?.context?.messages && typeof window !== 'undefined') {
      // Use a microtask to wait for the DOM to update
      Promise.resolve().then(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    }
  });
</script>
<div class="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
  <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
    {#each snapshot.context.messages as message, i (i)}
      <div class="chat-message {message.role === 'user' ? 'user' : 'assistant'}">
        <div class="message-bubble">
          {@html message.content.replace(/\n/g, '<br>')}
          {#if snapshot.matches('loading') && i === snapshot.context.messages.length - 1}
            <span class="typing-indicator"></span>
          {/if}
        </div>
      </div>
    {/each}
    {#if snapshot.matches('error')}
      <div class="chat-message assistant">
        <div class="message-bubble error-bubble">
          <p>Sorry, an error occurred: {snapshot.context.error?.message || 'Unknown error'}</p>
          <p>Please try again.</p>
        </div>
      {/if}
  </div>
  <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
    <form onsubmit={handleSubmit} class="flex items-center space-x-2">
      <input
        type="text"
        bind:value={userInput}
        placeholder="Ask about your case..."
        class="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        disabled={snapshot.matches('loading')}
      />
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        disabled={snapshot.matches('loading') || !userInput.trim()}
      >
        Send
      </button>
    </form>
  </div>
</div>
<style>
  /* Styles from previous Chat.svelte component can be reused here */
  .chat-message {
    display: flex;
    max-width: 80%;
  }
  .chat-message.user {
    margin-left: auto;
    flex-direction: row-reverse;
  }
  .chat-message.assistant {
    margin-right: auto;
  }
  .message-bubble {
    padding: 0.75rem 1rem;
    border-radius: 1.25rem;
    word-wrap: break-word;
    position: relative;
  }
  .user .message-bubble {
    background-color: #2563eb;
    color: white;
    border-bottom-right-radius: 0.25rem;
  }
  .assistant .message-bubble {
    background-color: #e5e7eb;
    color: #111827;
    border-bottom-left-radius: 0.25rem;
  }
  .dark .assistant .message-bubble {
    background-color: #374151;
    color: #f9fafb;
  }
  .error-bubble {
    background-color: #fef2f2;
    color: #991b1b;
  }
  .dark .error-bubble {
    background-color: #4c1d1d;
    color: #fca5a5;
  }
  .typing-indicator {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: currentColor;
    animation: typing 1s infinite steps(4, end);
    margin-left: 8px;
    vertical-align: bottom;
  }
  @keyframes typing {
    to {
      transform: translateY(-0.25rem);
    }
  }
</style>
