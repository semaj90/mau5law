/**
 * WebAssembly and LLVM Integration Types
 * Type definitions for WASM compilation and execution
 */

// WebGPU type declarations for environments without native WebGPU support
declare global {
  interface GPUDevice {}
  interface GPUCommandQueue {}
  interface GPUAdapter {}
  interface GPUShaderModule {}
  interface GPUComputePipeline {}
  interface GPUBindGroupLayout {}
  interface GPUBuffer {}
}

// LLVM Compilation Options
export interface LLVMCompileOptions {
  moduleId: string;
  optimizationLevel: '-O0' | '-O1' | '-O2' | '-O3' | '-Os' | '-Oz';
  features: string[];
  memorySize: number;
  target?: string;
  sysroot?: string;
  includePaths?: string[];
  defines?: Record<string, string>;
  linkFlags?: string[];
}

// Compilation Result
export interface CompilationResult {
  success: boolean;
  wasmBinary: ArrayBuffer | null;
  exports: string[];
  compileTime: number;
  memoryUsage: number;
  optimizations: string[];
  warnings: string[];
  error: string | null;
}

// WebAssembly Module Interface
export interface WASMModule {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
  memory: WebAssembly.Memory;
  exports: Record<string, any>;
}

// Legal-specific WASM configurations
export interface WASMLLMConfig {
  modelPath: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  topK?: number;
  contextLength?: number;
  memoryPoolSize?: number;
  useGPUAcceleration?: boolean;
  legalDomainOptimizations?: boolean;
}

// WASM LLM Response
export interface WASMLLMResponse {
  text: string;
  tokens: number;
  processingTimeMs: number;
  confidence: number;
  metadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    citationCount?: number;
    statuteReferences?: number;
    caseReferences?: number;
    jurisdictionMentions?: number;
  };
}

// WebGPU Device Information
export interface WebGPUDevice {
  device: GPUDevice;
  queue: GPUCommandQueue;
  adapter: GPUAdapter;
  features: string[];
  limits: Record<string, number>;
  isAvailable: boolean;
}

// WebGPU Compute Shader
export interface WebGPUComputeShader {
  module: GPUShaderModule;
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

// Vector Operation Types
export interface WebGPUVectorOperation {
  operationType: 'embedding' | 'similarity' | 'search' | 'clustering';
  inputVectors: Float32Array[];
  outputSize: number;
  parameters?: {
    dimensions?: number;
    threshold?: number;
    algorithm?: string;
    batchSize?: number;
  };
}

// Performance Metrics
export interface WASMPerformanceMetrics {
  compileTimeMs: number;
  loadTimeMs: number;
  executionTimeMs: number;
  memoryUsageBytes: number;
  throughputOpsPerSecond?: number;
  cacheHitRate?: number;
}

// Legal Document Processing
export interface LegalDocumentProcessor {
  id: string;
  type: 'contract' | 'brief' | 'evidence' | 'statute' | 'case_law';
  wasmModule: string;
  requiredMemoryMB: number;
  supportedFormats: string[];
  capabilities: {
    textExtraction: boolean;
    citationExtraction: boolean;
    entityRecognition: boolean;
    riskAssessment: boolean;
    complianceCheck: boolean;
  };
}

// WASM Memory Management
export interface WASMMemoryLayout {
  heapBase: number;
  heapSize: number;
  stackBase: number;
  stackSize: number;
  dataBase: number;
  dataSize: number;
  globalBase: number;
  globalSize: number;
  memoryPages: number;
  maxMemoryPages?: number;
}

// Legal AI WASM Functions
export interface LegalAIWASMFunctions {
  // Text Processing
  processLegalText: (text: string, options?: any) => Promise<string>;
  extractCitations: (text: string) => Promise<string[]>;
  analyzePrecedents: (text: string, jurisdiction?: string) => Promise<any>;

  // Document Analysis
  parseContract: (documentBytes: Uint8Array) => Promise<any>;
  assessRisk: (contractData: any) => Promise<number>;
  identifyObligations: (contractText: string) => Promise<any[]>;

  // Vector Operations
  computeEmbedding: (inputVector: Float32Array, dimensions: number) => Promise<Float32Array>;
  calculateSimilarity: (vector1: Float32Array, vector2: Float32Array) => Promise<number>;
  buildIndex: (vectors: Float32Array[], metadata: any[]) => Promise<any>;

  // Search Functions
  semanticSearch: (query: string, corpus: string[], topK?: number) => Promise<any[]>;
  caseSearch: (facts: string, jurisdiction?: string) => Promise<any[]>;
  statuteSearch: (query: string, jurisdiction?: string) => Promise<any[]>;
}

// WASM Error Types
export type WASMErrorType =
  | 'compilation_failed'
  | 'instantiation_failed'
  | 'runtime_error'
  | 'memory_error'
  | 'type_error'
  | 'import_error'
  | 'export_error';

export interface WASMError extends Error {
  type: WASMErrorType;
  moduleId?: string;
  functionName?: string;
  wasmTrace?: string;
  nativeTrace?: string;
}

// WASM Resource Limits
export interface WASMResourceLimits {
  maxMemoryPages: number;
  maxTableElements: number;
  maxFunctions: number;
  maxGlobals: number;
  maxImports: number;
  maxExports: number;
  maxDataSegments: number;
  maxElementSegments: number;
  executionTimeoutMs: number;
}

// Legal-specific WASM Configuration
export interface LegalWASMConfig {
  enableTextProcessing: boolean;
  enableDocumentParsing: boolean;
  enableVectorOperations: boolean;
  enableRiskAssessment: boolean;
  enableComplianceChecking: boolean;

  jurisdiction: string[];
  practiceAreas: string[];
  confidentialityLevel: 'public' | 'confidential' | 'restricted';

  performance: {
    optimizationLevel: number;
    memoryPoolSizeMB: number;
    maxConcurrentOperations: number;
    cacheEnabled: boolean;
  };

  security: {
    sandboxEnabled: boolean;
    allowFileAccess: boolean;
    allowNetworkAccess: boolean;
    maxExecutionTime: number;
  };
}

// WASM Service Interface
export interface WASMService {
  initialize(config?: any): Promise<boolean>;
  compile(sources: any[], options: LLVMCompileOptions): Promise<CompilationResult>;
  instantiate(wasmBinary: ArrayBuffer, imports?: any): Promise<WASMModule>;
  execute(moduleId: string, functionName: string, args: any[]): Promise<any>;
  getPerformanceMetrics(): WASMPerformanceMetrics;
  dispose(): Promise<void>;
}

// SvelteKit 2 WASM Polyfill Types
export interface SvelteKitWASMPolyfill {
  isSupported(): boolean;
  polyfillWebAssembly(): void;
  polyfillWebGPU(): void;
  polyfillLoki(): void;
  setupServiceWorkerIntegration(): Promise<void>;
}

// Loki.js Integration Types
export interface LokiWASMCache {
  collection: any; // Loki collection
  wasmModules: Map<string, WASMModule>;
  queryCache: Map<string, any>;
  performanceCache: Map<string, WASMPerformanceMetrics>;
}

// Types are already exported above via export interface/export type declarations