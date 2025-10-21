<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { Button, Card, CardContent, CardHeader, CardTitle, Alert } from '$lib/components/ui/enhanced-bits';
  import { LodCacheEngine } from '$lib/gpu/lod-cache-engine.js';
  // import { GpuVectorProcessor } from '$lib/gpu/GpuVectorProcessor.js'; // Temporarily disabled due to TypeScript compilation issues
  let log = $state('');
  let isRunning = $state(false);
  function append(msg: string) {
    log += msg + '\n';
  }
  async function runTest() {
    if (isRunning) return;
    isRunning = true;
    log = '';
    try {
      append('🚀 Starting WebGL2/WebGPU Acceleration Test...');
      append('📱 Browser: ' + navigator.userAgent.split.slice - join(' '));
      // Test WebGPU support
      if ('gpu' in navigator) {
        append('✅ WebGPU API detected');
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            append('✅ WebGPU adapter available');
            const device = await adapter.requestDevice();
            append('✅ WebGPU device created successfully');
            device.destroy();
          } else {
            append('❌ WebGPU adapter not available');
          }
        } catch (err) {
          append('❌ WebGPU error: ' + (err as Error).message);
        }
      } else {
        append('❌ WebGPU not supported');
      }
      // Test WebGL2 support
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        append('✅ WebGL2 context available');
        const ext = gl2.getExtension('EXT_transform_feedback');
        append(ext ? '✅ Transform feedback supported' : '❌ Transform feedback not available');
      } else {
        append('❌ WebGL2 not supported');
      }
      // Test WebGL1 fallback
      const gl1 = canvas.getContext('webgl');
      if (gl1) {
        append('✅ WebGL1 fallback available');
      } else {
        append('❌ WebGL1 not supported');
      }
      // Test WebAssembly
      if (typeof WebAssembly === 'object') {
        append('✅ WebAssembly supported');
        if (typeof SharedArrayBuffer !== 'undefined') {
          append('✅ SharedArrayBuffer available (multithreading possible)');
        } else {
          append('⚠️ SharedArrayBuffer not available (single-threaded WASM only)');
        }
      } else {
        append('❌ WebAssembly not supported');
      }
      append('🏁 Test completed - Ready for Gemma3 270M deployment');
    } catch (error) {
      append('💥 Test failed: ' + (error as Error).message);
    } finally {
      isRunning = false;
    }
  }
  $effect(() => {
    append('🎮 WebGL2/WebGPU Acceleration Test - Enhanced UI Version');
    append('🔧 Click "Run Test" to check browser GPU acceleration capabilities');
    append('📋 This test validates WebGPU → WebGL2 → WebGL1 → WASM fallback chain');
  });
</script>

<div class="container mx-auto p-6 max-w-4xl">
  <Card>
    <CardHeader>
      <CardTitle>WebGL2/WebGPU Acceleration Test</CardTitle>
      <p class="text-muted-foreground">Browser GPU acceleration capabilities for Gemma3 270M WebAssembly deployment</p>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex gap-2">
        <Button onclick={runTest} disabled={isRunning} variant="default">
          {isRunning ? '🔄 Testing...' : '🚀 Run Test'}
        </Button>
        <Button onclick={() => (log = '')} disabled={isRunning} variant="ghost">🗑️ Clear Log</Button>
      </div>
      {#if log}
        <Alert>
          <div class="font-mono text-sm whitespace-pre-wrap bg-background border rounded p-4 max-h-96 overflow-y-auto">
            {log}
          </div>
        </Alert>
      {/if}
      <div class="text-sm text-muted-foreground mt-4">
        <p><strong>Testing Strategy:</strong></p>
        <ul class="list-disc list-inside space-y-1">
          <li>🥇 <strong>WebGPU</strong>: Next-gen GPU compute for neural networks</li>
          <li>🥈 <strong>WebGL2</strong>: Transform feedback for matrix operations</li>
          <li>🥉 <strong>WebGL1</strong>: Basic GPU acceleration fallback</li>
          <li>🔧 <strong>WebAssembly</strong>: CPU-based SIMD processing</li>
        </ul>
      </div>
    </CardContent>
  </Card>
</div>
