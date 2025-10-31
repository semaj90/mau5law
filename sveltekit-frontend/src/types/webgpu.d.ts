// Minimal WebGPU ambient types for the frontend to satisfy tsc checks.
// This file intentionally declares a small subset of names used in gpu-som-embeddings.ts
// and avoids conflicting with upstream full WebGPU definitions.

declare global {
  interface GPUBufferUsage {
    [key: string]: number;
  }
  interface GPUMapMode { READ: number }

  interface GPUAdapter {
    requestDevice(options?: any): Promise<GPUDevice>;
  }

  interface GPU {
    requestAdapter(options?: any): Promise<GPUAdapter | null>;
  }

  interface GPUQueue {
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer, dataOffset?: number, size?: number): void;
    submit(commandBuffers: any[]): void;
    onSubmittedWorkDone(): Promise<void>;
  }

  interface GPUDevice {
    queue: GPUQueue;
    createBuffer(descriptor: any): GPUBuffer;
    createShaderModule(descriptor: any): any;
    createComputePipeline(descriptor: any): GPUComputePipeline;
    createBindGroup(descriptor: any): any;
    createCommandEncoder(): any;
    requestAdapter?: any;
    destroy?(): void;
  }

  interface GPUBuffer {
    destroy(): void;
    // mapAsync and getMappedRange are present on mapped buffers returned by mapAsync
    mapAsync?(mode: number, offset?: number, size?: number): Promise<void>;
    getMappedRange?(): ArrayBuffer;
    unmap?(): void;
  }

  interface GPUComputePipeline {
    getBindGroupLayout(index: number): any;
  }

  interface Navigator {
    gpu?: GPU;
  }
}

export {};
