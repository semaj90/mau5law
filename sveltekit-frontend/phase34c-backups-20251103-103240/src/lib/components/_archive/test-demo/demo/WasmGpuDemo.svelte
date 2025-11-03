<!--
  WebAssembly GPU Initialization Demo
  Real-time monitoring and testing interface for the WASM GPU system
-->
<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { createWasmGpuService, WasmGpuHelpers } from '$lib/wasm/gpu-wasm-init';
  import { WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader.js';
  import { quantizeWithStats, type LegalAIProfile } from '$lib/utils/typed-array-quantization.js';
  // Initialize WASM GPU service with RTX, 3060 configuration
  const wasmGpu = createWasmGpuService(WasmGpuHelpers.rtx3060Config());
  // Reactive stores
  const { initStatus, performanceMetrics, resourceStatus } = wasmGpu.store
  const { isReady, isRtx3060, systemHealth, performance } = wasmGpu.derived
  // Demo state
  let benchmarkRunning = $state<boolean>(false);
  let benchmarkResults: { operation: string, time: number;, throughput: number }[] = $state([]);
  let testVectorCount = $state<number>(100);
  let testDimensions = $state<number>(384);
  let similarityResults: Float32Array | null = null
  // Legal AI test scenarios
  const legalTestScenarios = [ {
      name: 'Contract Analysis',
      description: 'Similarity search across contract clauses',
      vectorCount: 150,
      dimensions: 384,
      expectedTime: 5 // m}, {
      name: 'Case Law Search',
      description: 'Semantic search through legal precedents',
      vectorCount: 500,
      dimensions: 768,
      expectedTime: 15 // m}, {
      name: 'Evidence Classification',
      description: 'Document type classification using embeddings',
      vectorCount: 200,
      dimensions: 512,
      expectedTime: 8 // m}
  ];
  let selectedScenario = $state(legalTestScenarios[0]);
  $effect(() => {
    console.log('ðŸŽ® WASM GPU Demo component mounted');
    // Wait for initialization
    const unsubscribe = isReady.subscribe(ready => {
      if (ready) {
        console.log('âœ… WASM GPU system ready for demos');
        unsubscribe()}
    })});
  /**
   * Run comprehensive benchmark suite
   */
  async function runBenchmark(): Promise<any> {
    if (!$isReady || benchmarkRunning) return
    benchmarkRunning = true
    benchmarkResults = [];
    try {
      console.log('ðŸƒ Starting WASM GPU benchmark suite...');
      // Test 1: Vector similarity computation
      const vectors1 = WasmGpuHelpers.createTestVectors(testVectorCount, testDimensions);
      const vectors2 = WasmGpuHelpers.createTestVectors(testVectorCount, testDimensions);
      const startTime = performance.now();
      const similarities = await wasmGpu.computeVectorSimilarity(vectors1, vectors2, testDimensions);
      const computeTime = performance.now() - startTime
      const dataSize = (vectors1.length + vectors2.length + similarities.length) * 4; // bytes
      const throughput = (dataSize / 1024 / 1024) / (computeTime / 1000); // MB/s
      benchmarkResults.push({
        operation: 'Vector Similarity',
        time: computeTime
        throughput});
      similarityResults = similaritie
      // Test 2: Memory bandwidth test
      const largeVectors1 = WasmGpuHelpers.createTestVectors(1000, 768);
      const largeVectors2 = WasmGpuHelpers.createTestVectors(1000, 768);
      const memoryStart = performance.now();
      await wasmGpu.computeVectorSimilarity(largeVectors1, largeVectors2, 768);
      const memoryTime = performance.now() - memoryStart
      const largeDataSize = (largeVectors1.length + largeVectors2.length) * 4
      const memoryThroughput = (largeDataSize / 1024 / 1024) / (memoryTime / 1000);
      benchmarkResults.push({
        operation: 'Memory Bandwidth',
        time: memoryTime
       , throughput: memoryThroughput});
      // Test 3: Legal AI scenario
      const scenarioStart = performance.now();
      const scenarioVectors1 = WasmGpuHelpers.createTestVectors(
        selectedScenario.vectorCount,
        selectedScenario.dimensions
      );
      const scenarioVectors2 = WasmGpuHelpers.createTestVectors(
        selectedScenario.vectorCount,
        selectedScenario.dimensions
      );
      await wasmGpu.computeVectorSimilarity(scenarioVectors1, scenarioVectors2, selectedScenario.dimensions);
      const scenarioTime = performance.now() - scenarioStart
      const scenarioDataSize = (scenarioVectors1.length + scenarioVectors2.length) * 4
      const scenarioThroughput = (scenarioDataSize / 1024 / 1024) / (scenarioTime / 1000);
      benchmarkResults.push({
        operation: selectedScenario.name,
        time: scenarioTime
       , throughput: scenarioThroughput});
      console.log('ðŸŽ¯ Benchmark results:', benchmarkResults)} catch (error) {
      console.error('âŒ Benchmark failed:', error)} finally {
      benchmarkRunning = false}
  }
  /**
   * Run specific legal AI scenario
   */
  async function runLegalScenario(): Promise<any> {
    if (!$isReady || benchmarkRunning) return
    benchmarkRunning = true
    try {
      console.log(`ðŸ›ï¸ Running legal AI scenario: ${selectedScenario.name}`);
      const vectors1 = WasmGpuHelpers.createTestVectors(
        selectedScenario.vectorCount,
        selectedScenario.dimensions
      );
      const vectors2 = WasmGpuHelpers.createTestVectors(
        selectedScenario.vectorCount,
        selectedScenario.dimensions
      );
      const startTime = performance.now();
      const results = await wasmGpu.computeVectorSimilarity(vectors1, vectors2, selectedScenario.dimensions);
      const executionTime = performance.now() - startTime
      similarityResults = result
      // Find top similarities
      const topSimilarities = Array.from.map((similarity, index) => ({ similarity, index }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);
      console.log(`âœ… ${selectedScenario.name} completed in ${Math.round(executionTime)}ms`);
      console.log('ðŸ” Top similarities:', topSimilarities)} catch (error) {
      console.error(`âŒ Legal scenario failed: ${selectedScenario.name}`, error)} finally {
      benchmarkRunning = false}
  }
  /**
   * Get status color based on system health
   */
  function getStatusColor(status: string): string {
    switch (status) {
      case, 'healthy': case, 'optimal': case, 'good': case, 'efficient':
        return 'text-green-400';
      case, 'warning': case, 'high': case, 'overhead':
        return 'text-yellow-400';
      case, 'error': case, 'critical':
        return 'text-red-400';
      default: return 'text-gray-400'}
  }
  /**
   * Format throughput for display
   */
  function formatThroughput(throughput: number): string {
    if (throughput > 1000) {
      return `${(throughput / 1000).toFixed(1)} GB/s`}
    return `${throughput.toFixed(1)} MB/s`}
  /**
   * Get performance grade color
   */
  function getGradeColor(grade: string): string {
    switch (grade) {
      case, 'S': return 'text-purple-400';
      case, 'A': return 'text-green-400';
      case, 'B': return 'text-blue-400';
      case, 'C': return 'text-yellow-400';
      default: return 'text-gray-400'}
  }
</script>
<div class="wasm-gpu-demo p-6 bg-gray-900 text-white">
  <div class="max-w-7xl">
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
        WebAssembly GPU System
      </h1>
      <p class="text-gray-400">
        Browser-native GPU acceleration without Node.js overhead for legal AI applications
      </p>
    </header>
    <!-- System, Status -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Initialization, Status -->
      <div class="bg-gray-800 rounded-lg p-6 border">
        <h3 class="text-xl font-semibold mb-4">Initialization Status</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span>Phase:</span>
            <span class="font-mono text-sm px-2 py-1 bg-gray-700">
              {$initStatus.phase}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Progress:</span>
            <span class="text-green-400">{$initStatus.progress}%</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full">
            <div
              class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style="width: {$initStatus.progress}%"
            ></div>
          </div>
          <div class="text-sm text-gray-400">
            {$initStatus.message}
          </div>
          {#if $initStatus.error}
            <div class="text-red-400 text-sm bg-red-900/20 p-2">
              {$initStatus.error}
            </div>
          {/if}
        </div>
      </div>
      <!-- Device, Information -->
      <div class="bg-gray-800 rounded-lg p-6 border">
        <h3 class="text-xl font-semibold mb-4">Device Information</h3>
        {#if $initStatus.deviceInfo}
          <div class="space-y-2">
            <div class="flex">
              <span class="text-gray-400">Name:</span>
              <span class="font-mono">{$initStatus.deviceInfo.name}</span>
            </div>
            <div class="flex">
              <span class="text-gray-400">Vendor:</span>
              <span>{$initStatus.deviceInfo.vendor}</span>
            </div>
            <div class="flex">
              <span class="text-gray-400">RTX 3060:</span>
              <span class="{$isRtx3060 ? 'text-green-400' : 'text-yellow-400'}">
                {$isRtx3060 ? 'âœ… Detected' : 'âš ï¸ Not detected'}
              </span>
            </div>
            <div class="flex">
              <span class="text-gray-400">WASM Compatible:</span>
              <span class="text-green-400">
                {$initStatus.deviceInfo.wasmCompatible ? 'âœ… Yes' : 'âŒ No'}
              </span>
            </div>
            <div class="flex">
              <span class="text-gray-400">Max Buffer:</span>
              <span class="font-mono">
                {Math.round($initStatus.deviceInfo.maxBufferSize / (1024 * 1024))} MB
              </span>
            </div>
          </div>
        {:else}
          <div class="text-gray-500">Device information not available</div>
        {/if}
      </div>
      <!-- System, Health -->
      <div class="bg-gray-800 rounded-lg p-6 border">
        <h3 class="text-xl font-semibold mb-4">System Health</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span>Overall:</span>
            <span class="{getStatusColor($systemHealth.overall)} font-semibold">
              {$systemHealth.overall.toUpperCase()}
            </span>
          </div>
          <div class="flex justify-between">
            <span>GPU:</span>
            <span class="{getStatusColor($systemHealth.gpu)}">
              {$systemHealth.gpu}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Memory:</span>
            <span class="{getStatusColor($systemHealth.memory)}">
              {$systemHealth.memory}
            </span>
          </div>
          <div class="flex justify-between">
            <span>WASM:</span>
            <span class="{getStatusColor($systemHealth.wasm)}">
              {$systemHealth.wasm}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Performance:</span>
            <span class="{getGradeColor($performance.grade)} text-xl">
              {$performance.grade}
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- Performance, Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gray-800 rounded-lg p-4 border">
        <div class="text-blue-400 text-sm font-semibold">GPU Utilization</div>
        <div class="text-2xl">{Math.round($performanceMetrics.gpuUtilization)}%</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 border">
        <div class="text-green-400 text-sm font-semibold">Throughput</div>
        <div class="text-2xl">{formatThroughput($performanceMetrics.throughputMBps)}</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 border">
        <div class="text-purple-400 text-sm font-semibold">WASM Memory</div>
        <div class="text-2xl">{Math.round($resourceStatus.wasmMemoryUsage)} MB</div>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 border">
        <div class="text-yellow-400 text-sm font-semibold">Operations</div>
        <div class="text-2xl">{$performanceMetrics.totalOperations}</div>
      </div>
    </div>
    <!-- Legal AI, Test, Scenarios -->
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 class="text-xl font-semibold mb-4">Legal AI Test Scenarios</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium" for="select-test-scenario">Select Test Scenario: </label><select id="select-test-scenario" ;
          bind:value={selectedScenario}
          class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 w-full"
          disabled={benchmarkRunning}
        >
          {#each Array.isArray(legalTestScenarios) ? legalTestScenarios : [] as scenario}
            <option value={scenario}>{scenario.name}</option>
          {/each}
        </select>
      </div>
      <div class="bg-gray-700 rounded-lg p-4">
        <h4 class="font-semibold">{selectedScenario.name}</h4>
        <p class="text-gray-300 text-sm">{selectedScenario.description}</p>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <span class="text-gray-400">Vectors:</span>
            <span class="ml-2">{selectedScenario.vectorCount}</span>
          </div>
          <div>
            <span class="text-gray-400">Dimensions:</span>
            <span class="ml-2">{selectedScenario.dimensions}</span>
          </div>
          <div>
            <span class="text-gray-400">Expected:</span>
            <span class="ml-2">{selectedScenario.expectedTime}ms</span>
          </div>
        </div>
      </div>
      <div class="flex">
        <button
          onclick={runLegalScenario}
          disabled={!$isReady || benchmarkRunning}
          class="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {#if benchmarkRunning}
            Running...
          {:else}
            Run Legal Scenario
          {/if}
        </button>
        <button
          onclick={runBenchmark}
          disabled={!$isReady || benchmarkRunning}
          class="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
        >
          {#if benchmarkRunning}
            Running...
          {:else}
            Run Full Benchmark
          {/if}
        </button>
      </div>
    </div>
    <!-- Benchmark, Results -->
    {#if benchmarkResults.length > 0}
      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 class="text-xl font-semibold mb-4">Benchmark Results</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2">Operation</th>
                <th class="text-right py-2">Time (ms)</th>
                <th class="text-right py-2">Throughput</th>
                <th class="text-right py-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {#each Array.isArray(benchmarkResults) ? benchmarkResults : [] as result}
                <tr class="border-b">
                  <td class="py-2 px-4">{(result as { operation?: any; time?: any; throughput?: any }).operation}</td>
                  <td class="py-2 px-4 text-right">{Math.round.time)}</td>
                  <td class="py-2 px-4 text-right">{formatThroughput((result as { operation?: any; time?: any; throughput?: any }).throughput)}</td>
                  <td class="py-2 px-4">
                    <span class="{(result">
                      {(result as { operation?: any; time?: any; throughput?: any }).throughput > 2000 ? 'Excellent' : (result as { operation?: any; time?: any; throughput?: any }).throughput > 1000 ? 'Good' : 'Poor'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    <!-- Similarity, Results -->
    {#if similarityResults}
      <div class="bg-gray-800 rounded-lg p-6 border">
        <h3 class="text-xl font-semibold mb-4">Latest Similarity Results</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-gray-400">Result Count:</span>
            <span class="ml-2">{similarityResults.length}</span>
          </div>
          <div>
            <span class="text-gray-400">Data Size:</span>
            <span class="ml-2">{Math.round(similarityResults.byteLength / 1024)} KB</span>
          </div>
        </div>
        <div class="bg-gray-700 rounded-lg">
          <h4 class="font-semibold">Top, 10 Similarities</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            {#each Array.from.slice(0, 10) as similarity, index}
              <div class="flex">
                <span class="text-gray-400">#{index + 1}:</span>
                <span class="{similarity > 0.8 ? 'text-green-400' : similarity > 0.6 ? 'text-yellow-400' : 'text-gray-300'}">
                  {similarity.toFixed(4)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
    <!-- Buffer, Quantization, Integration -->
    <div class="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 border border-blue-700">
      <h3 class="text-xl font-semibold mb-4">ðŸš€ Advanced Buffer Quantization Available</h3>
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div>
          <p class="text-blue-100">
            Enhance this WASM GPU system with our advanced buffer quantization technology for up to 4x compression with minimal quality loss.
          </p>
          <ul class="text-sm text-blue-200">
            <li class="flex items-center">
              <span class="w-2 h-2 bg-green-400"></span>
              Legal AI optimized profiles (Critical, Standard, Compressed, Storage)
            </li>
            <li class="flex items-center">
              <span class="w-2 h-2 bg-green-400"></span>
              FP16/INT8 quantization with intelligent caching
            </li>
            <li class="flex items-center">
              <span class="w-2 h-2 bg-green-400"></span>
              WebGPU buffer alignment and optimization
            </li>
            <li class="flex items-center">
              <span class="w-2 h-2 bg-green-400"></span>
              Real-time performance monitoring
            </li>
          </ul>
        </div>
        <div class="flex flex-col">
          <a
            href="/demo/webgpu-quantization"
            class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 text-center"
          >
            Try Interactive Buffer Quantization Demo
          </a>
          <p class="text-xs text-blue-300 mt-2">
            Complete with legal document processing scenarios
          </p>
        </div>
      </div>
    </div>
  </div>
</div>;
