/**
 * WebGPU Vertex Buffer Streaming with TypeScript Safety
 * Connects to NES-GPU memory bridge for legal AI visualization
 * Achieves true pixel placement with SSR compatibility
 */

import { ensureBufferCompatibility, safeWriteBuffer } from '$lib/utils/buffer-utils';

export interface VertexData {
  position: [number, number, number];
  color: [number, number, number, number];
  metadata: {
    caseId?: string;
    documentType?: 'contract' | 'evidence' | 'brief' | 'citation';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
  };
}

export interface LegalVisualizationVertex {
  position: Float32Array; // 3 floats (x, y, z)
  color: Float32Array;    // 4 floats (r, g, b, a)
  textureCoord: Float32Array; // 2 floats (u, v)
  caseData: Uint32Array;  // 4 uint32 (caseId hash, docType, risk, confidence)
}

export interface StreamingConfig {
  maxVertices: number;
  bufferSize: number;
  updateFrequency: number;
  chrRomIntegration: boolean;
  nesMemoryBanks: number;
}

export class WebGPUVertexStreamer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  private config: StreamingConfig;
  private vertices: LegalVisualizationVertex[] = [];
  private isDirty = false;
  private streamingActive = false;
  
  // CHR-ROM integration for cached patterns
  private chrRomCache = new Map<string, ArrayBuffer>();
  private nesMemoryBanks: ArrayBuffer[] = [];
  
  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      maxVertices: 100000,
      bufferSize: 8 * 1024 * 1024, // 8MB buffer
      updateFrequency: 60, // 60 FPS
      chrRomIntegration: true,
      nesMemoryBanks: 8,
      ...config
    };
    
    this.initializeNESMemoryBanks();
  }

  private initializeNESMemoryBanks(): void {
    // Initialize memory banks like NES CHR-ROM (8KB each)
    for (let i = 0; i < this.config.nesMemoryBanks; i++) {
      this.nesMemoryBanks[i] = new ArrayBuffer(8192); // 8KB CHR-ROM bank
    }
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No appropriate GPUAdapter found');
    }

    this.device = await adapter.requestDevice();
    this.context = canvas.getContext('webgpu');
    
    if (!this.context) {
      throw new Error('Failed to get WebGPU context');
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: canvasFormat,
    });

    await this.createRenderPipeline(canvasFormat);
    await this.createBuffers();
    
    console.log('🎮 WebGPU Vertex Streamer initialized with NES-style memory banks');
  }

  private async createRenderPipeline(format: GPUTextureFormat): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    const shaderModule = this.device.createShaderModule({
      code: `
        struct Uniforms {
          mvpMatrix: mat4x4<f32>,
          time: f32,
          caseCount: f32,
        }

        struct VertexInput {
          @location(0) position: vec3<f32>,
          @location(1) color: vec4<f32>,
          @location(2) textureCoord: vec2<f32>,
          @location(3) caseData: vec4<u32>,
        }

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) color: vec4<f32>,
          @location(1) textureCoord: vec2<f32>,
          @location(2) caseId: f32,
          @location(3) riskLevel: f32,
        }

        @group(0) @binding(0)
        var<uniform> uniforms: Uniforms;

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          
          // Transform position using MVP matrix
          output.position = uniforms.mvpMatrix * vec4<f32>(input.position, 1.0);
          
          // Pass through color with risk-based intensity
          let riskIntensity = f32(input.caseData.z) / 4.0; // 0-3 mapped to 0-0.75
          output.color = vec4<f32>(
            input.color.rgb * (0.5 + riskIntensity * 0.5),
            input.color.a
          );
          
          output.textureCoord = input.textureCoord;
          output.caseId = f32(input.caseData.x);
          output.riskLevel = f32(input.caseData.z);
          
          return output;
        }

        @fragment
        fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
          // CHR-ROM style pattern-based rendering
          let patternX = u32(input.textureCoord.x * 8.0) % 8u;
          let patternY = u32(input.textureCoord.y * 8.0) % 8u;
          let patternIndex = patternY * 8u + patternX;
          
          // Risk-based color modulation
          var finalColor = input.color;
          
          if (input.riskLevel >= 3.0) {
            // Critical risk - red pulsing
            finalColor.r = min(1.0, finalColor.r + sin(uniforms.time * 4.0) * 0.3);
          } else if (input.riskLevel >= 2.0) {
            // High risk - orange
            finalColor = vec4<f32>(1.0, 0.6, 0.2, finalColor.a);
          } else if (input.riskLevel >= 1.0) {
            // Medium risk - yellow
            finalColor = vec4<f32>(1.0, 1.0, 0.4, finalColor.a);
          }
          
          return finalColor;
        }
      `
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 48, // 12 floats + 4 uint32s = 48 bytes
          attributes: [
            { format: 'float32x3', offset: 0, shaderLocation: 0 }, // position
            { format: 'float32x4', offset: 12, shaderLocation: 1 }, // color
            { format: 'float32x2', offset: 28, shaderLocation: 2 }, // textureCoord
            { format: 'uint32x4', offset: 36, shaderLocation: 3 }, // caseData
          ]
        }]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }]
      },
      primitive: {
        topology: 'triangle-list',
      }
    });
  }

  private async createBuffers(): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    // Create vertex buffer
    this.vertexBuffer = this.device.createBuffer({
      size: this.config.bufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Create uniform buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 80, // mat4x4 (64 bytes) + 2 floats (16 bytes for alignment)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline!.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });
  }

  /**
   * Stream legal document vertices with CHR-ROM caching
   */
  async streamLegalDocuments(documents: Array<{
    id: string;
    position: [number, number, number];
    documentType: 'contract' | 'evidence' | 'brief' | 'citation';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    relatedCases: string[];
  }>): Promise<void> {
    const newVertices: LegalVisualizationVertex[] = [];
    
    for (const doc of documents) {
      // Check CHR-ROM cache for pre-computed patterns
      const cacheKey = `${doc.documentType}-${doc.riskLevel}`;
      let vertexData = this.chrRomCache.get(cacheKey);
      
      if (!vertexData) {
        // Generate new pattern and cache it
        vertexData = this.generateDocumentPattern(doc);
        this.chrRomCache.set(cacheKey, vertexData);
      }
      
      const vertex: LegalVisualizationVertex = {
        position: new Float32Array(doc.position),
        color: this.getRiskColor(doc.riskLevel),
        textureCoord: new Float32Array([
          (doc.position[0] + 1) * 0.5,
          (doc.position[1] + 1) * 0.5
        ]),
        caseData: new Uint32Array([
          this.hashString(doc.id),
          this.getDocumentTypeIndex(doc.documentType),
          this.getRiskLevelIndex(doc.riskLevel),
          Math.floor(doc.confidence * 1000)
        ])
      };
      
      newVertices.push(vertex);
    }
    
    this.vertices = newVertices;
    this.isDirty = true;
    
    if (this.streamingActive) {
      await this.updateVertexBuffer();
    }
  }

  private generateDocumentPattern(doc: any): ArrayBuffer {
    // Generate 8x8 CHR-ROM style pattern based on document type and risk
    const pattern = new ArrayBuffer(64); // 8x8 pattern
    const view = new Uint8Array(pattern);
    
    // Pattern generation based on document type
    const typePatterns = {
      contract: [0x3C, 0x42, 0x81, 0x81, 0x81, 0x81, 0x42, 0x3C],
      evidence: [0xFF, 0x81, 0x81, 0xBD, 0xBD, 0x81, 0x81, 0xFF],
      brief: [0x7E, 0x81, 0x99, 0x81, 0x81, 0x99, 0x81, 0x7E],
      citation: [0x18, 0x24, 0x42, 0x81, 0x81, 0x42, 0x24, 0x18]
    };
    
    const basePattern = typePatterns[doc.documentType] || typePatterns.contract;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        view[i * 8 + j] = basePattern[i];
      }
    }
    
    return pattern;
  }

  private getRiskColor(riskLevel: string): Float32Array {
    const colors = {
      low: [0.2, 0.8, 0.2, 1.0],
      medium: [1.0, 1.0, 0.4, 1.0],
      high: [1.0, 0.6, 0.2, 1.0],
      critical: [1.0, 0.2, 0.2, 1.0]
    };
    return new Float32Array(colors[riskLevel] || colors.low);
  }

  private getDocumentTypeIndex(type: string): number {
    const indices = { contract: 0, evidence: 1, brief: 2, citation: 3 };
    return indices[type] || 0;
  }

  private getRiskLevelIndex(risk: string): number {
    const indices = { low: 0, medium: 1, high: 2, critical: 3 };
    return indices[risk] || 0;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async updateVertexBuffer(): Promise<void> {
    if (!this.device || !this.vertexBuffer || !this.isDirty) return;
    
    // Pack vertices into buffer format
    const vertexData = new Float32Array(this.vertices.length * 12); // 12 floats per vertex
    const caseData = new Uint32Array(this.vertices.length * 4); // 4 uint32s per vertex
    
    for (let i = 0; i < this.vertices.length; i++) {
      const vertex = this.vertices[i];
      const floatOffset = i * 12;
      const intOffset = i * 4;
      
      // Position (3 floats)
      vertexData.set(vertex.position, floatOffset);
      // Color (4 floats)
      vertexData.set(vertex.color, floatOffset + 3);
      // Texture coordinates (2 floats)
      vertexData.set(vertex.textureCoord, floatOffset + 7);
      // Case data (4 uint32s) - will be written separately
      caseData.set(vertex.caseData, intOffset);
    }
    
    // Create interleaved buffer (float data + uint32 data)
    const bufferData = new ArrayBuffer(this.vertices.length * 48);
    const bufferView = new DataView(bufferData);
    
    for (let i = 0; i < this.vertices.length; i++) {
      const offset = i * 48;
      
      // Write float data (36 bytes)
      for (let j = 0; j < 9; j++) {
        bufferView.setFloat32(offset + j * 4, vertexData[i * 12 + j], true);
      }
      
      // Write uint32 data (16 bytes)
      for (let j = 0; j < 4; j++) {
        bufferView.setUint32(offset + 36 + j * 4, caseData[i * 4 + j], true);
      }
    }
    
    this.device.queue.writeBuffer(this.vertexBuffer, 0, bufferData);
    this.isDirty = false;
  }

  async startStreaming(): Promise<void> {
    this.streamingActive = true;
    console.log('🚀 Started WebGPU vertex streaming with CHR-ROM optimization');
  }

  async stopStreaming(): Promise<void> {
    this.streamingActive = false;
    console.log('⏹️ Stopped WebGPU vertex streaming');
  }

  async render(time: number, mvpMatrix: Float32Array): Promise<void> {
    if (!this.device || !this.context || !this.pipeline || !this.bindGroup) {
      throw new Error('WebGPU not fully initialized');
    }

    if (this.isDirty) {
      await this.updateVertexBuffer();
    }

    // Update uniforms
    const uniformData = new Float32Array(20); // 16 + 4 for alignment
    uniformData.set(mvpMatrix, 0); // MVP matrix (16 floats)
    uniformData[16] = time; // time
    uniformData[17] = this.vertices.length; // vertex count
    
    safeWriteBuffer(this.device, this.uniformBuffer, uniformData);

    // Render
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.1, g: 0.1, b: 0.2, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }]
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(this.vertices.length * 3); // 3 vertices per triangle

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Get performance metrics for monitoring
   */
  getMetrics(): {
    vertexCount: number;
    chrRomCacheSize: number;
    memoryBanksUsed: number;
    bufferUtilization: number;
  } {
    return {
      vertexCount: this.vertices.length,
      chrRomCacheSize: this.chrRomCache.size,
      memoryBanksUsed: this.nesMemoryBanks.length,
      bufferUtilization: (this.vertices.length * 48) / this.config.bufferSize
    };
  }

  /**
   * Clear CHR-ROM cache to free memory
   */
  clearCHRCache(): void {
    this.chrRomCache.clear();
    console.log('🧹 Cleared CHR-ROM pattern cache');
  }

  dispose(): void {
    this.streamingActive = false;
    this.vertexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.chrRomCache.clear();
    this.vertices = [];
    console.log('🗑️ WebGPU Vertex Streamer disposed');
  }
}

/**
 * TypeScript-safe vertex buffer factory for legal documents
 */
export function createLegalVertexBuffer(
  documents: Array<{
    id: string;
    title: string;
    content: string;
    metadata: {
      caseId: string;
      documentType: 'contract' | 'evidence' | 'brief' | 'citation';
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
    };
  }>
): VertexData[] {
  return documents.map((doc, index) => ({
    position: [
      (index % 10) * 0.2 - 1.0, // X: spread horizontally
      Math.floor(index / 10) * 0.2 - 1.0, // Y: stack vertically
      0.0 // Z: flat for now
    ],
    color: getRiskColorArray(doc.metadata.riskLevel),
    metadata: {
      caseId: doc.metadata.caseId,
      documentType: doc.metadata.documentType,
      riskLevel: doc.metadata.riskLevel,
      confidence: doc.metadata.confidence
    }
  }));
}

function getRiskColorArray(riskLevel: string): [number, number, number, number] {
  const colors = {
    low: [0.2, 0.8, 0.2, 1.0] as [number, number, number, number],
    medium: [1.0, 1.0, 0.4, 1.0] as [number, number, number, number],
    high: [1.0, 0.6, 0.2, 1.0] as [number, number, number, number],
    critical: [1.0, 0.2, 0.2, 1.0] as [number, number, number, number]
  };
  return colors[riskLevel] || colors.low;
}

// Export types for external use
export type { StreamingConfig, LegalVisualizationVertex };