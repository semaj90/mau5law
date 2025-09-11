<!-- 🏛️ NES-GPU Integrated Legal Document Viewer
     Advanced GPU-accelerated document rendering with:
     - NES memory architecture integration  
     - WebGPU texture streaming with quantization
     - Binary document processing pipeline
     - Legal AI-optimized buffer management -->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { nesGPUIntegration, type LegalDocument, type PipelineStats } from '$lib/gpu/nes-gpu-integration';
  import { textureStreamer, type NESTexture } from '$lib/webgpu/texture-streaming';
  import { WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader';
  
  // Enhanced Props with NES integration
  interface Props {
    documents: EnhancedLegalDocument[];
    aiAnalysis?: AIAnalysisResult[];
    showAnnotations?: boolean;
    enableRealTimeUpdates?: boolean;
    nesMemoryMode?: 'efficient' | 'performance' | 'balanced';
    quantizationProfile?: 'legal_critical' | 'legal_standard' | 'legal_compressed' | 'legal_storage';
    visualMemoryPalace?: boolean;
  }
  
  let { 
    documents = [], 
    aiAnalysis = [], 
    showAnnotations = true,
    enableRealTimeUpdates = false,
    nesMemoryMode = 'balanced',
    quantizationProfile = 'legal_standard',
    visualMemoryPalace = false
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

<div class="nes-gpu-document-viewer">
  <div class="viewer-header">
    <h3>🎮🏛️ NES-GPU Legal Document Viewer</h3>
    <div class="performance-stats">
      <span>FPS: {frameStats.fps}</span>
      <span>Pipeline: {frameStats.binaryPipelineTime.toFixed(1)}ms</span>
      <span>Vertices: {frameStats.verticesRendered.toLocaleString()}</span>
      <span>Compression: {frameStats.compressionRatio.toFixed(1)}x</span>
      <span>Quant Savings: {frameStats.quantizationSavings.toFixed(1)}%</span>
    </div>
  </div>
  
  <div class="viewer-controls">
    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={showAnnotations} />
        Show Annotations
      </label>
      <label>
        <input type="checkbox" bind:checked={enableRealTimeUpdates} />
        Real-time Updates
      </label>
      <label>
        <input type="checkbox" bind:checked={visualMemoryPalace} />
        Memory Palace 3D
      </label>
    </div>
    
    <div class="control-group">
      <label>
        View Mode:
        <select bind:value={viewMode}>
          <option value="list">List</option>
          <option value="graph">Graph</option>
          <option value="3d">3D Documents</option>
          <option value="memory-palace">Memory Palace</option>
          <option value="nes-banks">NES Memory Banks</option>
        </select>
      </label>
      
      <label>
        Quantization:
        <select bind:value={quantizationProfile}>
          <option value="legal_critical">Critical (FP32)</option>
          <option value="legal_standard">Standard (FP16)</option>
          <option value="legal_compressed">Compressed (INT8)</option>
          <option value="legal_storage">Storage (INT8)</option>
        </select>
      </label>
    </div>
    
    <div class="control-group">
      <input 
        type="text" 
        bind:value={searchQuery} 
        onkeydown={(e) => e.key === 'Enter' && searchDocuments(searchQuery)}
        placeholder="Search legal documents..." 
        class="search-input"
      />
      <button onclick={() => searchDocuments(searchQuery)}>🔍 Search</button>
      <button onclick={() => render()}>🔄 Render</button>
    </div>
  </div>
  
  <canvas 
    bind:this={canvas}
    width="1200"
    height="800"
    class="document-canvas"
  ></canvas>
  
  <div class="stats-panels">
    <!-- NES-GPU Performance Statistics -->
    <div class="stats-panel">
      <h4>🎮 NES-GPU Performance</h4>
      <div class="stat-row">
        <span>Frame Time:</span>
        <span>{frameStats.lastFrameTime.toFixed(2)}ms</span>
      </div>
      <div class="stat-row">
        <span>Binary Pipeline:</span>
        <span>{frameStats.binaryPipelineTime.toFixed(2)}ms</span>
      </div>
      <div class="stat-row">
        <span>Texture Streaming:</span>
        <span>{frameStats.textureStreamingTime.toFixed(2)}ms</span>
      </div>
      <div class="stat-row">
        <span>Documents Cached:</span>
        <span>{frameStats.documentsCached}</span>
      </div>
      <div class="stat-row">
        <span>Draw Calls:</span>
        <span>{frameStats.drawCalls}</span>
      </div>
    </div>
    
    <!-- NES Memory Bank Status -->
    <div class="memory-banks-panel">
      <h4>🏛️ NES Memory Banks</h4>
      {#each Object.entries(memoryBankStatus) as [bank, status]}
        <div class="bank-row" class:active={status.active}>
          <div class="bank-header">
            <span class="bank-name">{formatNESBank(bank)}</span>
            <span class="bank-docs">{status.documents.length} docs</span>
          </div>
          <div class="bank-usage">
            <div class="usage-bar">
              <div 
                class="usage-fill" 
                style="width: {Math.min(100, (status.used / status.capacity) * 100)}%"
              ></div>
            </div>
            <span class="usage-text">
              {formatMemoryUsage(status.used)} / {formatMemoryUsage(status.capacity)}
            </span>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Texture Streaming Stats -->
    <div class="stats-panel">
      <h4>🎨 Texture Streaming</h4>
      <div class="stat-row">
        <span>Textures Loaded:</span>
        <span>{textureStats.textures}</span>
      </div>
      <div class="stat-row">
        <span>Memory Used:</span>
        <span>{formatMemoryUsage(textureStats.memoryUsed || 0)}</span>
      </div>
      <div class="stat-row">
        <span>WebGPU Active:</span>
        <span>{textureStats.isWebGPU ? '✅' : '❌'}</span>
      </div>
      <div class="stat-row">
        <span>WebGL2 Fallback:</span>
        <span>{textureStats.isWebGL2 ? '✅' : '❌'}</span>
      </div>
    </div>
  </div>
  
  <div class="viewer-info">
    <p>📄 Documents: {documents.length} | 🤖 AI Analysis: {aiAnalysis.length}</p>
    <p>⚡ Mode: {viewMode} | 🗜️ Quantization: {quantizationProfile}</p>
    <p>🎮 NES Memory: {formatMemoryUsage(frameStats.nesMemoryUsed)} | 💾 Savings: {frameStats.quantizationSavings.toFixed(1)}%</p>
  </div>
</div>

<style>
  .nes-gpu-document-viewer {
    border: 2px solid #333;
    border-radius: 8px;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    padding: 1rem;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
  }
  
  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #444;
  }
  
  .viewer-header h3 {
    margin: 0;
    color: #64ffda;
    text-shadow: 0 0 10px rgba(100, 255, 218, 0.3);
  }
  
  .performance-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #a0a0a0;
  }
  
  .performance-stats span {
    background: rgba(100, 255, 218, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(100, 255, 218, 0.2);
  }
  
  .viewer-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid #444;
  }
  
  .control-group {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .viewer-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #b0b0b0;
  }
  
  .viewer-controls select,
  .search-input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #555;
    border-radius: 4px;
    color: #e0e0e0;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .search-input {
    min-width: 200px;
    flex: 1;
  }
  
  .viewer-controls button {
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #64ffda, #4fc3f7);
    color: #1a1a2e;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .viewer-controls button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(100, 255, 218, 0.3);
  }
  
  .document-canvas {
    width: 100%;
    border: 2px solid #555;
    border-radius: 6px;
    background: radial-gradient(ellipse at center, #0f0f23, #0a0a1a);
    box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.5);
  }
  
  .stats-panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .stats-panel {
    background: rgba(100, 255, 218, 0.05);
    border: 1px solid rgba(100, 255, 218, 0.2);
    border-radius: 6px;
    padding: 1rem;
  }
  
  .stats-panel h4 {
    margin: 0 0 0.75rem 0;
    color: #64ffda;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
    font-size: 0.75rem;
    color: #b0b0b0;
  }
  
  .stat-row span:last-child {
    color: #64ffda;
    font-weight: 600;
  }
  
  .memory-banks-panel {
    background: rgba(255, 193, 7, 0.05);
    border: 1px solid rgba(255, 193, 7, 0.2);
    border-radius: 6px;
    padding: 1rem;
  }
  
  .memory-banks-panel h4 {
    margin: 0 0 0.75rem 0;
    color: #ffc107;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .bank-row {
    margin: 0.75rem 0;
    padding: 0.5rem;
    border-radius: 4px;
    transition: all 0.3s ease;
    opacity: 0.5;
  }
  
  .bank-row.active {
    opacity: 1;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
  }
  
  .bank-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  
  .bank-name {
    font-size: 0.75rem;
    color: #ffc107;
    font-weight: 600;
  }
  
  .bank-docs {
    font-size: 0.7rem;
    color: #888;
  }
  
  .bank-usage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .usage-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .usage-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffc107, #ff9800);
    transition: width 0.5s ease;
  }
  
  .usage-text {
    font-size: 0.7rem;
    color: #aaa;
    min-width: 80px;
    text-align: right;
  }
  
  .viewer-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid #333;
  }
  
  .viewer-info p {
    margin: 0.25rem 0;
    font-size: 0.8rem;
    color: #999;
  }
  
  /* NES-style animations */
  @keyframes nesGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(100, 255, 218, 0.3); }
    50% { box-shadow: 0 0 20px rgba(100, 255, 218, 0.6); }
  }
  
  .viewer-header h3 {
    animation: nesGlow 2s ease-in-out infinite;
  }
  
  .bank-row.active {
    animation: nesGlow 3s ease-in-out infinite;
  }
</style>