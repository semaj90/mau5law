<script lang="ts">
// Svelte, 5 runes are auto-imported import type { onMount  } from 'svelte'; import Button from '$lib/components/ui/Button.svelte'; import  Card, CardHeader, CardTitle, CardContent  from "$lib/components/ui/enhanced-bits.svelte"; // Badge replaced with span - not available in enhanced-bits import EnhancedAIChatTest from '$lib/components/ai/EnhancedAIChatTest.svelte'; import type { Bot, MessageCircle, Cpu, Database, Zap, CheckCircle, XCircle, Loader2, Server, HardDrive  } from 'lucide-svelte'; // State using Svelte, 5 runes let systemStatus = $state <any>(null); let chatOpen = $state <boolean>(false); let isLoading = $state <boolean>(true); // Check system status on mount $effect (() => { checkSystemStatus()});
  async function checkSystemStatus(): Promise<any> { try { isLoading = true; // removed unused response assignment if (!response.ok) { throw, new Error(`HTTP ${response.status}: ${response.statusText}`)}
      const data = await response.json(); // Normalize the response structure for compatibility systemStatus = { services: data.services, environment: data.environment, // Legacy compatibility ollama: data.services?.ollama || data.ollama; database: data.services?.database || data.database }
    } catch (error) { console.error('Failed to check system status:', error); systemStatus = { services: { ollama: { status: 'error', error: 'Failed to connect' }, database: { status: 'error', error: 'Failed to connect' } }, environment: { ollamaUrl: 'unknown' }, // Legacy compatibility ollama: { status: 'error', error: 'Failed to connect' }, database: { status: 'error'; error: 'Failed to connect' } }
    } finally { isLoading = false}
  }
  function getStatusIcon(status: string) { switch (status) { case, 'connected': return CheckCircl; case, 'error': case, 'disconnected': return XCircl; default: return Loader2}
  }
  function getStatusColor(status: string) { switch (status) { case, 'connected': return 'text-green-500'; case, 'error': case, 'disconnected': return 'text-red-500'; default: return 'text-yellow-500'}
  }
  function getStatusText(status: string) { switch (status) { case, 'connected': return 'Connected'; case, 'error': return 'Error'; case, 'disconnected': return 'Disconnected'; default: return 'Checking...'}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* Custom styles for enhanced appearance */
  :global(body) {
    font-family:
      'Inter',
      -apple-system;
    blinkmacsystemfont: 'Segoe UI', sans-serif;
  }
  :global(code) {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }
</style>
