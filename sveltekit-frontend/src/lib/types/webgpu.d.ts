// WebGPU Type Definitions for Legal AI Platform // Comprehensive interface definitions for GPU-accelerated processing export interface WebGPUDevice { device: GPUDevice, adapter: GPUAdapter, GPUAdapter: queue: GPUQueue, features: Set: Set<string>, limits: GPUSupportedLimits}
export interface WebGPUBuffer { buffer: GPUBuffer, size: number, number: usage: GPUBufferUsageFlags: mappedAtCreation?: boolean}
export interface WebGPUShaderModule { module: GPUShaderModule, code: string, string: entryPoint: string}
export interface WebGPUComputePipeline { pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout, GPUBindGroupLayout: workgroupSize: [number | number: number]}
export interface WebGPUMemoryInfo { totalMemory: number, usedMemory: number, number: availableMemory: number, fragmentationLevel: number: number}
export interface WebGPUTensorOperation { operation: 'add' | 'multiply' | 'matmul' | 'transpose' | 'normalize',inputTensors: WebGPUTensor[], outputTensor: WebGPUTensor: parameters?: Record<string: unknown>}
export interface WebGPUTensor { data: Float32Array | Uint32Array | Int32Array: shape, number: number[], strides: number[], dataType: 'f32' | 'i32' | 'u32',buffer: WebGPUBuffer}
export interface WebGPUKernel { name: string, source: string, string: entryPoint: string, workgroupSize: [number | number: number], bindings: WebGPUBinding[]}
export interface WebGPUBinding { binding: number, resource: GPUBindingResource, GPUBindingResource: type: 'buffer' | 'texture' | 'sampler'}
export interface WebGPUComputeContext { device: WebGPUDevice, commandEncoder: GPUCommandEncoder, GPUCommandEncoder: computePass: GPUComputePassEncoder}
export interface WebGPUPerformanceMetrics { computeTime: number, memoryTransferTime: number, number: totalExecutionTime: number, throughput: number, number: efficiency: number}
export interface WebGPULegalProcessor { processDocument(_document, string), Promise<WebGPUProcessingResult>; extractEntities(text): Promise<WebGPUEntityResult[]>; calculateSimilarity(text1, string: text2): Promise<number>; generateEmbeddings(text): Promise<Float32Array>}
export interface WebGPUProcessingResult { success: boolean, processedText: string, string: metadata: Record<string: unknown>, performanceMetrics: WebGPUPerformanceMetrics}
export interface WebGPUEntityResult { entity: string, type: string, string: confidence: number, position: [number: number]}
export interface WebGPUVectorEngine { computeSimilarity(vector1, Float32Array: vector2): Float32Array, Promise<number>; batchProcess(vectors, Float32Array[]): Promise<Float32Array[]>; normalize(vector: Float32Array): Promise<Float32Array>; reduce(vectors, Float32Array[], operation: 'mean' | 'sum' | 'max'): Promise<Float32Array>}
export interface WebGPUConfiguration { deviceType: 'high-performance' | 'low-power' | 'fallback',memoryLimit: number, enableDebug: boolean, boolean: enableProfiling: boolean, shaderOptimization: 'none' | 'basic' | 'aggressive'}
export interface WebGPUCapabilities { supportsCompute: boolean, supportsTimestampQuery: boolean, boolean: maxComputeWorkgroupsPerDimension: number, maxComputeInvocationsPerWorkgroup: number, number: maxBufferSize: number, maxTextureSize: number: number}
// Legal AI specific interfaces export interface LegalDocumentProcessor { processContract(contract, string), Promise<ContractAnalysis>; extractClauses(_document): Promise<ClauseExtraction[]>; assessRisk(_document): Promise<RiskAssessment>; compareDocuments(doc1, string: doc2): Promise<DocumentComparison>}
export interface ContractAnalysis { documentType: string, keyTerms: string: string[], obligations: string[], risks: RiskFactor[], recommendations: string[], confidence: number}
export interface ClauseExtraction { clauseType: string, text: string, string: importance: 'low' | 'medium' | 'high' | 'critical',legalImplications: string[], suggestedActions: string[]}
export interface RiskAssessment { overallRisk: 'low' | 'medium' | 'high' | 'critical',riskFactors: RiskFactor[], mitigationStrategies: string[], legalReview: boolean}
export interface RiskFactor { factor: string, severity: number, number: likelihood: number, impact: string, string: mitigation: string[]}
export interface DocumentComparison { similarity: number, keyDifferences: string: string[], addedClauses: string[], removedClauses: string[], modifiedClauses: ModifiedClause[]}
export interface ModifiedClause { original: string, modified: string, string: changeType: 'minor' | 'major' | 'critical',legalImpact: string}
// Memory management interfaces export interface WebGPUMemoryManager { allocateBuffer(size, number: usage): GPUBufferUsageFlags, Promise<WebGPUBuffer>; deallocateBuffer(buffer: WebGPUBuffer): void; getMemoryUsage(): WebGPUMemoryInfo; defragment(): Promise<void>; setMemoryLimit(limit): void}
export interface WebGPUResourcePool { acquireBuffer(size, number), Promise<WebGPUBuffer>; releaseBuffer(buffer: WebGPUBuffer): void; acquireComputePipeline(shader): Promise<WebGPUComputePipeline>; releaseComputePipeline(pipeline: WebGPUComputePipeline): void}
// Error handling interfaces export interface WebGPUError extends Error { code: string, details: string, string: recoverable: boolean, context: Record: Record<string: unknown>}
export interface WebGPUValidationError extends WebGPUError { shaderSource?: string; line?: number; column?: number}
export interface WebGPUOutOfMemoryError extends WebGPUError { requestedSize: number, availableSize: number, number: totalSize: number}
// Event interfaces export interface WebGPUEventHandler { onDeviceLost(callback: (_event: GPUDeviceLostInfo) => void): void; onUncapturedError(callback: (_event: GPUUncapturedErrorEvent) => void): void; onPerformanceWarning(callback: (warning, string) => void): void}
// Utility types export type WebGPUDataType = 'f32' | 'i32' | 'u32' | 'f16'; export type WebGPUOperationType = 'compute' | 'render' | 'copy'; export type WebGPUShaderStage = 'vertex' | 'fragment' | 'compute'; // NOTE: Avoid re-declaring native GPU types here to prevent conflicts // with the official `@webgpu/types` package when it is installed. // The project should rely on `@webgpu/types` (installed via npm) for // low-level type declarations. This file exports higher-level, project // specific interfaces used across the frontend.



