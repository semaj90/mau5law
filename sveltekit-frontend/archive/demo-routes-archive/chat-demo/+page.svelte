<!-- Chat Demo Page -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import SimpleWorkingChat from '$lib/components/ai/SimpleWorkingChat.svelte';
</script>

<svelte:head>
  <title>Legal AI Chat Demo - CUDA Accelerated</title>
  <meta name="description" content="Legal AI Chat powered by RTX 3060 Ti GPU acceleration" />
</svelte:head>

<main class="container mx-auto px-4 py-8">
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold mb-4">⚖️ Legal AI Chat Demo</h1>
    <p class="text-lg nes-text is-disabled">
      Experience GPU-accelerated legal AI assistance powered by RTX 3060 Ti
    </p>
    <div class="flex justify-center gap-4 mt-4">
      <div class="text-sm">
        🚀 <strong>CUDA Acceleration:</strong> RTX 3060 Ti
      </div>
      <div class="text-sm">
        🧠 <strong>AI Model:</strong> Gemma3-Legal
      </div>
      <div class="text-sm">
        ⚡ <strong>Protocol:</strong> Binary Transport
      </div>
    </div>
  </div>

  <SimpleWorkingChat />

  <div class="mt-8 text-center text-sm nes-text is-disabled">
    <p>
      This demo uses the working CUDA service backend (port 8096) with GPU inference.
      <br />
      Backend: Go CUDA Service • Frontend: SvelteKit 5 • Proxy: Caddy with QUIC/HTTP3
    </p>
  </div>
</main>
