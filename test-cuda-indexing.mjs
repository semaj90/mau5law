#!/usr/bin/env node

/**
 * Test CUDA Indexing Performance
 * Tests the new GPU-accelerated indexing endpoints
 */

import { spawn } from 'child_process';

const CUDA_SERVICE_PORT = '8097';
const BASE_URL = `http://localhost:${CUDA_SERVICE_PORT}/api/v1`;

// Generate test vectors (embeddings)
function generateTestVectors(count, dimensions) {
    const vectors = [];
    for (let i = 0; i < count; i++) {
        const vector = [];
        for (let j = 0; j < dimensions; j++) {
            // Generate realistic embedding-like values
            vector.push((Math.random() - 0.5) * 0.4);
        }
        vectors.push(vector);
    }
    return vectors;
}

// Test CUDA indexing endpoints
async function testCUDAIndexing() {
    console.log('🚀 Testing CUDA Indexing Performance');
    console.log('=' .repeat(50));

    // Test data
    const dimensions = 768; // Common embedding size (e.g., BERT, Gemma)
    const vectorCount = 1000;
    const vectors = generateTestVectors(vectorCount, dimensions);

    console.log(`📊 Test Configuration:`);
    console.log(`   Vectors: ${vectorCount}`);
    console.log(`   Dimensions: ${dimensions}`);
    console.log(`   Total Size: ${(vectorCount * dimensions * 4 / 1024 / 1024).toFixed(2)} MB`);
    console.log();

    try {
        // Test 1: Get optimal batch size
        console.log('🔍 Test 1: Optimal Batch Size for RTX 3060 Ti');
        const batchResponse = await fetch(`${BASE_URL}/index/optimize/${dimensions}/hnsw`);
        if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            console.log(`   ✅ Optimal batch size: ${batchData.optimal_batch}`);
            console.log(`   GPU: ${batchData.gpu_model} (${batchData.vram_gb}GB VRAM)`);
            console.log(`   Recommendation: ${batchData.recommendation}`);
        } else {
            console.log(`   ❌ Failed to get batch optimization`);
        }
        console.log();

        // Test 2: Build HNSW Index (optimized for RTX 3060 Ti)
        console.log('🏗️  Test 2: Building HNSW Index (RTX 3060 Ti Optimized)');
        const startTime = Date.now();

        const hnswResponse = await fetch(`${BASE_URL}/index/hnsw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vectors: vectors,
                dimensions: dimensions,
                max_elements: vectorCount * 2
            })
        });

        if (hnswResponse.ok) {
            const hnswData = await hnswResponse.json();
            const buildTime = Date.now() - startTime;

            console.log(`   ✅ HNSW Index built successfully`);
            console.log(`   Build Time: ${buildTime}ms`);
            console.log(`   GPU Build Time: ${hnswData.stats?.build_time_ms || 'N/A'}ms`);
            console.log(`   Memory Usage: ${hnswData.stats?.memory_usage_mb?.toFixed(2) || 'N/A'} MB`);
            console.log(`   GPU Utilization: ${hnswData.stats?.gpu_utilization?.toFixed(1) || 'N/A'}%`);
            console.log(`   Index Size: ${hnswData.stats?.index_size_mb?.toFixed(2) || 'N/A'} MB`);
            console.log(`   RTX 3060 Ti Optimized: ${hnswData.rtx_3060_optimized}`);
        } else {
            const errorData = await hnswResponse.text();
            console.log(`   ❌ HNSW build failed: ${errorData}`);
        }
        console.log();

        // Test 3: Build IVF-PQ Index (for large-scale legal documents)
        console.log('📚 Test 3: Building IVF-PQ Index (Legal Documents Optimized)');
        const ivfStartTime = Date.now();

        const ivfResponse = await fetch(`${BASE_URL}/index/ivfpq`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vectors: vectors,
                dimensions: dimensions
            })
        });

        if (ivfResponse.ok) {
            const ivfData = await ivfResponse.json();
            const ivfBuildTime = Date.now() - ivfStartTime;

            console.log(`   ✅ IVF-PQ Index built successfully`);
            console.log(`   Build Time: ${ivfBuildTime}ms`);
            console.log(`   GPU Build Time: ${ivfData.stats?.build_time_ms || 'N/A'}ms`);
            console.log(`   Memory Usage: ${ivfData.stats?.memory_usage_mb?.toFixed(2) || 'N/A'} MB`);
            console.log(`   Index Size: ${ivfData.stats?.index_size_mb?.toFixed(2) || 'N/A'} MB`);
            console.log(`   Legal Docs Optimized: ${ivfData.legal_docs_optimized}`);
        } else {
            const errorData = await ivfResponse.text();
            console.log(`   ❌ IVF-PQ build failed: ${errorData}`);
        }
        console.log();

        // Test 4: Service Health Check
        console.log('🏥 Test 4: Service Health Check');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log(`   ✅ Service Status: ${healthData.status}`);
            console.log(`   Workers: ${healthData.ready_workers}/${healthData.total_workers} ready`);
            console.log(`   Total Jobs: ${healthData.total_jobs}`);
            console.log(`   Queue Length: ${healthData.queue_length}`);
        } else {
            console.log(`   ❌ Health check failed`);
        }

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.log(`💡 Tip: Make sure the CUDA service is running on port ${CUDA_SERVICE_PORT}`);
            console.log(`   Start with: ./cuda-service-worker-enhanced.exe`);
        }
    }

    console.log();
    console.log('🎯 CUDA Indexing Architecture Summary:');
    console.log('   ✅ pgvector handles storage (PostgreSQL)');
    console.log('   ✅ CUDA handles indexing computations (GPU)');
    console.log('   ✅ SIMD handles CPU optimizations (AVX2/SSE4)');
    console.log('   ✅ RTX 3060 Ti specific optimizations');
    console.log('   ✅ Legal document workload optimization');
}

// Start CUDA service and run tests
async function runTests() {
    console.log('🔧 Starting CUDA Service Worker...');

    // Check if service is already running
    try {
        const response = await fetch(`${BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ CUDA Service already running\n');
            await testCUDAIndexing();
            return;
        }
    } catch (error) {
        // Service not running, try to start it
    }

    // Try to start the service
    console.log('🚀 Starting CUDA service worker...');
    const cudaProcess = spawn('./cuda-service-worker-enhanced.exe', [], {
        stdio: 'pipe',
        env: { ...process.env, PORT: CUDA_SERVICE_PORT }
    });

    let serviceStarted = false;

    // Wait for service to start
    cudaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[CUDA] ${output.trim()}`);

        if (output.includes('HTTP server is responding') && !serviceStarted) {
            serviceStarted = true;
            setTimeout(async () => {
                await testCUDAIndexing();
                cudaProcess.kill();
            }, 1000);
        }
    });

    cudaProcess.stderr.on('data', (data) => {
        console.log(`[CUDA Error] ${data.toString().trim()}`);
    });

    // Timeout if service doesn't start
    setTimeout(() => {
        if (!serviceStarted) {
            console.log('❌ Service failed to start within timeout');
            cudaProcess.kill();
        }
    }, 30000);
}

// Run the tests
runTests().catch(console.error);