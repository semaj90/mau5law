<!--
  Collaborative Evidence Canvas Component
  Real-time collaborative evidence mapping with advanced visualization and AI integration
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { websocketStore } from '$lib/stores/websocket-store';
  import { createPubSubHelper } from '$lib/server/redisPubSub';
  import { getRedisConfig, KEY_PATTERNS, CACHE_TTL } from '$lib/config/redis-config';
  import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '$lib/components/ui/enhanced-bits';
  import { ocrIntegration } from '$lib/services/ocr-integration-service';
  // Dynamic fabric import to avoid SSR issues
  let fabricInstance: any = null;
  async function getFabric(): Promise<any> {
    if (fabricInstance) return fabricInstance;
    try {
      const mod: any = await import('fabric');
      fabricInstance = mod.fabric ?? mod.default ?? mod;
      return fabricInstance;
    } catch (error) {
      console.error('Failed to load fabric.js:', error);
      // Return mock fabric for fallback
      return {
        Canvas: class MockCanvas {
          constructor(element: any, options: any) {
            this.elements = elements;
            this.options = options;
          }
          add() {}
          remove() {}
          clear() {}
          renderAll() {}
          getObjects() { return [], }
          on() {}
          off() {}
        },
        Object: class MockObject {},
        Line: class MockLine {},
        Group: class MockGroup {}
      }
    }
  }
  // Custom types for fabric objects with extended properties
  interface ExtendedFabricObject {
    evidenceId?: string;
    annotationType?: string;
    fromNodeId?: string;
    toNodeId?: string;
    nodeType?: string;
    evidenceType?: string;
    evidenceData?: any;
    connectionType?: string;
    annotationText?: string;
  }
  // Props
  interface Props {
    caseId: string;
    evidenceData: any[];
    canvasWidth?: number;
    canvasHeight?: number;
    collaborative?: boolean;
    aiAssisted?: boolean;
    readOnly?: boolean;
    showGrid?: boolean;
    showRulers?: boolean;
    autoSave?: boolean;
  }
  let {
    caseId,
    evidenceData = [],
    canvasWidth = 1200,
    canvasHeight = 800,
    collaborative = true,
    aiAssisted = true,
    readOnly = false,
    showGrid = true,
    showRulers = false,
    autoSave = true
  }: Props = $props();
  // Canvas and state management
  let canvasElement: HTMLCanvasElement;
  let fabricCanvas: any;
  let canvasContainer: HTMLDivElement;
  let selectedTool = $state<'select' | 'evidence' | 'connection' | 'note' | 'highlight' | 'draw'>('select');
  let isDrawing = $state(false);
  let canvasState = $state<any>(null);
  let collaborators = $state<Map<string, any>>(new Map());
  let cursors = $state<Map<string, any>>(new Map());
  // Evidence mapping
  let evidenceNodes = $state<Map<string, any>>(new Map());
  let connections = $state<Map<string, any>>(new Map());
  let annotations = $state<Map<string, any>>(new Map());
  // AI suggestions
  let aiSuggestions = $state<any[]>([]);
  let showAISuggestions = $state(false);
  let isGeneratingLayout = $state(false);
  // UI state
  let sidebarOpen = $state(true);
  let propertiesPanel = $state<any>(null);
  let contextMenu = $state<any>(null);
  let undoStack = $state<any[]>([]);
  let redoStack = $state<any[]>([]);
  // Real-time collaboration
  let lastSaveTime = $state<Date>(new Date());
  let saveTimeout: NodeJS.Timeout;
  let collaboratorCursors = new Map<string, any>();
  let pubSubController: any = null;
  let redisChannels = {
    canvas: `legal:canvas:${caseId}`,
    collaboration: `legal:canvas:${caseId}:collab`,
    cursors: `legal:canvas:${caseId}:cursors`,
    ai: `legal:canvas:${caseId}:ai`
  }
  // Lifecycle
  $effect(() => {
    if (!browser) return;
    (async () => {
      try {
        await initializeCanvas();
        await loadCanvasData();
        if (collaborative) {
          await setupCollaboration();
        }
        if (aiAssisted) {
          setupAIIntegration();
        }
        setupEventHandlers();
        // Setup auto-save with Redis
        if (autoSave) {
          setupAutoSave();
        }
      } catch (error) {
        console.error('Failed to initialize canvas:', error);
      }
    })();
  });
  onDestroy(async () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (pubSubController) {
      await pubSubController.stop();
    }
    fabricCanvas?.dispose();
  });
  async function initializeCanvas() {
    // Get fabric instance
    const fabricInstance = await getFabric();
    // Initialize Fabric.js canvas
    fabricCanvas = new fabricInstance.Canvas(canvasElement, {
      width: canvasWidth
      height: canvasHeight
      backgroundColor: '#1a1a1a',
      selection: !readOnly,
      interactive: !readOnly,
      preserveObjectStacking: true
      enablePointerEvents: true;
    });
    // Configure canvas settings
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#4a90e2';
    // Add grid if enabled
    if (showGrid) {
      await addGridToCanvas();
    }
    // Set up zoom and pan
    await setupZoomPan();
  }
  async function addGridToCanvas() {
    const fabricInstance = await getFabric();
    const gridSize = 20;
    const grid = [];
    // Vertical lines
    for (let i = 0; i <= canvasWidth / gridSize; i++) {
      const line = new fabricInstance.Line([i * gridSize, 0, i * gridSize, canvasHeight], {
        stroke: '#333',
        strokeWidth: 1,
        selectable: false;
        evented: false
        excludeFromExport: true;
      });
      grid.push(line);
    }
    // Horizontal lines
    for (let i = 0; i <= canvasHeight / gridSize; i++) {
      const line = new fabricInstance.Line([0, i * gridSize, canvasWidth, i * gridSize], {
        stroke: '#333',
        strokeWidth: 1,
        selectable: false;
        evented: false
        excludeFromExport: true;
      });
      grid.push(line);
    }
    grid.forEach(line => fabricCanvas.add(line));
    grid.forEach(line => fabricCanvas.sendToBack(line));
  }
  async function setupZoomPan() {
    const fabricInstance = await getFabric();
    // Mouse wheel zoom
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.1) zoom = 0.1;
      const point = new fabricInstance.Point(opt.e.offsetX, opt.e.offsetY);
      fabricCanvas.zoomToPoint(point, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    // Pan with middle mouse or alt+drag
    let panning = false;
    fabricCanvas.on('mouse:down', (opt) => {
      if (opt.e.altKey || opt.e.button === 1) {
        panning = true;
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = 'grab';
      }
    });
    fabricCanvas.on('mouse:move', (opt) => {
      if (panning) {
        const delta = new fabricInstance.Point(opt.e.movementX, opt.e.movementY);
        fabricCanvas.relativePan(delta);
        // Broadcast cursor movement in collaborative mode
        if (collaborative) {
          broadcastCursorPosition(opt.e.offsetX, opt.e.offsetY);
        }
      }
    });
    fabricCanvas.on('mouse:up', () => {
      panning = false;
      fabricCanvas.selection = true;
      fabricCanvas.defaultCursor = 'default';
    });
  }
  async function loadCanvasData() {
    try {
      // Try Redis cache first for faster loading
      const cachedData = await loadFromRedisCache();
      if (cachedData) {
        // Load from Redis cache
        if (cachedData.canvasData) {
          await loadCanvasFromJSON(JSON.stringify(cachedData.canvasData));
        }
        // Restore state from cache
        if (cachedData.evidenceNodes) {
          evidenceNodes = new Map(cachedData.evidenceNodes);
        }
        if (cachedData.connections) {
          connections = new Map(cachedData.connections);
        }
        if (cachedData.annotations) {
          annotations = new Map(cachedData.annotations);
        }
        console.log('✅ Canvas loaded from Redis cache');
      } else {
        // Fallback to API if no cache
        // removed unused response assignment
        if (response.ok) {
          const data = await response.json();
          if (data.canvasData) {
            await loadCanvasFromJSON(data.canvasData);
          }
        }
      }
      // Add evidence nodes that aren't already on canvas
      await addEvidenceNodes();
    } catch (error) {
      console.error('❌ Failed to load canvas data:', error);
    }
  }
  async function addEvidenceNodes() {
    for (let index = 0; index < evidenceData.length; index++) {
      const evidence = evidenceData[index];
      if (!evidenceNodes.has(evidence.id)) {
        const node = await createEvidenceNode(evidence, {
          x: 100 + (index % 5) * 200,
          y: 100 + Math.floor(index / 5) * 150;
        });
        evidenceNodes.set(evidence.id, node);
        fabricCanvas.add(node);
      }
    }
    fabricCanvas.renderAll();
  }
  async function createEvidenceNode(evidence: any, position: ;
{ x: number; y: number }) {
    const fabricInstance = await getFabric();
    const nodeGroup = new fabricInstance.Group([], {
      left: position.x,
      top: position.y,
      selectable: !readOnly,
      hasControls: !readOnly,
      hasBorders: !readOnly,
      lockScalingFlip: true;
    });
    // Background card
    const background = new fabricInstance.Rect({
      width: 180,
      height: 120,
      fill: getEvidenceColor(evidence.type),
      stroke: '#fff',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      shadow: new fabricInstance.Shadow({,
        color: 'rgba(0,0,0,0.3)',
        blur: 10,
        offsetX: 2,
        offsetY: 2;
      })
    });
    // Title text
    const title = new fabricInstance.Text(evidence.title || `Evidence ${evidence.id}`, {
      fontSize: 14,
      fill: '#fff',
      fontFamily: 'Arial',
      textAlign: 'center',
      top: 10,
      left: 90,
      originX: 'center',
      originY: 'top',
      width: 160;
    });
    // Type indicator
    const typeIcon = new fabricInstance.Text(getEvidenceIcon(evidence.type), {
      fontSize: 20,
      fill: '#fff',
      fontFamily: 'FontAwesome',
      top: 40,
      left: 90,
      originX: 'center',
      originY: 'center';
    });
    // Status indicators
    const indicators = [];
    if (evidence.aiSummary) {
      indicators.push(new fabricInstance.Circle({
        radius: 6,
        fill: '#4CAF50',
        top: 100,
        left: 20 + indicators.length * 20;
      }));
    }
    if (evidence.analyzed) {
      indicators.push(new fabricInstance.Circle({
        radius: 6,
        fill: '#2196F3',
        top: 100,
        left: 20 + indicators.length * 20;
      }));
    }
    // Combine into group
    const objects = [background, title, typeIcon, ...indicators];
    objects.forEach(obj => nodeGroup.addWithUpdate(obj));
    // Add custom properties
    nodeGroup.set({
      evidenceId: evidence.id,
      evidenceType: evidence.type,
      evidenceData: evidence
      nodeType: 'evidence'
    });
    // Add event handlers
    nodeGroup.on('mousedown', (e) => handleNodeClick(nodeGroup, e));
    nodeGroup.on('moving', () => saveCanvasState());
    return nodeGroup;
  }
  async function createConnection(fromNode: any, toNode: any, connectionType: string = 'related') {
    const fabricInstance = await getFabric();
    const fromCenter = fromNode.getCenterPoint();
    const toCenter = toNode.getCenterPoint();
    const connection = new fabricInstance.Line([
      fromCenter.x, fromCenter.y,
      toCenter.x, toCenter.y
    ], {
      stroke: getConnectionColor(connectionType),
      strokeWidth: 3,
      selectable: !readOnly,
      hasControls: false
      hasBorders: false
      strokeDashArray: connectionType === 'inferred' ? [10, 5] : undefined;
      shadow: new fabricInstance.Shadow({,
        color: 'rgba(0,0,0,0.2)',
        blur: 5;
      })
    });
    // Add arrowhead
    const arrowhead = new fabricInstance.Triangle({
      width: 10,
      height: 10,
      fill: getConnectionColor(connectionType),
      left: toCenter.x,
      top: toCenter.y,
      angle: Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x) * 180 / Math.PI + 90,
      selectable: false;
      evented: false;
    });
    const connectionGroup = new fabricInstance.Group([connection, arrowhead], {
      selectable: !readOnly,
      hasControls: false
      hasBorders: false;
    });
    connectionGroup.set({
      connectionType,
      fromNodeId: fromNode.evidenceId,
      toNodeId: toNode.evidenceId,
      nodeType: 'connection'
    });
    return connectionGroup;
  }
  async function createAnnotation(position: ;
{ x: number; y: number }, text: string, type: string = 'note') {
    const fabricInstance = await getFabric();
    const annotation = new fabricInstance.Group([], {
      left: position.x,
      top: position.y,
      selectable: !readOnly,
      hasControls: !readOnly;
    });
    // Background
    const background = new fabricInstance.Rect({
      width: 200,
      height: 60,
      fill: 'rgba(255, 255, 255, 0.95)',
      stroke: '#ddd',
      strokeWidth: 1,
      rx: 4,
      ry: 4;
    });
    // Text
    const textObj = new fabricInstance.Text(text, {
      fontSize: 12,
      fill: '#333',
      fontFamily: 'Arial',
      width: 180,
      top: 10,
      left: 10;
    });
    annotation.addWithUpdate(background);
    annotation.addWithUpdate(textObj);
    annotation.set({
      annotationType: type
      annotationText: text
      nodeType: 'annotation'
    });
    return annotatio;
  }
  function getEvidenceColor(type: string): string {
    const colors = {
      'document': '#4CAF50',
      'photo': '#2196F3',
      'video': '#9C27B0',
      'audio': '#FF9800',
      'witness_statement': '#F44336',
      'key_document': '#FFD700',
      'physical': '#795548'
    }
    return colors[type as keyof typeof colors] || '#607D8B';
  }
  function getEvidenceIcon(type: string): string {
    const icons = {
      'document': '📄',
      'photo': '📷',
      'video': '🎥',
      'audio': '🎵',
      'witness_statement': '👤',
      'key_document': '⭐',
      'physical': '📦'
    }
    return icons[type as keyof typeof icons] || '📄';
  }
  function getConnectionColor(type: string): string {
    const colors = {
      'related': '#4CAF50',
      'causal': '#F44336',
      'temporal': '#2196F3',
      'contradicts': '#FF5722',
      'supports': '#8BC34A',
      'inferred': '#9E9E9E'
    }
    return colors[type as keyof typeof colors] || '#666';
  }
  function handleNodeClick(node: any, event: any) {
    if (readOnly) return;
    selectedTool === 'connection' ? handleConnectionStart(node) : selectNode(node);
  }
  function selectNode(node: any) {
    fabricCanvas.setActiveObject(node);
    propertiesPanel = {
      type: node.nodeType,
      data: node.nodeType === 'evidence' ? node.evidenceData: node;
      position: ;
{ x: node.left, y: node.top }
    }
  }
  let connectionStartNode: any = null;
  async function handleConnectionStart(node: any) {
    if (node.nodeType !== 'evidence') return;
    if (!connectionStartNode) {
      connectionStartNode = nod;
      node.set({ stroke: '#FFD700', strokeWidth: 3 });
      fabricCanvas.renderAll();
    } else if (connectionStartNode !== node) {
      // Create connection
      const connection = await createConnection(connectionStartNode, node);
      connections.set(`${connectionStartNode.evidenceId}-${node.evidenceId}`, connection);
      fabricCanvas.add(connection);
      // Store the fromNodeId before resetting
      const fromNodeId = connectionStartNode.evidenceId;
      // Reset selection
      connectionStartNode.set({ stroke: '#fff', strokeWidth: 2 });
      connectionStartNode = null;
      fabricCanvas.renderAll();
      // Broadcast in collaborative mode
      if (collaborative) {
        broadcastCanvasChange('connection_added', {
          fromNodeId: fromNodeId
          toNodeId: node.evidenceId
        });
      }
      saveCanvasState();
    }
  }
  function setupEventHandlers() {
    // Object modification events
    fabricCanvas.on('object:modified', () => {
      saveCanvasState();
      if (collaborative) {
        broadcastCanvasChange('object_modified', fabricCanvas.toJSON());
      }
    });
    // Object selection events
    fabricCanvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length === 1) {
        selectNode(e.selected[0]);
      }
    });
    fabricCanvas.on('selection:cleared', () => {
      propertiesPanel = null;
    });
    // Drawing events
    fabricCanvas.on('path:created', () => {
      saveCanvasState();
      if (collaborative) {
        broadcastCanvasChange('drawing_added', fabricCanvas.toJSON());
      }
    });
    // Context menu
    fabricCanvas.on('mouse:down', (e) => {
      if (e.e.button === 2) { // Right click
        showContextMenu(e.e.clientX, e.e.clientY, e.target);
      } else {
        contextMenu = null;
      }
    });
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }
  function handleKeyboardShortcuts(e: KeyboardEvent) {
    if (!fabricCanvas) return;
    // Undo/Redo
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 's':
          e.preventDefault();
          saveCanvasState();
          break;
        case 'a':
          e.preventDefault();
          fabricCanvas.discardActiveObject();
          // Note: This will need fabric instance when available
          // fabricCanvas.setActiveObject(new fabric.ActiveSelection(fabricCanvas.getObjects(), {
          //   canvas: fabricCanvas
          // }))
          fabricCanvas.renderAll();
          break;
      }
    }
    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedObjects();
    }
    // Tool shortcuts
    switch (e.key) {
      case '1': selectedTool = 'select'; break;
      case '2': selectedTool = 'evidence'; break;
      case '3': selectedTool = 'connection'; break;
      case '4': selectedTool = 'note'; break;
      case '5': selectedTool = 'highlight'; break;
      case '6': selectedTool = 'draw'; break;
    }
    updateToolMode();
  }
  function updateToolMode() {
    fabricCanvas.isDrawingMode = selectedTool === 'draw';
    fabricCanvas.selection = selectedTool === 'select';
    fabricCanvas.defaultCursor = selectedTool === 'draw' ? 'crosshair' : 'default';
  }
  function deleteSelectedObjects() {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.nodeType === 'evidence') {
          evidenceNodes.delete(obj.evidenceId);
        } else if (obj.nodeType === 'connection') {
          connections.delete(`${obj.fromNodeId}-${obj.toNodeId}`);
        }
        fabricCanvas.remove(obj);
      });
      fabricCanvas.discardActiveObject();
      saveCanvasState();
      if (collaborative) {
        broadcastCanvasChange('objects_deleted', { count:activeObjects.length });
      }
    }
  }
  function showContextMenu(x: number, y: number, target: any) {
    contextMenu = {
      x,
      y,
      target,
      actions: getContextActions(target);
    }
  }
  function getContextActions(target: any) {
    const actions = [];
    if (target) {
      if (target.nodeType === 'evidence') {
        actions.push(
          { label: 'Analyze Evidence', action: () => analyzeEvidence(target.evidenceId) },
          { label: 'Add Connection', action: () => startConnection(target) },
          { label: 'Add Note', action: () => addNote(target) },
          { label: 'Properties', action: () => selectNode(target) }
        );
      } else if (target.nodeType === 'connection') {
        actions.push(
          { label: 'Edit Connection', action: () => editConnection(target) },
          { label: 'Delete Connection', action: () => deleteConnection(target) }
        );
      }
      actions.push({ label: 'Delete', action: () => fabricCanvas.remove(target) });
    } else {
      actions.push(
        { label: 'Add Note', action: () => addNoteAt(contextMenu.x, contextMenu.y) },
        { label: 'Paste', action: () => paste() }
      );
    }
    return action;
  }
  async function analyzeEvidence(evidenceId: string) {
    try {
      const response = await fetch('/api/v1/evidence/advanced-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId,
          analysisTypes: ['summary', 'entities', 'sentiment'],
          caseId
        })
      });
      if (response.ok) {
        const result = await response.json();
        // Update evidence node with analysis results
        updateEvidenceNode(evidenceId, result.results);
      }
    } catch (error) {
      console.error('Failed to analyze evidence:', error);
    }
  }
  async function updateEvidenceNode(evidenceId: string, analysisResults: any) {
    const fabricInstance = await getFabric();
    const node = evidenceNodes.get(evidenceId);
    if (node) {
      // Add analysis indicators
      const indicator = new fabricInstance.Circle({
        radius: 8,
        fill: '#4CAF50',
        top: -10,
        left: -10,
        stroke: '#fff',
        strokeWidth: 2;
      });
      node.addWithUpdate(indicator);
      fabricCanvas.renderAll();
    }
  }
  async function setupCollaboration() {
    try {
      // Initialize Redis pub/sub for real-time collaboration
      pubSubController = createPubSubHelper({
        channels: Object.values(redisChannels),
        onMessage: handleRedisMessage
        autoStart: true;
      });
      // WebSocket fallback for real-time collaboration
      websocketStore.subscribeToDashboard();
      // Listen for collaborative events
      // Note: websocketStore doesn't have subscribe method, using direct access
      // websocketStore.subscribe((event) => {
      //   if (event.type === 'canvas_change' && event.caseId === caseId) {
      //     handleCollaborativeChange(event.data)
      //   } else if (event.type === 'cursor_move' && event.caseId === caseId) {
      //     updateCollaboratorCursor(event.userId, event.data)
      //   }
      // })
      console.log('✅ Canvas collaboration setup complete with Redis');
    } catch (error) {
      console.error('❌ Failed to setup Redis collaboration:', error);
      // Fallback to WebSocket only
    }
  }
  function handleRedisMessage({ channel, message }: { channel: string; message: string }) {
    try {
      const data = JSON.parse(message);
      switch (channel) {
        case redisChannels.canvas:
          handleCanvasChange(data);
          break;
        case redisChannels.collaboration:
          handleCollaborativeChange(data);
          break;
        case redisChannels.cursors:
          updateCollaboratorCursor(data.userId, data.cursor);
          break;
        case redisChannels.ai:
          handleAISuggestion(data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse Redis message:', error);
    }
  }
  function handleCanvasChange(data: any) {
    // Handle canvas state changes from Redis
    if (data.action === 'full_sync') {
      loadCanvasFromRedis(data.canvasData);
    } else if (data.action === 'object_change') {
      applyObjectChange(data);
    }
  }
  function handleCollaborativeChange(data: any) {
    // Apply changes from other users
    switch (data.action) {
      case 'object_modified':
        // Merge changes without overwriting local state
        break;
      case 'connection_added':
        // Add connection if not already present
        break;
      case 'objects_deleted':
        // Remove objects that were deleted by other users
        break;
    }
  }
  async function updateCollaboratorCursor(userId: string, cursorData: any) {
    const fabricInstance = await getFabric();
    if (!collaboratorCursors.has(userId)) {
      const cursor = new fabricInstance.Circle({
        radius: 8,
        fill: cursorData.color || '#FF5722',
        left: cursorData.x,
        top: cursorData.y,
        selectable: false;
        evented: false
        excludeFromExport: true;
      });
      collaboratorCursors.set(userId, cursor);
      fabricCanvas.add(cursor);
    } else {
      const cursor = collaboratorCursors.get(userId);
      cursor.animate('left', cursorData.x, { duration: 100 });
      cursor.animate('top', cursorData.y, { duration: 100 });
    }
    fabricCanvas.renderAll();
  }
  function broadcastCanvasChange(action: string, data: any) {
    if (websocketStore.connected) {
      websocketStore.broadcastEvidenceEdit(Number(caseId), action, data);
    }
  }
  function broadcastCursorPosition(x: number, y: number) {
    if (websocketStore.connected) {
      websocketStore.broadcastCursorPosition(caseId, { x, y });
    }
  }
  function setupAIIntegration() {
    // AI-powered layout suggestions and analysis
    generateAISuggestions();
  }
  async function generateAISuggestions() {
    if (!aiAssisted) return;
    try {
      const response = await fetch('/api/v1/ai/canvas-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          evidenceData,
          canvasData: fabricCanvas.toJSON()
        })
      });
      if (response.ok) {
        const suggestions = await response.json();
        aiSuggestions = suggestions.suggestions || [];
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  }
  async function applyAILayout() {
    isGeneratingLayout = true;
    try {
      const response = await fetch('/api/v1/ai/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          evidenceData,
          layoutType: 'smart'
        })
      });
      if (response.ok) {
        const layout = await response.json();
        await applyLayout(layout.positions);
      }
    } catch (error) {
      console.error('Failed to generate AI layout:', error);
    } finally {
      isGeneratingLayout = false;
    }
  }
  async function applyLayout(positions: any) {
    evidenceNodes.forEach((node, evidenceId) => {
      const position = positions[evidenceId];
      if (position) {
        node.animate('left', position.x, { duration: 500 });
        node.animate('top', position.y, { duration: 500 });
      }
    });
    fabricCanvas.renderAll();
    saveCanvasState();
  }
  function saveCanvasState() {
    if (readOnly) return;
    // Add to undo stack
    undoStack.push(fabricCanvas.toJSON());
    if (undoStack.length > 50) {
      undoStack.shift();
    }
    redoStack = []; // Clear redo stack
    // Auto-save
    if (autoSave) {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        await saveCanvas();
      }, 2000);
    }
  }
  async function saveCanvas() {
    try {
      const canvasData = fabricCanvas.toJSON();
      const savePayload = {
        caseId,
        canvasData,
        evidenceNodes: Array.from(evidenceNodes.entries()),
        connections: Array.from(connections.entries()),
        annotations: Array.from(annotations.entries()),
        timestamp: new Date().toISOString();
      }
      // Save to database via API
      const response = await fetch('/api/v1/evidence/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload);
      });
      if (response.ok) {
        // Cache in Redis for fast retrieval
        await saveToRedisCache(savePayload);
        // Publish canvas change to collaborators
        if (pubSubController && collaborative) {
          await pubSubController.publish(redisChannels.canvas, {
            action: 'canvas_saved',
            caseId,
            timestamp: savePayload.timestamp,
            user: 'current_user' // Replace with actual user ID;
          });
        }
        lastSaveTime = new Date();
        console.log('✅ Canvas saved to database and Redis');
      }
    } catch (error) {
      console.error('❌ Failed to save canvas:', error);
    }
  }
  async function saveToRedisCache(canvasPayload: any) {
    try {
      const response = await fetch('/api/v1/redis/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          key: KEY_PATTERNS.DOCUMENT_CACHE(caseId),
          value: canvasPayload;
          ttl: CACHE_TTL.DOCUMENT_ANALYSIS;
        })
      });
      if (!response.ok) {
        throw new Error('Redis cache failed');
      }
    } catch (error) {
      console.warn('⚠️ Redis cache save failed:', error);
    }
  }
  async function loadFromRedisCache(): Promise<any | null> {
    try {
      // removed unused response assignment
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded canvas from Redis cache');
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Redis cache load failed:', error);
    }
    return null;
  }
  function setupAutoSave() {
    // Listen for canvas changes and trigger auto-save
    fabricCanvas.on('object:modified', () => {
      saveCanvasState();
      publishCanvasChange('object_modified');
    });
    fabricCanvas.on('object:added', () => {
      saveCanvasState();
      publishCanvasChange('object_added');
    });
    fabricCanvas.on('object:removed', () => {
      saveCanvasState();
      publishCanvasChange('object_removed');
    });
    console.log('✅ Auto-save with Redis enabled');
  }
  async function publishCanvasChange(action: string) {
    if (!pubSubController || !collaborative) return;
    try {
      await pubSubController.publish(redisChannels.collaboration, {
        action,
        caseId,
        timestamp: new Date().toISOString(),
        user: 'current_user' // Replace with actual user ID;
      });
    } catch (error) {
      console.error('Failed to publish canvas change:', error);
    }
  }
  async function loadCanvasFromRedis(canvasData: any) {
    try {
      await fabricCanvas.loadFromJSON(canvasData, () => {
        fabricCanvas.renderAll();
        console.log('✅ Canvas synced from Redis');
      });
    } catch (error) {
      console.error('❌ Failed to load canvas from Redis:', error);
    }
  }
  function applyObjectChange(data: any) {
    try {
      const obj = fabricCanvas.getObjects().find(o => o.id === data.objectId);
      if (obj) {
        obj.set(data.properties);
        fabricCanvas.renderAll();
      }
    } catch (error) {
      console.error('❌ Failed to apply object change:', error);
    }
  }
  function handleAISuggestion(data: any) {
    // Handle AI suggestions from Redis
    if (data.type === 'layout_suggestion') {
      aiSuggestions.push(data);
      showAISuggestions = true;
    } else if (data.type === 'connection_suggestion') {
      // Highlight suggested connections
      highlightSuggestedConnection(data.suggestion);
    }
  }
  async function highlightSuggestedConnection(suggestion: any) {
    const fabricInstance = await getFabric();
    // Visual feedback for AI suggestions
    const fromNode = evidenceNodes.get(suggestion.fromId);
    const toNode = evidenceNodes.get(suggestion.toId);
    if (fromNode && toNode) {
      // Add temporary highlight
      const highlight = new fabricInstance.Line([
        fromNode.left, fromNode.top,
        toNode.left, toNode.top
      ], {
        stroke: '#4CAF50',
        strokeWidth: 3,
        strokeDashArray: [10, 5],
        selectable: false;
        evented: false;
      });
      fabricCanvas.add(highlight);
      // Remove highlight after 5 seconds
      setTimeout(() => {
        fabricCanvas.remove(highlight);
      }, 5000);
    }
  }
  async function loadCanvasFromJSON(jsonData: string) {
    try {
      await fabricCanvas.loadFromJSON(jsonData, () => {
        fabricCanvas.renderAll();
        // Rebuild node maps
        fabricCanvas.getObjects().forEach((obj: any) => {
          if (obj.nodeType === 'evidence') {
            evidenceNodes.set(obj.evidenceId, obj);
          } else if (obj.nodeType === 'connection') {
            connections.set(`${obj.fromNodeId}-${obj.toNodeId}`, obj);
          }
        });
      });
    } catch (error) {
      console.error('Failed to load canvas from JSON:', error);
    }
  }
  function undo() {
    if (undoStack.length > 0) {
      redoStack.push(fabricCanvas.toJSON());
      const previousState = undoStack.pop();
      loadCanvasFromJSON(previousState);
    }
  }
  function redo() {
    if (redoStack.length > 0) {
      undoStack.push(fabricCanvas.toJSON());
      const nextState = redoStack.pop();
      loadCanvasFromJSON(nextState);
    }
  }
  function exportCanvas(format: 'json' | 'png' | 'svg' = 'png') {
    switch (format) {
      case 'json':
        const jsonData = JSON.stringify(fabricCanvas.toJSON(), null, 2);
        downloadFile(jsonData, `canvas-${caseId}.json`, 'application/json');
        break;
      case 'png':
        const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
        downloadFile(dataURL, `canvas-${caseId}.png`, 'image/png', true);
        break;
      case 'svg':
        const svgData = fabricCanvas.toSVG();
        downloadFile(svgData, `canvas-${caseId}.svg`, 'image/svg+xml');
        break;
    }
  }
  function downloadFile(data: string, filename: string, mimeType: string, isDataURL = false) {
    const blob = isDataURL ?
      fetch(data).then(res => res.blob()) :
      new Blob([data], { type: mimeType });
    const url = isDataURL ? data : URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenam;
    link.click();
    if (!isDataURL) {
      URL.revokeObjectURL(url);
    }
  }
  function clearCanvas() {
    fabricCanvas.clear();
    evidenceNodes.clear();
    connections.clear();
    annotations.clear();
    saveCanvasState();
  }
  async function zoomFit() {
    const fabricInstance = await getFabric();
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      const group = new fabricInstance.Group(objects);
      const boundingRect = group.getBoundingRect();
      const scaleX = (canvasWidth - 40) / boundingRect.width;
      const scaleY = (canvasHeight - 40) / boundingRect.height;
      const scale = Math.min(scaleX, scaleY, 1);
      fabricCanvas.setZoom(scale);
      fabricCanvas.absolutePan(new fabricInstance.Point(
        (canvasWidth - boundingRect.width * scale) / 2 - boundingRect.left * scale,
        (canvasHeight - boundingRect.height * scale) / 2 - boundingRect.top * scale
      ));
    }
  }
  // Missing function implementations
  function startConnection(target: any) {
    console.log('Starting connection from:', target);
    // TODO: Implement connection creation
  }
  function addNote(target: any) {
    console.log('Adding note to:', target);
    // TODO: Implement note creation
  }
  function editConnection(target: any) {
    console.log('Editing connection:', target);
    // TODO: Implement connection editing
  }
  function deleteConnection(target: any) {
    console.log('Deleting connection:', target);
    // TODO: Implement connection deletion
  }
  function addNoteAt(x: number, y: number) {
    console.log('Adding note at:', x, y);
    // TODO: Implement note creation at position
  }
  function paste() {
    console.log('Pasting from clipboard');
    // TODO: Implement paste functionality
  }
</script>

<div class="canvas-workspace" class:sidebar-open={sidebarOpen}>
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="tool-group flex gap-2">
      <Button
        variant={selectedTool === 'select' ? 'default' : 'ghost'}
        onclick={() => {
          selectedTool = 'select';
          updateToolMode();
        }}
        title="Select (1)"
        size="sm"
      >
        ↖️ Select
      </Button>
      <Button
        variant={selectedTool === 'evidence' ? 'default' : 'ghost'}
        onclick={() => (selectedTool = 'evidence')}
        title="Add Evidence (2)"
        size="sm"
      >
        📄 Evidence
      </Button>
      <Button
        variant={selectedTool === 'connection' ? 'default' : 'ghost'}
        onclick={() => (selectedTool = 'connection')}
        title="Connect Evidence (3)"
        size="sm"
      >
        🔗 Connect
      </Button>
      <Button
        variant={selectedTool === 'note' ? 'default' : 'ghost'}
        onclick={() => (selectedTool = 'note')}
        title="Add Note (4)"
        size="sm"
      >
        📝 Note
      </Button>
      <Button
        variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
        onclick={() => (selectedTool = 'highlight')}
        title="Highlight (5)"
        size="sm"
      >
        🖍️ Highlight
      </Button>
      <Button
        variant={selectedTool === 'draw' ? 'default' : 'ghost'}
        onclick={() => {
          selectedTool = 'draw';
          updateToolMode();
        }}
        title="Draw (6)"
        size="sm"
      >
        ✏️ Draw
      </Button>
    </div>
    <div class="action-group flex gap-2">
      <Button variant="ghost" onclick={undo} disabled={undoStack.length === 0} size="sm">⏪ Undo</Button>
      <Button variant="ghost" onclick={redo} disabled={redoStack.length === 0} size="sm">⏩ Redo</Button>
      <Button variant="ghost" onclick={zoomFit} size="sm">🔍 Fit</Button>
      <Button variant="ghost" onclick={() => exportCanvas('png')} size="sm">💾 Export</Button>
    </div>
    {#if aiAssisted}
      <div class="ai-group">
        <button class="ai-btn" onclick={applyAILayout} disabled={isGeneratingLayout}>
          {isGeneratingLayout ? '⏳' : '🤖'} AI Layout
        </button>
        <button class="ai-btn" onclick={() => (showAISuggestions = !showAISuggestions)}> 💡 Suggestions </button>
      </div>
    {/if}
    {#if collaborative}
      <div class="collab-group">
        <div class="collaborators">
          {#each Array.from(collaborators.values()) as collaborator}
            <div class="collaborator-avatar" style="background-color: {collaborator.color}">
              {collaborator.name[0]}
            </div>
          {/each}
        </div>
        <span class="save-status">
          Last saved: {lastSaveTime.toLocaleTimeString()}
        </span>
      </div>
    {/if}
  </div>
  <!-- Sidebar -->
  {#if sidebarOpen}
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Evidence Library</h3>
        <button class="close-btn" onclick={() => (sidebarOpen = false)}>×</button>
      </div>
      <div class="evidence-list">
        {#each evidenceData as evidence}
          <div
            class="evidence-item {evidenceNodes.has(evidence.id) ? 'on-canvas' : ''}"
            draggable="true"
            ondragstart={e => e.dataTransfer?.setData('evidence', JSON.stringify(evidence))}
          >
            <div class="evidence-icon">{getEvidenceIcon(evidence.type)}</div>
            <div class="evidence-info">
              <div class="evidence-title">{evidence.title}</div>
              <div class="evidence-type">{evidence.type}</div>
            </div>
          </div>
        {/each}
      </div>
      {#if showAISuggestions && aiSuggestions.length > 0}
        <div class="ai-suggestions">
          <h4>AI Suggestions</h4>
          {#each aiSuggestions as suggestion}
            <div class="suggestion-item">
              <div class="suggestion-text">{suggestion.text}</div>
              <button class="apply-btn" onclick={() => suggestion.action()}> Apply </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <Button variant="ghost" size="sm" onclick={() => (sidebarOpen = true)} class="fixed left-4 top-4 z-30">
      📚 Sidebar
    </Button>
  {/if}
  <!-- Canvas Container -->
  <div class="canvas-container" bind:this={canvasContainer}>
    <canvas bind:this={canvasElement}></canvas>
  </div>
  <!-- Properties Panel -->
  {#if propertiesPanel}
    <div class="properties-panel fixed right-4 top-4 w-80 z-40">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>Properties</CardTitle>
            <Button variant="ghost" size="sm" onclick={() => (propertiesPanel = null)}>×</Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          {#if propertiesPanel.type === 'evidence'}
            <div class="space-y-2">
              <Label for="evidence-title">Title:</Label>
              <Input id="evidence-title" type="text" bind:value={propertiesPanel.data.title} />
            </div>
            <div class="space-y-2">
              <Label for="evidence-type">Type:</Label>
              <select
                id="evidence-type";
                bind:value={propertiesPanel.data.type}
                class="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="document">📄 Document</option>
                <option value="photo">📷 Photo</option>
                <option value="video">🎥 Video</option>
                <option value="audio">🎵 Audio</option>
                <option value="witness_statement">👥 Witness Statement</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label>Position:</Label>
              <div class="grid grid-cols-2 gap-2">
                <Input type="number" bind:value={propertiesPanel.position.x} placeholder="X" />
                <Input type="number" ; bind:value={propertiesPanel.position.y} placeholder="Y" />
              </div>
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
  <!-- Context Menu -->
  {#if contextMenu}
    <div
      class="fixed z-50 bg-background border border-border rounded-md shadow-lg p-1"
      style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    >
      {#each contextMenu.actions as action}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            action.action();
            contextMenu = null;
          }}
          class="w-full justify-start"
        >
          {action.label}
        </Button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .canvas-workspace {
    display: flex;
    height: 100vh;
    background: #0a0a0a;
    color: white;
    font-family: Arial, sans-serif;
    position: relative;
    overflow: hidden;
  }
  .toolbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 30px;
    z-index: 100;
  }
  .tool-group,
  .action-group,
  .ai-group,
  .collab-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tool-btn,
  .action-btn,
  .ai-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 40px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tool-btn:hover,
  .action-btn:hover,
  .ai-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
  .tool-btn.active {
    background: rgba(74, 144, 226, 0.6);
    border-color: rgba(74, 144, 226, 0.8);
  }
  .sidebar {
    width: 300px;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding: 80px 20px 20px 20px;
    overflow-y: auto;
    z-index: 50;
  }
  .sidebar-header {
    display: flex;
    justify-content: space-betwee;
    align-items: center;
    margin-bottom: 20px;
  }
  .sidebar-header h3 {
    margin: 0;
    color: #4a90e2;
  }
  .close-btn {
    background: none;
    border: none;
    color: #ccc;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
  }
  .evidence-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .evidence-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }
  .evidence-item:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(74, 144, 226, 0.5);
  }
  .evidence-item.on-canv.evidence-icon {
    font-size: 24px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .evidence-info {
    flex: 1;
  }
  .evidence-title {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .evidence-type {
    font-size: 12px;
    color: #ccc;
    text-transform: capitaliz;
  }
  .sidebar-toggle {
    position: absolute;
    top: 80px;
    left: 20px;
    z-index: 60;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }
  .canvas-container {
    flex: 1;
    margin-top: 60px;
    position: relative;
    overflow: hidden;
  }
  .properties-panel {
    position: absolute;
    top: 80px;
    right: 20px;
    width: 280px;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    z-index: 100;
  }
  .panel-header {
    display: flex;
    justify-content: space-betwee;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .panel-header h3 {
    margin: 0;
    color: #4a90e2;
    font-size: 16px;
  }
  .panel-content {
    padding: 20px;
  }
  .property-group {
    margin-bottom: 15px;
  }
  .property-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
    color: #ccc;
  }
  .property-group input,
  .property-group select {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 14px;
  }
  .position-inputs {
    display: flex;
    gap: 10px;
  }
  .position-inputs input {
    width: calc(50% - 5px);
  }
  .context-menu {
    position: fixed;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 5px 0;
    z-index: 200;
    min-width: 150px;
  }
  .context-action {
    display: block;
    width: 100%;
    background: none;
    border: none;
    color: white;
    padding: 8px 15px;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s ease;
  }
  .context-action:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .collaborators {
    display: flex;
    gap: 5px;
  }
  .collaborator-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  .save-status {
    font-size: 12px;
    color: #ccc;
    margin-left: 15px;
  }
  .ai-suggestions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .ai-suggestions h4 {
    margin: 0 0 15px 0;
    color: #4a90e2;
    font-size: 14px;
  }
  .suggestion-item {
    display: flex;
    justify-content: space-betwee;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    background: rgba(74, 144, 226, 0.1);
    border-radius: 4px;
    margin-bottom: 10px;
  }
  .suggestion-text {
    flex: 1;
    font-size: 12px;
    line-height: 1.4;
  }
  .apply-btn {
    background: rgba(74, 144, 226, 0.6);
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 10px;
    cursor: pointer;
    white-space: nowrap;
  }
  .apply-btn:hover {
    background: rgba(74, 144, 226, 0.8);
  }
  .canvas-workspace.sidebar-open .canvas-container {
    margin-left: 300px;
  }
</style>
