<script lang="ts">
  import { onMount } from 'svelte';
  import { gpuIntegrationService } from '$lib/services/gpu-integration-service';
  import type { AppGPUIntegration } from '$lib/services/gpu-integration-service';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let uploadedImage: HTMLImageElement | null = null;
  let gpuStatus: AppGPUIntegration | null = null;
  let processing = $state(false);
  let processingTime = $state(0);
  let imageFile: File | null = null;
  
  let quantizationOptions = $state({
    dithering: false,
    paletteSubset: 'full' as 'background' | 'sprite' | 'full'
  });

  onMount(async () => {
    // Register this component for GPU acceleration
    gpuIntegrationService.registerComponent({
      componentId: 'nes-gpu-quantization-demo',
      requiresGPU: true,
      nesColorQuantization: true,
      lodAcceleration: false,
      pixelEffects: true,
      priority: 'high'
    });

    // Get GPU status
    gpuStatus = gpuIntegrationService.getIntegrationStatus();
    
    // Initialize canvas
    if (canvas) {
      ctx = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 240;
      
      // Draw NES palette preview
      drawPalettePreview();
    }
  });

  function drawPalettePreview() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw NES palette colors in a grid
    const cols = 16;
    const rows = 4;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;
    
    // NES palette colors (first 64 colors)
    const nesPalette = [
      0x666666, 0x002A88, 0x1412A7, 0x3B00A4, 0x5C007E, 0x6E0040, 0x6C0600, 0x561D00,
      0x333500, 0x0B4800, 0x005200, 0x004F08, 0x00404D, 0x000000, 0x000000, 0x000000,
      0xADADAD, 0x155FD9, 0x4240FF, 0x7527FE, 0xA01ACC, 0xB71E7B, 0xB53120, 0x994E00,
      0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
      0xFEFEFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
      0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
      0xFEFEFF, 0xC0DFFF, 0xD3D2FF, 0xE8C8FF, 0xFBC2FF, 0xFEC4EA, 0xFECCC5, 0xF7D8A5,
      0xE4E594, 0xCFEF96, 0xBDF4AB, 0xB3F3CC, 0xB5EBF2, 0xB8B8B8, 0x000000, 0x000000
    ];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const colorIndex = row * cols + col;
        if (colorIndex < nesPalette.length) {
          const color = nesPalette[colorIndex];
          const r = (color >> 16) & 0xFF;
          const g = (color >> 8) & 0xFF;
          const b = color & 0xFF;
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
        }
      }
    }
    
    // Add title
    ctx.fillStyle = '#FFD700';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NES Color Palette (52 colors)', canvas.width / 2, canvas.height - 10);
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    imageFile = file;
    
    // Create image element
    uploadedImage = new Image();
    uploadedImage.onload = () => {
      if (!ctx || !uploadedImage) return;
      
      // Resize canvas to match image (or scale down if too large)
      const maxSize = 512;
      let { width, height } = uploadedImage;
      
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width *= scale;
        height *= scale;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw original image
      ctx.drawImage(uploadedImage, 0, 0, width, height);
    };
    
    uploadedImage.src = URL.createObjectURL(file);
  }

  async function quantizeImage() {
    if (!ctx || !uploadedImage) return;
    
    processing = true;
    const startTime = Date.now();
    
    try {
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert to Float32Array for GPU processing
      const floatData = new Float32Array(imageData.data.length);
      for (let i = 0; i < imageData.data.length; i++) {
        floatData[i] = imageData.data[i] / 255.0;
      }
      
      // Apply NES color quantization using GPU acceleration
      const quantizedData = await gpuIntegrationService.quantizeImageToNES(
        floatData,
        {
          dithering: quantizationOptions.dithering,
          paletteSubset: quantizationOptions.paletteSubset,
          componentId: 'nes-gpu-quantization-demo'
        }
      );
      
      // Convert back to ImageData
      const resultImageData = new ImageData(canvas.width, canvas.height);
      if (quantizedData instanceof Float32Array) {
        for (let i = 0; i < quantizedData.length; i++) {
          resultImageData.data[i] = Math.round(quantizedData[i] * 255);
        }
      } else {
        resultImageData.data.set(quantizedData.data);
      }
      
      // Draw quantized result
      ctx.putImageData(resultImageData, 0, 0);
      
      processingTime = Date.now() - startTime;
      
      console.log(`🎮 NES quantization complete in ${processingTime}ms using ${gpuStatus?.isInitialized ? 'GPU' : 'CPU'}`);
      
    } catch (error) {
      console.error('Quantization failed:', error);
    } finally {
      processing = false;
    }
  }

  function resetToOriginal() {
    if (!ctx || !uploadedImage) return;
    
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
  }
</script>

<div class="min-h-screen bg-nier-bg-primary text-nier-text-primary p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-nier-accent-warm mb-4 font-mono">
        🎮 NES GPU Color Quantization Demo
      </h1>
      <p class="text-nier-text-secondary mb-6">
        Experience authentic 8-bit color quantization using NES memory architecture and WebGPU acceleration
      </p>
      
      <!-- GPU Status -->
      {#if gpuStatus}
        <div class="flex justify-center gap-4 mb-6">
          <span class="px-3 py-1 rounded bg-{gpuStatus.isInitialized ? 'green' : 'red'}-500/20 text-{gpuStatus.isInitialized ? 'green' : 'red'}-400 border border-{gpuStatus.isInitialized ? 'green' : 'red'}-500/30 text-sm">
            🎮 GPU: {gpuStatus.isInitialized ? 'Active' : 'Inactive'}
          </span>
          <span class="px-3 py-1 rounded bg-{gpuStatus.nesQuantizationActive ? 'purple' : 'gray'}-500/20 text-{gpuStatus.nesQuantizationActive ? 'purple' : 'gray'}-400 border border-{gpuStatus.nesQuantizationActive ? 'purple' : 'gray'}-500/30 text-sm">
            🕹️ NES Mode: {gpuStatus.nesQuantizationActive ? 'Active' : 'Inactive'}
          </span>
          <span class="px-3 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm">
            📊 Profile: {gpuStatus.performanceProfile}
          </span>
          <span class="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm">
            🧠 Memory: {gpuStatus.memoryUsage.gpu + gpuStatus.memoryUsage.nesMemory}MB
          </span>
        </div>
      {/if}
    </div>

    <div class="grid lg:grid-cols-2 gap-8">
      <!-- Controls Panel -->
      <div class="space-y-6">
        <!-- Image Upload -->
        <div class="nes-container with-title">
          <h3 class="title">Image Upload</h3>
          <div class="space-y-4">
            <div class="nes-field">
              <label for="image-upload">Choose Image:</label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                on:change={handleImageUpload}
                class="nes-input"
              />
            </div>
            
            {#if uploadedImage}
              <p class="text-sm text-nier-text-secondary">
                Original: {uploadedImage.width}×{uploadedImage.height}px
              </p>
            {/if}
          </div>
        </div>

        <!-- Quantization Options -->
        <div class="nes-container with-title">
          <h3 class="title">NES Quantization Options</h3>
          <div class="space-y-4">
            <div class="nes-field">
              <label>
                <input
                  type="checkbox"
                  class="nes-checkbox"
                  bind:checked={quantizationOptions.dithering}
                />
                <span>Enable Dithering</span>
              </label>
            </div>
            
            <div class="nes-field">
              <label for="palette-subset">Palette Subset:</label>
              <div class="nes-select">
                <select id="palette-subset" bind:value={quantizationOptions.paletteSubset}>
                  <option value="full">Full NES Palette (52 colors)</option>
                  <option value="background">Background Palette (16 colors)</option>
                  <option value="sprite">Sprite Palette (16 colors)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-4">
          <button
            class="nes-btn is-success w-full"
            disabled={!uploadedImage || processing}
            on:click={quantizeImage}
          >
            {#if processing}
              🔄 Processing...
            {:else}
              🎮 Apply NES Quantization
            {/if}
          </button>
          
          <button
            class="nes-btn w-full"
            disabled={!uploadedImage || processing}
            on:click={resetToOriginal}
          >
            🔄 Reset to Original
          </button>
        </div>

        <!-- Processing Stats -->
        {#if processingTime > 0}
          <div class="nes-container">
            <p class="text-sm">
              <strong>Processing Time:</strong> {processingTime}ms<br>
              <strong>Method:</strong> {gpuStatus?.isInitialized ? 'WebGPU Compute Shader' : 'CPU Fallback'}<br>
              <strong>Dithering:</strong> {quantizationOptions.dithering ? 'Enabled' : 'Disabled'}<br>
              <strong>Colors Used:</strong> {quantizationOptions.paletteSubset === 'full' ? '52' : '16'} NES colors
            </p>
          </div>
        {/if}
      </div>

      <!-- Canvas Display -->
      <div class="space-y-6">
        <div class="nes-container with-title">
          <h3 class="title">Result</h3>
          <div class="text-center">
            <canvas
              bind:this={canvas}
              class="border-2 border-nier-border-muted max-w-full h-auto pixel-art"
              style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"
            ></canvas>
          </div>
        </div>

        <!-- Technical Details -->
        <div class="nes-container with-title">
          <h3 class="title">NES Technical Specs</h3>
          <div class="text-xs space-y-2 font-mono">
            <p><strong>PPU Memory Map:</strong></p>
            <ul class="ml-4 space-y-1">
              <li>Pattern Tables: 0x0000-0x1FFF (8KB)</li>
              <li>Name Tables: 0x2000-0x2FFF (4KB)</li>
              <li>Palette RAM: 0x3F00-0x3F1F (32 bytes)</li>
              <li>OAM: 256 bytes for sprites</li>
            </ul>
            <p><strong>Color Palette:</strong> 52 unique colors total</p>
            <p><strong>Simultaneous Colors:</strong> 25 (4 palettes × 4 colors + 1 backdrop)</p>
            <p><strong>Resolution:</strong> 256×240 pixels</p>
            <p><strong>GPU Acceleration:</strong> {gpuStatus?.isInitialized ? 'WebGPU Compute Shaders' : 'CPU Processing'}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .pixel-art {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
</style>