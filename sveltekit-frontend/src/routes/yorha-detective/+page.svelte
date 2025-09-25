<!-- YoRHa Detective Interface Demo Page -->
<script lang="ts">
  import YorHADetectiveInterface from '$lib/components/custom/YorHADetectiveInterface.svelte';
  import { fade } from 'svelte/transition';
  let isBooting = $state(true);
  let bootProgress = $state(0);
  let bootMessages = $state<string[]>([]);
  const bootSequence = [
    'Initializing YoRHa OS...',
    'Loading Neural Network Protocols...',
    'Establishing Connection to Command Center...',
    'Activating Detective Support System...',
    'AI Assistant 9S Online...',
    'Investigation Interface Ready.',
  ];
  // Boot sequence simulation
  setTimeout(() => {
    const bootInterval = setInterval(() => {
      if (bootProgress < bootSequence.length) {
        bootMessages.push(bootSequence[bootProgress]);
        bootProgress++;
      } else {
        clearInterval(bootInterval);
        setTimeout(() => {
          isBooting = false;
        }, 1000);
      }
    }, 800);
  }, 500);
</script>

<svelte:head>
  <title>YoRHa Detective Interface | Enhanced-Bits Gaming UI</title>
  <meta name="description" content="Cyberpunk detective interface using Enhanced-Bits components" />
</svelte:head>
{#if isBooting}
  <div class="boot-screen" transition:fade>
    <div class="boot-content">
      <div class="boot-logo">
        <div class="logo-symbol">⚔️</div>
        <div class="logo-text">
          <div class="logo-main">YoRHa</div>
          <div class="logo-sub">DETECTIVE SYSTEM</div>
        </div>
      </div>
      <div class="boot-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {(bootProgress / bootSequence.length) * 100}%"></div>
        </div>
        <div class="progress-text">
          {Math.round((bootProgress / bootSequence.length) * 100)}% Complete
        </div>
      </div>
      <div class="boot-messages">
        {#each bootMessages as message, index}
          <div class="boot-message" transition:fade={{ delay: 200 }}>
            <span class="message-prefix">[{(index + 1).toString().padStart(2, '0')}]</span>
            <span class="message-text">{message}</span>
            <span class="message-status">✓</span>
          </div>
        {/each}
        {#if bootProgress < bootSequence.length}
          <div class="boot-message current">
            <span class="message-prefix">[{(bootProgress + 1).toString().padStart(2, '0')}]</span>
            <span class="message-text">
              {bootSequence[bootProgress] || 'Finalizing...'}
            </span>
            <span class="loading-dots">...</span>
          </div>
        {/if}
      </div>
      <div class="boot-footer">
        <div class="system-info">YoRHa OS v2.0 | Neural Network Active | Enhanced-Bits Framework</div>
      </div>
    </div>
  </div>
{:else}
  <div transition:fade={{ delay: 300, duration: 800 }}>
    <YorHADetectiveInterface />
  </div>
{/if}

<style>
  .boot-screen {
    position: fixed;
    inset: 0;
    background: linear-gradient(145deg, #000000 0%, #1a1a1a 50%, #000000 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }
  .boot-content {
    text-align: center;
    max-width: 600px;
    width: 90%;
  }
  .boot-logo {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 3rem;
  }
  .logo-symbol {
    font-size: 4rem;
    color: #00ff41;
    text-shadow: 0 0 20px #00ff41;
    animation: glow-pulse 2s infinite;
  }
  .logo-text {
    text-align: left;
  }
  .logo-main {
    font-size: 2.5rem;
    font-weight: bold;
    color: #00ff41;
    text-shadow: 0 0 15px #00ff41;
    line-height: 1;
  }
  .logo-sub {
    font-size: 1rem;
    color: #cccccc;
    margin-top: 0.25rem;
    letter-spacing: 2px;
  }
  .boot-progress {
    margin-bottom: 3rem;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #333333;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 1rem;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00ff41, #00cc34);
    border-radius: 3px;
    transition: width 0.8s ease;
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  }
  .progress-text {
    font-size: 1rem;
    color: #00ff41;
    font-weight: bold;
  }
  .boot-messages {
    text-align: left;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #333333;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
    min-height: 200px;
  }
  .boot-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    padding: 0.5rem 0;
  }
  .boot-message.current {
    background: rgba(0, 255, 65, 0.1);
    border-left: 3px solid #00ff41;
    padding-left: 1rem;
    margin-left: -1rem;
  }
  .message-prefix {
    color: #666666;
    font-weight: bold;
    min-width: 2rem;
  }
  .message-text {
    flex: 1;
    color: #cccccc;
  }
  .boot-message.current .message-text {
    color: #00ff41;
  }
  .message-status {
    color: #00ff41;
    font-weight: bold;
  }
  .loading-dots {
    color: #00ff41;
    animation: loading-dots 1.5s infinite;
  }
  .boot-footer {
    border-top: 1px solid #333333;
    padding-top: 1rem;
  }
  .system-info {
    font-size: 0.75rem;
    color: #666666;
    line-height: 1.5;
  }
  @keyframes glow-pulse {
    0%,
    100% {
      text-shadow: 0 0 20px #00ff41;
      transform: scale(1);
    }
    50% {
      text-shadow:
        0 0 30px #00ff41,
        0 0 40px #00ff41;
      transform: scale(1.05);
    }
  }
  @keyframes loading-dots {
    0%,
    20% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    60% {
      opacity: 1;
    }
    80%,
    100% {
      opacity: 0;
    }
  }
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .boot-logo {
      flex-direction: column;
      gap: 0.5rem;
    }
    .logo-symbol {
      font-size: 3rem;
    }
    .logo-main {
      font-size: 2rem;
    }
    .boot-messages {
      padding: 1rem;
    }
    .boot-message {
      font-size: 0.75rem;
    }
  }
</style>
