<script lang="ts">
  /**
   * Enhanced Evidence Canvas Editor
   * Production-quality canvas editor with:
   * - Fabric.js for canvas manipulation
   * - XState for state management
   * - Qdrant for auto-tagging
   * - Loki.js for local caching
   * - RabbitMQ for async operations
   * - Drizzle ORM for database operations
   * - bits-ui for UI components
   */

  import { onMount, onDestroy } from 'svelte';
  import { fabric } from 'fabric';
  import { useMachine } from '@xstate/svelte';
  import { canvasEditorMachine } from '$lib/machines/canvasEditorMachine';
  import { qdrantClient } from '$lib/ai/qdrant-service';
  import { lokiCanvasCache } from '$lib/services/loki-cache';
  import { rabbitMQClient } from '$lib/services/rabbitmq-client';
  import { db } from '$lib/server/db';
  import { evidence, canvasStates } from '$lib/server/db/schema';
  import { eq } from 'drizzle-orm';

  // bits-ui components
  import * as Dialog from '$lib/components/ui/enhanced-bits/dialog';
  import * as Popover from '$lib/components/ui/enhanced-bits/popover';
  import * as Toolbar from '$lib/components/ui/enhanced-bits/toolbar';
  import * as Tooltip from '$lib/components/ui/enhanced-bits/tooltip';
  import Button from '$lib/components/ui/button/Button.svelte';
  import Card from '$lib/components/ui/card/Card.svelte';
  import CardContent from '$lib/components/ui/card/CardContent.svelte';
  import CardHeader from '$lib/components/ui/card/CardHeader.svelte';
  import CardTitle from '$lib/components/ui/card/CardTitle.svelte';

  // Icons
  import {
    Save,
    Download,
    Upload,
    ZoomIn,
    ZoomOut,
    Move,
    Square,
    Circle,
    Type,
    Image,
    Trash2,
    Undo,
    Redo,
    Grid,
    Lock,
    Unlock,
    Tag,
    Share2,
  } from 'lucide-svelte';

  // Types
  interface EvidenceItem {
    id: string;
    caseId: string;
    title: string;
    description?: string;
    evidenceType: string;
    fileUrl?: string;
    fileName?: string;
    aiTags?: string[];
    canvasPosition?: { x: number; y: number; width: number; height: number };
  }

  interface CanvasState {
    id?: string;
    reportId: string;
    canvasData: string; // JSON serialized fabric canvas
    objects: CanvasObject[];
    version number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  interface CanvasObject {
    id: string;
    type: 'image' | 'text' | 'shape' | 'evidence';
    data: any;
    position { x: number; y: number };
    size: { width: number; height: number };
    metadata?: Record<string, any>;
  }

  // Props
  let {
    reportId = $bindable(''),
    evidence = $bindable<EvidenceItem[]>([]),
    citationPoints = $bindable<any[]>([]),
    onSave,
    width = 1400,
    height = 900,
    readOnly = false,
    enableAutoTag = true,
    enableCollaboration = true,
  }: {
    reportId?: string;
    evidence?: EvidenceItem[];
    citationPoints?: any[];
    onSave?: (state: CanvasState) => void;
    width?: number;
    height?: number;
    readOnly?: boolean;
    enableAutoTag?: boolean;
    enableCollaboration?: boolean;
  } = $props();

  // XState machine for canvas state management
  const { state, send } = useMachine(canvasEditorMachine, {
    context: {
      reportId,
      canvasState: null,
      selectedObjects: [],
      history: [],
      historyIndex: -1,
    },
  });

  // Svelte 5 runes
  let canvas = $state<fabric.Canvas | null>(null);
  let canvasElement: HTMLCanvasElement;
  let selectedObject = $state<fabric.Object | null>(null);
  let zoomLevel = $state(1);
  let gridEnabled = $state(true);
  let snapToGrid = $state(true);
  let isLoading = $state(false);
  let error = $state('');
  let autoSaveEnabled = $state(true);
  let lastSaved = $state<Date | null>(null);
  let isDirty = $state(false);

  // Tool state
  let activeTool = $state<'select' | 'pan' | 'draw' | 'text' | 'image' | 'evidence'>('select');
  let drawingMode = $state(false);

  // Dialog states
  let showEvidenceDialog = $state(false);
  let showTaggingDialog = $state(false);
  let showShareDialog = $state(false);

  // Auto-tagging state
  let isAutoTagging = $state(false);
  let suggestedTags = $state<string[]>([]);

  // Initialize canvas
  onMount(async () => {
    await initializeCanvas();
    await loadCanvasState();

    // Setup auto-save
    if (autoSaveEnabled) {
      setupAutoSave();
    }

    // Setup RabbitMQ for collaboration
    if (enableCollaboration) {
      await setupCollaboration();
    }

    // Load cached state from Loki
    loadCachedState();
  });

  onDestroy(() => {
    if (canvas) {
      canvas.dispose();
    }

    // Cleanup RabbitMQ connection
    rabbitMQClient.disconnect();
  });

  async function initializeCanvas(): Promise<void> {
    try {
      canvas = new fabric.Canvas(canvasElement, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection !readOnly,
        isDrawingMode: false,
      });

      // Setup event handlers
      setupCanvasEvents();

      // Enable grid if requested
      if (gridEnabled) {
        enableGrid();
      }

      send({ type: 'CANVAS_INITIALIZED' });
    } catch (err) {
      console.error('Failed to initialize canvas:', err);
      error = 'Failed to initialize canvas';
    }
  }

  function setupCanvasEvents(): void {
    if (!canvas) return;

    // Selection events
    canvas.on('selectioncreated', handleSelection);
    canvas.on('selectionupdated', handleSelection);
    canvas.on('selectioncleared', () => {
      selectedObject = null;
      send({ type: 'DESELECT' });
    });

    // Object modification events
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);

    // Mouse events for drawing
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
  }

  function handleSelection(e: fabric.IEvent): void {
    selectedObject = e.selected?.[0] || null;
    send({ type: 'SELECT_OBJECT', object: selectedObject });

    // Trigger auto-tagging if enabled
    if (enableAutoTag && selectedObject) {
      void autoTagObject(selectedObject);
    }
  }

  function handleObjectModified(e: fabric.IEvent): void {
    isDirty = true;
    addToHistory();

    // Cache in Loki
    saveToLokiCache();
  }

  function handleObjectAdded(e: fabric.IEvent): void {
    isDirty = true;
    addToHistory();

    // Broadcast via RabbitMQ if collaboration enabled
    if (enableCollaboration && e.target) {
      void broadcastChange('object:added', e.target);
    }
  }

  function handleObjectRemoved(e: fabric.IEvent): void {
    isDirty = true;
    addToHistory();

    if (enableCollaboration && e.target) {
      void broadcastChange('object:removed', e.target);
    }
  }

  function handleMouseDown(e: fabric.IEvent): void {
    if (activeTool === 'pan') {
      canvas?.setCursor('grab');
    }
  }

  function handleMouseMove(e: fabric.IEvent): void {
    // Handle panning, drawing, etc.
  }

  function handleMouseUp(e: fabric.IEvent): void {
    if (activeTool === 'pan') {
      canvas?.setCursor('default');
    }
  }

  // Load canvas state from database
  async function loadCanvasState(): Promise<void> {
    if (!reportId) return;

    try {
      isLoading = true;

      const response = await fetch(`/api/canvas/${reportId}`);
      if (response.ok) {
        const data: CanvasState = await response.json();

        if (data.canvasData && canvas) {
          canvas.loadFromJSON(data.canvasData, () => {
            canvas?.renderAll();
            send({ type: 'STATE_LOADED', state: data });
          });
        }
      }
    } catch (err) {
      console.error('Failed to load canvas state:', err);
      error = 'Failed to load canvas state';
    } finally {
      isLoading = false;
    }
  }

  // Save canvas state to database
  async function saveCanvasState(): Promise<void> {
    if (!canvas || !reportId) return;

    try {
      isLoading = true;
      send({ type: 'SAVE_START' });

      const canvasData = JSON.stringify(canvas.toJSON(['id', 'evidenceId', 'metadata']));
      const objects = extractCanvasObjects();

      const state: CanvasState = {
        reportId,
        canvasData,
        objects,
        version ($state.context.canvasState?.version || 0) + 1,
      };

      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (response.ok) {
        const savedState = await response.json();
        lastSaved = new Date();
        isDirty = false;

        send({ type: 'SAVE_SUCCESS', state: savedState });

        if (onSave) {
          onSave(savedState);
        }

        // Cache in Loki
        saveToLokiCache();

        // Show success toast
        showToast('Canvas saved successfully', 'success');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error('Failed to save canvas state:', err);
      error = 'Failed to save canvas';
      send({ type: 'SAVE_ERROR', error: err });
      showToast('Failed to save canvas', 'error');
    } finally {
      isLoading = false;
    }
  }

  function extractCanvasObjects(): CanvasObject[] {
    if (!canvas) return [];

    return canvas.getObjects().map((obj: any) => ({
      id: obj.id || crypto.randomUUID(),
      type: obj.type === 'image' ? 'image' : obj.type === 'text' ? 'text' : 'shape',
      data: obj.toJSON(),
      position { x: obj.left || 0, y: obj.top || 0 },
      size: { width: obj.width || 0, height: obj.height || 0 },
      metadata: obj.metadata || {},
    }));
  }

  // Qdrant auto-tagging
  async function autoTagObject(obj: fabric.Object): Promise<void> {
    if (!enableAutoTag || isAutoTagging) return;

    try {
      isAutoTagging = true;

      const objectData = {
        type: obj.type,
        content: (obj as any).text || (obj as any).src || '',
        metadata: (obj as any).metadata || {},
      };

      // Generate tags using Qdrant semantic search
      const tags = await qdrantClient.generateTags(objectData);
      suggestedTags = tags;

      // Show tagging dialog
      showTaggingDialog = true;

      send({ type: 'TAGS_GENERATED', tags });
    } catch (err) {
      console.error('Auto-tagging failed:', err);
    } finally {
      isAutoTagging = false;
    }
  }

  function applyTags(tags: string[]): void {
    if (!selectedObject) return;

    (selectedObject as any).metadata = {
      ...(selectedObject as any).metadata,
      tags,
    };

    canvas?.renderAll();
    isDirty = true;
    showTaggingDialog = false;
  }

  // Loki.js caching
  function saveToLokiCache(): void {
    if (!canvas || !reportId) return;

    const cacheData = {
      reportId,
      canvasData: JSON.stringify(canvas.toJSON()),
      timestamp: Date.now(),
    };

    lokiCanvasCache.set(`canvas_${reportId}`, cacheData);
  }

  function loadCachedState(): void {
    if (!reportId) return;

    const cached = lokiCanvasCache.get(`canvas_${reportId}`);
    if (cached && canvas) {
      canvas.loadFromJSON(cached.canvasData, () => {
        canvas?.renderAll();
      });
    }
  }

  // RabbitMQ collaboration
  async function setupCollaboration(): Promise<void> {
    try {
      await rabbitMQClient.connect();

      // Subscribe to canvas updates
      await rabbitMQClient.subscribe(`canvas.${reportId}`, handleRemoteChange);

      send({ type: 'COLLABORATION_ENABLED' });
    } catch (err) {
      console.error('Failed to setup collaboration', err);
    }
  }

  async function broadcastChange(type: string, object: fabric.Object): Promise<void> {
    try {
      await rabbitMQClient.publish(`canvas.${reportId}`, {
        type,
        object: object.toJSON(),
        userId: 'current-user', // TODO: Get from auth
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to broadcast change:', err);
    }
  }

  function handleRemoteChange(message: any): void {
    // Handle incoming changes from other users
    console.log('Remote change received:', message);
    // TODO: Apply remote changes to canvas
  }

  // History management
  function addToHistory(): void {
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON());
    send({ type: 'ADD_TO_HISTORY', state });
  }

  function undo(): void {
    send({ type: 'UNDO' });
    // TODO: Restore from history
  }

  function redo(): void {
    send({ type: 'REDO' });
    // TODO: Restore from history
  }

  // Canvas tools
  function setActiveTool(tool: typeof activeTool): void {
    activeTool = tool;

    if (canvas) {
      canvas.isDrawingMode = tool === 'draw';
      canvas.selection = tool === 'select';
    }

    send({ type: 'TOOL_CHANGED', tool });
  }

  function zoomIn(): void {
    if (!canvas) return;
    zoomLevel = Math.min(zoomLevel * 1.2, 5);
    canvas.setZoom(zoomLevel);
    canvas.renderAll();
  }

  function zoomOut(): void {
    if (!canvas) return;
    zoomLevel = Math.max(zoomLevel / 1.2, 0.1);
    canvas.setZoom(zoomLevel);
    canvas.renderAll();
  }

  function resetZoom(): void {
    if (!canvas) return;
    zoomLevel = 1;
    canvas.setZoom(1);
    canvas.renderAll();
  }

  function enableGrid(): void {
    // TODO: Implement grid overlay
    gridEnabled = true;
  }

  function toggleGrid(): void {
    gridEnabled = !gridEnabled;
    // TODO: Show/hide grid
  }

  function toggleSnapToGrid(): void {
    snapToGrid = !snapToGrid;
  }

  // Add evidence to canvas
  function addEvidence(item: EvidenceItem): void {
    if (!canvas) return;

    if (item.fileUrl && item.evidenceType === 'photo') {
      fabric.Image.fromURL(item.fileUrl, img => {
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
          ...(item.canvasPosition || {}),
        });

        (img as any).evidenceId = item.id;
        (img as any).metadata = {
          title: item.title,
          description item.description,
          evidenceType: item.evidenceType,
          tags: item.aiTags || [],
        };

        canvas?.add(img);
        canvas?.renderAll();

        isDirty = true;
      });
    } else {
      // Add as text annotation
      const text = new fabric.Text(item.title, {
        left: 100,
        top: 100,
        fontSize: 16,
        fill: '#333',
      });

      (text as any).evidenceId = item.id;
      (text as any).metadata = {
        description item.description,
        evidenceType: item.evidenceType,
      };

      canvas.add(text);
      canvas.renderAll();

      isDirty = true;
    }
  }

  function deleteSelected(): void {
    if (!canvas || !selectedObject) return;

    canvas.remove(selectedObject);
    selectedObject = null;
    isDirty = true;
  }

  function lockSelected(): void {
    if (!selectedObject) return;
    selectedObject.set({
      lockMovementX: true,
      lockMovementY: true,
      lockRotation true,
      lockScalingX: true,
      lockScalingY: true,
    });
    canvas?.renderAll();
  }

  function unlockSelected(): void {
    if (!selectedObject) return;
    selectedObject.set({
      lockMovementX: false,
      lockMovementY: false,
      lockRotation false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas?.renderAll();
  }

  // Export functions
  async function exportAsImage(): Promise<void> {
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
    });

    const link = document.createElement('a');
    link.download = `canvas_${reportId}_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }

  async function exportAsJSON(): Promise<void> {
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `canvas_${reportId}_${Date.now()}.json`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Auto-save setup
  let autoSaveInterval: ReturnType<typeof setInterval>;

  function setupAutoSave(): void {
    autoSaveInterval = setInterval(() => {
      if (isDirty && !isLoading) {
        void saveCanvasState();
      }
    }, 30000); // Auto-save every 30 seconds
  }

  onDestroy(() => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
  });

  // Toast notifications
  function showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText =
      'position fixed; top: 20px; right: 20px; padding: 1rem; border-radius: 0.5rem; z-index: 10000, animation slideIn 0.3s ease;';

    if (type === 'success') toast.style.background = '#10b981';
    if (type === 'error') toast.style.background = '#ef4444';
    if (type === 'info') toast.style.background = '#3b82f6';

    toast.style.color = 'white';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
</script>

<div class="evidence-canvas-editor">
  <!-- Toolbar -->
  <Toolbar.Root class="canvas-toolbar">
    <Toolbar.Group>
      <Toolbar.Button onclick={() => setActiveTool('select')} class:active={activeTool === 'select'}>
        <Move size={20} />
        <Tooltip.Root>
          <Tooltip.Trigger>Select</Tooltip.Trigger>
          <Tooltip.Content>Select and move objects</Tooltip.Content>
        </Tooltip.Root>
      </Toolbar.Button>

      <Toolbar.Button onclick={() => setActiveTool('draw')} class:active={activeTool === 'draw'}>
        <Square size={20} />
        <Tooltip.Root>
          <Tooltip.Trigger>Draw</Tooltip.Trigger>
          <Tooltip.Content>Draw shapes</Tooltip.Content>
        </Tooltip.Root>
      </Toolbar.Button>

      <Toolbar.Button onclick={() => setActiveTool('text')} class:active={activeTool === 'text'}>
        <Type size={20} />
        <Tooltip.Root>
          <Tooltip.Trigger>Text</Tooltip.Trigger>
          <Tooltip.Content>Add text</Tooltip.Content>
        </Tooltip.Root>
      </Toolbar.Button>

      <Toolbar.Button onclick={() => (showEvidenceDialog = true)}>
        <Image size={20} />
        <Tooltip.Root>
          <Tooltip.Trigger>Evidence</Tooltip.Trigger>
          <Tooltip.Content>Add evidence to canvas</Tooltip.Content>
        </Tooltip.Root>
      </Toolbar.Button>
    </Toolbar.Group>

    <Toolbar.Separator />

    <Toolbar.Group>
      <Toolbar.Button onclick={undo} disabled={$state.context.historyIndex <= 0}>
        <Undo size={20} />
      </Toolbar.Button>

      <Toolbar.Button onclick={redo} disabled={$state.context.historyIndex >= $state.context.history.length - 1}>
        <Redo size={20} />
      </Toolbar.Button>

      <Toolbar.Button onclick={deleteSelected} disabled={!selectedObject}>
        <Trash2 size={20} />
      </Toolbar.Button>
    </Toolbar.Group>

    <Toolbar.Separator />

    <Toolbar.Group>
      <Toolbar.Button onclick={zoomOut}>
        <ZoomOut size={20} />
      </Toolbar.Button>

      <Toolbar.Button onclick={resetZoom}>
        <span class="zoom-level">{Math.round(zoomLevel * 100)}%</span>
      </Toolbar.Button>

      <Toolbar.Button onclick={zoomIn}>
        <ZoomIn size={20} />
      </Toolbar.Button>
    </Toolbar.Group>

    <Toolbar.Separator />

    <Toolbar.Group>
      <Toolbar.Button onclick={toggleGrid} class:active={gridEnabled}>
        <Grid size={20} />
      </Toolbar.Button>

      <Toolbar.Button onclick={() => selectedObject && lockSelected()}>
        <Lock size={20} />
      </Toolbar.Button>

      <Toolbar.Button onclick={() => selectedObject && unlockSelected()}>
        <Unlock size={20} />
      </Toolbar.Button>

      {#if enableAutoTag}
        <Toolbar.Button onclick={() => (showTaggingDialog = true)} disabled={!selectedObject}>
          <Tag size={20} />
        </Toolbar.Button>
      {/if}
    </Toolbar.Group>

    <Toolbar.Separator />

    <Toolbar.Group>
      <Toolbar.Button onclick={saveCanvasState} disabled={isLoading || !isDirty}>
        <Save size={20} />
        {#if lastSaved}
          <span class="save-time">Saved {lastSaved.toLocaleTimeString()}</span>
        {/if}
      </Toolbar.Button>

      <Popover.Root>
        <Popover.Trigger asChild let:builder>
          <Toolbar.Button builders={[builder]}>
            <Download size={20} />
          </Toolbar.Button>
        </Popover.Trigger>
        <Popover.Content>
          <div class="export-menu">
            <Button onclick={exportAsImage} variant="ghost" class="w-full justify-start">Export as PNG</Button>
            <Button onclick={exportAsJSON} variant="ghost" class="w-full justify-start">Export as JSON</Button>
          </div>
        </Popover.Content>
      </Popover.Root>

      {#if enableCollaboration}
        <Toolbar.Button onclick={() => (showShareDialog = true)}>
          <Share2 size={20} />
        </Toolbar.Button>
      {/if}
    </Toolbar.Group>
  </Toolbar.Root>

  <!-- Canvas Container -->
  <div class="canvas-container">
    {#if error}
      <div class="error-message">
        L {error}
      </div>
    {/if}

    {#if isLoading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading canvas...</p>
      </div>
    {/if}

    <canvas bind:this={canvasElement}></canvas>
  </div>

  <!-- Evidence Panel -->
  {#if evidence.length > 0}
    <div class="evidence-panel">
      <h3>Evidence Library ({evidence.length})</h3>
      <div class="evidence-grid">
        {#each evidence as item}
          <Card class="evidence-item" onclick={() => addEvidence(item)}>
            <CardHeader>
              <CardTitle class="text-sm">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="evidence-type">{item.evidenceType}</div>
              {#if item.aiTags && item.aiTags.length > 0}
                <div class="tags">
                  {#each item.aiTags.slice(0, 3) as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              {/if}
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Evidence Dialog -->
<Dialog.Root bind:open={showEvidenceDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Evidence to Canvas</Dialog.Title>
      <Dialog.Description>Select evidence items to add to your canvas workspace</Dialog.Description>
    </Dialog.Header>

    <div class="evidence-list">
      {#each evidence as item}
        <Button
          variant="outline"
          class="w-full justify-start mb-2"
          onclick={() => {
            addEvidence(item);
            showEvidenceDialog = false;
          }}
        >
          {item.title}
        </Button>
      {/each}
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Tagging Dialog -->
<Dialog.Root bind:open={showTaggingDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Auto-Generated Tags</Dialog.Title>
      <Dialog.Description>AI-suggested tags from Qdrant semantic analysis</Dialog.Description>
    </Dialog.Header>

    {#if isAutoTagging}
      <div class="loading">Generating tags...</div>
    {:else}
      <div class="tags-list">
        {#each suggestedTags as tag}
          <span class="tag suggested">{tag}</span>
        {/each}
      </div>

      <div class="dialog-actions">
        <Button variant="secondary" onclick={() => (showTaggingDialog = false)}>Cancel</Button>
        <Button onclick={() => applyTags(suggestedTags)}>Apply Tags</Button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Share Dialog -->
{#if enableCollaboration}
  <Dialog.Root bind:open={showShareDialog}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Share Canvas</Dialog.Title>
        <Dialog.Description>Collaborate in real-time with your team</Dialog.Description>
      </Dialog.Header>

      <div class="share-content">
        <p>Share URL: <code>/canvas/{reportId}</code></p>
        <p class="collaboration-status">
          {#if $state.matches('collaboration.enabled')}
             Collaboration active
          {:else}
            � Collaboration paused
          {/if}
        </p>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  .evidence-canvas-editor {
    display: flex;
    flex-direction column;
    height: 100%;
    width: 100%;
    background: #f5f5f5;
  }

  .canvas-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    background: white;
    border-bottom: 1px solid #e5e5e5;
    align-items: center;
  }

  .canvas-container {
    flex: 1,
    position relative;
    overflow: hidden;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    border: 1px solid #e5e5e5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .error-message {
    position absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #fee;
    color: #c33;
    padding: 1rem;
    border-radius: 0.5rem;
    z-index: 100,
  }

  .loading-overlay {
    position absolute;
    inset: 0,
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction column;
    align-items: center;
    justify-content: center;
    z-index: 100,
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e5e5;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .evidence-panel {
    width: 300px;
    background: white;
    border-left: 1px solid #e5e5e5;
    padding: 1rem;
    overflow-y: auto;
  }

  .evidence-panel h3 {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    font-weight: 600,
    color: #333;
  }

  .evidence-grid {
    display: grid;
    gap: 0.75rem;
  }

  .evidence-item {
    cursor: pointer;
    transition all 0.2s;
  }

  .evidence-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .evidence-type {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .tag {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    background: #e5e5e5;
    border-radius: 0.25rem;
    color: #666;
  }

  .tag.suggested {
    background: #dbeafe;
    color: #1e40af;
  }

  .zoom-level {
    font-size: 0.85rem;
    font-weight: 600,
  }

  .save-time {
    font-size: 0.75rem;
    color: #666;
    margin-left: 0.5rem;
  }

  .export-menu {
    display: flex;
    flex-direction column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .evidence-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .share-content {
    padding: 1rem 0;
  }

  .share-content code {
    background: #f5f5f5;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }

  .collaboration-status {
    margin-top: 1rem;
    font-weight: 600,
  }

  .active {
    background: #3b82f6 !important;
    color: white !important;
  }
</style>
