<!-- @migration-task Error while migrating Svelte code: Expected token > -->
<!-- 🏛️ NES-GPU Integrated Legal Document Viewer with MinIO Upload
     Advanced GPU-accelerated document rendering with:
     - NES memory architecture integration  
     - WebGPU texture streaming with quantization
     - Binary document processing pipeline
     - Legal AI-optimized buffer management
     - MinIO file upload with real-time processing -->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { nesGPUIntegration, type LegalDocument, type PipelineStats } from '$lib/gpu/nes-gpu-integration';
  import { textureStreamer, type NESTexture } from '$lib/webgpu/texture-streaming';
  import { WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader';
  import { minioService, type MinIOFile, type UploadProgress } from '$lib/services/minio-service';
  import DocumentUploader from '$lib/components/headless/DocumentUploader.svelte';
  import { ragIngestionWorker } from '$lib/workers/rag-ingestion-worker';
  
  // Import N64 theme for styling
  import '$lib/components/ui/gaming/n64/N64Theme.css';
  
  // Enhanced Props with MinIO integration
  interface Props {
    documents: EnhancedLegalDocument[];
    aiAnalysis?: AIAnalysisResult[];
    showAnnotations?: boolean;
    enableRealTimeUpdates?: boolean;
    nesMemoryMode?: 'efficient' | 'performance' | 'balanced';
    quantizationProfile?: 'legal_critical' | 'legal_standard' | 'legal_compressed' | 'legal_storage';
    visualMemoryPalace?: boolean;
    enableFileUpload?: boolean;
    caseId?: string;
    userId?: string;
    maxUploadFiles?: number;
    autoProcessUploads?: boolean;
  }
  
  let { 
    documents = [], 
    aiAnalysis = [], 
    showAnnotations = true,
    enableRealTimeUpdates = false,
    nesMemoryMode = 'balanced',
    quantizationProfile = 'legal_standard',
    visualMemoryPalace = false,
    enableFileUpload = true,
    caseId,
    userId,
    maxUploadFiles = 10,
    autoProcessUploads = true
  }: Props = $props();
  
  // Enhanced document type with NES-GPU integration
  type EnhancedLegalDocument = LegalDocument & {
    renderPosition?: { x: number; y: number; z: number };
    vertexBufferId?: string;
    bankAssignment?: string;
    gpuTextureSlot?: number;
    binarySize?: number;
    compressionRatio?: number;
    nesTexture?: NESTexture;
    quantizationLevel?: 'FP32' | 'FP16' | 'INT8';
  };
  
  // GPU Infrastructure with NES integration
  let canvas: HTMLCanvasElement;
  let device: GPUDevice | null = null;
  let context: GPUCanvasContext | null = null;
  let renderPipeline: GPURenderPipeline | null = null;
  
  // Enhanced Vertex Buffer Cache with NES memory banks
  let documentVertexBuffer: GPUBuffer | null = null;
  let annotationVertexBuffer: GPUBuffer | null = null;
  let highlightVertexBuffer: GPUBuffer | null = null;
  let memoryBankVertexBuffer: GPUBuffer | null = null; // NES memory visualization
  
  // NES Memory Bank Status
  let memoryBankStatus = $state({
    INTERNAL_RAM: { used: 0, capacity: 2048, active: false, documents: [] as string[] },
    CHR_ROM: { used: 0, capacity: 8192, active: false, documents: [] as string[] },
    PRG_ROM: { used: 0, capacity: 32768, active: false, documents: [] as string[] },
    SAVE_RAM: { used: 0, capacity: 8192, active: false, documents: [] as string[] }
  });
  
  // Enhanced Performance Tracking
  let frameStats = $state({
    fps: 0,
    drawCalls: 0,
    verticesRendered: 0,
    lastFrameTime: 0,
    // NES-GPU specific metrics
    nesMemoryUsed: 0,
    binaryPipelineTime: 0,
    documentsCached: 0,
    compressionRatio: 0,
    textureStreamingTime: 0,
    quantizationSavings: 0
  });
  
  // Pipeline performance stats
  let pipelineStats: PipelineStats | null = null;
  let textureStats = $state({ memoryUsed: 0, texturesLoaded: 0, compressionRatio: 1.0 });
  
  // View mode with memory palace support
  let viewMode = $state<'list' | 'graph' | '3d' | 'memory-palace' | 'nes-banks'>('3d');
  let selectedDocument = $state<EnhancedLegalDocument | null>(null);
  let searchQuery = $state<string>('');
  
  // MinIO Upload State
  let uploadInProgress = $state(false);
  let uploadQueue = $state<File[]>([]);
  let uploadProgress = $state(new Map<string, UploadProgress>());
  let uploadedFiles = $state<MinIOFile[]>([]);
  let showUploadArea = $state(false);
  let dragOverUpload = $state(false);
  
  // Document Uploader Reference
  let documentUploader: any;
  
  // GPU Initialization with full NES-GPU integration
  async function initializeGPU() {
    if (!browser || !navigator.gpu) {
      console.error('WebGPU not supported');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        console.error('No WebGPU adapter found');
        return false;
      }
      
      device = await adapter.requestDevice({
        requiredFeatures: ['texture-binding-array'],
        requiredLimits: {
          maxBufferSize: 256 * 1024 * 1024, // 256MB for large legal documents
          maxStorageBufferBindingSize: 128 * 1024 * 1024,
          maxTextureArrayLayers: 256 // For texture streaming
        }
      });
      
      context = canvas.getContext('webgpu');
      if (!context) return false;
      
      context.configure({
        device,
        format: 'bgra8unorm',
        alphaMode: 'premultiplied',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      });
      
      // Initialize integrated systems
      await initializeNESGPUIntegration();
      await initializeTextureStreaming();
      await createNESEnhancedRenderPipeline();
      await createEnhancedVertexBuffers();
      
      console.log('🎮🏛️ NES-GPU integrated legal document viewer initialized');
      return true;
      
    } catch (error) {
      console.error('NES-GPU initialization failed:', error);
      return false;
    }
  }
  
  // Initialize NES-GPU Integration
  async function initializeNESGPUIntegration() {
    try {
      // Get performance stats from NES-GPU integration
      pipelineStats = await nesGPUIntegration.getPerformanceStats();
      
      // Update memory bank status
      updateMemoryBankStatus();
      
      console.log('🔥 NES-GPU binary pipeline initialized with', pipelineStats.documentsProcessed, 'cached documents');
      
    } catch (error) {
      console.warn('⚠️ NES-GPU pipeline initialization failed:', error);
    }
  }
  
  // Initialize WebGPU Texture Streaming
  async function initializeTextureStreaming() {
    try {
      const success = await textureStreamer.initialize(canvas);
      if (success) {
        textureStats = textureStreamer.getMemoryStats();
        console.log('🎨 WebGPU texture streaming initialized');
      }
    } catch (error) {
      console.warn('⚠️ Texture streaming initialization failed:', error);
    }
  }
  
  // Enhanced Render Pipeline with NES Memory Bank Visualization
  async function createNESEnhancedRenderPipeline() {
    if (!device) return;
    
    const vertexShaderCode = `
      struct VertexInput {
        @location(0) position: vec3f,
        @location(1) texCoord: vec2f,
        @location(2) color: vec4f,
        @location(3) elementId: f32,
        @location(4) documentId: f32,
        @location(5) bankId: f32,
        @location(6) riskLevel: f32,
        @location(7) compressionRatio: f32,
        @location(8) quantizationLevel: f32,
      }
      
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) texCoord: vec2f,
        @location(1) color: vec4f,
        @location(2) elementId: f32,
        @location(3) documentId: f32,
        @location(4) bankId: f32,
        @location(5) riskLevel: f32,
        @location(6) compressionRatio: f32,
        @location(7) quantizationLevel: f32,
      }
      
      struct Uniforms {
        viewMatrix: mat4x4f,
        projectionMatrix: mat4x4f,
        time: f32,
        documentScale: f32,
        highlightOpacity: f32,
        animationPhase: f32,
        nesMemoryMode: f32,
        visualMemoryPalace: f32,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      @vertex
      fn main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        
        // NES memory bank-aware positioning
        var bankOffset = getBankOffset(input.bankId);
        if (uniforms.nesMemoryMode > 0.5) {
          bankOffset = bankOffset * 2.0; // Spread out banks for visualization
        }
        
        // Visual Memory Palace mode - 3D spatial organization
        var finalPosition = input.position;
        if (uniforms.visualMemoryPalace > 0.5) {
          finalPosition = transformToMemoryPalace(input.position, input.bankId, input.riskLevel);
        }
        
        let worldPos = vec4f(
          (finalPosition.x + bankOffset.x) * uniforms.documentScale,
          (finalPosition.y + bankOffset.y) * uniforms.documentScale,
          finalPosition.z + bankOffset.z,
          1.0
        );
        
        output.position = uniforms.projectionMatrix * uniforms.viewMatrix * worldPos;
        output.texCoord = input.texCoord;
        output.color = input.color;
        output.elementId = input.elementId;
        output.documentId = input.documentId;
        output.bankId = input.bankId;
        output.riskLevel = input.riskLevel;
        output.compressionRatio = input.compressionRatio;
        output.quantizationLevel = input.quantizationLevel;
        
        return output;
      }
      
      fn getBankOffset(bankId: f32) -> vec3f {
        switch (i32(bankId)) {
          case 0: { return vec3f(-0.8, 0.8, 0.2); }   // INTERNAL_RAM
          case 1: { return vec3f(0.8, 0.8, 0.1); }    // CHR_ROM  
          case 2: { return vec3f(0.0, 0.0, 0.0); }    // PRG_ROM (center)
          case 3: { return vec3f(-0.8, -0.8, 0.15); } // SAVE_RAM
          default: { return vec3f(0.0, 0.0, 0.0); }
        }
      }
      
      fn transformToMemoryPalace(pos: vec3f, bankId: f32, riskLevel: f32) -> vec3f {
        // 3D memory palace transformation based on legal importance
        let radius = 1.0 + riskLevel * 0.5;
        let angle = bankId * 1.5708 + pos.x * 0.1; // 90 degrees per bank
        let height = pos.y + riskLevel * 0.3;
        
        return vec3f(
          radius * cos(angle),
          height,
          radius * sin(angle)
        );
      }
    `;
    
    const fragmentShaderCode = `
      struct FragmentInput {
        @location(0) texCoord: vec2f,
        @location(1) color: vec4f,
        @location(2) elementId: f32,
        @location(3) documentId: f32,
        @location(4) bankId: f32,
        @location(5) riskLevel: f32,
        @location(6) compressionRatio: f32,
        @location(7) quantizationLevel: f32,
      }
      
      struct Uniforms {
        viewMatrix: mat4x4f,
        projectionMatrix: mat4x4f,
        time: f32,
        documentScale: f32,
        highlightOpacity: f32,
        animationPhase: f32,
        nesMemoryMode: f32,
        visualMemoryPalace: f32,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var documentTexture: texture_2d_array<f32>;
      @group(0) @binding(2) var textureSampler: sampler;
      
      @fragment
      fn main(input: FragmentInput) -> @location(0) vec4f {
        // Sample from texture array based on document ID
        let textureIndex = i32(input.documentId) % 256;
        let baseColor = textureSample(documentTexture, textureSampler, input.texCoord, textureIndex);
        
        var finalColor = baseColor * input.color;
        
        // NES Memory Bank Color Coding
        finalColor = applyBankColoring(finalColor, input.bankId, input.compressionRatio);
        
        // Legal Risk Level Highlighting (overrides bank colors for critical documents)
        if (input.riskLevel > 2.5) { // Critical
          let criticalPulse = sin(uniforms.time * 6.0) * 0.5 + 0.5;
          finalColor.rgb = mix(finalColor.rgb, vec3f(1.0, 0.1, 0.1), criticalPulse * 0.6);
        } else if (input.riskLevel > 1.5) { // High  
          let warningPulse = sin(uniforms.time * 4.0) * 0.5 + 0.5;
          finalColor.rgb = mix(finalColor.rgb, vec3f(1.0, 0.5, 0.1), warningPulse * 0.4);
        }
        
        // Quantization Level Visualization
        let quantBrightness = getQuantizationBrightness(input.quantizationLevel);
        finalColor.rgb = finalColor.rgb * quantBrightness;
        
        // Compression Efficiency Indicator
        if (input.compressionRatio > 2.0) {
          let compressionGlow = (input.compressionRatio - 1.0) * 0.1;
          finalColor.rgb = finalColor.rgb + vec3f(0.0, compressionGlow, 0.0);
        }
        
        // AI Analysis Highlighting
        if (input.elementId > 1000.0) { // AI-generated elements
          let aiPulse = sin(uniforms.time * 3.0 + input.elementId * 0.1) * 0.5 + 0.5;
          finalColor.rgb = mix(finalColor.rgb, vec3f(0.2, 0.8, 0.2), aiPulse * 0.3);
        }
        
        finalColor.a *= uniforms.highlightOpacity;
        
        return finalColor;
      }
      
      fn applyBankColoring(color: vec4f, bankId: f32, compressionRatio: f32) -> vec4f {
        var bankColor = color;
        
        switch (i32(bankId)) {
          case 0: { // INTERNAL_RAM - Fast access, blue tint
            bankColor.rgb = mix(bankColor.rgb, vec3f(0.2, 0.4, 1.0), 0.3);
          }
          case 1: { // CHR_ROM - Pattern data, green tint
            bankColor.rgb = mix(bankColor.rgb, vec3f(0.2, 1.0, 0.4), 0.3);
          }
          case 2: { // PRG_ROM - Program logic, purple tint
            bankColor.rgb = mix(bankColor.rgb, vec3f(0.8, 0.2, 1.0), 0.3);
          }
          case 3: { // SAVE_RAM - Persistent data, yellow tint
            bankColor.rgb = mix(bankColor.rgb, vec3f(1.0, 0.8, 0.2), 0.3);
          }
          default: {
            // Default coloring
          }
        }
        
        return bankColor;
      }
      
      fn getQuantizationBrightness(quantLevel: f32) -> f32 {
        switch (i32(quantLevel)) {
          case 0: { return 1.0; }   // FP32 - full brightness
          case 1: { return 0.9; }   // FP16 - slightly dimmed
          case 2: { return 0.8; }   // INT8 - more dimmed
          default: { return 1.0; }
        }
      }
    `;
    
    const vertexShaderModule = device.createShaderModule({
      code: vertexShaderCode
    });
    
    const fragmentShaderModule = device.createShaderModule({
      code: fragmentShaderCode  
    });
    
    renderPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'main',
        buffers: [{
          arrayStride: 72, // 3+2+4+1+1+1+1+1+1 floats * 4 bytes = 60, padded to 72 for alignment
          attributes: [
            { format: 'float32x3', offset: 0, shaderLocation: 0 },  // position
            { format: 'float32x2', offset: 12, shaderLocation: 1 }, // texCoord
            { format: 'float32x4', offset: 20, shaderLocation: 2 }, // color
            { format: 'float32', offset: 36, shaderLocation: 3 },   // elementId
            { format: 'float32', offset: 40, shaderLocation: 4 },   // documentId
            { format: 'float32', offset: 44, shaderLocation: 5 },   // bankId
            { format: 'float32', offset: 48, shaderLocation: 6 },   // riskLevel
            { format: 'float32', offset: 52, shaderLocation: 7 },   // compressionRatio
            { format: 'float32', offset: 56, shaderLocation: 8 },   // quantizationLevel
          ]
        }]
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'main',
        targets: [{
          format: 'bgra8unorm',
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      }
    });
  }
  
  // Enhanced Vertex Buffer Creation with Full NES Integration
  async function createEnhancedVertexBuffers() {
    if (!device) return;
    
    const currentDocs = documents;
    if (currentDocs.length === 0) return;
    
    try {
      const startTime = performance.now();
      
      // Step 1: Process documents through NES-GPU binary pipeline
      await nesGPUIntegration.ingestLegalDocumentsBinary(currentDocs);
      
      // Step 2: Load document textures with streaming and quantization
      await loadDocumentTextures(currentDocs);
      
      // Step 3: Generate enhanced geometry with full NES data
      const enhancedVertices = generateNESEnhancedGeometry(currentDocs);
      const annotationVertices = generateNESAnnotationGeometry(currentDocs);
      const memoryBankVertices = generateMemoryBankVisualization();
      
      // Step 4: Create GPU buffers with quantization-aware upload
      documentVertexBuffer = await WebGPUBufferUtils_Extended.uploadForLegalAI(
        device,
        new Float32Array(enhancedVertices),
        quantizationProfile
      );
      
      annotationVertexBuffer = await WebGPUBufferUtils_Extended.uploadForLegalAI(
        device,
        new Float32Array(annotationVertices),
        'legal_compressed' // Annotations can use higher compression
      );
      
      memoryBankVertexBuffer = device.createBuffer({
        size: memoryBankVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      
      new Float32Array(memoryBankVertexBuffer.getMappedRange()).set(
        new Float32Array(memoryBankVertices)
      );
      memoryBankVertexBuffer.unmap();
      
      // Step 5: Update comprehensive performance statistics
      const nesStats = await nesGPUIntegration.getPerformanceStats();
      const processingTime = performance.now() - startTime;
      
      frameStats.nesMemoryUsed = calculateNESMemoryUsage(currentDocs);
      frameStats.binaryPipelineTime = nesStats.totalPipelineTime;
      frameStats.documentsCached = nesStats.documentsProcessed;
      frameStats.compressionRatio = calculateCompressionRatio(currentDocs);
      frameStats.textureStreamingTime = processingTime - nesStats.totalPipelineTime;
      frameStats.quantizationSavings = calculateQuantizationSavings(currentDocs);
      frameStats.verticesRendered = enhancedVertices.length / 18; // 18 floats per vertex
      
      // Step 6: Update memory bank status
      updateMemoryBankStatus();
      
      console.log(`🎮🏛️ NES-GPU enhanced vertex buffers created for ${currentDocs.length} documents`);
      console.log(`📊 Pipeline: ${nesStats.totalPipelineTime.toFixed(2)}ms | Textures: ${frameStats.textureStreamingTime.toFixed(2)}ms`);
      console.log(`💾 Quantization savings: ${frameStats.quantizationSavings.toFixed(1)}% | Compression: ${frameStats.compressionRatio.toFixed(1)}x`);
      
    } catch (error) {
      console.error('❌ Enhanced vertex buffer creation failed:', error);
      // Fallback to basic vertex buffer creation
      await createBasicVertexBuffers(currentDocs);
    }
  }
  
  // Load Document Textures with Streaming and Quantization
  async function loadDocumentTextures(docs: EnhancedLegalDocument[]) {
    for (const [index, doc] of docs.entries()) {
      try {
        // Generate texture data for document (in real implementation, this would be document page images)
        const textureData = generateDocumentTexture(doc, 256, 256);
        
        const success = await textureStreamer.loadTexture(
          `doc_${doc.id}`,
          textureData,
          256,
          256,
          {
            priority: doc.priority || 1,
            legalContext: {
              documentType: doc.type as any,
              confidenceLevel: doc.confidenceLevel || 0.5,
              riskIndicator: doc.riskLevel === 'critical' || doc.riskLevel === 'high'
            },
            region: getBankForTextureStorage(doc.bankAssignment || 'PRG_ROM'),
            compress: true
          }
        );
        
        if (success) {
          doc.nesTexture = {
            id: `doc_${doc.id}`,
            data: textureData,
            width: 256,
            height: 256,
            format: 'rgba8unorm',
            size: textureData.byteLength,
            lastUsed: Date.now(),
            priority: doc.priority || 1,
            compressed: true,
            legalContext: {
              documentType: doc.type as any,
              confidenceLevel: doc.confidenceLevel || 0.5,
              riskIndicator: doc.riskLevel === 'critical' || doc.riskLevel === 'high'
            }
          };
          doc.gpuTextureSlot = index;
        }
      } catch (error) {
        console.warn(`Failed to load texture for document ${doc.id}:`, error);
      }
    }
    
    // Update texture statistics
    textureStats = textureStreamer.getMemoryStats();
  }
  
  // Generate document texture data (placeholder - would be real document pages)
  function generateDocumentTexture(doc: EnhancedLegalDocument, width: number, height: number): ArrayBuffer {
    const size = width * height * 4; // RGBA
    const data = new Uint8Array(size);
    
    // Generate texture pattern based on document properties
    const riskColor = getRiskColor(doc.riskLevel);
    const bankColor = getBankColor(doc.bankAssignment || 'PRG_ROM');
    
    for (let i = 0; i < size; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      // Create a pattern that reflects document characteristics
      const pattern = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
      
      data[i] = Math.floor((riskColor[0] * pattern + bankColor[0] * (1 - pattern)) * 255);     // R
      data[i + 1] = Math.floor((riskColor[1] * pattern + bankColor[1] * (1 - pattern)) * 255); // G
      data[i + 2] = Math.floor((riskColor[2] * pattern + bankColor[2] * (1 - pattern)) * 255); // B
      data[i + 3] = 255; // A
    }
    
    return data.buffer;
  }
  
  // Generate NES-Enhanced Geometry with Full Integration
  function generateNESEnhancedGeometry(docs: EnhancedLegalDocument[]): ArrayBuffer {
    const vertices: number[] = [];
    
    docs.forEach((doc, index) => {
      // Enhanced position calculation with memory bank layout
      const bankOffset = getBankLayoutOffset(doc.bankAssignment || 'PRG_ROM');
      const memoryPalacePos = calculateMemoryPalacePosition(doc, index);
      
      const baseX = visualMemoryPalace ? memoryPalacePos.x : (index % 10) * 0.2 - 1.0 + bankOffset.x;
      const baseY = visualMemoryPalace ? memoryPalacePos.y : Math.floor(index / 10) * 0.2 - 1.0 + bankOffset.y;
      const baseZ = visualMemoryPalace ? memoryPalacePos.z : (doc.score || 0) * 0.1 + bankOffset.z;
      
      // Enhanced attributes with full NES integration
      const elementId = index;
      const documentId = parseFloat(doc.id) || index;
      const bankId = getBankId(doc.bankAssignment || 'PRG_ROM');
      const riskLevel = getRiskLevelValue(doc.riskLevel);
      const compressionRatio = doc.compressionRatio || 1.0;
      const quantizationLevel = getQuantizationLevelValue(doc.quantizationLevel);
      
      // Enhanced color with NES bank and quantization indicators
      const color = getNESEnhancedColor(doc);
      
      // Document size based on importance and compression
      const size = getEnhancedDocumentSize(doc);
      
      // Create enhanced quad (2 triangles = 6 vertices with 18 floats each)
      const positions = [
        [baseX - size, baseY - size, baseZ], [baseX + size, baseY - size, baseZ], [baseX - size, baseY + size, baseZ],
        [baseX + size, baseY - size, baseZ], [baseX + size, baseY + size, baseZ], [baseX - size, baseY + size, baseZ]
      ];
      
      const texCoords = [
        [0.0, 0.0], [1.0, 0.0], [0.0, 1.0],
        [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]
      ];
      
      positions.forEach(([x, y, z], i) => {
        const [u, v] = texCoords[i];
        vertices.push(
          x, y, z,                          // position (3 floats)
          u, v,                             // texCoord (2 floats)
          color[0], color[1], color[2], color[3], // color (4 floats)
          elementId,                        // elementId (1 float)
          documentId,                       // documentId (1 float)
          bankId,                           // bankId (1 float)
          riskLevel,                        // riskLevel (1 float)
          compressionRatio,                 // compressionRatio (1 float)
          quantizationLevel,                // quantizationLevel (1 float)
          0, 0, 0                           // padding for 72-byte alignment (3 floats)
        );
      });
    });
    
    return new Float32Array(vertices).buffer;
  }
  
  // Search documents with full NES-GPU acceleration
  async function searchDocuments(query: string) {
    if (!query.trim()) {
      documents = [];
      return;
    }
    
    try {
      const startTime = performance.now();
      
      // Use NES-GPU integration for ultra-fast semantic search
      const searchResults = await nesGPUIntegration.searchLegalDocumentsGPU(query, {
        limit: 50,
        threshold: 0.7,
        useNESCache: true,
        enableGPUAcceleration: true
      });
      
      // Enhance results with full integration data
      const enhancedResults: EnhancedLegalDocument[] = searchResults.map((doc, index) => {
        const bankAssignment = assignOptimalNESBank(doc);
        const quantLevel = selectQuantizationLevel(doc);
        
        return {
          ...doc,
          renderPosition: calculateMemoryPalacePosition(doc, index),
          vertexBufferId: `vertex_${doc.id}`,
          bankAssignment,
          gpuTextureSlot: index % 256, // Distribute across texture array slots
          binarySize: estimateBinarySize(doc),
          compressionRatio: calculateDocumentCompression(doc),
          quantizationLevel: quantLevel
        };
      });
      
      const searchTime = performance.now() - startTime;
      console.log(`🔍🏛️ NES-GPU search completed in ${searchTime.toFixed(2)}ms (${enhancedResults.length} results)`);
      
      documents = enhancedResults;
      await createEnhancedVertexBuffers();
      
    } catch (error) {
      console.error('❌ NES-GPU search failed:', error);
      // Fallback to mock data for development
      await fallbackMockSearch(query);
    }
  }
  
  // MinIO Upload Handlers
  async function handleFileUpload(files: FileList | File[]) {
    if (!enableFileUpload) return;
    
    uploadInProgress = true;
    const startTime = performance.now();
    
    try {
      console.log(`📤 Starting MinIO upload of ${files.length} files...`);
      
      // Upload files using MinIO service
      const uploadedMinIOFiles = await minioService.uploadDocuments(files, {
        autoProcess: autoProcessUploads,
        priority: 200,
        caseId,
        documentType: 'brief' // Default type, will be auto-detected
      });
      
      uploadedFiles = [...uploadedFiles, ...uploadedMinIOFiles];
      
      // Process through RAG ingestion worker for vector embeddings
      if (autoProcessUploads) {
        console.log(`🤖 Processing ${uploadedMinIOFiles.length} files through RAG pipeline...`);
        
        for (const minioFile of uploadedMinIOFiles) {
          try {
            await ragIngestionWorker.ingestDocument({
              id: minioFile.id,
              filename: minioFile.filename,
              content: '', // Content will be fetched from MinIO
              contentType: minioFile.contentType,
              s3Key: minioFile.objectPath,
              metadata: {
                caseId,
                userId,
                uploadedAt: minioFile.uploadedAt.toISOString(),
                documentType: minioFile.metadata?.documentType || 'brief',
                riskLevel: minioFile.metadata?.riskLevel || 'medium'
              }
            });
            console.log(`✅ RAG processing completed for ${minioFile.filename}`);
          } catch (ragError) {
            console.error(`❌ RAG processing failed for ${minioFile.filename}:`, ragError);
          }
        }
      }
      
      // Convert MinIO files to enhanced legal documents
      const newDocuments = await convertMinIOFilesToDocuments(uploadedMinIOFiles);
      documents = [...documents, ...newDocuments];
      
      // Update GPU buffers
      await createEnhancedVertexBuffers();
      
      const uploadTime = performance.now() - startTime;
      console.log(`🎮📤 MinIO upload completed in ${uploadTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ MinIO upload failed:', error);
    } finally {
      uploadInProgress = false;
    }
  }
  
  // Convert MinIO files to enhanced legal documents for GPU rendering
  async function convertMinIOFilesToDocuments(minioFiles: MinIOFile[]): Promise<EnhancedLegalDocument[]> {
    return minioFiles.map((file, index) => {
      const bankAssignment = assignOptimalNESBankFromMinIO(file);
      const quantLevel = selectQuantizationLevelFromMinIO(file);
      
      return {
        id: file.id,
        title: file.filename,
        content: '', // Content loaded on demand
        type: file.metadata?.documentType || 'brief',
        size: file.size,
        createdAt: file.uploadedAt,
        updatedAt: file.processedAt || file.uploadedAt,
        riskLevel: file.metadata?.riskLevel || 'medium',
        priority: file.metadata?.priority || 128,
        metadata: {
          caseId: file.metadata?.caseId,
          minioObjectPath: file.objectPath,
          uploadedAt: file.uploadedAt.toISOString(),
          aiProcessed: file.metadata?.aiProcessed || false,
          vectorEmbedding: file.metadata?.vectorEmbedding
        },
        renderPosition: calculateMemoryPalacePosition({ 
          id: file.id, 
          riskLevel: file.metadata?.riskLevel || 'medium' 
        } as LegalDocument, index),
        vertexBufferId: `vertex_${file.id}`,
        bankAssignment,
        gpuTextureSlot: index % 256,
        binarySize: estimateBinarySizeFromMinIO(file),
        compressionRatio: calculateCompressionFromMinIO(file),
        nesTexture: undefined, // Will be loaded on demand
        quantizationLevel: quantLevel
      };
    });
  }
  
  // Drag and drop handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOverUpload = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOverUpload = false;
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOverUpload = false;
    
    if (!enableFileUpload) return;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }
  
  // Upload progress tracking
  function handleUploadProgress(progress: UploadProgress) {
    uploadProgress.set(progress.filename, progress);
  }
  
  function handleUploadComplete(event: CustomEvent<{ file: MinIOFile }>) {
    console.log(`✅ Upload completed: ${event.detail.file.filename}`);
    uploadProgress.delete(event.detail.file.filename);
  }
  
  function handleUploadError(event: CustomEvent<{ error: string; file?: File }>) {
    console.error(`❌ Upload error: ${event.detail.error}`, event.detail.file?.name);
    if (event.detail.file) {
      uploadProgress.delete(event.detail.file.name);
    }
  }
  
  // High-Performance Render Loop with NES Integration
  function render() {
    if (!device || !context || !renderPipeline) return;
    
    const startTime = performance.now();
    
    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.05, g: 0.1, b: 0.15, a: 1.0 }, // Dark background for NES aesthetic
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    
    renderPass.setPipeline(renderPipeline);
    
    let drawCalls = 0;
    let verticesRendered = 0;
    
    // Render NES memory bank visualization (background layer)
    if (viewMode === 'nes-banks' && memoryBankVertexBuffer) {
      renderPass.setVertexBuffer(0, memoryBankVertexBuffer);
      const vertexCount = memoryBankVertexBuffer.size / 72; // 72 bytes per vertex
      renderPass.draw(vertexCount);
      drawCalls++;
      verticesRendered += vertexCount;
    }
    
    // Render documents (main layer)
    if (documentVertexBuffer) {
      renderPass.setVertexBuffer(0, documentVertexBuffer);
      const vertexCount = documentVertexBuffer.size / 72;
      renderPass.draw(vertexCount);
      drawCalls++;
      verticesRendered += vertexCount;
    }
    
    // Render annotations (overlay layer)
    if (showAnnotations && annotationVertexBuffer) {
      renderPass.setVertexBuffer(0, annotationVertexBuffer);
      const vertexCount = annotationVertexBuffer.size / 72;
      renderPass.draw(vertexCount);
      drawCalls++;
      verticesRendered += vertexCount;
    }
    
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
    
    // Update comprehensive performance stats
    const frameTime = performance.now() - startTime;
    frameStats.fps = Math.round(1000 / frameTime);
    frameStats.drawCalls = drawCalls;
    frameStats.verticesRendered = verticesRendered;
    frameStats.lastFrameTime = frameTime;
    
    if (enableRealTimeUpdates) {
      requestAnimationFrame(render);
    }
  }
  
  // MinIO-specific utility functions
  function assignOptimalNESBankFromMinIO(file: MinIOFile): string {
    if (file.metadata?.riskLevel === 'critical' || (file.metadata?.priority && file.metadata.priority > 200)) {
      return 'INTERNAL_RAM';
    }
    if (file.metadata?.documentType === 'evidence' || file.metadata?.documentType === 'contract') {
      return 'CHR_ROM';
    }
    if (file.metadata?.documentType === 'brief' || file.metadata?.documentType === 'precedent') {
      return 'PRG_ROM';
    }
    if (file.metadata?.caseId) {
      return 'SAVE_RAM';
    }
    return 'PRG_ROM';
  }
  
  function selectQuantizationLevelFromMinIO(file: MinIOFile): 'FP32' | 'FP16' | 'INT8' {
    if (file.metadata?.riskLevel === 'critical') return 'FP32';
    if (file.metadata?.riskLevel === 'high' || file.metadata?.documentType === 'contract') return 'FP16';
    return 'INT8';
  }
  
  function estimateBinarySizeFromMinIO(file: MinIOFile): number {
    const baseSize = 64;
    const embeddingSize = file.metadata?.vectorEmbedding ? file.metadata.vectorEmbedding.length * 4 : 384 * 4;
    const matrixSize = 16 * 4;
    const metadataSize = file.metadata ? JSON.stringify(file.metadata).length : 0;
    return baseSize + embeddingSize + matrixSize + metadataSize;
  }
  
  function calculateCompressionFromMinIO(file: MinIOFile): number {
    const baseCompression = 1.5;
    const typeBonus = file.metadata?.documentType === 'citation' ? 0.5 : 0;
    const sizeBonus = file.size > 10000 ? 0.8 : 0;
    const aiBonus = file.metadata?.aiProcessed ? 0.3 : 0;
    return baseCompression + typeBonus + sizeBonus + aiBonus;
  }
  
  // Utility Functions (comprehensive set for NES-GPU integration)
  function assignOptimalNESBank(doc: LegalDocument): string {
    if (doc.riskLevel === 'critical' || (doc.priority && doc.priority > 200)) {
      return 'INTERNAL_RAM';
    }
    if (doc.type === 'evidence' || doc.type === 'contract') {
      return 'CHR_ROM';
    }
    if (doc.type === 'brief' || doc.type === 'precedent') {
      return 'PRG_ROM';
    }
    if (doc.metadata?.caseId) {
      return 'SAVE_RAM';
    }
    return 'PRG_ROM';
  }
  
  function selectQuantizationLevel(doc: LegalDocument): 'FP32' | 'FP16' | 'INT8' {
    if (doc.riskLevel === 'critical') return 'FP32';
    if (doc.riskLevel === 'high' || doc.type === 'contract') return 'FP16';
    return 'INT8';
  }
  
  function calculateMemoryPalacePosition(doc: LegalDocument, index: number): { x: number; y: number; z: number } {
    const bankOffset = getBankLayoutOffset(assignOptimalNESBank(doc));
    const riskBoost = getRiskLevelValue(doc.riskLevel) * 0.2;
    const angle = (index / documents.length) * Math.PI * 2;
    const radius = 1.0 + riskBoost;
    
    return {
      x: radius * Math.cos(angle) + bankOffset.x * 0.5,
      y: bankOffset.y + riskBoost,
      z: radius * Math.sin(angle) + bankOffset.z
    };
  }
  
  function getBankLayoutOffset(bankAssignment: string): { x: number; y: number; z: number } {
    switch (bankAssignment) {
      case 'INTERNAL_RAM': return { x: -0.8, y: 0.8, z: 0.2 };
      case 'CHR_ROM': return { x: 0.8, y: 0.8, z: 0.1 };
      case 'PRG_ROM': return { x: 0.0, y: 0.0, z: 0.0 };
      case 'SAVE_RAM': return { x: -0.8, y: -0.8, z: 0.15 };
      default: return { x: 0.0, y: 0.0, z: 0.0 };
    }
  }
  
  function getBankId(bankAssignment: string): number {
    switch (bankAssignment) {
      case 'INTERNAL_RAM': return 0.0;
      case 'CHR_ROM': return 1.0;
      case 'PRG_ROM': return 2.0;
      case 'SAVE_RAM': return 3.0;
      default: return 2.0;
    }
  }
  
  function getRiskLevelValue(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 0.0;
      case 'medium': return 1.0;
      case 'high': return 2.0;
      case 'critical': return 3.0;
      default: return 0.0;
    }
  }
  
  function getQuantizationLevelValue(quantLevel?: string): number {
    switch (quantLevel) {
      case 'FP32': return 0.0;
      case 'FP16': return 1.0;
      case 'INT8': return 2.0;
      default: return 1.0;
    }
  }
  
  function getNESEnhancedColor(doc: EnhancedLegalDocument): number[] {
    // Base color by document type
    let baseColor: number[];
    switch (doc.type) {
      case 'contract': baseColor = [0.2, 0.8, 0.2, 1.0]; break;
      case 'evidence': baseColor = [0.8, 0.2, 0.2, 1.0]; break;
      case 'brief': baseColor = [0.2, 0.2, 0.8, 1.0]; break;
      case 'citation': baseColor = [0.8, 0.8, 0.2, 1.0]; break;
      case 'precedent': baseColor = [0.8, 0.2, 0.8, 1.0]; break;
      default: baseColor = [0.6, 0.6, 0.6, 1.0]; break;
    }
    
    // Modulate based on quantization level
    const quantMod = doc.quantizationLevel === 'FP32' ? 1.0 : doc.quantizationLevel === 'FP16' ? 0.9 : 0.8;
    return [baseColor[0] * quantMod, baseColor[1] * quantMod, baseColor[2] * quantMod, baseColor[3]];
  }
  
  function getBankForTextureStorage(bankAssignment: string): 'RAM' | 'CHR_ROM' | 'PRG_ROM' {
    switch (bankAssignment) {
      case 'INTERNAL_RAM': return 'RAM';
      case 'CHR_ROM': return 'CHR_ROM';
      case 'SAVE_RAM': return 'CHR_ROM'; // Map to CHR_ROM for patterns
      default: return 'PRG_ROM';
    }
  }
  
  function getRiskColor(riskLevel: string): number[] {
    switch (riskLevel) {
      case 'critical': return [1.0, 0.1, 0.1];
      case 'high': return [1.0, 0.5, 0.1];
      case 'medium': return [1.0, 0.8, 0.2];
      case 'low': return [0.2, 0.8, 0.2];
      default: return [0.5, 0.5, 0.5];
    }
  }
  
  function getBankColor(bankAssignment: string): number[] {
    switch (bankAssignment) {
      case 'INTERNAL_RAM': return [0.2, 0.4, 1.0];
      case 'CHR_ROM': return [0.2, 1.0, 0.4];
      case 'PRG_ROM': return [0.8, 0.2, 1.0];
      case 'SAVE_RAM': return [1.0, 0.8, 0.2];
      default: return [0.5, 0.5, 0.5];
    }
  }
  
  function getEnhancedDocumentSize(doc: EnhancedLegalDocument): number {
    const baseSize = 0.08;
    const priorityBoost = (doc.priority / 255) * 0.02;
    const compressionReduction = (doc.compressionRatio || 1.0) > 1.5 ? 0.01 : 0;
    const quantizationBoost = doc.quantizationLevel === 'FP32' ? 0.01 : 0;
    return baseSize + priorityBoost - compressionReduction + quantizationBoost;
  }
  
  function calculateNESMemoryUsage(docs: EnhancedLegalDocument[]): number {
    return docs.reduce((total, doc) => total + (doc.binarySize || 1024), 0);
  }
  
  function calculateCompressionRatio(docs: EnhancedLegalDocument[]): number {
    if (docs.length === 0) return 1.0;
    const totalRatio = docs.reduce((sum, doc) => sum + (doc.compressionRatio || 1.0), 0);
    return totalRatio / docs.length;
  }
  
  function calculateQuantizationSavings(docs: EnhancedLegalDocument[]): number {
    const fp32Count = docs.filter(d => d.quantizationLevel === 'FP32').length;
    const fp16Count = docs.filter(d => d.quantizationLevel === 'FP16').length;
    const int8Count = docs.filter(d => d.quantizationLevel === 'INT8').length;
    
    const originalSize = docs.length * 4; // Assume 4 bytes per element for FP32
    const actualSize = fp32Count * 4 + fp16Count * 2 + int8Count * 1;
    
    return ((originalSize - actualSize) / originalSize) * 100;
  }
  
  function updateMemoryBankStatus() {
    const currentDocs = documents;
    
    // Reset bank status
    for (const bank of Object.keys(memoryBankStatus)) {
      memoryBankStatus[bank as keyof typeof memoryBankStatus] = {
        used: 0,
        capacity: memoryBankStatus[bank as keyof typeof memoryBankStatus].capacity,
        active: false,
        documents: []
      };
    }
    
    // Calculate usage
    currentDocs.forEach(doc => {
      const bank = doc.bankAssignment || 'PRG_ROM';
      const size = doc.binarySize || 1024;
      
      if (bank in memoryBankStatus) {
        const bankStatus = memoryBankStatus[bank as keyof typeof memoryBankStatus];
        bankStatus.used += size;
        bankStatus.active = true;
        bankStatus.documents.push(doc.id);
      }
    });
  }
  
  // Generate remaining helper functions for completeness
  function generateNESAnnotationGeometry(docs: EnhancedLegalDocument[]): ArrayBuffer {
    // Simplified version - full implementation would generate annotation overlays
    return new Float32Array([]).buffer;
  }
  
  function generateMemoryBankVisualization(): ArrayBuffer {
    // Simplified version - full implementation would generate bank boundary visualizations
    return new Float32Array([]).buffer;
  }
  
  function estimateBinarySize(doc: LegalDocument): number {
    const baseSize = 64;
    const embeddingSize = 384 * 4;
    const matrixSize = 16 * 4;
    const metadataSize = doc.metadata ? JSON.stringify(doc.metadata).length : 0;
    return baseSize + embeddingSize + matrixSize + metadataSize;
  }
  
  function calculateDocumentCompression(doc: LegalDocument): number {
    // Estimate compression based on document characteristics
    const baseCompression = 1.5;
    const typeBonus = doc.type === 'citation' ? 0.5 : 0;
    const sizeBonus = (doc.size || 1024) > 10000 ? 0.8 : 0;
    return baseCompression + typeBonus + sizeBonus;
  }
  
  async function createBasicVertexBuffers(docs: EnhancedLegalDocument[]) {
    console.warn('⚠️ Using basic vertex buffers (NES integration failed)');
    // Fallback implementation
  }
  
  async function fallbackMockSearch(query: string) {
    console.warn('⚠️ Using fallback mock search');
    // Mock implementation
  }
  
  function formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }
  
  function formatNESBank(bank: string): string {
    const labels = {
      'INTERNAL_RAM': 'RAM (2KB)',
      'CHR_ROM': 'CHR (8KB)',
      'PRG_ROM': 'PRG (32KB)',
      'SAVE_RAM': 'SAVE (8KB)'
    };
    return labels[bank as keyof typeof labels] || bank;
  }
  
  // Reactive updates
  $effect(() => {
    if (aiAnalysis.length > 0) {
      // Update AI highlights
      render();
    }
  });
  
  onMount(async () => {
    const success = await initializeGPU();
    if (success) {
      if (enableRealTimeUpdates) {
        render(); // Start render loop
      } else {
        render(); // Single render
      }
    }
  });
  
  onDestroy(() => {
    // Cleanup GPU resources
    documentVertexBuffer?.destroy();
    annotationVertexBuffer?.destroy();
    highlightVertexBuffer?.destroy();
    memoryBankVertexBuffer?.destroy();
    
    // Cleanup texture streaming
    textureStreamer.destroy();
  });
</script>

<div class="border-2 border-gray-700 rounded-lg bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 text-gray-200 font-mono">
  <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-600">
    <h3 class="m-0 text-cyan-400 text-shadow-glow animate-pulse">🎮🏛️ NES-GPU Legal Document Viewer</h3>
    <div class="flex gap-4 text-xs text-gray-400">
      <span class="bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">FPS: {frameStats.fps}</span>
      <span class="bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">Pipeline: {frameStats.binaryPipelineTime.toFixed(1)}ms</span>
      <span class="bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">Vertices: {frameStats.verticesRendered.toLocaleString()}</span>
      <span class="bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">Compression: {frameStats.compressionRatio.toFixed(1)}x</span>
      <span class="bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">Quant Savings: {frameStats.quantizationSavings.toFixed(1)}%</span>
    </div>
  </div>
  
  <div class="flex flex-col gap-3 mb-4 p-3 bg-black/30 rounded-md border border-gray-600">
    <div class="flex gap-4 items-center flex-wrap">
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" bind:checked={showAnnotations} class="accent-cyan-400" />
        Show Annotations
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" bind:checked={enableRealTimeUpdates} class="accent-cyan-400" />
        Real-time Updates
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" bind:checked={visualMemoryPalace} class="accent-cyan-400" />
        Memory Palace 3D
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" bind:checked={enableFileUpload} class="accent-cyan-400" />
        MinIO Upload
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" bind:checked={showUploadArea} class="accent-cyan-400" />
        Upload Area
      </label>
    </div>
    
    <div class="flex gap-4 items-center flex-wrap">
      <label class="flex items-center gap-2 text-sm text-gray-300">
        View Mode:
        <select bind:value={viewMode} class="bg-black/50 border border-gray-500 rounded px-2 py-1 text-gray-200 text-sm">
          <option value="list">List</option>
          <option value="graph">Graph</option>
          <option value="3d">3D Documents</option>
          <option value="memory-palace">Memory Palace</option>
          <option value="nes-banks">NES Memory Banks</option>
        </select>
      </label>
      
      <label class="flex items-center gap-2 text-sm text-gray-300">
        Quantization:
        <select bind:value={quantizationProfile} class="bg-black/50 border border-gray-500 rounded px-2 py-1 text-gray-200 text-sm">
          <option value="legal_critical">Critical (FP32)</option>
          <option value="legal_standard">Standard (FP16)</option>
          <option value="legal_compressed">Compressed (INT8)</option>
          <option value="legal_storage">Storage (INT8)</option>
        </select>
      </label>
    </div>
    
    <div class="flex gap-2 items-center">
      <input 
        type="text" 
        bind:value={searchQuery} 
        onkeydown={(e) => e.key === 'Enter' && searchDocuments(searchQuery)}
        placeholder="Search legal documents..." 
        class="flex-1 min-w-48 bg-black/50 border border-gray-500 rounded px-3 py-2 text-gray-200 placeholder-gray-400 text-sm"
      />
      <button 
        onclick={() => searchDocuments(searchQuery)}
        class="px-3 py-2 bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 rounded text-xs font-semibold hover:scale-105 transition-transform cursor-pointer border-none"
      >
        🔍 Search
      </button>
      <button 
        onclick={() => render()}
        class="px-3 py-2 bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 rounded text-xs font-semibold hover:scale-105 transition-transform cursor-pointer border-none"
      >
        🔄 Render
      </button>
    </div>
  </div>
  
  <canvas 
    bind:this={canvas}
    width="1200"
    height="800"
    class="w-full border-2 border-gray-500 rounded-md bg-radial-gradient"
    style="background: radial-gradient(ellipse at center, #0f0f23, #0a0a1a); box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.5);"
  ></canvas>
  
  <!-- MinIO Upload Interface -->
  {#if enableFileUpload && showUploadArea}
    <div class="mt-4 bg-cyan-400/3 border border-cyan-400/20 rounded-lg p-4">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-cyan-400/10">
        <h4 class="m-0 text-cyan-400 text-base font-semibold">📤 MinIO Document Upload</h4>
        <div class="flex gap-4 items-center text-sm">
          {#if uploadInProgress}
            <span class="text-yellow-400 font-semibold">⚡ Uploading...</span>
          {:else}
            <span class="text-green-400 font-semibold">✅ Ready</span>
          {/if}
          <span class="text-gray-400">{uploadedFiles.length} files uploaded</span>
        </div>
      </div>
      
      <!-- Drag and Drop Zone -->
      <div 
        class="border-2 border-dashed border-cyan-400/30 rounded-lg p-8 text-center transition-all duration-300 bg-black/20 min-h-38 flex items-center justify-center"
        class:border-cyan-400={dragOverUpload}
        class:bg-cyan-400/10={dragOverUpload}
        class:shadow-lg={dragOverUpload}
        class:shadow-cyan-400/30={dragOverUpload}
        class:border-yellow-400={uploadInProgress}
        class:bg-yellow-400/5={uploadInProgress}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        role="region" aria-label="Drop zone" ondrop={handleDrop}
      >
        {#if uploadInProgress}
          <div class="w-full">
            <div class="text-center mb-4 text-yellow-400 font-semibold">
              <span>🚀 Processing {Array.from(uploadProgress.values()).length} files...</span>
            </div>
            {#each Array.from(uploadProgress.entries()) as [filename, progress]}
              <div class="mb-4 p-3 bg-black/30 rounded-md border border-yellow-400/20">
                <div class="flex justify-between items-center mb-2 text-sm">
                  <span class="font-semibold text-gray-200 flex-1 text-left truncate">{filename}</span>
                  <span class="text-cyan-400 text-xs capitalize ml-2">{progress.stage}</span>
                  <span class="text-yellow-400 font-semibold min-w-12 text-right ml-2">{progress.percentage.toFixed(1)}%</span>
                </div>
                <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-cyan-400 to-yellow-400 transition-all duration-300" style="width: {progress.percentage}%"></div>
                </div>
                {#if progress.message}
                  <div class="mt-2 text-xs text-gray-400 italic">{progress.message}</div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex flex-col items-center gap-4">
            <div class="text-6xl opacity-60">📁</div>
            <div>
              <p class="text-gray-200 mb-1">Drag & drop legal documents here</p>
              <p class="text-xs text-gray-400">PDF, JPG, PNG, TXT files • Max {maxUploadFiles} files • 50MB each</p>
            </div>
            <button 
              class="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 rounded-md text-sm font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              onclick={() => documentUploader?.selectFiles()}
              disabled={uploadInProgress}
            >
              📂 Browse Files
            </button>
          </div>
        {/if}
      </div>
      
      <!-- Upload Options -->
      <div class="mt-4 flex gap-4 items-center p-3 bg-black/20 rounded-md text-sm">
        <label class="flex items-center gap-2 text-gray-300">
          <input type="checkbox" bind:checked={autoProcessUploads} class="accent-cyan-400" />
          Auto-process uploads (RAG + Embeddings)
        </label>
        {#if caseId}
          <span class="text-cyan-400 text-xs px-2 py-1 bg-cyan-400/10 rounded border border-cyan-400/20">📋 Case: {caseId}</span>
        {/if}
        {#if userId}
          <span class="text-cyan-400 text-xs px-2 py-1 bg-cyan-400/10 rounded border border-cyan-400/20">👤 User: {userId}</span>
        {/if}
      </div>
      
      <!-- Recent Uploads -->
      {#if uploadedFiles.length > 0}
        <div class="mt-4 p-4 bg-black/20 rounded-md border border-cyan-400/10">
          <h5 class="m-0 mb-3 text-cyan-400 text-sm font-semibold">📋 Recent Uploads</h5>
          <div class="flex flex-col gap-2">
            {#each uploadedFiles.slice(-5) as file}
              <div class="flex items-center gap-3 p-2 bg-cyan-400/5 rounded border border-cyan-400/10">
                <div class="text-xl flex-shrink-0">
                  {#if file.contentType.includes('pdf')}📄
                  {:else if file.contentType.includes('image')}🖼️
                  {:else}📝
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-gray-200 text-sm truncate">{file.filename}</div>
                  <div class="flex gap-2 items-center text-xs text-gray-400 mt-1">
                    <span>{(file.size / 1024).toFixed(1)}KB</span>
                    <span>•</span>
                    <span>{file.metadata?.documentType || 'unknown'}</span>
                    <span>•</span>
                    <span class:text-green-400={file.metadata?.riskLevel === 'low'}
                          class:text-yellow-400={file.metadata?.riskLevel === 'medium'}
                          class:text-orange-400={file.metadata?.riskLevel === 'high'}
                          class:text-red-400={file.metadata?.riskLevel === 'critical'}>
                      {file.metadata?.riskLevel || 'medium'}
                    </span>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  {#if file.metadata?.aiProcessed}
                    <span class="text-green-400 text-xs font-semibold">🤖 Processed</span>
                  {:else}
                    <span class="text-yellow-400 text-xs font-semibold">⏳ Pending</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Headless Document Uploader Component -->
  <DocumentUploader
    bind:this={documentUploader}
    {maxUploadFiles}
    maxFileSize={50 * 1024 * 1024}
    acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'text/plain']}
    {caseId}
    priority={200}
    autoUpload={false}
    {autoProcessUploads}
    onfiles-selected={(e) => console.log('Files selected:', e.detail.files)}
    onupload-start={(e) => console.log('Upload started:', e.detail.files)}
    onupload-progress={handleUploadProgress}
    onupload-complete={handleUploadComplete}
    onupload-error={handleUploadError}
    onall-uploads-complete={(e) => handleFileUpload(e.detail.files)}
  >
    {#snippet children({ selectFiles, uploadFiles, getUploadStats })}
      <!-- Slot content for custom upload UI -->
    {/snippet}
  </DocumentUploader>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    <!-- NES-GPU Performance Statistics -->
    <div class="bg-cyan-400/5 border border-cyan-400/20 rounded-md p-4">
      <h4 class="m-0 mb-3 text-cyan-400 text-sm font-semibold">🎮 NES-GPU Performance</h4>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Frame Time:</span>
        <span class="text-cyan-400 font-semibold">{frameStats.lastFrameTime.toFixed(2)}ms</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Binary Pipeline:</span>
        <span class="text-cyan-400 font-semibold">{frameStats.binaryPipelineTime.toFixed(2)}ms</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Texture Streaming:</span>
        <span class="text-cyan-400 font-semibold">{frameStats.textureStreamingTime.toFixed(2)}ms</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Documents Cached:</span>
        <span class="text-cyan-400 font-semibold">{frameStats.documentsCached}</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Draw Calls:</span>
        <span class="text-cyan-400 font-semibold">{frameStats.drawCalls}</span>
      </div>
    </div>
    
    <!-- NES Memory Bank Status -->
    <div class="bg-yellow-400/5 border border-yellow-400/20 rounded-md p-4">
      <h4 class="m-0 mb-3 text-yellow-400 text-sm font-semibold">🏛️ NES Memory Banks</h4>
      {#each Object.entries(memoryBankStatus) as [bank, status]}
        <div class="my-3 p-2 rounded transition-all duration-300 opacity-50"
             class:opacity-100={status.active}
             class:bg-yellow-400/10={status.active}
             class:border={status.active}
             class:border-yellow-400/30={status.active}>
          <div class="flex justify-between mb-1">
            <span class="text-yellow-400 text-xs font-semibold">{formatNESBank(bank)}</span>
            <span class="text-gray-500 text-xs">{status.documents.length} docs</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                style="width: {Math.min(100, (status.used / status.capacity) * 100)}%"
              ></div>
            </div>
            <span class="text-gray-400 text-xs min-w-20 text-right">
              {formatMemoryUsage(status.used)} / {formatMemoryUsage(status.capacity)}
            </span>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Texture Streaming Stats -->
    <div class="bg-cyan-400/5 border border-cyan-400/20 rounded-md p-4">
      <h4 class="m-0 mb-3 text-cyan-400 text-sm font-semibold">🎨 Texture Streaming</h4>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Textures Loaded:</span>
        <span class="text-cyan-400 font-semibold">{textureStats.textures}</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>Memory Used:</span>
        <span class="text-cyan-400 font-semibold">{formatMemoryUsage(textureStats.memoryUsed || 0)}</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>WebGPU Active:</span>
        <span class="text-cyan-400 font-semibold">{textureStats.isWebGPU ? '✅' : '❌'}</span>
      </div>
      <div class="flex justify-between my-2 text-xs text-gray-300">
        <span>WebGL2 Fallback:</span>
        <span class="text-cyan-400 font-semibold">{textureStats.isWebGL2 ? '✅' : '❌'}</span>
      </div>
    </div>
  </div>
  
  <div class="mt-4 p-3 bg-black/20 rounded border border-gray-700">
    <p class="my-1 text-xs text-gray-400">📄 Documents: {documents.length} | 🤖 AI Analysis: {aiAnalysis.length}</p>
    <p class="my-1 text-xs text-gray-400">⚡ Mode: {viewMode} | 🗜️ Quantization: {quantizationProfile}</p>
    <p class="my-1 text-xs text-gray-400">🎮 NES Memory: {formatMemoryUsage(frameStats.nesMemoryUsed)} | 💾 Savings: {frameStats.quantizationSavings.toFixed(1)}%</p>
  </div>
</div>

<style>
  /* Essential NES-style animations using N64 theme colors */
  @keyframes nesGlow {
    0%, 100% { 
      text-shadow: 0 0 5px rgba(100, 255, 218, 0.3);
      box-shadow: 0 0 5px rgba(100, 255, 218, 0.3);
    }
    50% { 
      text-shadow: 0 0 20px rgba(100, 255, 218, 0.6);
      box-shadow: 0 0 20px rgba(100, 255, 218, 0.6);
    }
  }
  
  .text-shadow-glow {
    text-shadow: 0 0 10px rgba(100, 255, 218, 0.3);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .animate-pulse {
      animation: none !important;
    }
  }
</style>