{#snippet default}
<script lang="ts">
  import { onMount } from 'svelte';
  import { yorhaWebGPU } from '$lib/components/three/yorha-ui/webgpu/YoRHaWebGPUMath';
  import { yorhaMipmapShaders } from '$lib/components/three/yorha-ui/webgpu/YoRHaMipmapShaders';
  import { yorhaTextureManager } from '$lib/components/three/yorha-ui/webgpu/YoRHaOptimizedTextureManager';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;

  // Reactive state using Svelte 5 runes
  let isInitialized = $state(false);
  let isProcessing = $state(false);
  let processingResults = $state<any[]>([]);
  let systemStats = $state<any>(null);
  let mipmapConfig = $state({
    maxMipLevels: 12,
    filterMode: 'linear' as 'linear' | 'nearest' | 'cubic',
    rtxOptimized: true,
    enableStreaming: false,
    maxTextureSize: 2048
  });

  // Demo legal documents
  let legalDocuments = $state([
    {
      id: 'contract_001',
      type: 'contract' as const,
      title: 'Commercial Lease Agreement',
      priority: 200,
      riskLevel: 'high' as const,
      textureSize: '2048x2048',
      estimatedComplexity: 'High'
    },
    {
      id: 'evidence_001', 
      type: 'evidence' as const,
      title: 'Financial Records Evidence',
      priority: 180,
      riskLevel: 'critical' as const,
      textureSize: '4096x4096',
      estimatedComplexity: 'Very High'
    },
    {
      id: 'brief_001',
      type: 'brief' as const,
      title: 'Legal Brief Document',
      priority: 150,
      riskLevel: 'medium' as const,
      textureSize: '1024x1024',
      estimatedComplexity: 'Medium'
    }
  ]);

  // Performance metrics
  let performanceMetrics = $state({
    totalTexturesProcessed: 0,
    totalMipmapsGenerated: 0,
    averageProcessingTime: 0,
    memoryEfficiency: 0,
    rtxAccelerationUsage: 0
  });

  // Initialize WebGPU systems
  async function initializeSystem() {
    isProcessing = true;
    try {
      console.log('🔥 Initializing YoRHa WebGPU mipmap optimization system');
      // Initialize WebGPU Math
      const webgpuInit = await yorhaWebGPU.initialize();
      if (!webgpuInit) {
        throw new Error('Failed to initialize WebGPU Math');
      }

      // Initialize mipmap shaders
      const mipmapInit = await yorhaMipmapShaders.initialize();
      if (!mipmapInit) {
        throw new Error('Failed to initialize mipmap shaders');
      }

      // Initialize texture manager
      const textureManagerInit = await yorhaTextureManager.initialize();
      if (!textureManagerInit) {
        throw new Error('Failed to initialize texture manager');
      }

      // Get system statistics
      systemStats = yorhaTextureManager.getStatistics();

      isInitialized = true;
      console.log('✅ YoRHa mipmap optimization system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system:', error);
      alert(`System initialization failed: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }

  // Create mock GPU texture for demonstration
  function createMockTexture(width: number, height: number): GPUTexture | null {
    try {
      const device = (yorhaWebGPU as any).device;
      if (!device) return null;

      return device.createTexture({
        size: [width, height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
      });
    } catch (error) {
      console.error('Failed to create mock texture:', error);
      return null;
    }
  }

  // Process single legal document with mipmap optimization
  async function processDocument(docIndex: number) {
    if (!isInitialized || isProcessing) return;

    isProcessing = true;
    const document = legalDocuments[docIndex];
    try {
      console.log(`🚀 Processing document: ${document.title}`);

      // Parse texture size
      const [width, height] = document.textureSize.split('x').map(Number);
      const mockTexture = createMockTexture(width, height);
      if (!mockTexture) {
        throw new Error('Failed to create texture');
      }

      // Process with optimized mipmaps
      const result = await yorhaWebGPU.processTextureWithMipmaps(mockTexture, {
        generateMipmaps: true,
        filterMode: mipmapConfig.filterMode,
        rtxOptimized: mipmapConfig.rtxOptimized,
        enableStreaming: mipmapConfig.enableStreaming,
        legalDocument: document
      });

      // Store result
      processingResults = [{
        document: document.title,
        processingTime: result.processingTime,
        mipmapsGenerated: result.mipmaps.length,
        memoryUsed: result.memoryUsed,
        rtxAcceleration: result.optimization.rtxAcceleration,
        streamingUsed: result.optimization.streamingUsed,
        timestamp: new Date()
      }, ...processingResults.slice(0, 9)]; // Keep last 10 results

      // Update performance metrics
      updatePerformanceMetrics(result);

      // Update system stats
      systemStats = yorhaTextureManager.getStatistics();

      console.log(`✅ Document processed: ${result.mipmaps.length} mip levels generated`);

    } catch (error) {
      console.error('Document processing failed:', error);
      alert(`Processing failed: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }

  // Batch process all documents
  async function batchProcessDocuments() {
    if (!isInitialized || isProcessing) return;

    isProcessing = true;
    try {
      console.log('🚀 Starting batch processing of all legal documents');

      // Create mock textures for all documents
      const documentsWithTextures = legalDocuments.map(doc => {
        const [width, height] = doc.textureSize.split('x').map(Number);
        const texture = createMockTexture(width, height);
        return {
          ...doc,
          texture: texture!
        };
      }).filter(doc => doc.texture); // Filter out failed textures

      if (documentsWithTextures.length === 0) {
        throw new Error('No textures could be created');
      }

      // Process batch with legal document context
      const batchResult = await yorhaWebGPU.processLegalDocumentTextures(documentsWithTextures);

      // Add batch result to processing results
      processingResults = [{
        document: `Batch (${batchResult.processedDocuments} docs)`,
        processingTime: batchResult.totalProcessingTime,
        mipmapsGenerated: batchResult.mipmapsGenerated,
        memoryUsed: 0,
        rtxAcceleration: true,
        streamingUsed: false,
        batchProcessing: true,
        timestamp: new Date()
      }, ...processingResults.slice(0, 9)];

      // Update metrics
      performanceMetrics = {
        totalTexturesProcessed: performanceMetrics.totalTexturesProcessed + batchResult.processedDocuments,
        totalMipmapsGenerated: performanceMetrics.totalMipmapsGenerated + batchResult.mipmapsGenerated,
        averageProcessingTime: batchResult.totalProcessingTime / batchResult.processedDocuments,
        memoryEfficiency: batchResult.memoryOptimized ? 95 : performanceMetrics.memoryEfficiency,
        rtxAccelerationUsage: performanceMetrics.rtxAccelerationUsage + 1
      };

      // Update system stats
      systemStats = yorhaTextureManager.getStatistics();

      console.log(`✅ Batch processing completed: ${batchResult.processedDocuments} documents, ${batchResult.mipmapsGenerated} total mipmaps`);

    } catch (error) {
      console.error('Batch processing failed:', error);
      alert(`Batch processing failed: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }

  // Generate single mipmap chain demonstration
  async function generateMipmapDemo() {
    if (!isInitialized || isProcessing) return;

    isProcessing = true;

    try {
      console.log('🔥 Generating mipmap chain demonstration');

      const mockTexture = createMockTexture(2048, 2048);
      if (!mockTexture) {
        throw new Error('Failed to create demo texture');
      }

      const result = await yorhaMipmapShaders.generateMipmapChain(mockTexture, {
        maxMipLevels: mipmapConfig.maxMipLevels,
        filterMode: mipmapConfig.filterMode,
        rtxOptimized: mipmapConfig.rtxOptimized,
        enableStreaming: mipmapConfig.enableStreaming
      });

      processingResults = [{
        document: 'Mipmap Demo (2048x2048)',
        processingTime: result.totalGenerationTime,
        mipmapsGenerated: result.mipmapLevels.length,
        memoryUsed: result.memoryUsed,
        rtxAcceleration: result.optimization.rtxAcceleration,
        streamingUsed: result.optimization.streamingUsed,
        demo: true,
        timestamp: new Date()
      }, ...processingResults.slice(0, 9)];

      console.log(`✅ Mipmap demo completed: ${result.mipmapLevels.length} levels generated in ${result.totalGenerationTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('Mipmap demo failed:', error);
      alert(`Mipmap demo failed: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }

  // Update performance metrics
  function updatePerformanceMetrics(result: any) {
    performanceMetrics = {
      totalTexturesProcessed: performanceMetrics.totalTexturesProcessed + 1,
      totalMipmapsGenerated: performanceMetrics.totalMipmapsGenerated + result.mipmaps.length,
      averageProcessingTime: (performanceMetrics.averageProcessingTime * (performanceMetrics.totalTexturesProcessed - 1) + result.processingTime) / performanceMetrics.totalTexturesProcessed,
      memoryEfficiency: Math.min(95, performanceMetrics.memoryEfficiency + (result.memoryUsed > 0 ? 5 : 0)),
      rtxAccelerationUsage: result.optimization.rtxAcceleration ? performanceMetrics.rtxAccelerationUsage + 1 : performanceMetrics.rtxAccelerationUsage
    };
  }

  // Format file size
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format time
  function formatTime(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // Initialize on mount
  onMount(() => {
    initializeSystem();
  });
</script>

<div class="space-y-6 p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🔥 YoRHa Mipmap Optimization Demo
    </h1>
    <p class="text-gray-600">
      NVIDIA RTX-Optimized • NES Memory Architecture • Vulkan-Style Compute Shaders
    </p>
  </div>

  <!-- Initialization Status -->
  <Card>
    <CardHeader>
      <CardTitle>System Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span class="font-medium">
            {isInitialized ? '✅ System Initialized' : '❌ Not Initialized'}
          </span>
        </div>
        
        {#if !isInitialized && !isProcessing}
          <Button class="bits-btn" onclick={initializeSystem} size="sm">
            🔄 Initialize System
          </Button>
        {/if}

        {#if isProcessing}
          <span class="text-blue-600">⏳ Processing...</span>
        {/if}
      </div>
    </CardContent>
  </Card>

  <!-- Configuration -->
  <Card>
    <CardHeader>
      <CardTitle>Mipmap Configuration</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" for="max-mip-levels">Max Mip Levels</label><input id="max-mip-levels" 
            type="number" 
            bind:value={mipmapConfig.maxMipLevels}
            min="1" 
            max="16"
            class="w-full p-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" for="filter-mode">Filter Mode</label><select id="filter-mode" 
            bind:value={mipmapConfig.filterMode}
            class="w-full p-2 border rounded-md"
            disabled={isProcessing}
          >
            <option value="linear">Linear (Bilinear)</option>
            <option value="nearest">Nearest (Box Filter)</option>
            <option value="cubic">Cubic (Gaussian)</option>
          </select>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              bind:checked={mipmapConfig.rtxOptimized}
              id="rtx"
              disabled={isProcessing}
            />
            <label for="rtx" class="text-sm font-medium">RTX Optimization</label>
          </div>
          
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              bind:checked={mipmapConfig.enableStreaming}
              id="streaming"
              disabled={isProcessing}
            />
            <label for="streaming" class="text-sm font-medium">Enable Streaming</label>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Legal Documents -->
  <Card>
    <CardHeader>
      <CardTitle>Legal Document Processing</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <!-- Document List -->
        <div class="grid gap-3">
          {#each legalDocuments as document, index}
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div class="flex-1">
                <div class="font-medium">{document.title}</div>
                <div class="text-sm text-gray-600">
                  {document.type} • Priority: {document.priority} • Risk: {document.riskLevel}
                </div>
                <div class="text-xs text-gray-500">
                  Size: {document.textureSize} • Complexity: {document.estimatedComplexity}
                </div>
              </div>
              
              <Button class="bits-btn" 
                onclick={() => processDocument(index)}
                disabled={!isInitialized || isProcessing}
                size="sm"
              >
                🔥 Process
              </Button>
            </div>
          {/each}
        </div>

        <!-- Batch Operations -->
        <div class="flex gap-2 pt-4 border-t">
          <Button class="bits-btn" 
            onclick={batchProcessDocuments}
            disabled={!isInitialized || isProcessing}
          >
            🚀 Batch Process All
          </Button>
          
          <Button class="bits-btn" 
            onclick={generateMipmapDemo}
            disabled={!isInitialized || isProcessing}
            variant="outline"
          >
            🔥 Mipmap Demo
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Performance Metrics -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{performanceMetrics.totalTexturesProcessed}</div>
          <div class="text-sm text-gray-500">Textures Processed</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{performanceMetrics.totalMipmapsGenerated}</div>
          <div class="text-sm text-gray-500">Mipmaps Generated</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{formatTime(performanceMetrics.averageProcessingTime)}</div>
          <div class="text-sm text-gray-500">Avg Processing Time</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{performanceMetrics.memoryEfficiency.toFixed(1)}%</div>
          <div class="text-sm text-gray-500">Memory Efficiency</div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-red-600">{performanceMetrics.rtxAccelerationUsage}</div>
          <div class="text-sm text-gray-500">RTX Accelerated</div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- System Statistics -->
  {#if systemStats}
    <Card>
      <CardHeader>
        <CardTitle>NES Memory Bank Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each Object.entries(systemStats.banks) as [bankName, bankStats]}
            <div class="p-4 border rounded-lg">
              <div class="font-semibold mb-2">{bankName} Bank</div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Textures:</span>
                  <span class="font-medium">{bankStats.textureCount}</span>
                </div>
                <div class="flex justify-between">
                  <span>Memory:</span>
                  <span class="font-medium">{bankStats.memoryUsedMB}MB</span>
                </div>
                <div class="flex justify-between">
                  <span>Utilization:</span>
                  <span class="font-medium">{bankStats.utilization}%</span>
                </div>
              </div>
              
              <div class="mt-2">
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    style:width="{bankStats.utilization}%"
                  ></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Processing Results -->
  {#if processingResults.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>Recent Processing Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each processingResults.slice(0, 5) as result}
            <div class="p-3 border rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{result.document}</span>
                  {#if result.batchProcessing}
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">BATCH</span>
                  {/if}
                  {#if result.demo}
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">DEMO</span>
                  {/if}
                </div>
                <div class="text-sm text-gray-500">
                  {formatTime(result.processingTime)}
                </div>
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span class="text-gray-500">Mipmaps:</span>
                  <span class="font-medium">{result.mipmapsGenerated}</span>
                </div>
                <div>
                  <span class="text-gray-500">Memory:</span>
                  <span class="font-medium">{formatBytes(result.memoryUsed)}</span>
                </div>
                <div>
                  <span class="text-gray-500">RTX:</span>
                  <span class="font-medium">{result.rtxAcceleration ? '✅' : '❌'}</span>
                </div>
                <div>
                  <span class="text-gray-500">Streaming:</span>
                  <span class="font-medium">{result.streamingUsed ? '✅' : '❌'}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Technical Information -->
  <Card>
    <CardHeader>
      <CardTitle>Technical Architecture</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold mb-2">🔥 Optimization Features</h4>
          <ul class="space-y-1 text-sm text-gray-600">
            <li>• NVIDIA RTX tensor core acceleration for mipmap generation</li>
            <li>• Vulkan-style compute shader approach with parallel mip level processing</li>
            <li>• NES memory architecture with intelligent bank allocation</li>
            <li>• Texture streaming for large legal documents (>16MB)</li>
            <li>• Memory-optimized LRU caching with legal document prioritization</li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold mb-2">🎮 Shader Types</h4>
          <ul class="space-y-1 text-sm text-gray-600">
            <li>• <strong>Box Filter:</strong> Fastest, good for thumbnails</li>
            <li>• <strong>Bilinear:</strong> Balanced quality/performance</li>
            <li>• <strong>Gaussian:</strong> High quality, slower</li>
            <li>• <strong>RTX-Optimized:</strong> Tensor core acceleration</li>
            <li>• <strong>Multi-Level Batch:</strong> Parallel mip generation</li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold mb-2">🏦 Memory Banks</h4>
          <ul class="space-y-1 text-sm text-gray-600">
            <li>• <strong>CHR-ROM:</strong> Legal document patterns (32MB, 64 textures)</li>
            <li>• <strong>PRG-ROM:</strong> Large documents (128MB, 128 textures)</li>
            <li>• <strong>SAVE-RAM:</strong> Critical documents (16MB, 32 textures)</li>
            <li>• <strong>EXPANSION-ROM:</strong> Streaming buffer (64MB, 16 textures)</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
{/snippet}

{@render default()}
