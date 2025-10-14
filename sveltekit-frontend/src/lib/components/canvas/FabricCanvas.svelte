<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import * as Card from '$lib/components/ui/card';
  import {
    Upload,
    Move,
    RotateCcw,
    Trash2,
    ZoomIn,
    ZoomOut,
    Save,
    Download,
    Image as ImageIcon,
    FileText,
  } from 'lucide-svelte';

  interface Props {
    width?: number;
    height?: number;
    caseId?: string;
    readOnly?: boolean;
    gridEnabled?: boolean;
    snapToGrid?: boolean;
    onSave?: (data: { objects: any[] }) => void;
    onDelete?: (data: { objectId: string }) => void;
    onSelect?: (data: { object: any }) => void;
  }

  let {
    width = 800,
    height = 600,
    caseId = undefined,
    readOnly = false,
    gridEnabled = false,
    snapToGrid = false,
    onSave,
    onDelete,
    onSelect,
  }: Props = $props();

  // Fabric.js canvas instance
  let fabricCanvas = $state<any>(null);
  let canvasElement: HTMLCanvasElement | undefined;
  let isLoading = $state(false);
  let selectedObject = $state<any>(null);
  let canvasObjects = $state<any[]>([]);
  let zoomLevel = $state(1);

  // Evidence management
  interface EvidenceItem {
    id: string;
    type: 'image' | 'document' | 'annotation';
    title: string;
    url?: string;
    urlExpiry?: number;
    x: number;
    y: number;
    metadata: { [key: string]: any };
  }

  let evidenceItems = $state<EvidenceItem[]>([]);
  let minioStatus = $state<'checking' | 'connected' | 'disconnected'>('checking');
  let uploadProgress = $state(new Map<string, number>());

  // Derived state (kept concise - author used $derived runes)
  let evidenceCount = $derived(evidenceItems.length);
  let hasSelectedObject = $derived(selectedObject !== null);
  let hasUploadProgress = $derived(uploadProgress.size > 0);
  let zoomPercentage = $derived(Math.round(zoomLevel * 100));
  let minioStatusText = $derived(
    minioStatus === 'connected' ? 'MinIO' : minioStatus === 'disconnected' ? 'Demo' : 'Checking...'
  );
  let minioStatusColor = $derived(
    minioStatus === 'connected'
      ? 'bg-green-500'
      : minioStatus === 'disconnected'
        ? 'bg-red-500'
        : 'bg-yellow-500 animate-pulse'
  );

  // Helper to normalize dynamic import of Fabric.js across bundlers
  async function getFabric(): Promise<any> {
    const mod: any = await import('fabric');
    return mod.fabric ?? mod.default ?? mod;
  }

  $effect(() => {
    (async () => {
      try {
        const fabric = await getFabric();
        fabricCanvas = new fabric.Canvas(canvasElement, {
          width,
          height,
          backgroundColor: '#f8fafc',
          selection: !readOnly,
        });
        if (gridEnabled) {
          drawGrid(fabric);
        }
        setupCanvasEvents();
        await checkMinIOStatus();
        await loadCanvasData();
      } catch (error) {
        console.error('Failed to initialize Fabric canvas:', error);
      }
    })();
  });

  function drawGrid(fabric: any) {
    if (!fabricCanvas) return;
    const gridSize = 25;
    const lines: any[] = [];
    for (let i = 0; i < Math.ceil(width / gridSize); i++) {
      const distance = i * gridSize;
      lines.push(
        new fabric.Line([distance, 0, distance, height], { stroke: '#edf2f7', selectable: false, evented: false })
      );
    }
    for (let j = 0; j < Math.ceil(height / gridSize); j++) {
      const distance = j * gridSize;
      lines.push(
        new fabric.Line([0, distance, width, distance], { stroke: '#edf2f7', selectable: false, evented: false })
      );
    }
    lines.forEach(line => fabricCanvas.add(line));
    fabricCanvas.sendToBack(...lines);
    if (snapToGrid) {
      fabricCanvas.on('object:moving', (e: any) => {
        const obj = e.target;
        if (!obj) return;
        obj.set({
          left: Math.round((obj.left ?? 0) / gridSize) * gridSize,
          top: Math.round((obj.top ?? 0) / gridSize) * gridSize,
        });
      });
    }
  }

  function setupCanvasEvents() {
    if (!fabricCanvas) return;
    // Object selection
    fabricCanvas.on('selection:created', (e: any) => {
      selectedObject = e.selected?.[0] ?? null;
      onSelect?.({ object: selectedObject });
    });
    fabricCanvas.on('selection:cleared', () => {
      selectedObject = null;
    });
    // Object modification
    fabricCanvas.on('object:modified', () => {
      updateCanvasObjects();
    });
    // Mouse wheel zoom
    fabricCanvas.on('mouse:wheel', (opt: any) => {
      const e = opt.e;
      const delta = e.deltaY;
      let zoom = fabricCanvas.getZoom ? fabricCanvas.getZoom() : zoomLevel;
      zoom *= Math.pow(0.999, delta);
      zoom = Math.min(Math.max(zoom, 0.01), 20);
      fabricCanvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      zoomLevel = zoom;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  async function checkMinIOStatus() {
    try {
      const response = await fetch('/api/v1/minio/status');
      minioStatus = response.ok ? 'connected' : 'disconnected';
    } catch {
      minioStatus = 'disconnected';
    }
  }

  async function loadCanvasData() {
    if (!caseId) return;
    isLoading = true;
    try {
      const response = await fetch(`/api/v1/evidence/${caseId}`);
      if (!response.ok) {
        evidenceItems = [];
        return;
      }
      const evidence = await response.json();
      evidenceItems = Array.isArray(evidence) ? evidence : [];
      for (const item of evidenceItems) {
        // don't await all serially in case there are many; but to keep ordering, await here
        // awaiting ensures images are added before next step; adjust if parallel desired
        // graceful handling inside addEvidenceToCanvas
        // eslint-disable-next-line no-await-in-loop
        await addEvidenceToCanvas(item);
      }
    } catch (error) {
      console.error('Failed to load canvas data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function refreshExpiredUrl(evidence: EvidenceItem): Promise<string> {
    if (!evidence.urlExpiry || Date.now() < evidence.urlExpiry) {
      return evidence.url || '';
    }
    try {
      const response = await fetch(`/api/v1/minio/url-refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: evidence.metadata?.bucket,
          fileName: evidence.metadata?.fileName,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        return result?.url ?? (evidence.url || '');
      }
    } catch (error) {
      console.warn('Failed to refresh URL for:', evidence.id);
    }
    return evidence.url || '';
  }

  async function addEvidenceToCanvas(evidence: EvidenceItem) {
    if (!fabricCanvas) return;
    try {
      const fabric = await getFabric();
      if (evidence.type === 'image' && evidence.url) {
        const imageUrl = await refreshExpiredUrl(evidence);
        if (!fabric || !fabric.Image || typeof fabric.Image.fromURL !== 'function') {
          console.warn('Fabric Image API not available; skipping image:', evidence.id);
          return;
        }
        // fromURL is callback-based in many builds
        fabric.Image.fromURL(
          imageUrl,
          (img: any) => {
            img.set({
              left: evidence.x,
              top: evidence.y,
              scaleX: 0.5,
              scaleY: 0.5,
              selectable: !readOnly,
              evidenceId: evidence.id,
              evidenceType: evidence.type,
            });
            fabricCanvas.add(img);
            fabricCanvas.renderAll();
            updateCanvasObjects();
          },
          { crossOrigin: 'anonymous' }
        );
      } else if (evidence.type === 'document') {
        const rect = new fabric.Rect({
          left: evidence.x,
          top: evidence.y,
          width: 120,
          height: 160,
          fill: '#ffffff',
          stroke: '#e2e8f0',
          strokeWidth: 2,
          selectable: !readOnly,
          evidenceId: evidence.id,
          evidenceType: evidence.type,
        });
        const text = new fabric.Text(evidence.title, {
          left: evidence.x + 10,
          top: evidence.y + 10,
          fontSize: 12,
          fontFamily: 'Arial',
          fill: '#1f2937',
          selectable: false,
        });
        const group = new fabric.Group([rect, text], {
          left: evidence.x,
          top: evidence.y,
          selectable: !readOnly,
          evidenceId: evidence.id,
          evidenceType: evidence.type,
        });
        fabricCanvas.add(group);
        fabricCanvas.renderAll();
        updateCanvasObjects();
      }
    } catch (err) {
      console.warn('Failed to add evidence to canvas:', evidence.id, err);
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    if (!files || files.length === 0) return;
    const promises = Array.from(files).map(f => uploadEvidence(f as File));
    await Promise.allSettled(promises);
    input.value = '';
  }

  async function uploadEvidence(file: File) {
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    try {
      isLoading = true;
      uploadProgress.set(fileId, 0);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId || 'demo-case');

      let uploadResponse = await fetch('/api/v1/minio/upload?bucket=evidence-files', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        uploadResponse = await fetch('/api/evidence/demo', {
          method: 'POST',
          body: formData,
        });
      }
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      const uploadResult = await uploadResponse.json();
      const evidence: EvidenceItem = {
        id: uploadResult.id || uploadResult.fileId || `${Date.now()}`,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        title: file.name,
        url: uploadResult.url,
        urlExpiry: uploadResult.bucket ? Date.now() + 23 * 60 * 60 * 1000 : undefined,
        x: Math.random() * (width - 200) + 100,
        y: Math.random() * (height - 200) + 100,
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          uploadDate: new Date().toISOString(),
          bucket: uploadResult.bucket || 'demo',
          fileName: uploadResult.fileName || uploadResult.filename,
        },
      };
      evidenceItems = [...evidenceItems, evidence];
      await addEvidenceToCanvas(evidence);
      uploadProgress.set(fileId, 100);
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      uploadProgress.delete(fileId);
    } finally {
      isLoading = false;
      setTimeout(() => uploadProgress.delete(fileId), 2000);
    }
  }

  function addAnnotation() {
    if (!fabricCanvas) return;
    (async () => {
      const fabric = await getFabric();
      if (!fabric || !fabric.IText) {
        console.warn('Fabric IText not available; annotation disabled');
        return;
      }
      const text = new fabric.IText('Click to edit annotation', {
        left: width / 2,
        top: height / 2,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: 8,
        selectable: !readOnly,
        editable: !readOnly,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      updateCanvasObjects();
    })();
  }

  function deleteSelected() {
    if (!fabricCanvas || !selectedObject) return;
    const evidenceId = selectedObject.evidenceId;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    if (evidenceId) {
      evidenceItems = evidenceItems.filter(item => item.id !== evidenceId);
      onDelete?.({ objectId: evidenceId });
    }
    selectedObject = null;
    updateCanvasObjects();
  }

  function zoomIn() {
    if (!fabricCanvas) return;
    const zoom = Math.min((fabricCanvas.getZoom ? fabricCanvas.getZoom() : zoomLevel) * 1.2, 5);
    fabricCanvas.setZoom ? fabricCanvas.setZoom(zoom) : (zoomLevel = zoom);
    zoomLevel = zoom;
  }

  function zoomOut() {
    if (!fabricCanvas) return;
    const zoom = Math.max((fabricCanvas.getZoom ? fabricCanvas.getZoom() : zoomLevel) * 0.8, 0.1);
    fabricCanvas.setZoom ? fabricCanvas.setZoom(zoom) : (zoomLevel = zoom);
    zoomLevel = zoom;
  }

  function resetZoom() {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom ? fabricCanvas.setZoom(1) : (zoomLevel = 1);
    zoomLevel = 1;
  }

  function saveCanvas() {
    if (!fabricCanvas) return;
    try {
      const objects = fabricCanvas.getObjects().map((obj: any) => ({
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        angle: obj.angle,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        evidenceId: obj.evidenceId,
        evidenceType: obj.evidenceType,
      }));
      onSave?.({ objects });
    } catch (err) {
      console.warn('Failed to save canvas:', err);
    }
  }

  function updateCanvasObjects() {
    if (!fabricCanvas) return;
    canvasObjects = fabricCanvas.getObjects().map((obj: any) => ({
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      angle: obj.angle,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      evidenceId: obj.evidenceId,
      evidenceType: obj.evidenceType,
    }));
  }

  function exportCanvas() {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `case-${caseId || 'canvas'}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }
</script>

<div class="fabric-canvas-container">
  <!-- Toolbar -->
  <div class="mb-4 nes-container">
    <div class="p-4 pb-3">
      <div class="flex items-center justify-between font-semibold text-lg">
        <div class="flex items-center gap-2">
          <ImageIcon class="h-5 w-5" />
          Evidence Canvas
          {#if evidenceCount > 0}
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{evidenceCount} items</span>
          {/if}
        </div>
        <div class="flex items-center gap-3 text-sm text-gray-600">
          <!-- MinIO Status Indicator -->
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full {minioStatusColor}"></div>
            <span class="text-xs">{minioStatusText}</span>
          </div>
          <span>Zoom: {zoomPercentage}%</span>
        </div>
      </div>
    </div>
    <div class="p-4">
      <div class="flex flex-wrap gap-2">
        <!-- File Upload -->
        {#if !readOnly}
          <label class="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              class="hidden"
              onchange={handleFileUpload}
              disabled={isLoading}
            />
            <Button class="bits-btn" variant="ghost" disabled={isLoading}>
              <Upload class="h-4 w-4 mr-2" />
              Upload Evidence
            </Button>
          </label>
        {/if}
        <!-- Add Annotation -->
        {#if !readOnly}
          <Button class="bits-btn" variant="ghost" onclick={addAnnotation}>
            <FileText class="h-4 w-4 mr-2" />
            Add Note
          </Button>
        {/if}
        <!-- Zoom Controls -->
        <Button class="bits-btn" variant="ghost" onclick={zoomIn}>
          <ZoomIn class="h-4 w-4" />
        </Button>
        <Button class="bits-btn" variant="ghost" onclick={zoomOut}>
          <ZoomOut class="h-4 w-4" />
        </Button>
        {#if hasSelectedObject && !readOnly}
          <Button class="bits-btn" variant="destructive" onclick={deleteSelected}>
            <Trash2 class="h-4 w-4 mr-2" />
            Delete
          </Button>
        {/if}
        <!-- Save & Export -->
        {#if !readOnly}
          <Button class="bits-btn" variant="default" onclick={saveCanvas}>
            <Save class="h-4 w-4 mr-2" />
            Save
          </Button>
        {/if}
        <Button class="bits-btn" variant="ghost" onclick={exportCanvas}>
          <Download class="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  </div>
  <!-- Canvas -->
  <div class="canvas-wrapper relative border border-gray-200 rounded-lg overflow-hidden">
    <canvas bind:this={canvasElement} class="block"></canvas>
    {#if isLoading}
      <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    {/if}
    <!-- Upload Progress Indicators -->
    {#if hasUploadProgress}
      <div class="absolute top-4 right-4 space-y-2">
        {#each Array.from(uploadProgress.entries()) as [fileId, progress]}
          <div class="bg-white rounded-lg shadow-lg p-3 min-w-48">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-gray-600">Uploading...</span>
              <span class="text-blue-600">{progress}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <!-- Object Properties Panel -->
  {#if selectedObject}
    <div class="mt-4 nes-container">
      <div class="p-4">
        <h3 class="text-lg font-semibold mb-4">Selected Object</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium">Type:</span>
            <p class="text-gray-600">{selectedObject.type}</p>
          </div>
          <div>
            <span class="font-medium">Position:</span>
            <p class="text-gray-600">
              {Math.round(selectedObject.left)}, {Math.round(selectedObject.top)}
            </p>
          </div>
          <div>
            <span class="font-medium">Size:</span>
            <p class="text-gray-600">
              {Math.round(selectedObject.width * selectedObject.scaleX)} ×
              {Math.round(selectedObject.height * selectedObject.scaleY)}
            </p>
          </div>
          <div>
            <span class="font-medium">Rotation:</span>
            <p class="text-gray-600">{Math.round(selectedObject.angle)}°</p>
          </div>
          {#if selectedObject.evidenceId}
            <div class="col-span-2">
              <span class="font-medium">Evidence ID:</span>
              <p class="text-gray-600 font-mono text-xs">{selectedObject.evidenceId}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .fabric-canvas-container {
    width: 100%;
  }
  .canvas-wrapper {
    display: inline-block;
    background: white;
  }
</style>
