<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    message: any;
  }
  let { message }: Props = $props();
  import { Button } from '$lib/components/ui/enhanced-bits'; // Changed to named import
  import { chatActions } from '$lib/stores/chat.svelte'; // Corrected import path
  import { notifications } from '$lib/stores/unified';
  import Bot from 'lucide-svelte/icons/bot';
  import Clock from 'lucide-svelte/icons/clock';
  import Copy from 'lucide-svelte/icons/copy';
  import Heart from 'lucide-svelte/icons/heart';
  import MoreVertical from 'lucide-svelte/icons/more-vertical';
  import Star from 'lucide-svelte/icons/star';
  import StarOff from 'lucide-svelte/icons/star-off';
  import ThumbsUp from 'lucide-svelte/icons/thumbs-up';
  import Users from 'lucide-svelte/icons/users'; // Import Users icon
  const UserIcon = Users; // Alias Users to UserIcon for template consistency
  import '../chat/chat-message.css';
  // Type-safe fallback for message.role
  let isUser = $derived(message.role === 'user' || message.type === 'user');
  let isAssistant = $derived(message.role === 'assistant' || message.type === 'assistant');
  let emotionalTone = $derived(message.metadata?.emotionalTone);
  let isProactive = $derived(message.metadata?.proactive);
  function copyToClipboard() {
    navigator.clipboard.writeText(message.content);
    (notifications as any).add({ // Type assertion to bypass TypeScript error for 'add' method
      type: 'success',
      title: 'Copied',
      message: 'Message copied to clipboard',
    });
  }
  function toggleSaved() {
    chatActions.toggleMessageSaved(message.id);
  }
  function formatTime(timestamp: Date | string | number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function getEmotionalToneColor(tone: string): string {
    switch (tone) {
      case 'encouraging':
        return 'text-green-600';
      case 'supportive':
        return 'text-blue-600';
      case 'enthusiastic':
        return 'text-purple-600';
      case 'thoughtful':
        return 'text-indigo-600';
      case 'professional':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  }
  function getEmotionalToneIcon(tone: string) {
    switch (tone) {
      case 'encouraging':
        return ThumbsUp;
      case 'supportive':
        return Heart;
      case 'enthusiastic':
        return Star;
      default:
        return null;
    }
  }
</script>

<div class="chat-message-container flex gap-2 mb-4 {isUser ? 'justify-end' : ''}">
  {#if !isUser}
    <!-- Bot Avatar -->
    <div class="avatar flex-shrink-0">
      <Bot class="w-8 h-8 nes-text is-primary" />
    </div>
  {/if}

  <div class="message-content-wrapper flex flex-col max-w-[70%]">
    <div class="message-bubble nes-container {isUser ? 'is-dark' : ''} {isUser ? 'is-rounded' : ''} p-3">
      <!-- Proactive Indicator -->
      {#if isProactive}
        <div class="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Clock class="w-3 h-3" />
          <span>Proactive suggestion</span>
        </div>
      {/if}
      <!-- Message Text -->
      <div class="message-text message-content">
        {@html message.content}
      </div>
      <!-- Emotional Tone Indicator for AI Messages -->
      {#if isAssistant && emotionalTone && emotionalTone !== 'neutral'}
        {@const ToneIcon = getEmotionalToneIcon(emotionalTone)}
        <div class="flex items-center gap-1 text-xs mt-2 {getEmotionalToneColor(emotionalTone)}">
          {#if ToneIcon}
            <!-- Changed from <svelte:component this={ToneIcon} ... /> -->
            <ToneIcon class="w-3 h-3" />
          {/if}
          <span>{emotionalTone}</span>
        </div>
      {/if}
    </div>

    <!-- Message Actions and Timestamp -->
    <div class="flex {isUser ? 'justify-end' : 'justify-start'} items-center gap-2 mt-1 text-xs text-gray-500">
      <span class="timestamp">
        {formatTime(message.timestamp)}
      </span>
      <div class="actions flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="p-1 h-auto w-auto"
          onclick={() => copyToClipboard()}
          title="Copy message"
        >
          <Copy class="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="p-1 h-auto w-auto"
          onclick={() => toggleSaved()}
          title={message.saved ? 'Remove from saved' : 'Save message'}
        >
          {#if message.saved}
            <Star class="w-4 h-4" />
          {:else}
            <StarOff class="w-4 h-4" />
          {/if}
        </Button>
        <Button variant="ghost" size="sm" class="p-1 h-auto w-auto" title="More options">
          <MoreVertical class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Metadata (for AI messages) -->
    {#if isAssistant && message.metadata}
      <div class="message-metadata text-xs text-gray-500 mt-1 {isUser ? 'text-right' : 'text-left'}">
        {#if message.metadata.model}
          <div class="flex items-center gap-1 {isUser ? 'justify-end' : 'justify-start'}">
            <span>Model: {message.metadata.model}</span>
            {#if message.metadata.latency}
              <span>• {message.metadata.latency}ms</span>
            {/if}
          </div>
        {/if}
        {#if message.metadata.tokenCount}
          <div class="{isUser ? 'text-right' : 'text-left'}">Tokens: {message.metadata.tokenCount}</div>
        {/if}
      </div>
    {/if}
  </div>

  {#if isUser}
    <!-- User Avatar -->
    <div class="avatar flex-shrink-0">
      <UserIcon class="w-8 h-8 nes-text is-success" />
    </div>
  {/if}
</div>

<style>
  /* @unocss-include */
  :global(.message-content) {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  :global(.message-content p) {
    margin-bottom: 0.5rem;
  }
  :global(.message-content p:last-child) {
    margin-bottom: 0; /* Corrected comma to semicolon */
  }
  :global(.message-content ul, .message-content ol) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }
  :global(.message-content li) {
    margin-bottom: 0.25rem;
  }
  :global(.message-content code) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875em;
  }
  :global(.message-content blockquote) {
    border-left: 3px solid rgba(0, 0, 0, 0.2);
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
  }
  :global(.message-content h1, .message-content h2, .message-content h3) {
    font-weight: 600;
    margin: 0.75rem 0 0.5rem 0;
  }
  :global(.message-content h1) {
    font-size: 1.25em;
  }
  :global(.message-content h2) {
    font-size: 1.125em;
  }
  :global(.message-content h3) {
    font-size: 1em;
  }
</style>
