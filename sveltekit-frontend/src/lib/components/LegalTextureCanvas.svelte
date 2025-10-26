<!--
  Legal Texture Streaming Canvas Component
  Svelte 5 UI component wrapper for N64-style texture streaming
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onDestroy } from 'svelte';
  import { useLegalTextureStreaming } from '$lib/components/headless/texture-streaming.svelte';
  import { useEvidenceCanvas } from '$lib/components/headless/evidence-canvas.svelte';
  import type {
    EvidencePhoto,
    DocumentScan,
    CaseVisualization,
    CourtroomDisplay,
  } from '$lib/gpu/legal-texture-pipeline';
  interface Props {
    width?: number;
    height?: number;
    enableGPU?: boolean;
    adaptiveQuality?: boolean;
    caseId?: string;
    mode?: 'evidence' | 'document' | 'visualization' | 'courtroom';
  }
  let {
    width = 1024,
    height = 768,
    enableGPU = true,
    adaptiveQuality = true,
    caseId = '',
    mode = 'evidence',
  }: Props = $props();
  // Canvas element reference
  let canvasElement: HTMLCanvasElement | null = null;
  let containerElement: HTMLDivElement | null = null;
  // Initialize texture streaming
  const textureStreaming = useLegalTextureStreaming({
    enableGPU,
    adaptiveQuality,
    maxChunkSize: 4096,
    cacheSize: 512,
    compressionEnabled: true,
  });
  // Initialize evidence canvas for interaction
  const evidenceCanvas = useEvidenceCanvas();
  // Component state
  let isReady = $state(false);
  let error = $state<string | null>(null);
  let currentTexture = $state<any>(null);
  let renderContext = $state<CanvasRenderingContext2D | null>(null);
  // Performance monitoring
  let frameRate = $state(0);
  let lastFrameTime = $state(0);
  let animationId = $state<number | null>(null);
  // Initialization
  $effect(() => {
    try {
      // Initialize texture streaming
      if (canvasElement) {
        textureStreaming.initialize(canvasElement);
        // Setup 2D rendering context for overlay
        renderContext = canvasElement.getContext('2d');
        // Setup evidence canvas
        evidenceCanvas.setCanvasSize({ width, height });
        evidenceCanvas.setViewport({ width, height });
        isReady = true;
        startRenderLoop();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize canvas';
      console.error('Canvas initialization error:', err);
    }
  });
  onDestroy(() => {
    stopRenderLoop();
    textureStreaming.dispose();
  });
  /**
   * Start render loop for real-time updates
   */
  function startRenderLoop() {
    function render(timestamp: number) {
      if (lastFrameTime > 0) {
        frameRate = 1000 / (timestamp - lastFrameTime);
      }
      lastFrameTime = timestamp;
      // Render current texture and overlays
      renderFrame();
      animationId = requestAnimationFrame(render);
    }
    animationId = requestAnimationFrame(render);
  }
  /**
   * Stop render loop
   */
  function stopRenderLoop() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
  /**
   * Render current frame
   */
  function renderFrame() {
    if (!renderContext) return;
    // Clear canvas
    renderContext.clearRect(0, 0, width, height);
    // Render background
    renderContext.fillStyle = '#001122';
    renderContext.fillRect(0, 0, width, height);
    // Render texture if available
    if (currentTexture) {
      renderTexture(currentTexture);
    }
    // Render evidence items overlay
    renderEvidenceOverlay();
    // Render UI overlay
    renderUIOverlay();
  }
  /**
   * Render texture to canvas
   */
  function renderTexture(texture: any) {
    if (!renderContext) return;
    // For WebGL textures, we'd need to read back to 2D context
    // For ImageData, we can draw directly
    if (texture instanceof ImageData) {
      const canvasState = evidenceCanvas.getCanvasState();
      // Apply zoom and pan transformations
      renderContext.save();
      renderContext.scale(canvasState.zoom, canvasState.zoom);
      renderContext.translate(canvasState.pan.x, canvasState.pan.y);
      // Draw texture
      renderContext.putImageData(texture, 0, 0);
      renderContext.restore();
    }
  }
  /**
   * Render evidence items overlay
   */
  function renderEvidenceOverlay() {
    if (!renderContext) return;
    const canvasState: any = evidenceCanvas.getCanvasState();
    const visibleItems: any[] = evidenceCanvas.visibleItems();
    const selectedItems: Set<any> = evidenceCanvas.getSelectedItems();
    renderContext.save();
    renderContext.scale(canvasState.zoom, canvasState.zoom);
    renderContext.translate(canvasState.pan.x, canvasState.pan.y);
    // Render connections if enabled
    if (canvasState.showConnections) {
      renderConnections(visibleItems);
    }
    // Render evidence items
    visibleItems.forEach(item => {
      renderEvidenceItem(item, selectedItems.has(item.id));
    });
    renderContext.restore();
  }
  /**
   * Render connections between evidence items
   */
  function renderConnections(items: any[]) {
    if (!renderContext) return;
    renderContext.strokeStyle = '#444444';
    renderContext.lineWidth = 2;
    renderContext.setLineDash([5, 5]);
    items.forEach(item => {
      (item.connections || []).forEach((connectionId: string) => {
        const connectedItem = items.find((i: any) => i.id === connectionId);
        if (connectedItem) {
          renderContext!.beginPath();
          renderContext!.moveTo(item.position.x, item.position.y);
          renderContext!.lineTo(connectedItem.position.x, connectedItem.position.y);
          renderContext!.stroke();
        }
      });
    });
    renderContext.setLineDash([]);
  }
  /**
   * Render individual evidence item
   */
  function renderEvidenceItem(item: any, isSelected: boolean) {
    if (!renderContext) return;
    renderContext.save();
    renderContext.translate(item.position.x, item.position.y);
    renderContext.rotate(item.rotation || 0);
    renderContext.scale(item.scale || 1, item.scale || 1);
    // Draw item based on type
    const color = getItemColor(item.type);
    renderContext.fillStyle = isSelected ? '#ffff00' : color;
    renderContext.fillRect(-16, -16, 32, 32);
    // Draw border
    renderContext.strokeStyle = isSelected ? '#ffffff' : '#666666';
    renderContext.lineWidth = isSelected ? 3 : 1;
    renderContext.strokeRect(-16, -16, 32, 32);
    // Draw label
    renderContext.fillStyle = '#ffffff';
    renderContext.font = '10px monospace';
    renderContext.textAlign = 'center';
    renderContext.fillText((item.name || '').substring(0, 8), 0, 30);
    renderContext.restore();
  }
  /**
   * Render UI overlay (stats, controls)
   */
  function renderUIOverlay() {
    if (!renderContext || mode === 'courtroom') return;
    const stats: any = textureStreaming.stats();
    // Render performance stats
    renderContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
    renderContext.fillRect(10, 10, 200, 100);
    renderContext.fillStyle = '#ffffff';
    renderContext.font = '12px monospace';
    renderContext.textAlign = 'left';
    const lines = [
      `FPS: ${frameRate.toFixed(1)}`,
      `Render: ${stats.renderTime?.toFixed(1) ?? '0.0'}ms`,
      `Chunks: ${stats.chunksLoaded ?? 0}`,
      `Cache: ${(textureStreaming.cacheHitRate() * 100).toFixed(1)}%`,
      `WebGL: ${stats.hasWebGL ? 'Yes' : 'No'}`,
      `WASM: ${stats.hasWASM ? 'Yes' : 'No'}`,
    ];
    lines.forEach((line, index) => {
      renderContext!.fillText(line, 15, 25 + index * 14);
    });
  }
  /**
   * Get color for evidence item type
   */
  function getItemColor(type: string): string {
    switch (type) {
      case 'photo':
        return '#ff4444';
      case 'document':
        return '#44ff44';
      case 'physical':
        return '#4444ff';
      case 'digital':
        return '#ffff44';
      default:
        return '#888888';
    }
  }
  /**
   * Handle mouse events
   */
  function handleMouseDown(event: MouseEvent) {
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Find clicked item
    const canvasState: any = evidenceCanvas.getCanvasState();
    const transformedX = (x - canvasState.pan.x) / canvasState.zoom;
    const transformedY = (y - canvasState.pan.y) / canvasState.zoom;
    const clickedItem = findItemAtPosition(transformedX, transformedY);
    evidenceCanvas.handlePointerDown(x, y, clickedItem?.id);
  }
  function handleMouseMove(event: MouseEvent) {
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    evidenceCanvas.handlePointerMove(x, y);
    // Update hovered item
    const canvasState: any = evidenceCanvas.getCanvasState();
    const transformedX = (x - canvasState.pan.x) / canvasState.zoom;
    const transformedY = (y - canvasState.pan.y) / canvasState.zoom;
    const hoveredItem = findItemAtPosition(transformedX, transformedY);
    evidenceCanvas.setHoveredItem(hoveredItem?.id || null);
  }
  function handleMouseUp() {
    evidenceCanvas.handlePointerUp();
  }
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    const x = (event as any).clientX - rect.left;
    const y = (event as any).clientY - rect.top;
    evidenceCanvas.handleWheel((event as any).deltaY, x, y);
  }
  /**
   * Find evidence item at position
   */
  function findItemAtPosition(x: number, y: number) {
    const items: any[] = evidenceCanvas.visibleItems();
    for (const item of items) {
      const dx = x - item.position.x;
      const dy = y - item.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 20 * (item.scale || 1)) {
        // Item radius
        return item;
      }
    }
    return null;
  }
  // Reactive updates
  $effect(() => {
    if (canvasElement) {
      canvasElement.width = width;
      canvasElement.height = height;
      evidenceCanvas.setCanvasSize({ width, height });
      evidenceCanvas.setViewport({ width, height });
    }
  });
  // Public API for loading textures
  export async function loadEvidencePhoto(photo: EvidencePhoto) {
    try {
      const texture = await textureStreaming.loadEvidencePhoto(photo);
      currentTexture = texture;
      // Add to evidence canvas
      evidenceCanvas.addEvidenceItem({
        type: 'photo',
        name: photo.filename,
        position { x: width / 2, y: height / 2 },
        rotation 0,
        scale: 1.0,
        textureId: photo.id,
        metadata: photo.metadata,
        connections: [],
      });
      return texture;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load evidence photo';
      throw err;
    }
  }
  export async function loadDocumentScan(scan: DocumentScan, pageData: ImageData[]) {
    try {
      const textures: any[] = await textureStreaming.loadDocumentScan(scan, pageData);
      if (textures.length > 0) {
        currentTexture = textures[0];
      }
      // Add to evidence canvas
      textures.forEach((texture: any, index: number) => {
        evidenceCanvas.addEvidenceItem({
          type: 'document',
          name: `${scan.id}_page_${index + 1}`,
          position { x: 200 + index * 100, y: 200 },
          rotation 0,
          scale: 1.0,
          textureId: texture.documentId,
          metadata: scan.metadata,
          connections: [],
        });
      });
      return textures;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load document scan';
      throw err;
    }
  }
  export async function loadCaseVisualization(visualization CaseVisualization) {
    try {
      const texture = await textureStreaming.loadCaseVisualization(visualization);
      currentTexture = texture;
      return texture;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load case visualization';
      throw err;
    }
  }
  export async function loadCourtroomDisplay(display: CourtroomDisplay) {
    try {
      const textures: any[] = await textureStreaming.loadCourtroomDisplay(display);
      if (textures.length > 0) {
        currentTexture = textures[0];
      }
      return textures;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load courtroom display';
      throw err;
    }
  }
  // Expose canvas methods
  export function fitToContent() {
    evidenceCanvas.fitToContent();
  }
  export function clearCanvas() {
    textureStreaming.clearCache();
    const items = evidenceCanvas.getEvidenceItems();
    for (const itemId of items.keys()) {
      evidenceCanvas.removeEvidenceItem(itemId);
    }
    currentTexture = null;
  }
  export function exportCanvas() {
    return evidenceCanvas.exportCanvas();
  }
  export function importCanvas(data: any) {
    evidenceCanvas.importCanvas(data);
  }
</script>

<div bind:this={containerElement} class="legal-texture-canvas" style="width: {width}px; height: {height}px;">
  <canvas>
    bind:this={canvasElement}
    {width}
    {height}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onwheel={handleWheel}
    class="texture-canvas" class:gpu-enabled={textureStreaming.stats().hasWebGL}
    class:error={!!error}
  </canvas>
  {#if error}
    <div class="error-overlay">
      <p>Error: {error}</p>
      <button
        onclick={() => {
          error = null;
        }}>Dismiss</button
      >
    </div>
  {/if}
  {#if !isReady}
    <div class="loading-overlay">
      <p>Initializing N64 texture streaming...</p>
      <div class="loading-spinner"></div>
    </div>
  {/if}
  {#if mode !== 'courtroom' && isReady}
    <div class="controls-overlay">
      <button
        onclick={() => evidenceCanvas.setMode('view')}
        class:active={evidenceCanvas.getCanvasState().mode === 'view'}
      >
        View
      </button>
      <button
        onclick={() => evidenceCanvas.setMode('edit')}
        class:active={evidenceCanvas.getCanvasState().mode === 'edit'}
      >
        Edit
      </button>
      <button
        onclick={() => evidenceCanvas.setMode('present')}
        class:active={evidenceCanvas.getCanvasState().mode === 'present'}
      >
        Present
      </button>
      <button onclick={() => evidenceCanvas.toggleConnections()}>
        {evidenceCanvas.getCanvasState().showConnections ? 'Hide' : 'Show'} Connections
      </button>
      <button onclick={fitToContent}>Fit to Content</button>
      <button onclick={clearCanvas}>Clear</button>
    </div>
  {/if}
</div>

<style>
  .legal-texture-canvas .texture-canvas {
    display: block;
    cursor: grab;
    transition: filter 0.2s ease;
  }
  .texture-canvas:active {
    cursor: grabbing;
  }
  .texture-canvas.gpu-enabled {
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }
  .texture-canvas.error {
    filter: hue-rotate(180deg);
    border-color: #ff4444;
  }
  .error-overlay {
    position absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    z-index: 1000,
  }
  .loading-overlay {
    position absolute;
    top: 0,
    left: 0;
    right: 0,
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 999,
  }
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #333;
    border-top: 4px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-top: 10px;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .controls-overlay {
    position absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 100,
  }
  .controls-overlay button {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 1px solid #666;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s ease;
  }
  .controls-overlay buttonhover {
    background: rgba(0, 0, 0, 0.9);
    border-color: #999;
  }
  .controls-overlay button.active {
    background: rgba(0, 255, 0, 0.7);
    border-color: #0f0;
  }
</style>

