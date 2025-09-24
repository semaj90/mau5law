/**
 * WebGPU Type Extensions for Legal AI Platform
 * Modern TypeScript definitions for WebGPU + SvelteKit 2 integration
 */

// Ensure WebGPU types are available globally
/// <reference types="@webgpu/types" />

// Extended WebGPU types for better TypeScript support
declare global {
  interface Navigator {
    gpu?: GPU;
  }
  
  interface Window {
    webgpu?: {
      adapter?: GPUAdapter;
      device?: GPUDevice;
      context?: GPUCanvasContext;
    };
  }
  
  interface HTMLCanvasElement {
    getContext(contextId: 'webgpu'): GPUCanvasContext | null;
  }
}

// Buffer compatibility types
export type GPUBufferCompatible = ArrayBuffer | ArrayBufferView | SharedArrayBuffer;
export type TypedArrayTypes = Float32Array | Uint32Array | Uint16Array | Int8Array | Uint8Array;

// Enhanced buffer creation options
export interface ExtendedGPUBufferDescriptor extends GPUBufferDescriptor {
  data?: GPUBufferCompatible;
  label?: string;
}

// Legal AI specific WebGPU interfaces
export interface LegalWebGPUContext {
  device: GPUDevice;
  adapter: GPUAdapter;
  context: GPUCanvasContext;
  
  // Legal document processing pipelines
  documentProcessingPipeline: GPUComputePipeline;
  embeddingNormalizationPipeline: GPUComputePipeline;
  similaritySearchPipeline: GPUComputePipeline;
  visualizationPipeline: GPURenderPipeline;
}

// Buffer management for legal documents
export interface LegalDocumentGPUBuffers {
  embeddings: GPUBuffer;
  metadata: GPUBuffer;
  colors: GPUBuffer;
  indices: GPUBuffer;
  uniforms: GPUBuffer;
}

// Shader module definitions
export interface LegalAIShaderModules {
  documentVertex: GPUShaderModule;
  documentFragment: GPUShaderModule;
  embeddingCompute: GPUShaderModule;
  similarityCompute: GPUShaderModule;
  visualizationVertex: GPUShaderModule;
  visualizationFragment: GPUShaderModule;
}

// WebGPU compute pipeline for legal AI operations
export interface LegalComputePipelineDescriptor {
  type: 'embedding_normalization' | 'similarity_search' | 'document_clustering' | 'risk_assessment';
  shaderModule: GPUShaderModule;
  workgroupSize: [number, number, number];
  bufferLayout: GPUBufferBindingLayout[];
}

// Render pipeline for legal document visualization
export interface LegalRenderPipelineDescriptor {
  vertex: {
    module: GPUShaderModule;
    entryPoint: string;
    buffers: GPUVertexBufferLayout[];
  };
  fragment: {
    module: GPUShaderModule;
    entryPoint: string;
    targets: GPUColorTargetState[];
  };
  primitive: GPUPrimitiveState;
  depthStencil?: GPUDepthStencilState;
}

// WebGPU performance metrics
export interface WebGPUPerformanceMetrics {
  renderTime: number;
  computeTime: number;
  memoryUsage: {
    buffers: number;
    textures: number;
    total: number;
  };
  pipelineStats: {
    drawCalls: number;
    computeDispatches: number;
    bufferUpdates: number;
  };
}

// Error handling for WebGPU operations
export class WebGPUError extends Error {
  constructor(
    message: string,
    public code: 'DEVICE_LOST' | 'OUT_OF_MEMORY' | 'VALIDATION_ERROR' | 'OPERATION_ERROR',
    public details?: {
      pipeline?: string;
      buffer?: string;
      operation?: string;
    }
  ) {
    super(message);
    this.name = 'WebGPUError';
  }
}

// Texture streaming for legal documents
export interface LegalDocumentTexture {
  texture: GPUTexture;
  view: GPUTextureView;
  sampler: GPUSampler;
  format: GPUTextureFormat;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  mipLevels: number;
}

// CHR-ROM pattern cache integration
export interface CHRROMGPUPattern {
  patternId: string;
  texture: GPUTexture;
  buffer: GPUBuffer;
  metadata: {
    bankId: number;
    tileIndex: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    documentType: string;
  };
}

// WebGPU utility functions type definitions
export interface WebGPUUtilities {
  createBuffer(device: GPUDevice, data: GPUBufferCompatible, usage: GPUBufferUsageFlags): GPUBuffer;
  createTexture(device: GPUDevice, descriptor: GPUTextureDescriptor): GPUTexture;
  createShaderModule(device: GPUDevice, code: string, label?: string): GPUShaderModule;
  createRenderPipeline(device: GPUDevice, descriptor: LegalRenderPipelineDescriptor): GPURenderPipeline;
  createComputePipeline(device: GPUDevice, descriptor: LegalComputePipelineDescriptor): GPUComputePipeline;
}

// Buffer streaming for large datasets
export interface BufferStreamer {
  streamBuffer(device: GPUDevice, buffer: GPUBuffer, data: AsyncIterable<GPUBufferCompatible>): Promise<void>;
  streamTexture(device: GPUDevice, texture: GPUTexture, data: AsyncIterable<ImageData>): Promise<void>;
}

// Legal document vertex structure for WebGPU
export interface LegalDocumentVertex {
  position: [number, number, number];
  color: [number, number, number, number];
  texCoord: [number, number];
  documentId: number;
  riskLevel: number; // 0=low, 1=medium, 2=high, 3=critical
  confidence: number; // 0.0-1.0
}

// WebGPU command encoder utilities
export interface LegalCommandEncoder {
  encoder: GPUCommandEncoder;
  renderPass: GPURenderPassEncoder | null;
  computePass: GPUComputePassEncoder | null;
  
  beginDocumentRenderPass(renderTarget: GPUTextureView): void;
  beginDocumentComputePass(): void;
  endCurrentPass(): void;
  submitCommands(): void;
}

// Animation and interaction state for legal visualizations
export interface LegalVisualizationState {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
    fov: number;
    near: number;
    far: number;
  };
  lighting: {
    ambient: [number, number, number];
    directional: {
      direction: [number, number, number];
      color: [number, number, number];
      intensity: number;
    };
  };
  interaction: {
    selectedDocument: string | null;
    hoveredDocument: string | null;
    filterLevel: 'all' | 'low' | 'medium' | 'high' | 'critical';
  };
}

// WebGPU resource management
export interface WebGPUResourceManager {
  buffers: Map<string, GPUBuffer>;
  textures: Map<string, GPUTexture>;
  pipelines: Map<string, GPURenderPipeline | GPUComputePipeline>;
  
  createResource<T extends GPUBuffer | GPUTexture>(id: string, creator: () => T): T;
  getResource<T extends GPUBuffer | GPUTexture>(id: string): T | undefined;
  disposeResource(id: string): void;
  disposeAll(): void;
}

// Export utility type for buffer validation
export type ValidateBuffer<T> = T extends GPUBufferCompatible ? T : never;

// Export all types
export default {};