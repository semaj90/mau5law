<!--
  WebGPU Quantization Demo Page
  Showcase the complete buffer quantization system integration
-->

<script lang="ts">
  import WebGPUQuantizationDemo from '$lib/components/demo/WebGPUQuantizationDemo.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  // Navigation state
  let showTechnicalDetails = $state(false);
  let activeTab = $state('demo');

  onMount(() => {
    // Check URL hash for direct navigation
    const hash = $page.url.hash;
    if (hash === '#technical') {
      activeTab = 'technical';
      showTechnicalDetails = true;
    }
  });
</script>

<svelte:head>
  <title>WebGPU Buffer Quantization Demo - Legal AI Platform</title>
  <meta name="description" content="Interactive demonstration of WebGPU buffer quantization for legal AI document processing" />
</svelte:head>

<div class="demo-page min-h-screen bg-gray-50">
  <!-- Navigation Header -->
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <a href="/" class="text-2xl font-bold text-blue-600">Legal AI Platform</a>
          <span class="ml-4 text-gray-400">•</span>
          <span class="ml-4 text-gray-600">WebGPU Quantization Demo</span>
        </div>
        <div class="flex space-x-8">
          <button
            onclick={() => { activeTab = 'demo'; showTechnicalDetails = false; }}
            class="px-3 py-2 text-sm font-medium {activeTab === 'demo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
          >
            Interactive Demo
          </button>
          <button
            onclick={() => { activeTab = 'technical'; showTechnicalDetails = true; }}
            class="px-3 py-2 text-sm font-medium {activeTab === 'technical' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
          >
            Technical Details
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="py-8">
    {#if activeTab === 'demo'}
      <!-- Interactive Demo -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <WebGPUQuantizationDemo />
        
        <!-- Additional Information -->
        <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- System Requirements -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">🔧 System Requirements</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                WebGPU-compatible browser (Chrome 113+, Edge 113+)
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                Modern GPU with WebGPU support
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                Minimum 2GB GPU memory recommended
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Hardware acceleration enabled
              </li>
            </ul>
          </div>

          <!-- Performance Benefits -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">⚡ Performance Benefits</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">FP16 Compression</span>
                <span class="text-sm font-medium text-green-600">2x smaller, <1% accuracy loss</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">INT8 Compression</span>
                <span class="text-sm font-medium text-green-600">4x smaller, ~3% accuracy loss</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Cache Performance</span>
                <span class="text-sm font-medium text-blue-600">Up to 10x faster repeated uploads</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Legal AI Profiles</span>
                <span class="text-sm font-medium text-purple-600">Domain-optimized processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Technical Details -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-lg shadow-lg">
          <div class="px-6 py-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Technical Implementation Details</h1>
            
            <!-- Architecture Overview -->
            <section class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">🏗️ System Architecture</h2>
              <div class="bg-gray-50 rounded-lg p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div class="text-center">
                    <div class="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">1</div>
                    <h3 class="font-medium text-gray-900">Buffer Conversion</h3>
                    <p class="text-sm text-gray-600 mt-1">Universal buffer type handling with proper WebGPU alignment</p>
                  </div>
                  <div class="text-center">
                    <div class="w-16 h-16 bg-green-500 rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">2</div>
                    <h3 class="font-medium text-gray-900">Quantization</h3>
                    <p class="text-sm text-gray-600 mt-1">FP32/FP16/INT8 modes with legal AI optimization profiles</p>
                  </div>
                  <div class="text-center">
                    <div class="w-16 h-16 bg-purple-500 rounded-lg mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">3</div>
                    <h3 class="font-medium text-gray-900">GPU Upload</h3>
                    <p class="text-sm text-gray-600 mt-1">Intelligent caching with performance monitoring</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Core Components -->
            <section class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">🔧 Core Components</h2>
              <div class="space-y-4">
                <div class="border border-gray-200 rounded-lg p-4">
                  <h3 class="font-medium text-gray-900 mb-2">buffer-conversion.ts</h3>
                  <p class="text-sm text-gray-600 mb-2">Fixes critical WebGPU buffer mapping issues and provides universal buffer type conversion.</p>
                  <ul class="text-xs text-gray-500 space-y-1">
                    <li>• WebGPUBufferUtils.createFloat32ArrayFromMappedRange() - Safe mapped buffer handling</li>
                    <li>• toFloat32Array() / toArrayBuffer() - Universal type conversion</li>
                    <li>• 4-byte alignment handling for WebGPU compliance</li>
                  </ul>
                </div>

                <div class="border border-gray-200 rounded-lg p-4">
                  <h3 class="font-medium text-gray-900 mb-2">typed-array-quantization.ts</h3>
                  <p class="text-sm text-gray-600 mb-2">Advanced quantization system with legal AI domain optimization.</p>
                  <ul class="text-xs text-gray-500 space-y-1">
                    <li>• FP16 conversion with minimal quality loss (2x compression)</li>
                    <li>• INT8 symmetric/asymmetric quantization (4x compression)</li>
                    <li>• Legal AI profiles: critical, standard, compressed, storage</li>
                  </ul>
                </div>

                <div class="border border-gray-200 rounded-lg p-4">
                  <h3 class="font-medium text-gray-900 mb-2">webgpu-buffer-uploader.ts</h3>
                  <p class="text-sm text-gray-600 mb-2">Production-ready WebGPU buffer management with intelligent caching.</p>
                  <ul class="text-xs text-gray-500 space-y-1">
                    <li>• Smart buffer caching with hit rate optimization</li>
                    <li>• Automatic quantization selection based on data characteristics</li>
                    <li>• Comprehensive performance monitoring and statistics</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Legal AI Profiles -->
            <section class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">⚖️ Legal AI Optimization Profiles</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 class="font-medium text-red-800 mb-2">🔴 Critical (FP32)</h3>
                  <p class="text-sm text-red-700 mb-2">Maximum precision for high-stakes legal analysis</p>
                  <ul class="text-xs text-red-600 space-y-1">
                    <li>• Contract terms and conditions</li>
                    <li>• Regulatory compliance analysis</li>
                    <li>• Risk assessment calculations</li>
                  </ul>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 class="font-medium text-blue-800 mb-2">🔵 Standard (FP16)</h3>
                  <p class="text-sm text-blue-700 mb-2">Balanced precision/performance for general legal processing</p>
                  <ul class="text-xs text-blue-600 space-y-1">
                    <li>• Legal brief analysis</li>
                    <li>• Case law similarity search</li>
                    <li>• Document classification</li>
                  </ul>
                </div>

                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 class="font-medium text-green-800 mb-2">🟢 Compressed (INT8)</h3>
                  <p class="text-sm text-green-700 mb-2">High compression for large legal datasets</p>
                  <ul class="text-xs text-green-600 space-y-1">
                    <li>• Bulk document embeddings</li>
                    <li>• Citation network analysis</li>
                    <li>• Legal corpus processing</li>
                  </ul>
                </div>

                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 class="font-medium text-purple-800 mb-2">🟣 Storage (INT8)</h3>
                  <p class="text-sm text-purple-700 mb-2">Maximum compression for archival storage</p>
                  <ul class="text-xs text-purple-600 space-y-1">
                    <li>• Historical case archives</li>
                    <li>• Long-term document storage</li>
                    <li>• Backup and redundancy systems</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Performance Characteristics -->
            <section class="mb-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">📊 Performance Characteristics</h2>
              <div class="overflow-x-auto">
                <table class="min-w-full border border-gray-200 rounded-lg">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precision</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compression</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy Loss</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Use Case</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr>
                      <td class="px-4 py-3 text-sm text-red-600 font-medium">Critical</td>
                      <td class="px-4 py-3 text-sm text-gray-900">FP32 (32-bit)</td>
                      <td class="px-4 py-3 text-sm text-gray-900">1x (no compression)</td>
                      <td class="px-4 py-3 text-sm text-gray-900">0%</td>
                      <td class="px-4 py-3 text-sm text-gray-600">Contracts, compliance</td>
                    </tr>
                    <tr class="bg-gray-50">
                      <td class="px-4 py-3 text-sm text-blue-600 font-medium">Standard</td>
                      <td class="px-4 py-3 text-sm text-gray-900">FP16 (16-bit)</td>
                      <td class="px-4 py-3 text-sm text-green-600 font-medium">2x smaller</td>
                      <td class="px-4 py-3 text-sm text-gray-900"><1%</td>
                      <td class="px-4 py-3 text-sm text-gray-600">General processing</td>
                    </tr>
                    <tr>
                      <td class="px-4 py-3 text-sm text-green-600 font-medium">Compressed</td>
                      <td class="px-4 py-3 text-sm text-gray-900">INT8 (8-bit)</td>
                      <td class="px-4 py-3 text-sm text-green-600 font-medium">4x smaller</td>
                      <td class="px-4 py-3 text-sm text-gray-900">~3%</td>
                      <td class="px-4 py-3 text-sm text-gray-600">Bulk embeddings</td>
                    </tr>
                    <tr class="bg-gray-50">
                      <td class="px-4 py-3 text-sm text-purple-600 font-medium">Storage</td>
                      <td class="px-4 py-3 text-sm text-gray-900">INT8 (8-bit)</td>
                      <td class="px-4 py-3 text-sm text-green-600 font-medium">4x smaller</td>
                      <td class="px-4 py-3 text-sm text-gray-900">~5%</td>
                      <td class="px-4 py-3 text-sm text-gray-600">Archival storage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Integration Examples -->
            <section>
              <h2 class="text-xl font-semibold text-gray-800 mb-4">🔌 Integration Examples</h2>
              <div class="bg-gray-900 rounded-lg p-4 text-sm text-gray-100 overflow-x-auto">
                <pre><code>{`// Quick legal AI upload
import { WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader.js';

const buffer = await WebGPUBufferUtils_Extended.uploadForLegalAI(
  device, documentEmbeddings, 'standard'
);

// Advanced pipeline with custom quantization
import { WebGPUBufferUploader } from '$lib/utils/webgpu-buffer-uploader.js';

const uploader = new WebGPUBufferUploader(device, true);
const result = await uploader.createLegalAnalysisBuffer(
  contractData, 'critical' // FP32 for high-stakes contracts
);

// Batch processing with compression statistics
const batchResults = await uploader.uploadBatch(legalDocuments, {
  quantization: 'legal_compressed',
  debugMode: true
});`}</code></pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center text-gray-600">
        <p class="text-sm">
          WebGPU Buffer Quantization System - Part of the Legal AI Platform
        </p>
        <p class="text-xs mt-2">
          Optimized for legal document processing with advanced compression and caching
        </p>
      </div>
    </div>
  </footer>
</div>

<style>
  .demo-page {
    min-height: 100vh;
  }
</style>
