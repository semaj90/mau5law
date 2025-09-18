<script lang="ts">
  import { ButtonBits, CardBits, InputBits } from '$lib/components/ui/bits-ui';

  let messages = $state([
    {
      id: '001',
      role: 'assistant',
      content: 'Hello! I\'m your Legal AI Assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);

  let currentMessage = $state('');
  let isTyping = $state(false);

  async function sendMessage() {
    if (!currentMessage.trim() || isTyping) return;

    const userMessage = {
      id: Date.now.toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    messages = [...messages, userMessage];
    const messageToSend = currentMessage;
    currentMessage = '';
    isTyping = true;

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about: "${messageToSend}". This is a demo response. The Legal AI would provide detailed analysis, case law references, and legal guidance based on your query.`,
        timestamp: new Date()
      };
      messages = [...messages, aiResponse];
      isTyping = false;
    }, 1500);
  }

  function formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>AI Chat - YoRHa Legal AI</title>
</svelte:head>

<div class="chat-dashboard">
  <div class="header nes-container with-title">
    <p class="title">🤖 AI CHAT TERMINAL</p>
    <p class="subtitle">Legal Intelligence Assistant</p>
  </div>

  <div class="chat-container">
    <CardBits class="chat-window">
      <div class="messages-area">
        {#each messages as message (message.id)}
          <div class="message-wrapper {message.role}">
            <div class="message-bubble">
              <div class="message-header">
                <span class="message-author">
                  {message.role === 'user' ? '👤 You' : '🤖 Legal AI'}
                </span>
                <span class="message-time">{formatTimestamp(message.timestamp)}</span>
              </div>
              <div class="message-content">
                {message.content}
              </div>
            </div>
          </div>
        {/each}

        {#if isTyping}
          <div class="message-wrapper assistant">
            <div class="message-bubble typing">
              <div class="message-header">
                <span class="message-author">🤖 Legal AI</span>
                <span class="typing-indicator">typing...</span>
              </div>
              <div class="message-content">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="input-area">
        <div class="input-container">
          <InputBits
            bind:value={currentMessage}
            placeholder="Ask your legal question..."
            class="message-input"
            onkeydown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <ButtonBits
            variant="primary"
            onclick={sendMessage}
            disabled={!currentMessage.trim() || isTyping}
            class="send-button"
          >
➤ Send
          </ButtonBits>
        </div>
      </div>
    </CardBits>

    <CardBits class="chat-info">
      <div class="info-section">
        <h4>🎯 AI Status</h4>
        <div class="status-indicators">
          <div class="status-item">
            <span class="status-dot active"></span>
            <span>Online</span>
          </div>
          <div class="status-item">
            <span class="status-dot active"></span>
            <span>Legal Database</span>
          </div>
          <div class="status-item">
            <span class="status-dot active"></span>
            <span>Case Analysis</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h4>💡 Quick Questions</h4>
        <div class="quick-questions">
          <button
            class="quick-question"
            onclick={() => currentMessage = 'What are Miranda rights?'}
          >
            Miranda Rights

          <button
            class="quick-question"
            onclick={() => currentMessage = 'How to file a motion?'}
          >
            Filing Motions

          <button
            class="quick-question"
            onclick={() => currentMessage = 'Evidence admissibility rules'}
          >
            Evidence Rules
          </button>
        </div>
      </div>
    </CardBits>
  </div>
</div>

<style>
  .chat-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100vh;
  }

  .header {
    background: linear-gradient(135deg, #4a90e2, #7ed321) !important;
    text-align: center;
  }

  .header .title {
    color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.25rem !important;
  }

  .header .subtitle {
    color: rgba(255, 255, 255, 0.9) !important;
    font-size: 0.75rem;
  }

  .chat-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }

  .chat-window {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .message-wrapper {
    display: flex;
    max-width: 80%;
  }

  .message-wrapper.user {
    align-self: flex-end;
  }

  .message-wrapper.assistant {
    align-self: flex-start;
  }

  .message-bubble {
    background: rgba(15, 15, 35, 0.7);
    border-radius: 8px;
    padding: 0.75rem;
    border: 1px solid rgba(74, 144, 226, 0.3);
  }

  .message-wrapper.user .message-bubble {
    background: rgba(74, 144, 226, 0.2);
    border-color: var(--n64-primary);
  }

  .message-wrapper.assistant .message-bubble {
    background: rgba(126, 227, 33, 0.1);
    border-color: var(--n64-secondary);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .message-author {
    font-family: 'Press Start 2P', cursive;
    font-size: 0.625rem;
    color: var(--nier-text-primary);
  }

  .message-time {
    font-size: 0.625rem;
    color: var(--nier-text-secondary);
  }

  .message-content {
    color: var(--nier-text-primary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .typing-indicator {
    font-size: 0.625rem;
    color: var(--n64-secondary);
    font-style: italic;
  }

  .typing-dots {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .typing-dots span {
    width: 4px;
    height: 4px;
    background: var(--n64-secondary);
    border-radius: 50%;
    animation: typing 1.5s infinite;
  }

  .typing-dots span:nth-child(2) {
    animation-delay: 0.3s;
  }

  .typing-dots span:nth-child(3) {
    animation-delay: 0.6s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      opacity: 0.3;
    }
    30% {
      opacity: 1;
    }
  }

  .input-area {
    border-top: 1px solid rgba(74, 144, 226, 0.3);
    padding: 1rem;
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .message-input {
    flex: 1;
  }

  .send-button {
    flex-shrink: 0;
  }

  .chat-info {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-secondary) !important;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .info-section h4 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.75rem;
    margin: 0 0 0.75rem 0;
  }

  .status-indicators {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--nier-text-secondary);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--n64-error);
  }

  .status-dot.active {
    background: var(--n64-success);
  }

  .quick-questions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quick-question {
    background: rgba(74, 144, 226, 0.1);
    border: 1px solid rgba(74, 144, 226, 0.3);
    color: var(--nier-text-primary);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .quick-question:hover {
    background: rgba(74, 144, 226, 0.2);
    border-color: var(--n64-primary);
  }

  @media (max-width: 768px) {
    .chat-container {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto;
    }

    .chat-info {
      max-height: 200px;
      overflow-y: auto;
    }

    .message-wrapper {
      max-width: 95%;
    }
  }
</style>