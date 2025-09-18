// Test file for unified runtime compilation
// Mock WebGPU types for testing
declare global {
  interface GPUAdapter {}
  interface GPUDevice {}
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<GPUAdapter | null>;
    };
  }
}

// Mock SvelteKit environment
const mockEnvironment = { browser: true };

import {
  unifiedRuntime,
  type InferenceRequest,
} from './src/lib/webgpu/unified-runtime-abstraction.js';

async function testUnifiedRuntime() {
  console.log('Testing unified runtime...');

  const request: InferenceRequest = {
    model: 'gemma3:270m',
    prompt: 'Hello, this is a test prompt',
    useCase: 'chat',
    useCHRROMCache: true,
  };

  try {
    await unifiedRuntime.initialize();
    const capabilities = unifiedRuntime.getCapabilities();
    console.log('Capabilities:', capabilities);

    const recommended = unifiedRuntime.getRecommendedRuntime(request);
    console.log('Recommended runtime:', recommended);

    console.log('✅ Unified runtime compiled successfully!');
  } catch (error) {
    console.error('❌ Runtime test failed:', error);
  }
}

export { testUnifiedRuntime };
