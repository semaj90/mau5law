<script lang="ts">
import YorHADetectiveInterface from '$lib/components/ui/core/YorHADetectiveInterface.svelte';
  import { fade } from 'svelte/transition';
  let isBooting = $state<boolean>(true);
  let bootProgress = $state<number>(0);
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

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* Custom styles for gradients, shadows, and animations not easily expressed with UnoCSS */
  .boot-screen {
    background: linear-gradient(145deg, #000000 0%, #1a1a1a 50%, #000000 100%)}
  .logo-symbol {
    text-shadow: 0 0 20px #00ff41}
  .logo-main {
    text-shadow: 0 0 15px #00ff41}
  .progress-fill {
    background: linear-gradient(90deg, #00ff41, #00cc34);
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.5)}
  .progress-bar {
    border: 1px solid #333333; /* Keep border as UnoCSS might not handle it exactly */
  }
  .progress-text {
    font-size: 1rem;
    color: #00ff41;
    font-weight: bold}
  .boot-messages {
    text-align: left
   ; background: rgba(0, 0, 0, 0.8);
    border: 1px solid #333333;
    border-radius: 8px;
    padding: 2rem;
    min-height: 200px}
  .boot-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    padding: 0.5rem 0}
  .boot-message.current { background: rgba(0, 255, 65, 0.1);
    border-left: 3px solid #00ff41;
    padding-left: 1rem;
    margin-left: -1rem}
  .message-prefix {
    color: #666666;
    font-weight: bold;
    min-width: 2rem}
  .message-text {
    flex: 1; /* Corrected syntax */;
    color: #cccccc}
  .boot-message.current .message-text {
    color: #00ff41}
  .message-status {
    color: #00ff41;
    font-weight: bold}
  .loading-dots {
    color: #00ff41;
    animation: loading-dots 1.5s infinite}
  .boot-footer {
    border-top: 1px solid #333333;
    padding-top: 1rem}
  .system-info {
    font-size: 0.75rem
   ; color: #666666;
    line-height: 1.5; /* Corrected syntax */
  }
  @keyframes glow-pulse {
    0%,
    100% {
      text-shadow: 0 0 20px #00ff41;
      transform: scale(1)}
    50% {
      text-shadow: 0 0 30px #00ff41 0 0 40px #00ff41;
      transform: scale(1.05)}
  }
  @keyframes loading-dots {
    0%,
    20% {
      opacity: 0; /* Corrected syntax */
    }
    40% {
      opacity: 1; /* Corrected syntax */
    }
    60% { opacity: 1; /* Corrected syntax */
    }
    80%,
    100% {
      opacity: 0; /* Corrected syntax */
    }
  }
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .boot-logo {
      flex-direction: column;
      gap: 0.5rem}
    .logo-symbol {
      font-size: 3rem}
    .logo-main {
      font-size: 2rem}
    .boot-messages { padding: 1rem}
    .boot-message {
      font-size: 0.75rem}
  }
</style>
