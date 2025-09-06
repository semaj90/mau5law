/**
 * Enhanced WebAssembly Type Definitions for GPU Integration
 * Fixes GPU device to ImportValue conversion issues
 */

// Enhanced WebAssembly ImportValue to handle GPU devices
export interface EnhancedImportValue extends WebAssembly.ImportValue {
  // GPU device can be passed as import value
  gpu?: GPUDevice;
  // Canvas context for WebGL integration
  gl?: WebGLRenderingContext | WebGL2RenderingContext;
  // Memory sharing for GPU operations
  memory?: WebAssembly.Memory;
}

// GPU device to ImportValue conversion utilities
export const webAssemblyGPUUtils = {
  // Safe conversion of GPUDevice to ImportValue
  convertGPUDeviceToImportValue: (device: GPUDevice): WebAssembly.ImportValue => {
    // Instead of converting directly, create a function that provides access
    return (() => device) as any;
  },

  // Create WebAssembly import object with GPU support
  createImportsWithGPU: (device: GPUDevice, additionalImports: any = {}): WebAssembly.Imports => {
    return {
      env: {
        memory: new WebAssembly.Memory({ initial: 10, maximum: 100 }),
        getGPUDevice: () => device,
        ...additionalImports
      },
      ...additionalImports
    };
  },

  // Type assertion helper for GPU device conversion
  assertGPUDevice: (device: unknown): device is GPUDevice => {
    return device !== null &&
      typeof device === 'object' &&
           'createBuffer' in (device as any);
  },

  // Safe type conversion for analysis results
  convertAnalysisResult: (analysis: unknown): any => {
    if (analysis && typeof analysis === 'object') {
      return {
        summary: (analysis as any).summary || 'No summary available',
        keyTerms: (analysis as any).keyTerms || [],
        entities: (analysis as any).entities || [],
        risks: (analysis as any).risks || [],
        recommendations: (analysis as any).recommendations || [],
        confidence: (analysis as any).confidence || 0,
        processingTime: (analysis as any).processingTime || 0,
        method: (analysis as any).method || 'unknown',
        ...analysis
      };
    }

    return {
      summary: 'Analysis failed',
      keyTerms: [],
      entities: [],
      risks: [],
      recommendations: [],
      confidence: 0,
      processingTime: 0,
      method: 'error'
    };
  }
};

// Module declaration for WebAssembly enhancements
declare module 'webassembly' {
  interface ImportValue {
    gpu?: GPUDevice;
  }
}

// Global type augmentations for WebAssembly
declare global {
  namespace WebAssembly {
    interface ImportValue {
      // Allow GPU devices as import values through function wrapper
      (): GPUDevice;
    }

    interface Imports {
      env?: {
        memory?: WebAssembly.Memory;
        getGPUDevice?: () => GPUDevice;
        [key: string]: any;
      };
      gpu?: {
        device?: GPUDevice;
        [key: string]: any;
      };
      [key: string]: any;
    }
  }

  // Enhanced GPU device interface
  interface GPUDevice {
    // Ensure destroy method is available
    destroy(): void;
    // Event target methods
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
    dispatchEvent(event: any): boolean;
  }
}

export { webAssemblyGPUUtils };