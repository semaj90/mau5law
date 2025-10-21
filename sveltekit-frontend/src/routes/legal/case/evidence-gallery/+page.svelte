<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import * as Card from '$lib/components/ui/card';
  import Select from '$lib/components/ui/select/Select.svelte';
  import Input from '$lib/components/ui/input/Input.svelte';
  // Svelte 5 Runes - Evidence Board State
  let isConnecting = $state(false);
  let selectedItem = $state(null);
  let canvasItems = $state([]);
  let connections = $state([]);
  let caseData = $state({
    id: 'CORPORATE ESPIONAGE INV',
    title: 'Corporate Espionage Investigation',
    status: 'active',
    items: [], // Fixed: Removed trailing semicolon
  });
  let isDemoMode = $state(false);
  let isConnected = $state(true);
  // Case sidebar data
  let caseDetails = $state([
    { name: 'Corporate Espionage Investigation', status: 'active', color: 'green' },
    { name: 'Missing Person Dr. Sarah Chen', status: 'active', color: 'green' },
    { name: 'Financial Fraud Analysis', status: 'pending', color: 'yellow' },
    { name: 'Security Breach Analysis', status: 'active', color: 'green' },
  ]);
  interface EvidenceCard {
    id: string;
    title: string;
    type: 'VIDEO' | 'DOCUMENT' | 'PHOTO' | 'AUDIO';
    description string;
    position { x: number; y: number };
    connections: string[];
    metadata?: {
      timestamp?: string;
      location?: string;
      source?: string;
    };
  }
  $effect(() => {
    initializeEvidenceBoard();
  });
  function initializeEvidenceBoard() {
    // Initialize with sample evidence cards like in the screenshot
    canvasItems = [
      {
        id: 'video-001',
        title: 'SECURITY CAMERA',
        type: 'VIDEO',
        description 'CCTV footage from the main entrance',
        position { x: 200, y: 300 },
        connections: ['doc-001'],
        metadata: {
          timestamp: '2024-03-15 14:32',
          location 'Main Entrance',
          source: 'Security System', // Fixed: Removed trailing semicolon
        },
      },
      {
        id: 'doc-001',
        title: 'WITNESS STATEMENT',
        type: 'DOCUMENT',
        description 'Detailed written statement from key witness',
        position { x: 500, y: 400 },
        connections: ['video-001'],
        metadata: {
          timestamp: '2024-03-16 09:15',
          source: 'Detective Interview', // Fixed: Removed trailing semicolon
        },
      },
    ];
    connections = [{ from: 'video-001', to: 'doc-001', type: 'correlation' }];
  }
  function getTypeIcon(type: string) {
    switch (type) {
      case 'VIDEO':
        return '🎥';
      case 'DOCUMENT':
        return '📄';
      case 'PHOTO':
        return '📷';
      case 'AUDIO':
        return '🎵';
      default:
        return '📋';
    }
  }
  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }
  function addEvidence() {
    const newEvidence: EvidenceCard = {
      id: `evidence-${Date.now()}`,
      title: 'NEW EVIDENCE',
      type: 'DOCUMENT',
      description 'New evidence item',
      position { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      connections: [], // Fixed: Removed trailing semicolon
    };
    canvasItems = [...canvasItems, newEvidence];
  }
  function startConnection(item: EvidenceCard) {
    if (!isConnecting) {
      isConnecting = true;
      selectedItem = item;
    } else if (selectedItem && selectedItem.id !== item.id) {
      // Simplified type access
      // Create connection
      const newConnection = {
        from: selectedItem.id,
        to: item.id, // Simplified type access
        type: 'correlation', // Fixed: Removed trailing semicolon
      };
      connections = [...connections, newConnection];
      // Update item connections
      canvasItems = canvasItems.map(i => {
        if (i.id === selectedItem.id) {
          return { ...i, connections: [...i.connections, item.id] }; // Simplified type access
        }
        if (i.id === item.id) {
          // Simplified type access
          return { ...i, connections: [...i.connections, selectedItem.id] };
        }
        return i;
      });
      isConnecting = false;
      selectedItem = null;
    }
  }
  function cancelConnection() {
    isConnecting = false;
    selectedItem = null;
  }
  // Drag and drop functionality
  let draggedItem = $state(null);
  let dragOffset = $state({ x: 0, y: 0 });
  function handleMouseDown(event: MouseEvent, item: EvidenceCard) {
    draggedItem = item;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
  function handleMouseMove(event: MouseEvent) {
    if (draggedItem) {
      const canvas = document.getElementById('evidence-canvas');
      if (!canvas) return; // Added null check for canvas
      const rect = canvas.getBoundingClientRect();
      const newX = event.clientX - rect.left - dragOffset.x;
      const newY = event.clientY - rect.top - dragOffset.y;
      canvasItems = canvasItems.map(
        (
          item: EvidenceCard // Fixed: Correct map syntax and added type for item
        ) => (item.id === draggedItem.id ? { ...item, position { x: Math.max(0, newX), y: Math.max(0, newY) } } : item)
      );
    }
  }
  function handleMouseUp() {
    draggedItem = null;
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />
<!-- Main Evidence Board Layout -->
<div class="flex h-screen bg-gray-100 font-mono">
  <!-- Left Sidebar Navigation -->
  <div class="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-4">
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      🏠
    </button>
    <button class="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white"> 📋 </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      🏢
    </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      📄
    </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      ⚙️
    </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      👤
    </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      💼
    </button>
    <button
      class="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
    >
      🔍
    </button>
  </div>
  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col">
    <!-- Top Header -->
    <div class="bg-white border-b flex items-center justify-between px-6 py-4">
      <div class="flex items-center space-x-4">
        <button class="text-gray-600 hover:text-gray-800">←</button>
        <div>
          <h1 class="text-xl font-bold text-gray-800">EVIDENCE BOARD</h1>
          <p class="text-sm text-gray-600">{caseData.title}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-700">Case:</span>
          <span class="px-3 py-1 bg-gray-800 text-white text-sm rounded">{caseData.id}</span>
        </div>
        <Button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">📚 LIBRARY</Button>
        <!-- Fixed: Added closing tag -->
        <Button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2">📊 ANALYSIS</Button>
        <!-- Fixed: Added closing tag -->
      </div>
    </div>
    <!-- Main Canvas and Controls -->
    <div class="flex-1 flex">
      <!-- Canvas Controls -->
      <div class="absolute top-4 left-4 flex items-center space-x-2 z-10">
        <Button class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm" disabled>🔒 100%</Button>
        <!-- Fixed: Added closing tag -->
        <Button class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm" disabled>📎 CONNECT</Button>
        <!-- Fixed: Added closing tag -->
        <Button onclick={addEvidence} class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm">
          + ADD EVIDENCE
        </Button>
        <!-- Fixed: Added closing tag -->
        <Button class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm" disabled>📚 LIBRARY (0)</Button>
        <!-- Fixed: Added closing tag -->
      </div>
      <!-- Connection Status -->
      <div class="absolute bottom-4 left-4 z-10">
        <div class="flex items-center space-x-2 text-sm text-gray-600">
          <span class="w-2 h-2 bg-red-500 rounded-full"></span>
          <span>Demo Mode - Server Not Connected</span>
        </div>
      </div>
      <!-- Main Canvas with Grid -->
      <div
        id="evidence-canvas"
        class="w-full h-full relative overflow-hidden"
        style="background-image: radial-gradient(circle, #d1d5db 1px, transparent 1px); background-size: 20px 20px;"
      >
        <!-- SVG for connection lines -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 1;">
          {#each connections as connection}
            {@const fromItem = canvasItems.find((i: EvidenceCard) => i.id === connection.from)}
            <!-- Fixed: Correct find syntax and added type -->
            {@const toItem = canvasItems.find((i: EvidenceCard) => i.id === connection.to)}
            <!-- Fixed: Correct find syntax and added type -->
            {#if fromItem && toItem}
              <line
                x1={fromItem.position.x + 120}
                y1={fromItem.position.y + 80}
                x2={toItem.position.x + 120}
                y2={toItem.position.y + 80}
                stroke="#6b7280"
                stroke-width="2"
                stroke-dasharray="5,5"
                opacity="0.7"
              />
            {/if}
          {/each}
        </svg>
        <!-- Evidence Cards -->
        {#each canvasItems as item (item.id)}
          <!-- Fixed: Simplified keying and removed redundant type cast -->
          <div
            class="absolute cursor-pointer select-none"
            style="left: {item.position.x}px; top: {item.position.y}px; z-index: 2;"
            onmousedown={(e: MouseEvent) => handleMouseDown(e, item)}
            onclick={() => startConnection(item)}
          >
            <Card.Root
              class="w-60 bg-white border-2 {selectedItem?.id === item.id
                ? 'border-blue-500'
                : 'border-gray-300'} shadow-lg hover:shadow-xl transition-all"
            >
              <!-- Fixed: Changed div.Root to Card.Root and simplified type access -->
              <Card.Header class="pb-2">
                <!-- Fixed: Changed div.Header to Card.Header -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-gray-800">{item.type}</span>
                  <!-- Simplified type access -->
                  <span class="text-xs text-gray-500">!</span>
                </div>
              </Card.Header>
              <Card.Content class="pt-0">
                <!-- Fixed: Changed div.Content to Card.Content -->
                <!-- Main Content Area -->
                <div class="bg-gray-600 h-16 rounded mb-2 flex items-center justify-center">
                  <span class="text-white text-2xl">{getTypeIcon(item.type)}</span>
                  <!-- Simplified type access -->
                </div>
                <!-- Title -->
                <div class="text-sm font-bold text-blue-600 mb-1">{item.title}</div>
                <!-- Simplified type access -->
                <!-- Description -->
                <div class="text-xs text-gray-700 mb-2">{item.description}</div>
                <!-- Simplified type access -->
                <!-- Metadata -->
                {#if item.metadata}
                  <!-- Simplified type access -->
                  <div class="text-xs text-gray-500 space-y-1">
                    {#if item.metadata.timestamp}
                      <!-- Simplified type access -->
                      <div>📅 {item.metadata.timestamp}</div>
                      <!-- Simplified type access -->
                    {/if}
                    {#if item.metadata.location}
                      <!-- Simplified type access -->
                      <div>📍 {item.metadata.location}</div>
                      <!-- Simplified type access -->
                    {/if}
                    {#if item.metadata.source}
                      <!-- Simplified type access -->
                      <div>🔗 {item.metadata.source}</div>
                      <!-- Simplified type access -->
                    {/if}
                  </div>
                {/if}
                <!-- Connection indicators -->
                {#if item.connections.length > 0}
                  <!-- Simplified type access -->
                  <div class="flex items-center mt-2 text-xs text-green-600">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {item.connections.length} connections <!-- Simplified type access -->
                    <span class="ml-auto">🔗</span>
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          </div>
        {/each}
        <!-- Connection Mode Overlay -->
        {#if isConnecting}
          <div class="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center" style="z-index: 10;">
            <div class="bg-white p-4 rounded-lg shadow-lg border">
              <div class="text-center">
                <div class="text-lg font-bold text-blue-600 mb-2">Connection Mode</div>
                <div class="text-sm text-gray-600 mb-4">
                  Selected: {selectedItem?.title}<br />
                  Click another evidence item to create connection
                </div>
                <Button onclick={cancelConnection} class="bg-red-600 hover:bg-red-700 text-white">
                  Cancel Connection
                </Button>
                <!-- Fixed: Added closing tag -->
              </div>
            </div>
          </div>
        {/if}
      </div>
      <!-- Right Sidebar -->
      <div class="w-80 bg-white border-l flex flex-col">
        <!-- Case Info Header -->
        <div class="p-4 border-b">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-700">Case:</span>
            <span class="text-xs text-green-600 font-medium">🔴 Connected</span>
          </div>
          <div class="space-y-2">
            {#each caseDetails as caseItem}
              <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-800">{caseItem.name}</div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-1 text-xs rounded {getStatusColor(caseItem.status)} text-white">
                    {caseItem.status}
                  </span>
                  <span class="text-green-500">✓</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
        <!-- Evidence Statistics -->
        <div class="p-4 border-b">
          <div class="text-sm font-medium text-gray-700 mb-3">Evidence Summary</div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total Items:</span>
              <span class="font-medium">{canvasItems.length}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Connections:</span>
              <span class="font-medium">{connections.length}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Analysis:</span>
              <span class="text-green-600 font-medium">Ready</span>
            </div>
          </div>
        </div>
        <!-- Evidence List -->
        <div class="flex-1 p-4 overflow-y-auto">
          <div class="text-sm font-medium text-gray-700 mb-3">Evidence Items</div>
          <div class="space-y-2">
            {#each canvasItems as item}
              <div class="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div class="flex items-center space-x-2">
                  <span class="text-lg">{getTypeIcon(item.type)}</span>
                  <!-- Simplified type access -->
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800">{item.title}</div>
                    <!-- Simplified type access -->
                    <div class="text-xs text-gray-600">{item.type}</div>
                    <!-- Simplified type access -->
                  </div>
                  {#if item.connections.length > 0}
                    <!-- Simplified type access -->
                    <span class="text-xs text-green-600">🔗</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
        <!-- Action Buttons -->
        <div class="p-4 border-t space-y-2">
          <Button onclick={addEvidence} class="w-full bg-blue-600 hover:bg-blue-700 text-white">+ Add Evidence</Button>
          <!-- Fixed: Added closing tag -->
          <Button class="w-full bg-green-600 hover:bg-green-700 text-white">🔍 Analyze All</Button>
          <!-- Fixed: Added closing tag -->
          <Button class="w-full bg-purple-600 hover:bg-purple-700 text-white">📊 Generate Report</Button>
          <!-- Fixed: Added closing tag -->
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* @unocss-include */
  /* Grid background pattern */
  #evidence-canvas {
    background-color: #f9fafb;
  }
  /* Smooth transitions for drag and drop */
  .evidence-card {
    transition transform 0.1s ease;
  }
  .evidence-card:hover {
    transform: translateY(-2px);
  }
  /* Connection line animations */
  svg line {
    animation dash 2s linear infinite;
  }
  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }
</style>
