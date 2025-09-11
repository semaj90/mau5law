<script lang="ts">
  import type { ChatMessage } from "$lib/stores/chatStore";
  import DOMPurify from "dompurify";
  import { Bot } from "lucide-svelte";
  import "./chat-message.css";

  interface Props {
    message: ChatMessage;
  }

  let { message }: Props = $props();
  const sanitizedContent = DOMPurify.sanitize(message.content);
</script>

<div className="${1}" class:user={message.role === "user"}>
  <div className="${1}">
    {#if message.role === "assistant"}
      <Bot className="${1}" />
    {:else}
      <span className="${1}">You</span>
    {/if}
  </div>
  <div className="${1}">
    {@html sanitizedContent}
  </div>
</div>

