// WebGPU Browser Diagnostics and Compatibility Check
// Provides detailed WebGPU support detection and troubleshooting

export interface WebGPUDiagnostics {
  isSupported: boolean;
  browserSupport: {
    hasNavigatorGPU: boolean;
    browserName: string;
    browserVersion: string;
    isChrome: boolean;
    isFirefox: boolean;
    isEdge: boolean;
    isSafari: boolean;
  };
  adapterInfo?: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
  deviceInfo?: {
    features: string[];
    limits: Record<string, number>;
    maxBufferSize: number;
    maxComputeWorkgroupSize: number;
  };
  errors: string[];
  recommendations: string[];
}

export class WebGPUDiagnosticsService {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;

  async runDiagnostics(): Promise<WebGPUDiagnostics> {
    const diagnostics: WebGPUDiagnostics = {
      isSupported: false,
      browserSupport: this.getBrowserSupport(),
      errors: [],
      recommendations: []
    };

    try {
      // Step 1: Check navigator.gpu availability
      if (!diagnostics.browserSupport.hasNavigatorGPU) {
        diagnostics.errors.push('navigator.gpu is not available');
        this.addBrowserRecommendations(diagnostics);
        return diagnostics;
      }

      // Step 2: Try to request adapter
      await this.testAdapterRequest(diagnostics);

      // Step 3: Try to request device if adapter succeeded
      if (this.adapter) {
        await this.testDeviceRequest(diagnostics);
      }

      // Step 4: Test basic compute functionality
      if (this.device) {
        await this.testComputeCapability(diagnostics);
        diagnostics.isSupported = true;
      }

    } catch (error: any) {
      diagnostics.errors.push(`Diagnostics failed: ${error.message}`);
    }

    return diagnostics;
  }

  private getBrowserSupport() {
    const hasNavigatorGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (isChrome) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isFirefox) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isEdge) {
      browserName = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (isSafari) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    return {
      hasNavigatorGPU,
      browserName,
      browserVersion,
      isChrome,
      isFirefox,
      isEdge,
      isSafari
    };
  }

  private async testAdapterRequest(diagnostics: WebGPUDiagnostics): Promise<void> {
    try {
      console.log('🔍 Testing WebGPU adapter request...');
      
      this.adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        diagnostics.errors.push('WebGPU adapter request returned null');
        diagnostics.recommendations.push('Your GPU may not support WebGPU or drivers need updating');
        return;
      }

      // Get adapter info if available
      try {
        const info = await this.adapter.requestAdapterInfo();
        diagnostics.adapterInfo = {
          vendor: info.vendor || 'Unknown',
          architecture: info.architecture || 'Unknown',  
          device: info.device || 'Unknown',
          description: info.description || 'Unknown'
        };
        console.log('✅ WebGPU adapter info:', diagnostics.adapterInfo);
      } catch (error: any) {
        console.warn('Could not get adapter info:', error.message);
        diagnostics.adapterInfo = {
          vendor: 'Unknown',
          architecture: 'Unknown',
          device: 'Unknown', 
          description: 'Unknown'
        };
      }

    } catch (error: any) {
      diagnostics.errors.push(`Adapter request failed: ${error.message}`);
      console.error('❌ WebGPU adapter request failed:', error);
    }
  }

  private async testDeviceRequest(diagnostics: WebGPUDiagnostics): Promise<void> {
    if (!this.adapter) return;

    try {
      console.log('🔍 Testing WebGPU device request...');

      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize || 134217728,
          maxComputeWorkgroupStorageSize: this.adapter.limits.maxComputeWorkgroupStorageSize || 16384,
          maxComputeInvocationsPerWorkgroup: this.adapter.limits.maxComputeInvocationsPerWorkgroup || 256,
        }
      });

      if (!this.device) {
        diagnostics.errors.push('WebGPU device request returned null');
        return;
      }

      // Collect device info
      diagnostics.deviceInfo = {
        features: Array.from(this.device.features),
        limits: Object.fromEntries(
          Object.entries(this.device.limits).map(([key, value]) => [key, Number(value)])
        ),
        maxBufferSize: Number(this.device.limits.maxBufferSize),
        maxComputeWorkgroupSize: Number(this.device.limits.maxComputeWorkgroupSize)
      };

      console.log('✅ WebGPU device created successfully');
      console.log('📊 Device features:', diagnostics.deviceInfo.features);
      console.log('📊 Device limits:', diagnostics.deviceInfo.limits);

    } catch (error: any) {
      diagnostics.errors.push(`Device request failed: ${error.message}`);
      console.error('❌ WebGPU device request failed:', error);
    }
  }

  private async testComputeCapability(diagnostics: WebGPUDiagnostics): Promise<void> {
    if (!this.device) return;

    try {
      console.log('🔍 Testing WebGPU compute capability...');

      // Create a simple compute shader for testing
      const shaderCode = `
        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          // Simple test - does nothing but validates compute pipeline
        }
      `;

      const module = this.device.createShaderModule({ code: shaderCode });
      
      const pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module,
          entryPoint: 'main'
        }
      });

      // Create a simple command encoder to test
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.dispatchWorkgroups(1);
      pass.end();
      
      this.device.queue.submit([encoder.finish()]);

      console.log('✅ WebGPU compute test passed');

    } catch (error: any) {
      diagnostics.errors.push(`Compute capability test failed: ${error.message}`);
      console.error('❌ WebGPU compute test failed:', error);
    }
  }

  private addBrowserRecommendations(diagnostics: WebGPUDiagnostics): void {
    const { browserName, browserVersion, isChrome, isFirefox } = diagnostics.browserSupport;

    if (isChrome) {
      const version = parseInt(browserVersion);
      if (version < 113) {
        diagnostics.recommendations.push(`Chrome ${browserVersion} detected. WebGPU requires Chrome 113+. Please update your browser.`);
      } else {
        diagnostics.recommendations.push('Chrome supports WebGPU. Try enabling chrome://flags/#enable-unsafe-webgpu flag if needed.');
      }
    } else if (isFirefox) {
      diagnostics.recommendations.push('Firefox has experimental WebGPU support. Enable dom.webgpu.enabled in about:config');
    } else {
      diagnostics.recommendations.push(`${browserName} may have limited WebGPU support. Try Chrome 113+ or Firefox with WebGPU enabled.`);
    }

    diagnostics.recommendations.push('Ensure you are using HTTPS or localhost (WebGPU requires secure context)');
    diagnostics.recommendations.push('Update your GPU drivers to the latest version');
  }

  async cleanup(): Promise<void> {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
  }
}

// Utility function for quick diagnostics
export async function diagnoseWebGPU(): Promise<WebGPUDiagnostics> {
  const service = new WebGPUDiagnosticsService();
  const results = await service.runDiagnostics();
  await service.cleanup();
  return results;
}

// Browser compatibility check
export function checkBrowserCompatibility(): { compatible: boolean; message: string } {
  if (typeof navigator === 'undefined') {
    return { compatible: false, message: 'Running in server-side environment' };
  }

  if (!('gpu' in navigator)) {
    return { compatible: false, message: 'WebGPU not supported in this browser' };
  }

  const userAgent = navigator.userAgent;
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : false;

  if (!isSecureContext) {
    return { compatible: false, message: 'WebGPU requires HTTPS or localhost (secure context)' };
  }

  if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    if (version >= 113) {
      return { compatible: true, message: `Chrome ${version} supports WebGPU` };
    } else {
      return { compatible: false, message: `Chrome ${version} detected. WebGPU requires Chrome 113+` };
    }
  }

  if (/Firefox/.test(userAgent)) {
    return { compatible: true, message: 'Firefox with experimental WebGPU support detected' };
  }

  return { compatible: false, message: 'Browser may have limited WebGPU support' };
}