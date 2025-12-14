<script lang="ts">
import type { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter  } from '$lib/components/ui/card';
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte';; import type { page  } from '$app/stores'; // Changed from '$app/state' to: '$app/stores'
  import  Button  from "$lib/components/ui/enhanced-bits.svelte"; // Standardized Button import for bits-ui import * as Card from '$lib/components/ui/Card.svelte'; import Input from '$lib/components/ui/input/Input.svelte'; // Svelte, 5 Runes - Evidence Board State let isConnecting = $state <boolean>(false); let selectedItem: EvidenceCard | null = null; let canvasItems = $state <EvidenceCard[]>([]); let connections = $state <Array<{ from string; to: string;, type: string }>>([]); let caseData = $state({ id: 'CORPORATE ESPIONAGE INV', title: 'Corporate Espionage Investigation', status: 'active', items: [] });
  let isDemoMode = $state <boolean>(false); let isConnected = $state <boolean>(true); // Case sidebar data let caseDetails = $state([ { name: 'Corporate Espionage Investigation', status: 'active', color: 'green' }, { name: 'Missing Person Dr. Sarah Chen', status: 'active', color: 'green' }, { name: 'Financial Fraud Analysis', status: 'pending', color: 'yellow' }, { name: 'Security Breach Analysis', status: 'active', color: 'green' }]); interface EvidenceCard { id: string, title: string, type: 'VIDEO' | 'DOCUMENT' | 'PHOTO' | 'AUDIO'; description: string, position: { x: number, y: number };, connections: string[], metadata?: { timestamp?: string; location?: string; source?: string}}
  $effect(() => {() => { initializeEvidenceBoard()}); function initializeEvidenceBoard() { // Initialize with sample evidence cards like in the screenshot canvasItems = [ { id: 'video-001', title: 'SECURITY CAMERA', type: 'VIDEO', description: 'CCTV footage from the main entrance', position: { x: 200, y: 300 }, connections: ['doc-001'], metadata: { timestamp: '2024-03-15, 14:32', location: 'Main Entrance', source: 'Security System'
        } }, {
        id: 'doc-001', title: 'WITNESS STATEMENT', type: 'DOCUMENT', description: 'Detailed written statement from key witness', position: { x: 500, y: 400 }, connections: ['video-001'], metadata: { timestamp: '2024-03-16, 09:15', source: 'Detective Interview'
        } }]; connections = [{ from 'video-001', to: 'doc-001', type: 'correlation' }]}
  function getTypeIcon(type: string) { switch (type) { case, 'VIDEO': return 'ðŸŽ¥'; case, 'DOCUMENT': return 'ðŸ“„'; case, 'PHOTO': return 'ðŸ“·'; case, 'AUDIO': return 'ðŸŽµ'; default: return 'ðŸ“‹'}
  }
  function getStatusColor(status: string) { switch (status) { case, 'active': return 'bg-green-500'; case, 'pending': return 'bg-yellow-500'; case, 'completed': return 'bg-blue-500'; default: return 'bg-gray-500'}
  }
  function addEvidence() { const newEvidence: EvidenceCard = { id: `evidence-${Date.now()}`, title: 'NEW EVIDENCE', type: 'DOCUMENT', description: 'New evidence item', position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 }, connections: [] }; canvasItems = [...canvasItems, newEvidence]}
  function startConnection(item: EvidenceCard) { if (!isConnecting) { isConnecting = true; selectedItem = item} else if (selectedItem && selectedItem.id !== item.id) { const currentSelectedItem = selectedItem; // Introduce a local constant to help TypeScript // Create connection const newConnection = { from currentSelectedItem.id, to: item.id, type: 'correlation'
      }; connections = [...connections, newConnection]; // Update item connections canvasItems = canvasItems.map(i => { if (i.id === currentSelectedItem.id) { return { ...i, connections: [...i.connections, item.id] }}
        if (i.id === item.id) { return { ...i, connections: [...i.connections, currentSelectedItem.id] }}
        return i}); isConnecting = false; selectedItem = null}
  }
  function cancelConnection() { isConnecting = false; selectedItem = null}

  // Drag and drop functionality let draggedItem: EvidenceCard | null = null; let dragOffset = $state({ x: 0, y: 0 }); function handleMouseDown(event: MouseEvent, item: EvidenceCard) { draggedItem = item; const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }}
  function handleMouseMove(event: MouseEvent) { if (draggedItem) { const canvas = document.getElementById('evidence-canvas'); if (!canvas) return; const rect = canvas.getBoundingClientRect(); const newX = event.clientX - rect.left - dragOffset.x; const newY = event.clientY - rect.top - dragOffset.y; canvasItems = canvasItems.map( (item: EvidenceCard) => (item.id === draggedItem!.id ? { ...item, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }: item) )}
  }
  function handleMouseUp() { draggedItem = null}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* @unocss-include */ /* Grid background pattern */
  #evidence-canvas {
    background-color: #f9fafb;
  }
  /* Smooth transitions for drag and drop */
  .evidence-card {
    transition: transform 0.1s ease;
  }
  .evidence-card:hover {
    transform: translateY(-2px);
  }
  /* Connection line animations */
  svg line {
    animation: dash 2s linear infinite;
  }
  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }
</style>
