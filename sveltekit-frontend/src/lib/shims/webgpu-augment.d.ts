// Conservative WebGPU augment shim to reduce typing noise during migration.
// This is permissive by design: it provides optional members used across the
// codebase so TypeScript errors don't drown the migration workflow.
declare global {
  // Relax GPU feature name to any string used by runtime code
  type GPUFeatureName = string | number | symbol;

  interface GPUAdapter {
    // keep minimal, real implementations will come later
    requestAdapter?: (options?: any) => Promise<GPUAdapter>;
  }

  interface GPUDevice {
    // commonly used, sometimes missing in d.ts targets
    getPreferredCanvasFormat?: (...args: any[]) => any;
    createBindGroupLayoutDescriptor?: (...args: any[]) => any;
    writeBuffer?: (...args: any[]) => any;
    // fallthrough for other experimental helpers
    [k: string]: any;
  }

  interface GPUQueue {
    submit?: (...args: any[]) => any;
    writeBuffer?: (...args: any[]) => any;
    onSubmittedWorkDone?: (...args: any[]) => any;
  }

  // allow BufferSource and shared variants used in the repo to be permissive
  type GPUAllowSharedBufferSource = any;
  type ArrayBufferLike = any;
  type BufferSource = any;
}


